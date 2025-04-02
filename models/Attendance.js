const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lecture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        default: 'present'
    },
    markedAt: {
        type: Date,
        default: Date.now
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

// Compound index to prevent duplicate attendance records
attendanceSchema.index({ student: 1, lecture: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema); 