import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import logo from './logo.svg';
import './App.css';

import Login from './components/login/login';
import MainPage from "./components/main/main";
import LecturePage from "./components/lecture/lecture";
import ProfilePage from "./components/profile/profile";


function App() {
  return (
      <Router>
          <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/main" element={<MainPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/lecture/:cod" element={<LecturePage />} />
          </Routes>
      </Router>
  );
}

export default App;
