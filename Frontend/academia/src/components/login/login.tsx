import React, { useState } from 'react';
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
    const navigate = useNavigate();

    const loginAPI = "http://localhost:8008/api/academia/login"

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

    return (
        <div className="login-container">
            <h1 className="login-title">Login</h1>
            <input
                type="text"
                className="login-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-button" onClick={handleLogin}>
                Login
            </button>
        </div>
    );
};

export default Login;
