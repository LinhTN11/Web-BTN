const Task = require('../models/Task');
const mongoose = require('mongoose');

const taskController = {
  // Get all tasks
  getAllTasks: async (req, res) => {
    try {
      const tasks = await Task.find()
        .populate('assignedTo', 'username')
        .populate('assignedBy', 'username');
      console.log(' All tasks:', tasks);
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      console.error(' Error in getAllTasks:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get tasks by user ID (assigned to)
  getTasksByUserId: async (req, res) => {
    try {
      console.log(' getTasksByUserId called');
      console.log(' User:', req.user);
      console.log(' Query params:', req.query);

      const query = { assignedTo: req.query.assignedTo };
      console.log(' Query:', JSON.stringify(query));

      const tasks = await Task.find(query).lean();
      console.log(' Found tasks:', JSON.stringify(tasks, null, 2));

      const populatedTasks = await Task.populate(tasks, [
        { path: 'assignedTo', select: 'username' }
      ]);
      
      console.log(' Populated tasks:', JSON.stringify(populatedTasks, null, 2));
      
      res.status(200).json({ success: true, data: populatedTasks });
    } catch (error) {
      console.error(' Error in getTasksByUserId:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create a new task
  createTask: async (req, res) => {
    try {
      console.log(' Creating new task');
      console.log(' User:', req.user);
      console.log(' Request body:', req.body);

      const taskData = {
        ...req.body,
        assignedBy: req.user.role === 'admin' ? 'admin001' : req.user.id // Use string ID for admin
      };

      const newTask = new Task(taskData);
      console.log(' New task object:', newTask);

      const savedTask = await newTask.save();
      
      // Populate only assignedTo
      const populatedTask = await Task.findById(savedTask._id)
        .populate('assignedTo', 'username');

      console.log(' Task created:', populatedTask);
      
      res.status(201).json({ success: true, data: populatedTask });
    } catch (error) {
      console.error(' Error creating task:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update a task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(' Updating task:', id);
      console.log(' User:', req.user);
      console.log(' Update data:', req.body);

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log(' Invalid task ID format:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid task ID format' 
        });
      }

      // Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log(' No update data provided');
        return res.status(400).json({ 
          success: false, 
          message: 'No update data provided' 
        });
      }

      // Check if user exists and has valid role
      if (!req.user || !req.user.id) {
        console.log(' Invalid user data in request');
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid user authentication' 
        });
      }

      // Find existing task
      const existingTask = await Task.findById(id);
      if (!existingTask) {
        console.log(' Task not found:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }

      console.log(' Existing task:', {
        id: existingTask._id,
        assignedTo: existingTask.assignedTo,
        status: existingTask.status
      });

      // Permission validation
      const isAdmin = req.user.role === 'admin';
      const isTaskOwner = existingTask.assignedTo.toString() === req.user.id;

      console.log(' Permission check:', {
        isAdmin,
        isTaskOwner,
        userRole: req.user.role,
        userId: req.user.id,
        taskAssignedTo: existingTask.assignedTo.toString()
      });

      if (!isAdmin && !isTaskOwner) {
        console.log(' Unauthorized update attempt');
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to update this task' 
        });
      }

      // Filter allowed fields for non-admin users
      let updateData = { ...req.body };
      
      if (!isAdmin) {
        // Regular users cannot change certain fields
        const allowedFields = ['status', 'proofUrl', 'receivedAt'];
        const restrictedFields = ['assignedTo', 'assignedBy', 'title', 'description', 'priority', 'dueDate'];
        
        // Remove restricted fields
        restrictedFields.forEach(field => {
          if (updateData[field] !== undefined) {
            console.log(` Removing restricted field for non-admin: ${field}`);
            delete updateData[field];
          }
        });

        // If no allowed fields remain, return error
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No valid fields to update for your role'
          });
        }
      }

      // Validate status if being updated
      if (updateData.status) {
        const validStatuses = ['pending', 'in-progress', 'completed', 'done', 'cancelled'];
        if (!validStatuses.includes(updateData.status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          });
        }
      }

      // Add timestamp
      updateData.updatedAt = new Date();

      console.log(' Final update data:', updateData);

      // Update task
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { $set: updateData },
        { 
          new: true,
          runValidators: true // Enable mongoose validations
        }
      ).populate('assignedTo', 'username');

      if (!updatedTask) {
        console.log(' Task update failed - task not found after update');
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update task' 
        });
      }

      console.log(' Task updated successfully:', {
        id: updatedTask._id,
        status: updatedTask.status,
        updatedAt: updatedTask.updatedAt
      });
      
      res.status(200).json({ success: true, data: updatedTask });
    } catch (error) {
      console.error(' Error updating task:', error);
      
      // Handle specific mongoose errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format'
        });
      }

      res.status(500).json({ 
        success: false, 
        message: 'Internal server error while updating task'
      });
    }
  },

  // Delete a task (admin only)
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(' Deleting task:', id);

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid task ID format' 
        });
      }

      const task = await Task.findById(id);
      if (!task) {
        console.log(' Task not found for deletion:', id);
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      await Task.findByIdAndDelete(id);
      console.log(' Task deleted successfully:', id);
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      console.error(' Error deleting task:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Upload proof for a task
  uploadProof: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(' Uploading proof for task:', id);
      
      if (!req.file) {
        console.log(' No file uploaded');
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      console.log(' Uploaded file:', req.file);

      // Create file URL
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      console.log(' File URL:', fileUrl);

      // Update task with proof URL
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { 
          $set: { 
            proofUrl: fileUrl,
            status: 'done',
            receivedAt: new Date()
          } 
        },
        { new: true }
      ).populate('assignedTo', 'username');

      if (!updatedTask) {
        console.log(' Task not found:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }

      console.log(' Task updated with proof:', updatedTask);
      res.status(200).json({ 
        success: true, 
        data: updatedTask 
      });
    } catch (error) {
      console.error(' Error uploading proof:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error uploading proof' 
      });
    }
  }
};

module.exports = taskController;