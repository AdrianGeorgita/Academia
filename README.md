# Academia

## Project Overview
This project is a Moodle-like web application designed for a single faculty, where study materials and course-related data are efficiently managed through encapsulated web services. The primary objective is to facilitate student access to course materials while ensuring proper authentication and authorization.

![image](https://github.com/user-attachments/assets/adce0198-4d58-4eaa-9636-c34262929326)


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

![image](https://github.com/user-attachments/assets/91823a8e-acc2-498b-be34-32a8b73f348b)
![image](https://github.com/user-attachments/assets/77c18b08-bc06-4c28-b514-169976779b36)


2. LecturesWebService (MongoDB)
	- Manages lecture materials.
	- Stores and retrieves course resources.

![image](https://github.com/user-attachments/assets/fcf8be4b-2c5e-4d3c-a30a-f72604c78dd3)

3. AuthService (gRPC & MariaDB)
	- Handles authentication and identity management (IDM).
	- Ensures secure access control.

![image](https://github.com/user-attachments/assets/7bf04f2d-3b3f-4ed9-a79c-406fb10bafe1)
 

## Use Cases
1. Administrator
	- Can create new user accounts (professor or student).
	- Manages users and their course associations.
	- Cannot access other stored application data.
- ![ezgif com-resize (4)](https://github.com/user-attachments/assets/0ded8ca9-3de6-444d-ab91-8c81d5ed5079) ![ezgif com-resize (5)](https://github.com/user-attachments/assets/b9a68d2c-9796-4212-ab87-2e0b660678ac)


2. Teacher
	- Can view information about students enrolled in their courses.
	- Can manage their assigned disciplines.
	- Can view other courses without making modifications.
- ![ezgif com-resize (6)](https://github.com/user-attachments/assets/8c22db8f-55b6-4e9d-8499-c11d86381fc5)


3. Student
	- Can manage personal information.
	- Can view details of enrolled courses only.

- ![ezgif com-resize (2)](https://github.com/user-attachments/assets/8afd0799-346e-4fb1-8aa2-00ae0e55def0)


## Technologies Used
- **Frontend**: React
- **Backend**: FastAPI - RESTful services, gRPC Framework
- **Database**: MariaDB, MongoDB
