import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './navBar.css'; // Import the CSS file

const NavBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activePath, setActivePath] = useState('');

    const AUTH_API_HOST: string = "http://localhost:8008";

    useEffect(() => {
        setActivePath(location.pathname);
    }, [location]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const menuButton = document.querySelector('.menu-button');
            const menuDropdown = document.querySelector('.menu-dropdown');
            const mobileMenuButton = document.querySelector('.mobile-menu-button');
            
            if (menuButton && menuDropdown && 
                !menuButton.contains(event.target as Node) && 
                !menuDropdown.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }

            if (mobileMenuButton && 
                !mobileMenuButton.contains(event.target as Node) &&
                !(event.target as Element).closest('.button-group')) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        await logoutRequest();
        localStorage.clear();
        navigate('/login');
    };

    const isStatsPage = localStorage.getItem("homePage")?.match("stats");

    const isActive = (path: string) => {
        if (path === '/lectures') {
            if (isStatsPage) {
                return location.pathname === '/dashboard';
            }
            return location.pathname === '/lectures';
        }
        return location.pathname === path;
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <button 
                    className="mobile-menu-button"
                    onClick={toggleMobileMenu}
                    aria-label="Toggle mobile menu"
                >
                    <div className={`menu-icon ${isMobileMenuOpen ? 'open' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </button>
                <div className={`button-group ${isMobileMenuOpen ? 'show' : ''}`}>
                    <button 
                        className={`navbar-button ${isActive('/lectures') ? 'active' : ''}`}
                        onClick={() => handleNavigation(isStatsPage ? '/dashboard' : '/lectures')}
                    >
                        {isStatsPage ? "Dashboard" : "Main Page"}
                    </button>

                    {localStorage.getItem("myLecturesAPI") && localStorage.getItem("myLecturesAPI") !== "" && (
                        <button 
                            className={`navbar-button ${isActive('/my-lectures') ? 'active' : ''}`}
                            onClick={() => handleNavigation('/my-lectures')}
                        >
                            My Lectures
                        </button>
                    )}

                    {isStatsPage && (
                        <>
                            <button 
                                className={`navbar-button ${isActive('/dashboard/students') ? 'active' : ''}`}
                                onClick={() => handleNavigation("/dashboard/students")}
                            >
                                Students
                            </button>
                            <button 
                                className={`navbar-button ${isActive('/dashboard/teachers') ? 'active' : ''}`}
                                onClick={() => handleNavigation("/dashboard/teachers")}
                            >
                                Teachers
                            </button>
                            <button 
                                className={`navbar-button ${isActive('/dashboard/lectures') ? 'active' : ''}`}
                                onClick={() => handleNavigation("/dashboard/lectures")}
                            >
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
                <button className="menu-button" onClick={toggleMenu} aria-label="Menu">
                    <div className={`menu-icon ${isMenuOpen ? 'open' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </button>

                <div className={`menu-dropdown ${isMenuOpen ? 'show' : ''}`}>
                    {!isStatsPage && (
                        <button 
                            className="menu-item"
                            onClick={() => {
                                navigate('/profile');
                                setIsMenuOpen(false);
                            }}
                        >
                            <span className="menu-item-icon">
                                <img src="/account_icon.svg" alt="Profile" />
                            </span>
                            <span className="menu-item-text">Profile</span>
                        </button>
                    )}
                    <button 
                        className="menu-item"
                        onClick={() => {
                            handleLogout();
                            setIsMenuOpen(false);
                        }}
                    >
                        <span className="menu-item-icon">
                            <img src="/logout_icon.svg" alt="Logout" />
                        </span>
                        <span className="menu-item-text">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
