const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const timekeepingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  checkIn: {
    type: Date,
    default: null
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['on_time', 'late', 'early_leave', 'half_day', 'day_off', 'absent'],
    default: 'on_time'
  },
  workingHours: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

timekeepingSchema.index({ userId: 1, date: 1 }, { unique: true });

timekeepingSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diffInMs = this.checkOut - this.checkIn;
    this.workingHours = parseFloat((diffInMs / (1000 * 60 * 60)).toFixed(2));
    
    const checkInHour = this.checkIn.getHours() + (this.checkIn.getMinutes() / 60);
    const checkOutHour = this.checkOut.getHours() + (this.checkOut.getMinutes() / 60);
    
    if (checkInHour > 8.5) {
      this.status = 'late';
    } else if (checkOutHour < 17.5) {
      this.status = 'early_leave';
    } else {
      this.status = 'on_time';
    }
  }
  
  this.updatedAt = new Date();
  next();
});

const Timekeeping = mongoose.model('Timekeeping', timekeepingSchema);

module.exports = Timekeeping;
