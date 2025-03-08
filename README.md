# Academia

## Project Overview
This project is a Moodle-like web application designed for a single faculty, where study materials and course-related data are efficiently managed through encapsulated web services. The primary objective is to facilitate student access to course materials while ensuring proper authentication and authorization.

## Features & Requirements
1. The application is designed for a single faculty.
2. User accounts (students and teachers) are created and managed by an administrator.
3. Each teacher can:
	- Be assigned to multiple disciplines.
	- Fully manage their own courses.
	- View information about other courses.
4. Each student:
	- Can be enrolled in multiple disciplines.
	- Can only access courses they are registered for.

## System Architecture
The application consists of three RESTful web services:
1. StudyWebService (MariaDB)
	- Stores data related to students, teachers, and lectures.
	- Handles user and course associations.
2. LecturesWebService (MongoDB)
	- Manages lecture materials.
	- Stores and retrieves course resources.
3. AuthService (gRPC & MariaDB)
	- Handles authentication and identity management (IDM).
	- Ensures secure access control.

## Use Cases
1. Administrator
	- Can create new user accounts (professor or student).
	- Manages users and their course associations.
	- Cannot access other stored application data.
2. Teacher
	- Can view information about students enrolled in their courses.
	- Can manage their assigned disciplines.
	- Can view other courses without making modifications.
3. Student
	- Can manage personal information.
	- Can view details of enrolled courses only.

## Technologies Used
- **Frontend**: React
- **Backend**: FastAPI - RESTful services, gRPC Framework
- **Database**: MariaDB, MongoDB
