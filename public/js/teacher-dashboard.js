let html5QrCode;
let currentTeacher = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user || user.role !== 'teacher') {
        window.location.href = '/index.html';
        return;
    }

    // Initialize teacher data
    currentTeacher = user;
    document.getElementById('teacherName').textContent = currentTeacher.name;

    // Initialize QR scanner
    html5QrCode = new Html5Qrcode("qrScanner");

    // Load lectures
    loadLectures();

    // Setup create lecture form
    document.getElementById('createLectureForm').addEventListener('submit', handleCreateLecture);
});

async function loadLectures() {
    try {
        const response = await fetch('/api/lectures/teacher', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to load lectures');

        const lectures = await response.json();
        displayLectures(lectures);
    } catch (error) {
        console.error('Error loading lectures:', error);
        alert('Failed to load lectures');
    }
}

function displayLectures(lectures) {
    const lecturesList = document.getElementById('lecturesList');
    if (!lecturesList) return;

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // Sort lectures by date and time
    lectures.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`);
        const dateB = new Date(`${b.date}T${b.startTime}`);
        return dateA - dateB;
    });

    // Filter lectures
    const todayLectures = lectures.filter(lecture => {
        const lectureDate = new Date(lecture.date).toISOString().split('T')[0];
        return lectureDate === today;
    });

    const pastLectures = lectures.filter(lecture => {
        const lectureDate = new Date(lecture.date).toISOString().split('T')[0];
        return lectureDate < today;
    });

    const futureLectures = lectures.filter(lecture => {
        const lectureDate = new Date(lecture.date).toISOString().split('T')[0];
        return lectureDate > today;
    });

    // Clear the lectures list
    lecturesList.innerHTML = '';

    // Display today's lectures section
    if (todayLectures.length > 0) {
        const todaySection = document.createElement('div');
        todaySection.className = 'lectures-section';
        todaySection.innerHTML = `
            <h2>Today's Lectures</h2>
            <div class="lectures-grid">
                ${todayLectures.map(lecture => {
                    const isOngoing = lecture.startTime <= currentTime && lecture.endTime >= currentTime;
                    return `
                        <div class="lecture-card ${isOngoing ? 'ongoing' : ''}">
                            <h3 class="lecture-title">${lecture.title || 'Lecture'}</h3>
                            <p class="lecture-info">Time: ${lecture.startTime} - ${lecture.endTime}</p>
                            <p class="lecture-info">Description: ${lecture.description || 'No description'}</p>
                            <div class="lecture-actions">
                                <button class="btn primary-btn" onclick="showQRScanner('${lecture._id}')">
                                    <i class="fas fa-qrcode"></i>
                                    Mark Attendance
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        lecturesList.appendChild(todaySection);
    } else {
        // Show create lecture button if no lectures for today
        const noLecturesSection = document.createElement('div');
        noLecturesSection.className = 'no-lectures-section';
        noLecturesSection.innerHTML = `
            <h2>Today's Lectures</h2>
            <p>No lectures scheduled for today</p>
            <button class="create-lecture-btn" onclick="showCreateLectureModal()">
                <i class="fas fa-plus-circle"></i>
                Create Lecture
            </button>
        `;
        lecturesList.appendChild(noLecturesSection);
    }

    // Display past lectures section if there are any
    if (pastLectures.length > 0) {
        const pastSection = document.createElement('div');
        pastSection.className = 'lectures-section';
        pastSection.innerHTML = `
            <h2>Previous Lectures</h2>
            <div class="lectures-grid">
                ${pastLectures.map(lecture => `
                    <div class="lecture-card past">
                        <h3 class="lecture-title">${lecture.title || 'Lecture'}</h3>
                        <p class="lecture-info">Date: ${new Date(lecture.date).toLocaleDateString()}</p>
                        <p class="lecture-info">Time: ${lecture.startTime} - ${lecture.endTime}</p>
                        <p class="lecture-info">Description: ${lecture.description || 'No description'}</p>
                    </div>
                `).join('')}
            </div>
        `;
        lecturesList.appendChild(pastSection);
    }

    // Display future lectures section if there are any
    if (futureLectures.length > 0) {
        const futureSection = document.createElement('div');
        futureSection.className = 'lectures-section';
        futureSection.innerHTML = `
            <h2>Upcoming Lectures</h2>
            <div class="lectures-grid">
                ${futureLectures.map(lecture => `
                    <div class="lecture-card future">
                        <h3 class="lecture-title">${lecture.title || 'Lecture'}</h3>
                        <p class="lecture-info">Date: ${new Date(lecture.date).toLocaleDateString()}</p>
                        <p class="lecture-info">Time: ${lecture.startTime} - ${lecture.endTime}</p>
                        <p class="lecture-info">Description: ${lecture.description || 'No description'}</p>
                    </div>
                `).join('')}
            </div>
        `;
        lecturesList.appendChild(futureSection);
    }
}

async function handleCreateLecture(event) {
    event.preventDefault();
    
    const title = document.getElementById('lectureTitle').value;
    const description = document.getElementById('lectureDescription').value;
    const date = document.getElementById('lectureDate').value;
    const startTime = document.getElementById('lectureStartTime').value;
    const endTime = document.getElementById('lectureEndTime').value;

    // Validate form fields
    if (!title || !description || !date || !startTime || !endTime) {
        alert('Please fill in all fields');
        return;
    }

    // Get the department from the current teacher
    const department = currentTeacher.department;
    if (!department) {
        alert('Teacher department not found. Please log in again.');
        return;
    }

    const formData = {
        title,
        description,
        date,
        startTime,
        endTime,
        department
    };

    try {
        const response = await fetch('/api/lectures', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create lecture');
        }

        alert('Lecture created successfully!');
        closeCreateLectureModal();
        
        // Reload lectures to show the newly created lecture
        await loadLectures();
        
        // Reset the form
        event.target.reset();
    } catch (error) {
        console.error('Error creating lecture:', error);
        alert(error.message || 'Failed to create lecture. Please try again.');
    }
}

function showCreateLectureModal() {
    document.getElementById('createLectureModal').style.display = 'block';
}

function closeCreateLectureModal() {
    document.getElementById('createLectureModal').style.display = 'none';
}

async function showQRScanner(lectureId) {
    const modal = document.getElementById('qrScannerModal');
    modal.style.display = 'block';

    try {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) =>onScanSuccess(decodedText, lectureId),
            onScanError
        );
    } catch (error) {
        console.error('Error starting QR scanner:', error);
        alert('Failed to start QR scanner. Please make sure you have camera permissions enabled.');
    }
}

function closeQRScannerModal() {
    const modal = document.getElementById('qrScannerModal');
    modal.style.display = 'none';
    
    // Clear the scan result
    const scanResult = document.getElementById('scanResult');
    if (scanResult) {
        scanResult.innerHTML = '';
    }
    
    // Stop the QR scanner
    html5QrCode.stop().catch(error => {
        console.error('Error stopping QR scanner:', error);
    });
}

async function onScanSuccess(decodedText, lectureId) {
    try {
        const qrData = JSON.parse(decodedText);
        console.log('Scanning QR for lecture:', lectureId); // Debug log
        
        // Create the complete QR data with lecture information
        const completeQrData = JSON.stringify({
            studentId: qrData.studentId,
            lectureId: lectureId,
            teacherId: currentTeacher.id,
            timestamp: Date.now()
        });

        const response = await fetch('/api/attendance/mark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                qrData: completeQrData,
                studentId: qrData.studentId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to mark attendance');
        }

        const result = await response.json();
        const scanResult = document.getElementById('scanResult');
        scanResult.innerHTML = `
            <p class="success">
                ${result.message || 'Attendance marked successfully!'}
            </p>
        `;

        // Stop the QR scanner
        try {
            await html5QrCode.stop();
        } catch (error) {
            console.error('Error stopping QR scanner:', error);
        }

        // Close the modal after 2 seconds
        setTimeout(() => {
            closeQRScannerModal();
        }, 2000);
    } catch (error) {
        console.error('Error marking attendance:', error);
        document.getElementById('scanResult').innerHTML = `
            <p class="error">${error.message || 'Failed to mark attendance'}</p>
        `;
    }
}

function onScanError(error) {
    // Ignore errors during scanning
    console.debug('QR Scan error:', error);
}

async function viewAttendance(lectureId) {
    try {
        const response = await fetch(`/api/attendance/teacher-report/${lectureId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to load attendance');

        const attendance = await response.json();
        displayAttendanceReport(attendance);
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Failed to load attendance report');
    }
}

function displayAttendanceReport(attendance) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Attendance Report</h2>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th>Status</th>
                        <th>Marked At</th>
                    </tr>
                </thead>
                <tbody>
                    ${attendance.map(record => `
                        <tr>
                            <td>${record.student.name}</td>
                            <td>${record.student.studentId}</td>
                            <td>${record.status}</td>
                            <td>${new Date(record.markedAt).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.body.appendChild(modal);
}

function viewLectureDetails(lectureId) {
    // Implement lecture details view
    console.log('Viewing lecture details:', lectureId);
}

function manageStudents() {
    // Implement student management view
    console.log('Opening student management');
}

function viewAllActivity() {
    // Implement view all activity
    console.log('Viewing all activity');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Attendance Report Functions
function viewAttendanceReport() {
    const modal = document.getElementById('attendanceReportModal');
    modal.style.display = 'block';
    loadAttendanceReport();
}

function closeAttendanceReportModal() {
    const modal = document.getElementById('attendanceReportModal');
    modal.style.display = 'none';
}

async function loadAttendanceReport() {
    try {
        const response = await fetch('/api/attendance/teacher-report', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load attendance report');
        }

        const data = await response.json();
        console.log(data);  
        displayAttendanceReport(data);
    } catch (error) {
        console.error('Error loading attendance report:', error);
        alert('Failed to load attendance report');
    }
}

function displayAttendanceReport(data) {
    // Update attendance table
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    if (!data.lectures || data.lectures.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">No attendance records found</td>
            </tr>
        `;
        return;
    }

    // Create table rows for each lecture's attendance
    let tableHTML = '';
    data.lectures.forEach(lectureData => {
        const lecture = lectureData.lecture;
        const lectureDate = new Date(lecture.date).toLocaleDateString();
        
        // Add lecture header row
        tableHTML += `
            <tr class="lecture-header">
                <td colspan="5" style="background-color: #f8f9fa; font-weight: 600; padding: 1rem;">
                    ${lecture.title} - ${lectureDate} (${lecture.startTime} - ${lecture.endTime})
                </td>
            </tr>
        `;

        // Add attendance rows for each student
        lectureData.attendance.forEach(record => {
            tableHTML += `
                <tr>
                    <td>${record.student.name || 'N/A'}</td>
                    <td>${record.student.studentId || 'N/A'}</td>
                    <td>${record.student.department || 'N/A'}</td>
                    <td>${record.markedAt ? new Date(record.markedAt).toLocaleString() : 'Not marked'}</td>
                    <td>
                        <span class="status-badge ${record.status === 'present' ? 'present' : 'absent'}">
                            ${record.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                    </td>
                </tr>
            `;
        });
    });

    tableBody.innerHTML = tableHTML;
}

// Add styles for status badges
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 500;
    }
    .status-badge.present {
        background-color: #d4edda;
        color: #155724;
    }
    .status-badge.absent {
        background-color: #f8d7da;
        color: #721c24;
    }
`;
document.head.appendChild(style);