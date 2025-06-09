const Message = require('../models/Message');
const User = require('../models/User');

const chatController = {    // Send a new message
    sendMessage: async (req, res) => {
        try {
            const { receiverId, content, messageType = 'text' } = req.body;
            const senderId = req.user.id;

            if (!receiverId || !content) {
                return res.status(400).json({ message: "Receiver ID and content are required" });
            }

            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId, // Changed from recipient to receiver
                content,
                messageType,
                isRead: false // Changed from read to isRead
            });

            const savedMessage = await newMessage.save();
            
            // Populate sender and receiver info
            const populatedMessage = await Message.findById(savedMessage._id)
                .populate('sender', 'username avatar')
                .populate('receiver', 'username avatar'); // Changed from recipient to receiver

            res.status(200).json(populatedMessage);
        } catch (err) {
            console.error('Error sending message:', err);
            res.status(500).json({ message: "Error sending message", error: err.message });
        }
    },    // Get conversation with specific user
    getConversation: async (req, res) => {
        try {
            const userId = req.user.id;
            const otherUserId = req.params.userId;

            if (!otherUserId) {
                return res.status(400).json({ message: "User ID is required" });
            }

            const messages = await Message.find({
                $or: [
                    { sender: userId, receiver: otherUserId }, // Changed from recipient to receiver
                    { sender: otherUserId, receiver: userId }  // Changed from recipient to receiver
                ]
            })
            .sort({ createdAt: 1 }) // Use createdAt instead of timestamp
            .populate('sender', 'username avatar')
            .populate('receiver', 'username avatar'); // Changed from recipient to receiver

            res.status(200).json(messages);
        } catch (err) {
            console.error('Error fetching conversation:', err);
            res.status(500).json({ message: "Error fetching conversation", error: err.message });
        }
    },    // Get all conversations
    getConversations: async (req, res) => {
        try {
            const userId = req.user.id;

            // Get the last message from each conversation
            const conversations = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: userId },
                            { receiver: userId }
                        ]
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$sender", userId] },
                                "$receiver",
                                "$sender"
                            ]
                        },
                        lastMessage: { $first: "$$ROOT" }
                    }
                }
            ]);

            // Populate user information
            const populatedConversations = await Promise.all(
                conversations.map(async (conv) => {
                    const otherUser = await User.findById(conv._id).select('username avatar');
                    return {
                        user: otherUser,
                        lastMessage: conv.lastMessage
                    };
                })
            );

            res.status(200).json(populatedConversations);
        } catch (err) {
            res.status(500).json({ message: "Error fetching conversations", error: err.message });
        }
    },    // Mark messages as read
    markAsRead: async (req, res) => {
        try {
            const { senderId } = req.body;
            const receiverId = req.user.id;

            await Message.updateMany(
                { 
                    sender: senderId,
                    receiver: receiverId,
                    isRead: false
                },
                { isRead: true, readAt: new Date() }
            );

            res.status(200).json({ message: "Messages marked as read" });
        } catch (err) {
            res.status(500).json({ message: "Error marking messages as read", error: err.message });
        }
    },    // Get unread message count
    getUnreadCount: async (req, res) => {
        try {
            const userId = req.user.id;

            const count = await Message.countDocuments({
                receiver: userId,
                isRead: false
            });

            res.status(200).json({ unreadCount: count });
        } catch (err) {
            res.status(500).json({ message: "Error getting unread count", error: err.message });
        }
    },    // Get users available for chat
    getChatUsers: async (req, res) => {
        try {
            const currentUserId = req.user.id;
            
            // Find all users except the current user
            const users = await User.find({ 
                _id: { $ne: currentUserId } 
            })
            .select('username avatar lastActive isOnline')
            .sort({ lastActive: -1 });

            res.status(200).json(users);
        } catch (err) {
            res.status(500).json({ message: "Error fetching chat users", error: err.message });
        }
    }
};

module.exports = chatController;
