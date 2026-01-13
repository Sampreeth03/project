// client/src/components/Auth/ForgotPassword.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { validateEmail, validatePassword, shakeElement } from '../../hooks/useAuthValidation';
import '../../styles/AuthFormStyles.css';

function ForgotPassword() {
    const [step, setStep] = useState('email'); // 'email' | 'otp' | 'reset'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [clientError, setClientError] = useState('');
    const [serverError, setServerError] = useState('');
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);

    const navigate = useNavigate();

    // Validation
    React.useEffect(() => {
        if (step === 'email') {
            setIsButtonDisabled(!!validateEmail(email.trim()));
        } else if (step === 'otp') {
            setIsButtonDisabled(!/^\d{4}$/.test(otp.trim()));
        } else if (step === 'reset') {
            const passValid = !validatePassword(newPassword);
            const matchValid = newPassword === confirmPassword && confirmPassword.length > 0;
            setIsButtonDisabled(!(passValid && matchValid));
        }
    }, [step, email, otp, newPassword, confirmPassword]);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        const emailMsg = validateEmail(email.trim());
        if (emailMsg) {
            setClientError(emailMsg);
            shakeElement('email-group');
            return;
        }

        setServerError('');
        setClientError('');

        try {
            const response = await axios.post('/api/forgot-password/request-otp', { email: email.trim() });
            if (response.data.success) {
                setStep('otp');
                setOtp('');
                setTimeout(() => document.getElementById('otp')?.focus(), 0);
            }
        } catch (err) {
            shakeElement('forgot-container');
            setServerError(err.response?.data?.error || 'Failed to send verification code.');
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();

        if (step === 'otp') {
            const code = otp.trim();
            if (!/^\d{4}$/.test(code)) {
                setClientError('Verification code must be 4 digits.');
                shakeElement('otp-group');
                return;
            }
            setStep('reset');
            setClientError('');
            setServerError('');
            setTimeout(() => document.getElementById('newPassword')?.focus(), 0);
            return;
        }

        // step === 'reset'
        const passMsg = validatePassword(newPassword);
        if (passMsg) {
            setClientError(passMsg);
            shakeElement('newPassword-group');
            return;
        }

        if (newPassword !== confirmPassword) {
            setClientError('Passwords do not match.');
            shakeElement('confirmPassword-group');
            return;
        }

        setServerError('');
        setClientError('');

        try {
            const response = await axios.post('/api/forgot-password/reset', {
                email: email.trim(),
                otp: otp.trim(),
                newPassword
            });

            if (response.data.success) {
                alert('Password reset successful! Please log in with your new password.');
                navigate('/login');
            }
        } catch (err) {
            shakeElement('forgot-container');
            setServerError(err.response?.data?.error || 'Password reset failed.');
        }
    };

    return (
        <div className="auth-page">
            <div className="login-container" id="forgot-container">
                <form className="login-form" onSubmit={step === 'email' ? handleEmailSubmit : handleResetSubmit}>
                    <h2>Forgot Password</h2>

                    {serverError && <p className="error">{serverError}</p>}

                    {step === 'email' && (
                        <div className="input-group" id="email-group">
                            <label htmlFor="email">Email Address:</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setServerError('');
                                    setClientError('');
                                }}
                            />
                            <div className="field-error" style={{ display: clientError ? 'block' : 'none' }}>
                                {clientError}
                            </div>
                        </div>
                    )}

                    {step === 'otp' && (
                        <div className="input-group" id="otp-group">
                            <label htmlFor="otp">Verification Code:</label>
                            <input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                name="otp"
                                placeholder="Enter 4-digit code"
                                maxLength={4}
                                required
                                value={otp}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setOtp(digits);
                                    setServerError('');
                                    setClientError('');
                                }}
                            />
                            <div className="field-error" style={{ display: clientError ? 'block' : 'none' }}>
                                {clientError}
                            </div>
                        </div>
                    )}

                    {step === 'reset' && (
                        <>
                            <div className="input-group" id="newPassword-group">
                                <label htmlFor="newPassword">New Password:</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    name="newPassword"
                                    placeholder="Enter new password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        setServerError('');
                                        setClientError('');
                                    }}
                                />
                                <div className="field-error" style={{ display: clientError && !confirmPassword ? 'block' : 'none' }}>
                                    {clientError}
                                </div>
                            </div>

                            <div className="input-group" id="confirmPassword-group">
                                <label htmlFor="confirmPassword">Confirm Password:</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Re-enter password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setServerError('');
                                        setClientError('');
                                    }}
                                />
                                <div className="field-error" style={{ display: clientError && confirmPassword ? 'block' : 'none' }}>
                                    {clientError}
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={isButtonDisabled}
                    >
                        {step === 'email'
                            ? (isButtonDisabled ? 'Enter Email' : 'Send OTP')
                            : step === 'otp'
                                ? (isButtonDisabled ? 'Enter Code' : 'Continue')
                                : (isButtonDisabled ? 'Complete Form' : 'Reset Password')}
                    </button>

                    <p className="signup-text">
                        Remember your password? <a href="/login">Sign In</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;
