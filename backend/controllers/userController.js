const User = require('../models/User');
const bcrypt = require('bcrypt');

const userController = {
    //Get all users
    getAllUsers: async (req, res) => {
        try {
            const users = await User.find().select('-password');
            res.status(200).json(users);
        } catch (error) {
            console.error('Error getting all users:', error);
            res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng' });
        }
    },

    //Get current user
    getCurrentUser: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }
            res.status(200).json(user);
        } catch (error) {
            console.error('Error getting current user:', error);
            res.status(500).json({ message: 'Lỗi khi lấy thông tin người dùng' });
        }
    },

    //Get user by ID
    getUserById: async (req, res) => {
        try {
            const user = await User.findById(req.params.id).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }
            res.status(200).json(user);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            res.status(500).json({ message: 'Lỗi khi lấy thông tin người dùng' });
        }
    },

    //Update user profile
    updateProfile: async (req, res) => {
        try {
            const updates = req.body;
            const userId = req.user.id;

            // Hash password if it's being updated
            if (updates.password) {
                const salt = await bcrypt.genSalt(10);
                updates.password = await bcrypt.hash(updates.password, salt);
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { $set: updates },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Lỗi khi cập nhật thông tin cá nhân' });
        }
    },
    //Delete user
    deleteUser: async (req, res) => {
        try {
            const user = await User.findByIdAndDelete(req.params.id); // thực hiện xóa user
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }
            res.status(200).json({ message: 'Đã xóa người dùng thành công' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: 'Lỗi khi xóa người dùng' });
        }
    },    //Update user profile (admin only - can update any user)
    updateUserByAdmin: async (req, res) => {
        try {
            const updates = req.body;
            const userId = req.params.id;
            
            console.log('Admin updating user:', userId, 'with data:', updates);
            
            // Validate email uniqueness if email is being updated
            if (updates.email) {
                const existingUser = await User.findOne({ 
                    email: updates.email.toLowerCase(),
                    _id: { $ne: userId }
                });
                
                if (existingUser) {
                    return res.status(400).json({ 
                        message: 'Email này đã được sử dụng bởi người dùng khác' 
                    });
                }
                
                // Ensure email is lowercase
                updates.email = updates.email.toLowerCase();
            }
            
            // Hash password if it's being updated
            if (updates.password) {
                const salt = await bcrypt.genSalt(10);
                updates.password = await bcrypt.hash(updates.password, salt);
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { $set: updates },
                { 
                    new: true, 
                    runValidators: true,
                    context: 'query'
                }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            console.log('User updated successfully:', user);
            res.status(200).json(user);
        } catch (error) {
            console.error('Error updating user:', error);
            
            // Handle specific MongoDB errors
            if (error.code === 11000) {
                const duplicateField = Object.keys(error.keyPattern || {})[0];
                if (duplicateField === 'email') {
                    return res.status(400).json({ 
                        message: 'Email này đã được sử dụng bởi người dùng khác' 
                    });
                } else if (duplicateField === 'username') {
                    return res.status(400).json({ 
                        message: 'Tên đăng nhập này đã được sử dụng' 
                    });
                }
            }
            
            // Handle validation errors
            if (error.name === 'ValidationError') {
                const errorMessages = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({ 
                    message: errorMessages.join(', ')
                });
            }
            
            res.status(500).json({ message: 'Lỗi khi cập nhật thông tin người dùng' });
        }
    },
}

module.exports = userController;