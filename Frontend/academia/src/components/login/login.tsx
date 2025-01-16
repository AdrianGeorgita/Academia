import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css'; // Import the CSS file

const Login: React.FC = () => {
    const [token, setToken] = useState<string>('');
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();

    const handleLogin = () => {
        if (token.trim() === '') {
            setError('Token cannot be empty');
            return;
        }
        localStorage.setItem('authToken', token);
        setError('');
        navigate('/main');
    };

    return (
        <div className="login-container">
            <h1 className="login-title">Login</h1>
            <input
                type="text"
                className="login-input"
                placeholder="Enter your token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-button" onClick={handleLogin}>
                Login
            </button>
            <p>You can't login with Email & Password yet :(</p>
            <p>Obtain the Token by executing the grpc_client from the Auth Service in Docker (Just for a normal Student for now)</p>
            <p>You need to use a proper token!</p>
        </div>
    );
};

export default Login;
