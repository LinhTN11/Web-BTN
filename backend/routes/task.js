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

// All routes require authentication
router.use(middlewareController.verifyToken);

// Get tasks (with access control)
router.get('/', checkTaskAccess, taskController.getTasksByUserId);

// Get all tasks (admin only)
router.get('/all', middlewareController.verifyAdmin, taskController.getAllTasks);

// Create a new task (admin only)
router.post('/', middlewareController.verifyAdmin, taskController.createTask);

// Update a task
router.patch('/:id', taskController.updateTask);

// Delete a task (admin only)
router.delete('/:id', middlewareController.verifyAdmin, taskController.deleteTask);

module.exports = router; 