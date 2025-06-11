const express = require('express');
const router = express.Router();
const timekeepingController = require('../controllers/timekeepingController');
const middlewareController = require('../controllers/middlewareController');



// Check-in
router.post('/checkin', middlewareController.verifyToken, timekeepingController.checkIn);

// Check-out
router.post('/checkout', middlewareController.verifyToken, timekeepingController.checkOut);

// Lấy toàn bộ lịch sử chấm công (cho admin)
router.get('/history/all', middlewareController.verifyAdmin, timekeepingController.getAllTimekeepingHistory);

// Lấy lịch sử chấm công
router.get('/history/:userId', middlewareController.verifyToken, timekeepingController.getTimekeepingHistory);

// Lấy thống kê chấm công
router.get('/stats/:userId', middlewareController.verifyToken, timekeepingController.getTimekeepingStats);

// Cập nhật trạng thái chấm công (cho admin)
router.put('/:id/status', middlewareController.verifyAdmin, timekeepingController.updateTimekeepingStatus);

module.exports = router;
