# Student Management System

A web-based student management system that allows teachers to create lectures and mark attendance using QR codes, and students to view their attendance records.

## Features

- User Authentication (Login/Register)
- Role-based access (Teacher/Student)
- Lecture Management
- QR Code-based Attendance System
- Attendance Reports
- Responsive Design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd student-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/student-management
JWT_SECRET=your-secret-key
PORT=5000
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

1. Open your browser and navigate to `http://localhost:5000`
2. Register as either a teacher or student
3. Login with your credentials
4. Access the dashboard based on your role

### Teacher Features
- Create new lectures
- Generate QR codes for attendance
- Scan student QR codes to mark attendance
- View attendance reports for each lecture

### Student Features
- View available lectures
- Generate personal QR code for attendance
- View personal attendance report

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### Lectures
- POST `/api/lectures` - Create a new lecture
- GET `/api/lectures/teacher` - Get all lectures for teacher
- GET `/api/lectures/student` - Get all lectures for student
- GET `/api/lectures/:id` - Get lecture by ID

### Attendance
- POST `/api/attendance/mark` - Mark attendance using QR code
- GET `/api/attendance/student-report` - Get student attendance report
- GET `/api/attendance/teacher-report/:lectureId` - Get lecture attendance report
- GET `/api/attendance/student-qr` - Generate student QR code

## Technologies Used

- Frontend:
  - HTML5
  - CSS3
  - JavaScript (ES6+)
  - HTML5-QRCode library

- Backend:
  - Node.js
  - Express.js
  - MongoDB
  - JWT for authentication
  - QRCode library

## Security Features

- JWT-based authentication
- Password hashing using bcrypt
- Role-based access control
- Secure QR code generation and validation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 