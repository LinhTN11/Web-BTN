const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');
const chatRoute = require('./routes/chat');
const taskRoute = require('./routes/task');
const timekeepingRoute = require('./routes/timekeeping');
const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();
const app = express();
const server = createServer(app);

// MongoDB Connection Options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000, // Timeout after 15 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

// MongoDB Connection with retry logic
const connectWithRetry = async (retryCount = 0, maxRetries = 5) => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL, mongooseOptions);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (retryCount < maxRetries) {
      console.log(`Retrying in 5 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectWithRetry(retryCount + 1, maxRetries);
    } else {
      console.error('Failed to connect to MongoDB after maximum retries');
      process.exit(1);
    }
  }
};

// Initialize MongoDB connection
connectWithRetry();

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('Mongoose connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing Mongoose connection:', err);
    process.exit(1);
  }
});

// Initialize Socket.IO with deployment-friendly configuration
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = getAllowedOrigins();
      
      if (!origin) return callback(null, true);
      
      // Allow development mode
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === origin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('Socket.IO CORS blocked for origin:', origin);
        console.log('Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});
global.io = io;

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log('Socket connection rejected: No token provided');
    return next(new Error("Authentication error"));
  }

  try {
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    console.log('Attempting to verify token for socket connection...');
    const decoded = jwt.verify(actualToken, process.env.JWT_ACCESS_KEY);
    console.log('Token decoded successfully:', { id: decoded.id, role: decoded.role });
    
    // Ensure we have a valid user ID
    if (!decoded.id) {
      console.log('Socket connection rejected: Invalid token - no user ID in decoded token:', decoded);
      return next(new Error("Authentication error"));
    }
    
    socket.userId = decoded.id;
    console.log('Socket authenticated for user:', socket.userId);
    next();
  } catch (err) {
    console.log('Socket connection rejected: Token verification failed:', err.message);
    console.log('Token details:', { 
      tokenExists: !!token, 
      tokenLength: token?.length, 
      startsWithBearer: token?.startsWith('Bearer '),
      actualTokenLength: token?.startsWith('Bearer ') ? token.slice(7).length : token?.length
    });
    return next(new Error("Authentication error"));
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('User connected:', socket.userId);

  // Validate user ID exists
  if (!socket.userId) {
    console.error('Socket connected but no userId found');
    socket.disconnect();
    return;
  }

  try {
    // Update user's online status and last active time
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastActive: new Date()
    });
    
    // Broadcast user's online status
    socket.broadcast.emit('userOnline', socket.userId);
  } catch (error) {
    console.error('Error updating user status:', error);
  }
  // Handle joining user's room
  socket.join(socket.userId);
  console.log(`🏠 User ${socket.userId} joined room: ${socket.userId}`);
  console.log(`🏠 Current rooms for this socket:`, Array.from(socket.rooms));
  console.log(`🏠 Total rooms in server:`, Object.keys(io.sockets.adapter.rooms));
  console.log(`🏠 Users in room ${socket.userId}:`, io.sockets.adapter.rooms.get(socket.userId)?.size || 0);// Handle messages
  socket.on('sendMessage', async (data) => {
    try {
      const { receiverId, content, messageType = 'text' } = data;
      
      // Validate required fields
      if (!socket.userId) {
        console.error('SendMessage error: No userId in socket');
        socket.emit('messageError', { error: 'Authentication error' });
        return;
      }
      
      if (!receiverId || !content) {
        console.error('SendMessage error: Missing receiverId or content');
        socket.emit('messageError', { error: 'Missing required fields' });
        return;
      }
      
      // Update sender's last active time
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
      
      // Save message to database
      const newMessage = new Message({
        sender: socket.userId,
        receiver: receiverId,
        content,
        messageType,
        isRead: false
      });

      const savedMessage = await newMessage.save();
      
      // Populate sender and receiver info
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'username avatar')
        .populate('receiver', 'username avatar');
      
      // Emit to receiver
      io.to(receiverId).emit('newMessage', populatedMessage);

      // Emit back to sender for confirmation
      socket.emit('messageConfirmed', populatedMessage);
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  // Handle typing status
  socket.on('typing', async ({ receiverId, isTyping }) => {
    try {
      // Update user's last active time
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
      
      io.to(receiverId).emit('userTyping', {
        userId: socket.userId,
        isTyping
      });
    } catch (error) {
      console.error('Error handling typing status:', error);
    }
  });

  // Handle heartbeat
  socket.on('heartbeat', async () => {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
    } catch (error) {
      console.error('Error updating heartbeat:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.userId);
    try {
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
      socket.broadcast.emit('userOffline', socket.userId);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// CORS Configuration for deployment
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000', // Local development
    'http://localhost:3001', // Local development alternative
  ];
  
  // Add production URLs if available
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Add common deployment platforms
  if (process.env.NODE_ENV === 'production') {
    // Vercel deployment patterns
    origins.push(/^https:\/\/.*\.vercel\.app$/);
    origins.push(/^https:\/\/.*\.vercel\.com$/);
    
    // Custom domain if you have one
    if (process.env.CUSTOM_FRONTEND_DOMAIN) {
      origins.push(process.env.CUSTOM_FRONTEND_DOMAIN);
    }
    
    // Add your specific Vercel URL here
    // origins.push('https://your-app-name.vercel.app');
  }
  
  return origins;
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow development mode
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization']
};

// Middleware setup
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' })); // Increase payload limit for avatar uploads
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Also handle URL encoded data
app.use(morgan('dev'));

// Health check endpoints for deployment
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes with versioning
app.use('/v1/auth', authRoute);
app.use('/v1/user', userRoute);
app.use('/v1/chat', chatRoute);
app.use('/v1/tasks', taskRoute);
app.use('/v1/timekeeping', timekeepingRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Đã xảy ra lỗi server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint không tồn tại' });
});

// Set up interval to check for offline users every minute
const authController = require('./controllers/authController');
setInterval(() => {
  authController.checkOfflineUsers();
}, 60000); // Check every 60 seconds

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
