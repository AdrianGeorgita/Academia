# Academia

## Project Overview
This project is a Moodle-like web application designed for a single faculty, where study materials and course-related data are efficiently managed through encapsulated web services. The primary objective is to facilitate student access to course materials while ensuring proper authentication and authorization.

![dashboard](https://github.com/user-attachments/assets/e9c6912a-dc02-4fbc-a959-1abc52a1695d)



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
- ![2025-06-1323-12-32-ezgif com-optimize](https://github.com/user-attachments/assets/bca14a5f-142b-4568-be22-8052fbf7bf38) ![ezgif com-optimize (2)](https://github.com/user-attachments/assets/cfac817f-9a70-48cd-bd49-b3e844d37abc)



2. Teacher
	- Can view information about students enrolled in their courses.
	- Can manage their assigned disciplines.
	- Can view other courses without making modifications.
- ![ezgif com-optimize (3)](https://github.com/user-attachments/assets/03e486e7-7dfb-41f5-abb7-14e87c4e186e)




3. Student
	- Can manage personal information.
	- Can view details of enrolled courses only.

- ![ezgif com-optimize (4)](https://github.com/user-attachments/assets/bad9ada2-c0f0-47c5-b563-6efb4865b8fc)




## Technologies Used
- **Frontend**: React
- **Backend**: FastAPI - RESTful services, gRPC Framework
- **Database**: MariaDB, MongoDB
