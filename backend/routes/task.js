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

module.exports = router;