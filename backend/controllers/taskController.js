const Task = require('../models/Task');
const mongoose = require('mongoose');

const taskController = {
  // Get all tasks
  getAllTasks: async (req, res) => {
    try {
      const tasks = await Task.find()
        .populate('assignedTo', 'username')
        .populate('assignedBy', 'username');
      console.log('📋 All tasks:', tasks);
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      console.error('❌ Error in getAllTasks:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get tasks by user ID (assigned to)
  getTasksByUserId: async (req, res) => {
    try {
      console.log('📥 getTasksByUserId called');
      console.log('👤 User:', req.user);
      console.log('🔍 Query params:', req.query);

      const query = { assignedTo: req.query.assignedTo };
      console.log('🎯 Query:', JSON.stringify(query));

      const tasks = await Task.find(query).lean();
      console.log('📝 Found tasks:', JSON.stringify(tasks, null, 2));

      const populatedTasks = await Task.populate(tasks, [
        { path: 'assignedTo', select: 'username' }
      ]);
      
      console.log('📝 Populated tasks:', JSON.stringify(populatedTasks, null, 2));
      
      res.status(200).json({ success: true, data: populatedTasks });
    } catch (error) {
      console.error('❌ Error in getTasksByUserId:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create a new task
  createTask: async (req, res) => {
    try {
      console.log('📝 Creating new task');
      console.log('👤 User:', req.user);
      console.log('📄 Request body:', req.body);

      const taskData = {
        ...req.body,
        assignedBy: req.user.role === 'admin' ? 'admin001' : req.user.id // Use string ID for admin
      };

      const newTask = new Task(taskData);
      console.log('📋 New task object:', newTask);

      const savedTask = await newTask.save();
      
      // Populate only assignedTo
      const populatedTask = await Task.findById(savedTask._id)
        .populate('assignedTo', 'username');

      console.log('✅ Task created:', populatedTask);
      
      res.status(201).json({ success: true, data: populatedTask });
    } catch (error) {
      console.error('❌ Error creating task:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update a task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🔄 Updating task:', id);
      console.log('📝 Update data:', req.body);

      // Validate task exists
      const existingTask = await Task.findById(id);
      if (!existingTask) {
        console.log('❌ Task not found:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }

      // Validate user can update this task
      if (existingTask.assignedTo.toString() !== req.user.id) {
        console.log('⛔ Unauthorized update attempt');
        console.log('Task assignedTo:', existingTask.assignedTo);
        console.log('User ID:', req.user.id);
        return res.status(403).json({ 
          success: false, 
          message: 'You can only update tasks assigned to you' 
        });
      }

      // Update task
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true }
      ).populate('assignedTo', 'username');

      console.log('✅ Task updated:', JSON.stringify(updatedTask, null, 2));
      
      res.status(200).json({ success: true, data: updatedTask });
    } catch (error) {
      console.error('❌ Error updating task:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Upload proof for a task
  uploadProof: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('📤 Uploading proof for task:', id);
      
      if (!req.file) {
        console.log('❌ No file uploaded');
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      console.log('📦 Uploaded file:', req.file);

      // Create file URL
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      console.log('🔗 File URL:', fileUrl);

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
        console.log('❌ Task not found:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }

      console.log('✅ Task updated with proof:', updatedTask);
      res.status(200).json({ 
        success: true, 
        data: updatedTask 
      });
    } catch (error) {
      console.error('❌ Error uploading proof:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error uploading proof' 
      });
    }
  }
};

module.exports = taskController; 