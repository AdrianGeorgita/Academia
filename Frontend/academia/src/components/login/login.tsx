import React, {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css'; // Import the CSS file

interface LoginResponse {
    token: string;
    _links: {
        self: {
            href: string,
            method: string,
        },
        logout: {
            href: string,
            method: string,
        }
        home_page: {
            href: string,
            method: string,
        },
        profile_page: {
            href: string,
            method: string,
        }
    }
}

const Login: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const navigate = useNavigate();

    const loginAPI = "http://localhost:8008/api/academia/login"

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) navigate('/');
    }, []);

    const fetchToken = async () => {
        try {
            const response = await fetch(`${loginAPI}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                }),
            });
            if (!response.ok) {
                throw new Error('Invalid credentials!');
            }

            const data: LoginResponse = await response.json();
            if (!data.token.trim()) {
                throw new Error('Invalid credentials!');
            }

            setLogoutLink(data._links.logout.href);
            setTokenAndNavigate(data.token, data._links.home_page.href, data._links.profile_page.href);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError('Something went wrong. Please try again later.');
            }
        }
    };

    const setLogoutLink = (link: string) => {
        localStorage.setItem('logoutPath', link);
    }

    const setTokenAndNavigate = (token: string, mainPage: string, profilePage: string) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem("homePage", mainPage);
        localStorage.setItem("profilePath", profilePage)
        setError('');
        navigate('/lectures');
    };

    const handleLogin = async () => {
        if (!email.trim()) {
            setError('You must provide an email!');
            return;
        }
        if (!password.trim()) {
            setError('You must provide a password!');
            return;
        }

        await fetchToken();
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Welcome Back</h1>
                <p className="login-subtitle">Please enter your credentials to login</p>
                
                <div className="input-group">
                    <div className="input-icon">
                        <img src="/mail_icon.svg" alt="Email" className="icon" />
                    </div>
                    <input
                        type="text"
                        className="login-input"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                </div>

                <div className="input-group">
                    <div className="input-icon">
                        <img src="/lock_icon.svg" alt="Password" className="icon" />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        className="login-input"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button 
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                    >
                        <img 
                            src={showPassword ? "/visibility_hidden.svg" : "/visibility_visible.svg"} 
                            alt={showPassword ? "Hide password" : "Show password"} 
                            className="icon"
                        />
                    </button>
                </div>

                {error && (
                    <div className="login-error">
                        <span className="error-icon">!</span>
                        {error}
                    </div>
                )}

                <button className="login-button" onClick={handleLogin}>
                    Sign In
                </button>
            </div>
        </div>
    );
};

export default Login;
