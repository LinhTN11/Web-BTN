const Timekeeping = require('../models/Timekeeping');

const timekeepingController = {
  // Check-in
  checkIn: async (req, res) => {
    console.log('Received check-in request for user:', req.user.id);
    try {
      const userId = req.user.id;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Kiểm tra xem đã check-in chưa
      const existingRecord = await Timekeeping.findOne({ 
        userId,
        date: { 
          $gte: today, 
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
        } 
      });

      if (existingRecord && existingRecord.checkIn) {
        return res.status(400).json({ success: false, message: 'Bạn đã check-in hôm nay rồi' });
      }

      const timekeeping = await Timekeeping.findOneAndUpdate(
        { 
          userId,
          date: { 
            $gte: today, 
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
          } 
        },
        { 
          userId,
          date: today,
          checkIn: now,
          $setOnInsert: { status: 'on_time' }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log('Timekeeping record after upsert:', timekeeping);

      if (!timekeeping) {
        console.error('Failed to create or update timekeeping record.');
        return res.status(500).json({ success: false, message: 'Không thể tạo bản ghi chấm công' });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Check-in thành công',
        data: timekeeping 
      });
    } catch (error) {
      console.error('Error during check-in process:', error);
      res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
  },

  // Check-out
  checkOut: async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Tìm bản ghi check-in hôm nay
      const timekeeping = await Timekeeping.findOne({ 
        userId,
        date: { 
          $gte: today, 
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
        } 
      });

      if (!timekeeping || !timekeeping.checkIn) {
        return res.status(400).json({ success: false, message: 'Bạn chưa check-in hôm nay' });
      }

      if (timekeeping.checkOut) {
        return res.status(400).json({ success: false, message: 'Bạn đã check-out hôm nay rồi' });
      }

      // Cập nhật thời gian check-out
      timekeeping.checkOut = now;
      await timekeeping.save();

      res.status(200).json({ 
        success: true, 
        message: 'Check-out thành công',
        data: timekeeping 
      });
    } catch (error) {
      console.error('Lỗi khi check-out:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Lấy lịch sử chấm công
  getTimekeepingHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;
      
      const startDate = new Date(year || new Date().getFullYear(), month ? month - 1 : new Date().getMonth(), 1);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const history = await Timekeeping.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 });

      res.status(200).json({ success: true, data: history });
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử chấm công:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Thống kê chấm công
  getTimekeepingStats: async (req, res) => {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;
      
      const startDate = new Date(year || new Date().getFullYear(), month ? month - 1 : new Date().getMonth(), 1);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const stats = await Timekeeping.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalWorkingDays: { $sum: 1 },
            presentDays: { 
              $sum: { 
                $cond: [{ $ne: ["$checkIn", null] }, 1, 0] 
              } 
            },
            lateDays: { 
              $sum: { 
                $cond: [{ $eq: ["$status", "late"] }, 1, 0] 
              } 
            },
            earlyLeaveDays: { 
              $sum: { 
                $cond: [{ $eq: ["$status", "early_leave"] }, 1, 0] 
              } 
            },
            dayOff: { 
              $sum: { 
                $cond: [{ $eq: ["$status", "day_off"] }, 1, 0] 
              } 
            },
            absentDays: { 
              $sum: { 
                $cond: [{ $eq: ["$status", "absent"] }, 1, 0] 
              } 
            },
            totalWorkingHours: { $sum: "$workingHours" }
          }
        },
        {
          $project: {
            _id: 0,
            month: startDate.getMonth() + 1,
            year: startDate.getFullYear(),
            totalWorkingDays: 1,
            presentDays: 1,
            lateDays: 1,
            earlyLeaveDays: 1,
            dayOff: 1,
            absentDays: 1,
            totalWorkingHours: 1,
            averageHoursPerDay: {
              $cond: [
                { $eq: ["$presentDays", 0] },
                0,
                { $divide: ["$totalWorkingHours", "$presentDays"] }
              ]
            }
          }
        }
      ]);

      res.status(200).json({ 
        success: true, 
        data: stats[0] || {
          month: startDate.getMonth() + 1,
          year: startDate.getFullYear(),
          totalWorkingDays: 0,
          presentDays: 0,
          lateDays: 0,
          earlyLeaveDays: 0,
          dayOff: 0,
          absentDays: 0,
          totalWorkingHours: 0,
          averageHoursPerDay: 0
        }
      });
    } catch (error) {
      console.error('Lỗi khi thống kê chấm công:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Cập nhật trạng thái chấm công (cho admin)
  updateTimekeepingStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const timekeeping = await Timekeeping.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!timekeeping) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi chấm công' });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Cập nhật trạng thái thành công',
        data: timekeeping 
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái chấm công:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }
};

  // Get all timekeeping history (for admin)
  getAllTimekeepingHistory: async (req, res) => {
    try {
      const { page = 1, limit = 10, userId, startDate, endDate } = req.query;

      const query = {};
      if (userId) {
        query.userId = userId;
      }
      if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const history = await Timekeeping.find(query)
        .populate({ path: 'userId', select: 'username email' })
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10));

      const totalRecords = await Timekeeping.countDocuments(query);

      res.status(200).json({
        success: true,
        data: history,
        pagination: {
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: parseInt(page, 10),
          totalRecords,
        },
      });
    } catch (error) {
      console.error('Lỗi khi lấy toàn bộ lịch sử chấm công:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },


timekeepingController.getAllTimekeepingHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { userId, startDate, endDate } = req.query;

        const filter = {};
        if (userId) {
            filter.userId = userId;
        }
        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (startDate) {
            filter.date = { $gte: new Date(startDate) };
        } else if (endDate) {
            filter.date = { $lte: new Date(endDate) };
        }

        const totalRecords = await Timekeeping.countDocuments(filter);
        const history = await Timekeeping.find(filter)
            .populate('userId', 'username email')
            .sort({ date: -1, checkIn: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            data: history,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords,
            },
        });
    } catch (error) {
        console.error('Error fetching all timekeeping history:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = timekeepingController;
