# Face Recognition Attendance System

A comprehensive system for managing attendance using face recognition technology, supporting both webcam and ESP32-CAM integration.

## Project Structure

The project is organized into two main components:

- `frontend`: React-based web application
- `backend`: API server handling business logic and face recognition

## Frontend

The frontend is a React application built with Material UI that provides a user-friendly interface for managing users, attendance sessions, and viewing reports.

### Key Features

- **User Management**: Create, edit and delete users with tag-based grouping
- **Face Registration**: Register user faces through webcam or ESP32-CAM
- **Attendance Sessions**: Create and manage attendance sessions
- **Real-time Face Recognition**: Perform face recognition for attendance marking
- **Reports**: Generate and export attendance reports
- **Tag Management**: Organize users with customizable tags
- **Camera Integration**: Support for both webcam and ESP32-CAM

### Getting Started

```bash
cd frontend
npm install
npm start
```

The application will run on [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Backend

The backend provides RESTful APIs for user management, face recognition, and attendance tracking.

### Key Features

- **Face Registration & Recognition**: Advanced face detection and recognition
- **User API**: Endpoints for user management
- **Attendance API**: Session management and attendance tracking
- **Tag API**: Tag-based organization
- **ESP32 Integration**: Support for ESP32-CAM image capture

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/users/` | User management |
| `/api/attendance/` | Attendance session management |
| `/api/tags/` | Tag management |
| `/api/recognition/` | Face recognition services |
| `/api/camera/` | Camera integration services |

### Database Configuration

In `attendance_system/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'face_attendance_db',
        'USER': 'root',
        'PASSWORD': 'root',  
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

### Running the Backend

```bash
cd backend

# Set up your virtual environment
python -m venv venv  
or python -m virtualenv env
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Load dummy data
python manage.py generate_dummy_data

# Start the server
python manage.py runserver
```

The API server will run on [http://localhost:8000](http://localhost:8000).

## System Requirements

- Node.js 14+ for frontend
- Python 3.8+ for backend
- MySQL database
- Webcam or ESP32-CAM device
- Modern web browser

## License

This project is licensed under the MIT License - see the LICENSE file for details.