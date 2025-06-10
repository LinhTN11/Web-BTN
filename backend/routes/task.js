const router = require('express').Router();
const taskController = require('../controllers/taskController');
const middlewareController = require('../controllers/middlewareController');

// Middleware to check if user can access tasks
const checkTaskAccess = (req, res, next) => {
  console.log(' Checking task access...');
  console.log(' User:', req.user);
  console.log(' Query:', req.query);

  // Admin can access all tasks
  if (req.user.role === 'admin' && !req.query.assignedTo) {
    console.log(' Admin accessing all tasks');
    return next();
  }

  // For specific user tasks, ensure assignedTo matches current user
  const targetUserId = req.query.assignedTo || req.user.id;
  if (req.user.role !== 'admin' && targetUserId !== req.user.id) {
    console.log(' Access denied: User can only access their own tasks');
    return res.status(403).json({ 
      success: false, 
      message: 'You can only access your own tasks' 
    });
  }

  // Set assignedTo parameter for non-admin users
  if (req.user.role !== 'admin') {
    req.query.assignedTo = req.user.id;
  }

  console.log(' Access granted');
  next();
};

// Middleware to check if user can update a specific task
const checkTaskUpdateAccess = async (req, res, next) => {
  try {
    console.log(' Checking task update access...');
    console.log(' User:', req.user);
    console.log(' Task ID:', req.params.id);

    const taskId = req.params.id;
    
    // Validate task ID
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    // Admin can update any task
    if (req.user.role === 'admin') {
      console.log(' Admin can update any task');
      return next();
    }

    // For regular users, check if they own the task
    // You'll need to implement this check in your controller or here
    // For now, we'll pass the user info to the controller
    req.userCanUpdate = true; // This should be determined by checking task ownership
    
    console.log(' Update access granted');
    next();
  } catch (error) {
    console.error(' Error checking update access:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking update permissions'
    });
  }
};

// Middleware to check if user can delete a specific task
const checkTaskDeleteAccess = async (req, res, next) => {
  try {
    console.log(' Checking task delete access...');
    console.log(' User:', req.user);
    console.log(' Task ID:', req.params.id);

    // For now, only admin can delete (as per your original code)
    // But you can modify this to allow users to delete their own tasks
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete tasks'
      });
    }

    console.log(' Delete access granted');
    next();
  } catch (error) {
    console.error(' Error checking delete access:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking delete permissions'
    });
  }
};

// All routes require authentication
router.use(middlewareController.verifyToken);

// Get tasks (with access control)
router.get('/', checkTaskAccess, taskController.getTasksByUserId);

// Get all tasks (admin only)
router.get('/all', middlewareController.verifyAdmin, taskController.getAllTasks);

// Create a new task (admin only)
router.post('/', middlewareController.verifyAdmin, taskController.createTask);

// Update a task (with proper access control)
router.patch('/:id', checkTaskUpdateAccess, taskController.updateTask);

// Delete a task (admin only, with access control)
router.delete('/:id', checkTaskDeleteAccess, taskController.deleteTask);

// Test notification endpoint
router.post('/test-notification', middlewareController.verifyToken, (req, res) => {
  try {
    console.log('🧪 Test notification endpoint called');
    console.log('User:', req.user);
    console.log('Request body:', req.body);

    const { targetUserId, message } = req.body;
    const userId = targetUserId || req.user.id;

    if (global.io) {
      const notification = {
        id: Date.now().toString(),
        type: 'task_assigned',
        taskId: 'test-' + Date.now(),
        taskTitle: 'Test Notification Task',
        message: message || `Test notification sent to user ${userId}`,
        timestamp: new Date(),
        read: false,
        assignedTo: userId
      };

      console.log('📤 Sending test notification:', notification);
      console.log('🏠 Available socket rooms:', Object.keys(global.io.sockets.adapter.rooms || {}));
      console.log('👥 Connected sockets:', Object.keys(global.io.sockets.sockets || {}));

      // Send to specific user room
      global.io.to(userId).emit('taskNotification', notification);
      
      // Also broadcast to all connected clients
      global.io.emit('taskNotification', notification);
      
      console.log('✅ Test notification sent successfully');
      
      res.status(200).json({ 
        success: true, 
        message: 'Test notification sent',
        notification,
        rooms: Object.keys(global.io.sockets.adapter.rooms || {}),
        sockets: Object.keys(global.io.sockets.sockets || {})
      });
    } else {
      console.log('❌ global.io not available');
      res.status(500).json({ 
        success: false, 
        message: 'Socket.IO not available' 
      });
    }
  } catch (error) {
    console.error('❌ Error in test notification:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Test direct notification endpoint (bypass auth for testing)
router.post('/test-direct-notification', (req, res) => {
  try {
    console.log('🧪 Direct test notification endpoint called (NO AUTH)');
    console.log('Request body:', req.body);

    const { targetUserId, message } = req.body;
    const userId = targetUserId || '6837ef18f94933046b33c2fd'; // Use the connected user ID

    if (global.io) {
      const notification = {
        id: Date.now().toString(),
        type: 'task_assigned',
        taskId: 'test-' + Date.now(),
        taskTitle: 'Test Direct Notification Task',
        message: message || `Direct test notification sent to user ${userId} at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date(),
        read: false,
        assignedTo: userId
      };

      console.log('📤 Sending direct test notification:', notification);
      console.log('🏠 Available socket rooms:', Object.keys(global.io.sockets.adapter.rooms || {}));
      console.log('👥 Connected sockets:', Object.keys(global.io.sockets.sockets || {}));

      // Send to specific user room
      global.io.to(userId).emit('taskNotification', notification);
      
      // Also broadcast to all connected clients
      global.io.emit('taskNotification', notification);
      
      console.log('✅ Direct test notification sent successfully');
      
      res.status(200).json({ 
        success: true, 
        message: 'Direct test notification sent',
        notification,
        rooms: Object.keys(global.io.sockets.adapter.rooms || {}),
        sockets: Object.keys(global.io.sockets.sockets || {}),
        targetUserId: userId
      });
    } else {
      console.log('❌ global.io not available');
      res.status(500).json({ 
        success: false, 
        message: 'Socket.IO not available' 
      });
    }
  } catch (error) {
    console.error('❌ Error in direct test notification:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;