import React from 'react';
import { useNavigate } from 'react-router-dom';
import './navBar.css'; // Import the CSS file

const NavBar: React.FC = () => {
    const navigate = useNavigate();

    const AUTH_API_HOST: string = "http://localhost:8008";

    const logoutRequest = async () => {
        try {
            const logoutAPI = localStorage.getItem('logoutPath');
            const token = localStorage.getItem("authToken")
            const response = await fetch(`${AUTH_API_HOST}${logoutAPI}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to logout!');
            }

            const data: string = await response.json();
            console.log(data);
        }
        finally {

        }
    };

    const handleLogout = async() => {
        await logoutRequest()

        localStorage.clear()

        navigate('/login');
    };

    const goToMainPage = () => {
        navigate('/');
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
