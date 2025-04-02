document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user || user.role !== 'student') {
        window.location.href = '/index.html';
        return;
    }

    // Set student name in header
    document.getElementById('studentName').textContent = user.name;

    // Update profile information
    updateProfileInfo(user);
    // Setup tab switching
    setupTabs();

    // Load lectures
    loadLectures(user?.department);

    // Load attendance data
    loadAttendanceData();
});

function updateProfileInfo(user) {
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileStudentId').textContent = user.studentId || 'N/A';
    document.getElementById('profileDepartment').textContent = user.department || 'N/A';
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if(tab === "attendance"){
                viewAttendance();
            }
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show corresponding content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tab}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

async function loadLectures(department) {
    try {
        const response = await fetch('/api/lectures/student', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
           
        });

        if (!response.ok) throw new Error('Failed to load lectures');

        const lectures = await response.json();
        console.log(lectures,"lectures")
        // Store lectures in localStorage for access from other places
        localStorage.setItem('studentLectures', JSON.stringify(lectures));
        displayLectures(lectures);
    } catch (error) {
        console.error('Error loading lectures:', error);
        alert('Failed to load lectures');
    }
}

function displayLectures(lectures) {
    const lecturesList = document.getElementById('lecturesList');
    const todayClasses = document.getElementById('todayClasses');
    if (!lecturesList) return;
    // Count today's lectures
    const todayLectureDate = new Date().toISOString().split('T')[0];
    // Filter lectures for today and count them
    const todayLectureCount = lectures.filter(lecture => {
        const lectureDate = new Date(lecture.date).toISOString().split('T')[0];
        return lectureDate === todayLectureDate;
    }).length;
    todayClasses.innerHTML = todayLectureCount;
    // Sort lectures by date and time
    lectures.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`);
        const dateB = new Date(`${b.date}T${b.startTime}`);
        return dateA - dateB;
    });

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // Display all lectures
    if (lectures.length > 0) {
        lecturesList.innerHTML = lectures.map(lecture => {
            const isToday = lecture.date === today;
            const isOngoing = isToday && 
                             lecture.startTime <= currentTime && 
                             lecture.endTime >= currentTime;
            
            return `
                <div class="lecture-card ${isOngoing ? 'ongoing' : ''}">
                    <h3 class="lecture-title">${lecture.title || 'Lecture'}</h3>
                    <p class="lecture-info">Date: ${new Date(lecture.date).toLocaleDateString()}</p>
                    <p class="lecture-info">Time: ${lecture.startTime} - ${lecture.endTime}</p>
                    <p class="lecture-info">Teacher: ${lecture.teacher?.name || 'Not specified'}</p>
                    <div class="lecture-actions">
                        ${isOngoing ? `
                            <button class="btn primary-btn" onclick="showQRCode()">
                                <i class="fas fa-qrcode"></i>
                                Show QR Code
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        lecturesList.innerHTML = '<p class="no-lectures">No lectures scheduled</p>';
    }
}

async function loadAttendanceData() {
    try {
        const response = await fetch('/api/attendance/student-report', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to load attendance');

        const attendance = await response.json();
        
        updateAttendanceSummary(attendance);
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Failed to load attendance data');
    }
}

function updateAttendanceSummary(attendance) {
    const total = attendance.length;
    const present = attendance.filter(record => record.status === 'present').length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    const lectures = JSON.parse(localStorage.getItem('studentLectures'));
    const absentCount = document.getElementById('absentCount');
    // absenttext.textContent = lectures.length-attendance.length;
    // Get total lectures count from todayClasses element
    const totalLectures = parseInt(document.getElementById('todayClasses').textContent) || 0;
    console.log(lectures.length-attendance.length,"absent count")
    // Calculate absent count as difference between total lectures and attendance records
    const actualAbsent = totalLectures - attendance.length;

    document.getElementById('presentCount').textContent = present;
    document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
    absentCount.textContent = lectures.length-attendance.length;
}

async function showQRCode() {
    try {
        const response = await fetch('/api/attendance/student-qr', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to generate QR code');

        const data = await response.json();
        const modal = document.getElementById('qrCodeModal');
        const qrCodeElement = document.getElementById('qrCode');
        
        // Get user data from localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Create QR code with student information
        qrCodeElement.innerHTML = `
            <img src="${data.qrCode}" alt="Student QR Code">
            
           
        `;
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error generating QR code:', error);
        alert('Failed to generate QR code. Please try again.');
    }
}

function closeQRCodeModal() {
    document.getElementById('qrCodeModal').style.display = 'none';
}

async function viewAttendance() {
    try {
        const response = await fetch('/api/attendance/student-report', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load attendance');
        }
        const attendance = await response.json();
        const totalLectures = parseInt(document.getElementById('presentCount').textContent) || 0;
        console.log(totalLectures,"total lectures")
        const actualAbsent = totalLectures - attendance.length;
        const lectures = JSON.parse(localStorage.getItem('studentLectures'));
        const absentCount = document.getElementById('absentCount');
        absentCount.textContent = lectures.length-attendance.length;


        console.log(actualAbsent,"actual absent")
        console.log(attendance,"attenedance response")
        if (!attendance || attendance.length === 0) {
            document.getElementById('attendanceTableBody').innerHTML = `
                <tr>
                    <td colspan="4" class="no-data">No attendance records found</td>
                </tr>
            `;
        } else {
            displayAttendanceReport(attendance);
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        document.getElementById('attendanceTableBody').innerHTML = `
            <tr>
                <td colspan="4" class="error-message">${error.message}</td>
            </tr>
        `;
    }
}

function displayAttendanceReport(attendance) {
    const modal = document.getElementById('attendanceReportModal');
    const tableBody = document.getElementById('attendanceTableBody');
    
    // Calculate attendance statistics
    const total = attendance.length;
    const present = attendance.filter(record => record.status === 'present').length;
    const absent = total - present;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    // Update summary cards
    document.getElementById('presentCount').textContent = present;
    // document.getElementById('absentCount').textContent = absent;
    document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
    
    // Update attendance table
    tableBody.innerHTML = attendance.map(record => `
        <tr>
            <td>${record.lecture?.title || 'N/A'}</td>
            <td>${new Date(record.lecture?.date || record.markedAt).toLocaleDateString()}</td>
            <td>
                <span class="status-badge ${record.status}">
                    ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </span>
            </td>
            <td>${new Date(record.markedAt).toLocaleString()}</td>
        </tr>
    `).join('');

    // modal.style.display = 'block';
}

function closeAttendanceReportModal() {
    document.getElementById('attendanceReportModal').style.display = 'none';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove the toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Update the attendance marking success handler
function handleAttendanceSuccess(response) {
    if (response.message === 'Attendance already marked') {
        showToast('Attendance already marked for this lecture', 'info');
    } else {
        showToast('Attendance marked successfully!');
    }
    // Close the QR scanner modal
    const qrScannerModal = document.getElementById('qrScannerModal');
    if (qrScannerModal) {
        qrScannerModal.style.display = 'none';
    }
} 