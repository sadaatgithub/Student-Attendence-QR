const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Lecture = require('../models/Lecture');

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

// Create a new lecture
router.post('/', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can create lectures' });
        }

        const { title, description, date, startTime, endTime, department } = req.body;

        // Validate required fields
        if (!title || !description || !date || !startTime || !endTime || !department) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Convert date string to Date object
        const lectureDate = new Date(date);
        if (isNaN(lectureDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Create lecture
        const lecture = new Lecture({
            title,
            description,
            date: lectureDate,
            startTime,
            endTime,
            teacher: req.user.userId,
            department
        });

        await lecture.save();

        res.status(201).json(lecture);
    } catch (error) {
        console.error('Error creating lecture:', error);
        res.status(500).json({ message: 'Error creating lecture', error: error.message });
    }
});

// Get all lectures for a teacher
router.get('/teacher', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const lectures = await Lecture.find({ teacher: req.user.userId })
            .sort({ date: -1, startTime: -1 });
        res.json(lectures);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all lectures for a student
router.get('/student', verifyToken, async (req, res) => {
    console.log(req.user,"req.user")
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const lectures = await Lecture.find({ userId: req.user.department })
            .sort({ date: -1, startTime: -1 });
        res.json(lectures);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get lecture by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }
        res.json(lecture);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 