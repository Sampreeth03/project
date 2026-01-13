// client/src/components/Auth/Login.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword, shakeElement } from '../../hooks/useAuthValidation';
import '../../styles/AuthFormStyles.css'; // Load EJS styles

const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com']; 

function Login() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
    const [clientError, setClientError] = useState('');
    const [serverError, setServerError] = useState('');
    const [capsWarning, setCapsWarning] = useState(false);
    const [emailSuggestion, setEmailSuggestion] = useState(null);
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);
    
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    // --- Validation and Button State Management ---
    useEffect(() => {
        if (step === 'credentials') {
            const emailValid = !validateEmail(formData.email.trim());
            const passValid = !validatePassword(formData.password);
            setIsButtonDisabled(!(emailValid && passValid));
            return;
        }

        // OTP step
        setIsButtonDisabled(!/^\d{4}$/.test(String(otp).trim()));
    }, [formData, otp, step]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setServerError('');
        setClientError('');

        // If user edits credentials after requesting OTP, reset OTP step.
        if (step === 'otp') {
            setStep('credentials');
            setOtp('');
        }
    };

    const handleOtpChange = (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
        setOtp(digitsOnly);
        setServerError('');
        setClientError('');
    };

    // Replicates Caps Lock Warning Handler
    const handlePasswordKeyUp = (e) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
            setCapsWarning(true);
        } else {
            setCapsWarning(false);
        }
    };
    
    // Replicates Email Suggestion Handler
    const handleEmailInput = (e) => {
        handleChange(e);
        const value = e.target.value.trim();
        const atIndex = value.indexOf('@');
        setEmailSuggestion(null);

        if (atIndex > 0 && atIndex < value.length - 1) {
            const domain = value.substring(atIndex + 1);
            const matchedDomain = commonDomains.find(d => d.startsWith(domain) && d !== domain);
            
            if (matchedDomain) {
                const username = value.substring(0, atIndex);
                setEmailSuggestion({ username, domain: matchedDomain });
            }
        }
    };
    
    const handleSuggestionClick = () => {
        if (emailSuggestion) {
            const newEmail = `${emailSuggestion.username}@${emailSuggestion.domain}`;
            setFormData(prev => ({ ...prev, email: newEmail }));
            setEmailSuggestion(null);
        }
    };
    
    // Replicates EJS Blur Validation Logic (shake/error visibility)
    const handleBlur = (e) => {
        const { name, value } = e.target;
        let msg = '';
        if (name === 'email') msg = validateEmail(value.trim());
        if (name === 'password') msg = validatePassword(value);
        
        if (msg) {
            setClientError(msg);
            shakeElement(`${name}-group`); 
        } else {
            setClientError(''); 
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // STEP 1: Continue -> request OTP
        if (step === 'credentials') {
            const emailMsg = validateEmail(formData.email.trim());
            const passMsg = validatePassword(formData.password);

            if (emailMsg || passMsg) {
                setClientError(emailMsg || passMsg);
                const targetId = emailMsg ? 'email' : 'password';
                shakeElement(`${targetId}-group`);
                document.getElementById(targetId).focus();
                return;
            }

            setServerError('');

            try {
                const response = await axios.post('/api/login/request-otp', {
                    email: formData.email,
                    password: formData.password
                });

                if (response.data.success) {
                    // Check if OTP should be skipped (for default users)
                    if (response.data.skipOtp) {
                        loginUser(response.data.user);
                        navigate(response.data.redirectPath || '/home');
                        return;
                    }
                    
                    setStep('otp');
                    setOtp('');
                    setTimeout(() => document.getElementById('otp')?.focus(), 0);
                }
            } catch (err) {
                shakeElement('login-container');
                const apiError = err.response?.data?.error;
                const status = err.response?.status;
                if (apiError) {
                    setServerError(apiError);
                } else if (!err.response) {
                    setServerError('Cannot reach backend server. Start the API on http://localhost:5000 and restart Vite.');
                } else if (status === 404) {
                    setServerError('OTP endpoint not found (404). Restart the backend server so the new /api/login/request-otp route is loaded.');
                } else {
                    setServerError('Unable to send verification code.');
                }
            }

            return;
        }

        // STEP 2: Verify OTP -> login
        const code = String(otp).trim();
        if (!/^\d{4}$/.test(code)) {
            setClientError('Verification code must be 4 digits.');
            shakeElement('otp-group');
            document.getElementById('otp')?.focus();
            return;
        }

        setServerError('');

        try {
            const response = await axios.post('/api/login/verify-otp', {
                email: formData.email,
                otp: code
            });

            if (response.data.success) {
                loginUser(response.data.user);
                navigate(response.data.redirectPath || '/home');
            }
        } catch (err) {
            shakeElement('login-container');
            setServerError(err.response?.data?.error || 'Verification failed.');
        }
    };

    return (
        <div className="login-container" id="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Login</h2>
                
                {serverError && <p className="error">{serverError}</p>}
                
                {/* Email Input Group */}
                <div className="input-group" id="email-group" 
                     onMouseEnter={() => document.getElementById('email-group').classList.add('focused')}
                     onMouseLeave={() => document.getElementById('email-group').classList.remove('focused')}>
                    <input 
                        id="email" 
                        type="email" 
                        name="email" 
                        placeholder="Email" 
                        required 
                        value={formData.email}
                        onBlur={handleBlur}
                        onChange={handleEmailInput}
                        disabled={step === 'otp'}
                        className={clientError && !formData.password ? 'input-error' : ''}
                    />
                    {/* Email Suggestion Block */}
                    {emailSuggestion && (
                        <div className="email-suggestion" onClick={handleSuggestionClick} style={{ display: 'block' }}>
                            Did you mean <strong>{emailSuggestion.username}@{emailSuggestion.domain}</strong>?
                        </div>
                    )}
                    <div id="email-error" className="field-error" style={{ display: clientError && !formData.password ? 'block' : 'none' }} aria-live="polite">
                        {clientError}
                    </div>
                </div><br/>
                
                {/* Password Input Group */}
                <div className="input-group" id="password-group"
                     onMouseEnter={() => document.getElementById('password-group').classList.add('focused')}
                     onMouseLeave={() => document.getElementById('password-group').classList.remove('focused')}>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Password"
                        required
                        value={formData.password}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        onKeyUp={handlePasswordKeyUp}
                        disabled={step === 'otp'}
                        className={clientError && formData.password ? 'input-error' : ''}
                    />
                    {/* Caps Lock Warning */}
                    {capsWarning && (
                        <span className="caps-lock-warning" id="caps-warning" style={{ display: 'block' }}>⇪ Caps</span>
                    )}
                    <span id="toggle-password-btn" className="toggle-password" onClick={() => {
                        const input = document.getElementById('password');
                        input.type = input.type === 'password' ? 'text' : 'password';
                        document.getElementById('toggle-password-btn').textContent = input.type === 'password' ? 'Show' : 'Hide';
                    }}>Show</span>
                    
                    <div id="password-error" className="field-error" style={{ display: clientError && formData.password ? 'block' : 'none' }} aria-live="polite">
                        {clientError}
                    </div>
                </div>

                {step === 'otp' && (
                    <>
                        <div className="input-group" id="otp-group"
                             onMouseEnter={() => document.getElementById('otp-group')?.classList.add('focused')}
                             onMouseLeave={() => document.getElementById('otp-group')?.classList.remove('focused')}>
                            <input
                                id="otp"
                                type="text"
                                name="otp"
                                placeholder="Enter 4-digit code"
                                value={otp}
                                onChange={handleOtpChange}
                                maxLength={4}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                required
                            />
                            <div className="field-error" style={{ display: clientError ? 'block' : 'none' }} aria-live="polite">
                                {clientError}
                            </div>
                        </div>
                    </>
                )}

                <div className="forgot-password-row">
                    <a href="/forgot-password" role="button" aria-label="Forgot your password">Forgot your password?</a>
                </div>

                <button 
                    type="submit" 
                    id="login-btn" 
                    className="login-btn" 
                    aria-disabled={isButtonDisabled} 
                    disabled={isButtonDisabled}
                >
                    {step === 'credentials'
                        ? (isButtonDisabled ? 'Enter Details' : 'Continue')
                        : (isButtonDisabled ? 'Enter Code' : 'Verify & Login')}
                </button>

                <p className="signup-text">
                    Don't have an account? <a href="/signup">Sign Up</a>
                </p>
            </form>
        </div>
    );
}
export default Login;