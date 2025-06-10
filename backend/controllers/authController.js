const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let refreshTokens = [];

const authController = {
  //REGISTER
  registerUser: async (req, res) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(req.body.password, salt);

      //Create new user
      const newUser = await new User({
        username: req.body.username,
        email: req.body.email,
        password: hashed,
      });

      //Save user to DB
      const user = await newUser.save();
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json(err);
    }
  },  generateAccessToken: (user) => {
    try {
      console.log('Generating access token for user:', { 
        id: user._id, 
        userId: user.id,
        role: user.role, 
        userObject: user 
      });
      
      const userId = user._id || user.id;
      if (!userId) {
        console.error('No user ID found in user object:', user);
        throw new Error('User ID is required for token generation');
      }
      
      return jwt.sign(
        {
          id: userId,
          role: user.role,
          isAdmin: user.role === 'admin', // Add isAdmin for backward compatibility
        },
        process.env.JWT_ACCESS_KEY || 'fallback_access_key',
        { expiresIn: "15m" } // Changed from 30s to 15 minutes
      );
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Không thể tạo token đăng nhập');
    }
  },  generateRefreshToken: (user) => {
    try {
      console.log('Generating refresh token for user:', { 
        id: user._id, 
        userId: user.id,
        role: user.role 
      });
      
      const userId = user._id || user.id;
      if (!userId) {
        console.error('No user ID found in user object:', user);
        throw new Error('User ID is required for refresh token generation');
      }
      
      return jwt.sign(
        {
          id: userId,
          role: user.role,
          isAdmin: user.role === 'admin', // Add isAdmin for backward compatibility
        },
        process.env.JWT_REFRESH_KEY || 'fallback_refresh_key',
        { expiresIn: "7d" } // Reduced from 365d to 7 days for better security
      );
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Không thể tạo token làm mới');
    }
  },

  //LOGIN
  loginUser: async (req, res) => {
    try {
      // Input validation
      if (!req.body.username || !req.body.password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin đăng nhập" });
      }

      // Find user and include password field
      const user = await User.findOne({ username: req.body.username }).select('+password');
      if (!user) {
        return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
      }

      // Validate password
      const validPassword = await bcrypt.compare(req.body.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
      }

      // Generate tokens
      const accessToken = authController.generateAccessToken(user);
      const refreshToken = authController.generateRefreshToken(user);
      
      // Add refresh token to array
      refreshTokens = refreshTokens.filter(token => token !== refreshToken);
      refreshTokens.push(refreshToken);

      // Set refresh token cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: "/",
        sameSite: "strict",
      });

      // Send response with user info and tokens
      const { password, ...userWithoutPassword } = user.toObject();
      res.status(200).json({
        user: userWithoutPassword,
        accessToken,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: "Lỗi đăng nhập, vui lòng thử lại" });
    }
  },
  requestRefreshToken: async (req, res) => {
    try {
      //Take refresh token from user
      const refreshToken = req.cookies.refreshToken;
      
      //Send error if token is not valid
      if (!refreshToken) {
        return res.status(401).json({ 
          message: "Không tìm thấy refresh token",
          code: "NO_REFRESH_TOKEN"
        });
      }
      
      if (!refreshTokens.includes(refreshToken)) {
        return res.status(403).json({ 
          message: "Refresh token không hợp lệ",
          code: "INVALID_REFRESH_TOKEN"
        });
      }
      
      jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (err, user) => {
        if (err) {
          console.error('Error verifying refresh token:', err);
          return res.status(403).json({ 
            message: "Refresh token đã hết hạn",
            code: "REFRESH_TOKEN_EXPIRED"
          });
        }
        
        // Remove old refresh token
        refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
        
        //create new access token, refresh token and send to user
        const newAccessToken = authController.generateAccessToken(user);
        const newRefreshToken = authController.generateRefreshToken(user);
        refreshTokens.push(newRefreshToken);
        
        // Set NEW refresh token cookie
        res.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: "/",
          sameSite: "strict",
        });
        
        res.status(200).json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      });
    } catch (error) {
      console.error('Error in requestRefreshToken:', error);
      res.status(500).json({ 
        message: "Lỗi làm mới token",
        code: "REFRESH_ERROR"
      });
    }
  },

  //LOG OUT
  logOut: async (req, res) => {
    //Clear cookies when user logs out
    refreshTokens = refreshTokens.filter((token) => token !== req.body.token);
    res.clearCookie("refreshToken");
    res.status(200).json("Logged out successfully!");
  },
  userLogout: async (req, res) => {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refreshToken;
      
      // Remove refresh token from memory if it exists
      if (refreshToken) {
        refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
      }
      
      // Also remove any token sent in body (for backward compatibility)
      if (req.body.token) {
        refreshTokens = refreshTokens.filter((token) => token !== req.body.token);
      }
      
      // Clear the refresh token cookie
      res.clearCookie("refreshToken");
      res.status(200).json({ message: "Logged out successfully!" });
    } catch (err) {
      console.error('Error logging out:', err);
      res.status(500).json({ message: "Error logging out", error: err.message });
    }
  },

  simpleLogout: async (req, res) => {
    try {
      res.clearCookie("refreshToken");
      res.status(200).json({ message: "Cookies cleared successfully!" });
    } catch (err) {
      res.status(500).json({ message: "Error clearing cookies", error: err.message });
    }
  },

  heartbeat: async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { lastActive: new Date() },
        { new: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({ message: "Heartbeat received", lastActive: user.lastActive });
    } catch (err) {
      res.status(500).json({ message: "Error updating last active status", error: err.message });
    }
  },

  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: "Error fetching user", error: err.message });
    }
  },

  checkOfflineUsers: async () => {
    try {
      const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      const now = new Date();
      
      // Find users who haven't updated their lastActive in the last 5 minutes
      const offlineUsers = await User.find({
        lastActive: { 
          $lt: new Date(now.getTime() - OFFLINE_THRESHOLD),
          $ne: null 
        },
        isOnline: true
      });

      // Update offline users
      for (const user of offlineUsers) {
        user.isOnline = false;
        await user.save();

        // Emit offline status through socket if available
        if (global.io) {
          global.io.emit('userOffline', user._id);
        }
      }
    } catch (error) {
      console.error('Error checking offline users:', error);
    }
  },
};

module.exports = authController;
