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
        catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const handleLogout = async () => {
        await logoutRequest()

        localStorage.clear()

        navigate('/login');
    };

    const goToMainPage = () => {
        navigate('/lectures');
    };

    const handleProfile = () => {
        navigate('/profile');
    };

    const isStatsPage = localStorage.getItem("homePage")?.match("stats");

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <div className="button-group">
                    <button className="navbar-button" onClick={goToMainPage}>
                        {isStatsPage ? "Dashboard" : "Main Page"}
                    </button>

                    {localStorage.getItem("myLecturesAPI") && localStorage.getItem("myLecturesAPI") !== "" && (
                        <button className="navbar-button"
                                onClick={() => {
                                    navigate(`/my-lectures`);
                                    window.location.reload()
                                }}>My Lectures</button>
                    )}

                    {isStatsPage && (
                        <>
                            <button className="navbar-button" onClick={() => navigate("/dashboard/students")}>
                                Students
                            </button>
                            <button className="navbar-button" onClick={() => navigate("/dashboard/teachers")}>
                                Teachers
                            </button>
                            <button className="navbar-button" onClick={() => navigate("/dashboard/lectures")}>
                                Lectures
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="navbar-center">
                <h1 className="navbar-title">Academia</h1>
            </div>
            <div className="navbar-right">
                <div className="button-group">
                    {!isStatsPage && (
                        <button className="navbar-button profile-button" onClick={handleProfile}>
                            Profile
                        </button>
                    )}
                    <button className="navbar-button logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
