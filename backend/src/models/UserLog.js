const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  details: {
    type: Object,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('UserLog', userLogSchema); 