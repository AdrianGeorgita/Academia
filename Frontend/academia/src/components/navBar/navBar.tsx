import React from 'react';
import { useNavigate } from 'react-router-dom';
import './navBar.css'; // Import the CSS file

const NavBar: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('profilePath');
        navigate('/');
    };

    const goToMainPage = () => {
        navigate('/main');
    };

    const handleProfile = () => {
        navigate('/profile');
    };

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <button className="navbar-button" onClick={goToMainPage}>
                    Main Page
                </button>
            </div>
            <div className="navbar-center">
                <h1 className="navbar-title">Academia</h1>
            </div>
            <div className="navbar-right">
                <button className="navbar-button profile-button" onClick={handleProfile}>
                    Profile
                </button>
                <button className="navbar-button logout-button" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default NavBar;
