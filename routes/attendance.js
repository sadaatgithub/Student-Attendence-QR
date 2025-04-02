const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Mark attendance using QR code
router.post('/mark', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can mark attendance' });
        }

        const { qrData, studentId } = req.body;
        console.log('Received QR data:', qrData);
        console.log('Received student ID:', studentId);

        // Parse QR data
        let parsedQRData;
        try {
            parsedQRData = JSON.parse(qrData);
        } catch (error) {
            console.error('Error parsing QR data:', error);
            return res.status(400).json({ message: 'Invalid QR code format' });
        }

        const { lectureId, teacherId, timestamp } = parsedQRData;
        console.log('Parsed QR data:', parsedQRData);

        // Verify QR code validity
        const lecture = await Lecture.findById(lectureId);
        console.log('Found lecture:', lecture);
        
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        if (lecture.teacher.toString() !== teacherId) {
            return res.status(403).json({ message: 'Invalid QR code' });
        }

        // Find student
        const student = await User.findOne({ studentId, role: 'student' });
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if attendance already exists
        const existingAttendance = await Attendance.findOne({
            student: student._id,
            lecture: lectureId
        });

        if (existingAttendance) {
            return res.status(200).json({ message: 'Attendance  marked for this student' });
        }

        // Create attendance record
        const attendance = new Attendance({
            student: student._id,
            lecture: lectureId,
            markedBy: req.user.userId,
            status: 'present'
        });

        console.log('Creating attendance record:', attendance);

        try {
            await attendance.save();
            console.log('Attendance saved successfully');
            res.status(200).json({ 
                message: 'Attendance marked successfully',
                attendance 
            });
        } catch (saveError) {
            console.error('Error saving attendance:', saveError);
            res.status(500).json({ 
                message: 'Failed to save attendance',
                error: saveError.message 
            });
        }
    } catch (error) {
        console.error('Error in attendance marking:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Get attendance report for a student
router.get('/student-report', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const attendance = await Attendance.find({ student: req.user.userId })
            .populate('lecture')
            .sort({ markedAt: -1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get attendance report for a teacher
router.get('/teacher-report/:lectureId', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const lecture = await Lecture.findById(req.params.lectureId);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        if (lecture.teacher.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const attendance = await Attendance.find({ lecture: req.params.lectureId })
            .populate('student')
            .sort({ markedAt: -1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Generate QR code for student
router.get('/student-qr', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const student = await User.findById(req.user.userId);
        
        const qrData = JSON.stringify({
            studentId: student.studentId,
            name: student.name,
            department: student.department,
            timestamp: Date.now(),
            email: student.email
        });

        const qrCode = await QRCode.toDataURL(qrData);
        res.json({ qrCode });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get teacher's attendance report
router.get('/teacher-report', verifyToken, async (req, res) => {
    try {
        // Get teacher's department
        const teacher = await User.findById(req.user.userId);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // Get teacher's lectures
        const lectures = await Lecture.find({ 
            teacher: req.user.userId,
            department: teacher.department 
        }).sort({ date: -1, startTime: -1 });

        // Get all students from the same department
        const departmentStudents = await User.find({ 
            role: 'student',
            department: teacher.department 
        }).select('_id name studentId department');

        // Get all attendance records for these lectures
        const attendanceRecords = await Attendance.find({
            lecture: { $in: lectures.map(l => l._id) }
        })
        .populate('student', 'name studentId department')
        .populate('lecture', 'title date startTime endTime')
        .sort({ date: -1, createdAt: -1 });

        // Create a map of student attendance by lecture
        const attendanceMap = new Map();
        attendanceRecords.forEach(record => {
            const key = `${record.student._id}-${record.lecture._id}`;
            attendanceMap.set(key, record);
        });

        // Create detailed attendance records
        const detailedAttendance = lectures.map(lecture => {
            const lectureAttendance = departmentStudents.map(student => {
                const key = `${student._id}-${lecture._id}`;
                const attendanceRecord = attendanceMap.get(key);
                
                return {
                    student: {
                        _id: student._id,
                        name: student.name,
                        studentId: student.studentId,
                        department: student.department
                    },
                    lecture: {
                        _id: lecture._id,
                        title: lecture.title,
                        date: lecture.date,
                        startTime: lecture.startTime,
                        endTime: lecture.endTime
                    },
                    status: attendanceRecord ? attendanceRecord.status : 'absent',
                    markedAt: attendanceRecord ? attendanceRecord.markedAt : null
                };
            });

            return {
                lecture,
                attendance: lectureAttendance
            };
        });

        // Calculate summary statistics
        const totalStudents = departmentStudents.length;
        const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
        const absentCount = (totalStudents * lectures.length) - presentCount;

        res.json({
            totalStudents,
            presentCount,
            absentCount,
            lectures: detailedAttendance
        });
    } catch (error) {
        console.error('Error fetching attendance report:', error);
        res.status(500).json({ message: 'Error fetching attendance report' });
    }
});

module.exports = router; 