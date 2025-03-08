import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import logo from './logo.svg';
import './App.css';

import Login from './components/login/login';
import MainPage from "./components/main/main";
import LecturePage from "./components/lecture/lecture";
import ProfilePage from "./components/profile/profile";
import EnrolledStudents from "./components/enrolledStudents/enrolledStudents";
import AdminDashboard from "./components/dashboard/dashboard";
import Users from "./components/users/users";
import UsersList from "./components/users/users";
import UserManagementPage from "./components/userManagement/userManagement";
import {StatsProvider} from "./components/context/statsContext";
import CreatePage from "./components/createPage/createPage";
import AdminLecturesPage from "./components/admin/lectures/lectures";
import LectureManagementPage from "./components/admin/lectureManagement/lectureManagement";


function App() {
  return (
      <StatsProvider>
          <Router>
              <Routes>
                  <Route path="/lectures" element={<MainPage />} />
                  <Route path="/" element={<MainPage />} />
                  <Route path="/my-lectures" element={<MainPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/lectures/:cod" element={<LecturePage />} />
                  <Route path="/lectures/:cod/students" element={<EnrolledStudents />} />
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/dashboard/students" element={<UsersList category={"students"} />} />
                  <Route path="/dashboard/teachers" element={<UsersList category={"teachers"} />} />
                  <Route path="/dashboard/lectures" element={<AdminLecturesPage />} />
                  <Route path="/dashboard/students/:id" element={<UserManagementPage category={"students"} />} />
                  <Route path="/dashboard/teachers/:id" element={<UserManagementPage category={"teachers"} />} />
                  <Route path="/dashboard/lectures/:cod" element={<LectureManagementPage />} />
                  <Route path="/dashboard/create" element={<CreatePage />} />
              </Routes>
          </Router>
      </StatsProvider>
  );
}

export default App;
