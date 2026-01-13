// client/src/components/Recruiter/ResetPassword.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
    validatePassword, 
    validateConfirm, 
    calculatePasswordStrength,
    shakeElement 
} from '../../hooks/useAuthValidation';
import '../../styles/AuthFormStyles.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [success, setSuccess] = useState(false);

    const email = searchParams.get('email');
    const token = searchParams.get('token');

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            if (!email || !token) {
                setError('Invalid reset link. Please request a new one.');
                setValidating(false);
                return;
            }

            try {
                const response = await axios.post('/api/verify-reset-token', { email, token });
                if (response.data.success) {
                    setTokenValid(true);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'This reset link is invalid or has expired.');
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [email, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const passError = validatePassword(password);
        if (passError) {
            setError(passError);
            shakeElement('password-group');
            return;
        }

        const confirmError = validateConfirm(confirmPassword, password);
        if (confirmError) {
            setError(confirmError);
            shakeElement('confirm-group');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/reset-password', {
                email,
                token,
                password,
                confirmPassword
            });

            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
            shakeElement('login-container');
        } finally {
            setLoading(false);
        }
    };

    // Password strength
    const { strength: passStrength, score } = calculatePasswordStrength(password);
    const passwordMatch = confirmPassword && password === confirmPassword;

    // Loading state
    if (validating) {
        return (
            <div className="login-container">
                <div className="loading-state">
                    <h2>Validating Link...</h2>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    // Invalid token state
    if (!tokenValid && !success) {
        return (
            <div className="login-container">
                <div className="error-state">
                    <h2>Invalid Reset Link</h2>
                    <p className="error">{error}</p>
                    <Link to="/forgot-password" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '20px' }}>
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="login-container">
                <div className="success-message">
                    <h2>Password Reset Successfully</h2>
                    <div className="success-icon">✓</div>
                    <p>Your password has been updated. Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container" id="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Reset Password</h2>
                
                <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '14px' }}>
                    Enter your new password below.
                </p>

                {error && <p className="error">{error}</p>}

                {/* New Password */}
                <div className="password-group" id="password-group">
                    <label htmlFor="password">New Password</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        required
                    />
                    <span className="toggle-password" onClick={() => {
                        const input = document.getElementById('password');
                        input.type = input.type === 'password' ? 'text' : 'password';
                    }}>Show</span>
                    
                    {password && (
                        <div className="password-strength-container">
                            <div className="password-strength-bar">
                                <div className={`password-strength-fill ${passStrength}`} style={{ width: `${(score / 6) * 100}%` }}></div>
                            </div>
                            <div className={`password-strength-text ${passStrength}`}>
                                {passStrength === 'weak' ? 'Weak password' : passStrength === 'medium' ? 'Medium strength' : 'Strong password'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="password-group" id="confirm-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError('');
                        }}
                        required
                    />
                    <span className="toggle-password" onClick={() => {
                        const input = document.getElementById('confirmPassword');
                        input.type = input.type === 'password' ? 'text' : 'password';
                    }}>Show</span>
                    
                    {confirmPassword && (
                        <div className={`password-match-indicator ${passwordMatch ? 'match' : 'no-match'}`}>
                            {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </div>
                    )}
                </div>

                <button 
                    type="submit" 
                    className="login-btn"
                    disabled={loading || !password || !confirmPassword || !passwordMatch}
                >
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>

                <p className="signup-text">
                    Remember your password? <Link to="/login">Sign In</Link>
                </p>
            </form>
        </div>
    );
}

export default ResetPassword;
