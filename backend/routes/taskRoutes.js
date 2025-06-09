const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const upload = require('../middleware/uploadMiddleware');

// Get all tasks
router.get('/', taskController.getAllTasks);

// Get tasks by user ID
router.get('/user', taskController.getTasksByUserId);

// Create new task
router.post('/', taskController.createTask);

// Update task
router.patch('/:id', taskController.updateTask);

// Upload proof (using multer middleware)
router.post('/:id/upload-proof', upload.single('proof'), taskController.uploadProof);

module.exports = router; 