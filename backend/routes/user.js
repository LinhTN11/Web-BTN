const router = require('express').Router();
const middlewareController = require('../controllers/middlewareController');
const userController = require('../controllers/userController');

// Public routes
router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Protected routes
router.get('/', middlewareController.verifyAdmin, userController.getAllUsers);
router.get('/me', middlewareController.verifyToken, userController.getCurrentUser);

// User profile routes (must be before /:id routes)
router.put('/profile', middlewareController.verifyToken, userController.updateProfile);

// Admin routes with :id parameter (must be after specific routes)
router.get('/:id', middlewareController.verifyAdmin, userController.getUserById);
router.put('/:id', middlewareController.verifyAdmin, userController.updateUserByAdmin);
router.delete('/:id', middlewareController.verifyAdmin, userController.deleteUser);

module.exports = router;