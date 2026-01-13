// client/src/components/Recruiter/ForgotPassword.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { validateEmail, shakeElement } from '../../hooks/useAuthValidation';
import '../../styles/AuthFormStyles.css';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const emailError = validateEmail(email.trim());
        if (emailError) {
            setError(emailError);
            shakeElement('email-group');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/forgot-password', { email: email.trim() });
            
            if (response.data.success) {
                setSuccess(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
            shakeElement('login-container');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="login-container">
                <div className="success-message">
                    <h2>Check Your Email</h2>
                    <div className="success-icon">📧</div>
                    <p>
                        If an account exists with <strong>{email}</strong>, 
                        you will receive a password reset link shortly.
                    </p>
                    <p className="small-text">
                        Don't see it? Check your spam folder or try again in a few minutes.
                    </p>
                    <Link to="/login" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '20px' }}>
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container" id="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Forgot Password</h2>
                
                <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '14px' }}>
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && <p className="error">{error}</p>}

                <div className="input-group" id="email-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError('');
                        }}
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    className="login-btn"
                    disabled={loading}
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <p className="signup-text">
                    Remember your password? <Link to="/login">Sign In</Link>
                </p>
            </form>
        </div>
    );
}

export default ForgotPassword;
