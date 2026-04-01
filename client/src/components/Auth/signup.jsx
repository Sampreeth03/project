// client/src/components/Auth/Signup.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { 
    validateName, 
    validateEmail, 
    validatePassword, 
    validateConfirm, 
    calculatePasswordStrength,
    shakeElement 
} from '../../hooks/useAuthValidation';
import '../../styles/AuthFormStyles.css'; // Load EJS styles

const totalFields = 7; // Name, Email, Password, Confirm, About, Skills, Interests

function Signup() {
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        confirmPassword: '',
        about: '',
        skills: '',
        interests: '',
        profilePic: null,
        resume: null
    });
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('form'); // 'form' | 'otp' | 'authenticator'
    const [twoFactorSetup, setTwoFactorSetup] = useState(null);
    const [authenticatorCode, setAuthenticatorCode] = useState('');
    const [clientError, setClientError] = useState('');
    const [serverError, setServerError] = useState('');
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);
    const [progress, setProgress] = useState(0);
    const [resendCooldown, setResendCooldown] = useState(0);
    
    const navigate = useNavigate();
    const isRecruiterSignup = window.location.pathname.includes('signupforrec');

    // --- Validation and State Management ---
    const getValidationMessages = (data) => ({
        nameMsg: validateName(data.name),
        emailMsg: validateEmail(data.email.trim()),
        passMsg: validatePassword(data.password),
        confMsg: validateConfirm(data.confirmPassword, data.password)
    });
    
    // Replicates EJS progress bar and button state logic
    const updateProgressAndButton = (data) => {
        const { nameMsg, emailMsg, passMsg, confMsg } = getValidationMessages(data);
        
        let completed = 0;
        if (!nameMsg && data.name.trim()) completed++;
        if (!emailMsg && data.email.trim()) completed++;
        if (!passMsg && data.password) completed++;
        if (!confMsg && data.confirmPassword && data.password) completed++;
        if (data.about && data.about.trim()) completed++;
        if (data.skills && data.skills.trim()) completed++;
        if (data.interests && data.interests.trim()) completed++;

        setProgress(completed);
        
        const isFormValid = !nameMsg && !emailMsg && !passMsg && !confMsg;
        
        if (step === 'form') {
            setIsButtonDisabled(!isFormValid);
        } else if (step === 'otp') {
            // OTP step - enable button if 4 digits
            setIsButtonDisabled(!/^\d{4}$/.test(String(otp).trim()));
        } else {
            setIsButtonDisabled(!/^\d{6}$/.test(String(authenticatorCode).trim()));
        }
        
        return isFormValid;
    };

    useEffect(() => {
        updateProgressAndButton(formData);
    }, [formData, otp, step, authenticatorCode]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setFormData({ ...formData, [name]: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
        setServerError('');
        setClientError('');
    };

    const handleOtpChange = (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
        setOtp(digitsOnly);
        setServerError('');
        setClientError('');
    };

    const handleAuthenticatorCodeChange = (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
        setAuthenticatorCode(digitsOnly);
        setServerError('');
        setClientError('');
    };
    
    const handleBlur = (e) => {
        const { name, value } = e.target;
        let msg = '';
        if (name === 'name') msg = validateName(value);
        if (name === 'email') msg = validateEmail(value.trim());
        if (name === 'password') msg = validatePassword(value);
        if (name === 'confirmPassword') msg = validateConfirm(value, formData.password);
        
        if (msg) shakeElement(`${name}-group`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        
        // STEP 1: Form submission - send OTP
        if (step === 'form') {
            const { nameMsg, emailMsg, passMsg, confMsg } = getValidationMessages(formData);

            if (nameMsg || emailMsg || passMsg || confMsg) {
                setClientError("Please correct the invalid fields.");
                const msgMap = { name: nameMsg, email: emailMsg, password: passMsg, confirmPassword: confMsg };
                const firstInvalid = Object.keys(msgMap).find(key => msgMap[key]);
                
                if (firstInvalid) {
                    shakeElement(`${firstInvalid}-group`);
                    document.getElementById(firstInvalid).focus();
                }
                return;
            }

            // Create FormData for file uploads
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('password', formData.password);
            formDataToSend.append('confirmPassword', formData.confirmPassword);
            formDataToSend.append('about', formData.about || '');
            formDataToSend.append('skills', formData.skills || '');
            formDataToSend.append('interests', formData.interests || '');
            
            if (formData.profilePic) {
                formDataToSend.append('picture', formData.profilePic);
            }
            if (formData.resume) {
                formDataToSend.append('resume', formData.resume);
            }
            
            try {
                const response = await axios.post('/api/signup/init', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (response.data.success) {
                    setStep('otp');
                    setOtp('');
                    setResendCooldown(60);
                    setTimeout(() => document.getElementById('otp')?.focus(), 0);
                }
            } catch (err) {
                shakeElement('signup-container2'); 
                const status = err.response?.status;
                if (status === 429) {
                    setServerError(err.response?.data?.error || 'Please wait before requesting another code.');
                } else {
                    setServerError(err.response?.data?.error || 'Failed to send verification code.');
                }
            }
            return;
        }

        if (step === 'authenticator') {
            const code = String(authenticatorCode).trim();
            if (!/^\d{6}$/.test(code)) {
                setClientError('Authentication code must be 6 digits.');
                shakeElement('authenticator-code-group');
                document.getElementById('authenticator-code')?.focus();
                return;
            }

            try {
                const response = await axios.post('/api/signup/verify-authenticator', {
                    email: formData.email,
                    code
                });

                if (response.data.success) {
                    navigate('/login');
                }
            } catch (err) {
                shakeElement('authenticator-code-group');
                setServerError(err.response?.data?.error || 'Authenticator verification failed.');
            }
            return;
        }

        // STEP 2: OTP verification - complete signup and return authenticator setup
        const code = String(otp).trim();
        if (!/^\d{4}$/.test(code)) {
            setClientError('Verification code must be 4 digits.');
            shakeElement('otp-group');
            document.getElementById('otp')?.focus();
            return;
        }

        try {
            const response = await axios.post('/api/signup/verify-otp', {
                email: formData.email,
                otp: code
            });

            if (response.data.success) {
                setTwoFactorSetup(response.data.twoFactorSetup || null);
                setStep('authenticator');
                setAuthenticatorCode('');
            }
        } catch (err) {
            shakeElement('otp-group');
            setServerError(err.response?.data?.error || 'Verification failed.');
        }
    };

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;
        
        try {
            const response = await axios.post('/api/signup/resend-otp', {
                email: formData.email
            });

            if (response.data.success) {
                setResendCooldown(60);
                setServerError('');
                setClientError('');
            }
        } catch (err) {
            if (err.response?.status === 429) {
                setServerError(err.response?.data?.error || 'Please wait before requesting another code.');
            } else if (err.response?.status === 404) {
                // Session expired, go back to form
                setServerError('Session expired. Please fill in the form again.');
                setStep('form');
            } else {
                setServerError(err.response?.data?.error || 'Failed to resend code.');
            }
        }
    };

    const handleBackToForm = () => {
        setStep('form');
        setOtp('');
        setServerError('');
        setClientError('');
    };

    // --- Render Helpers ---
    const { strength: passStrength, score } = calculatePasswordStrength(formData.password);
    const passwordMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

    return (
        <div className="signup-container2" id="signup-container2">
            <form className="signup-form" onSubmit={handleSubmit}>
                <h2>{isRecruiterSignup ? 'Recruiter Sign Up' : 'Student Sign Up'}</h2>

                {serverError && <p className="error">{serverError}</p>}
                
                {/* Form Progress Indicator */}
                <div className="form-progress">
                    <div className="progress-text">
                        <span id="progress-text">Step <span id="progress-count">{progress}</span> of {totalFields} completed</span>
                    </div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" id="progress-bar" style={{ width: `${(progress / totalFields) * 100}%` }}></div>
                    </div>
                </div>

                <div id="signup-summary" className="field-error" style={{ display: clientError ? 'block' : 'none' }} aria-live="polite">{clientError}</div>

                {/* Name Input */}
                <div className="input-group" id="name-group" onMouseEnter={(e) => e.currentTarget.classList.add('focused')} onMouseLeave={(e) => e.currentTarget.classList.remove('focused')}>
                    <label htmlFor="name">Name:</label>
                    <input id="name" type="text" name="name" placeholder="Enter your name" required value={formData.name} onChange={handleChange} onBlur={handleBlur} disabled={step !== 'form'} />
                    <div id="name-error" className="field-error"></div>
                </div>
                
                {/* Email Input */}
                <div className="input-group" id="email-group" onMouseEnter={(e) => e.currentTarget.classList.add('focused')} onMouseLeave={(e) => e.currentTarget.classList.remove('focused')}>
                    <label htmlFor="email">Email:</label>
                    <input id="email" type="email" name="email" placeholder="Enter your email" required value={formData.email} onChange={handleChange} onBlur={handleBlur} disabled={step !== 'form'} />
                    <div id="email-error" className="field-error"></div>
                </div>
                
                {/* Password Input */}
                <div className="password-group" id="password-group" onMouseEnter={(e) => e.currentTarget.classList.add('focused')} onMouseLeave={(e) => e.currentTarget.classList.remove('focused')}>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" placeholder="Enter password" required value={formData.password} onChange={handleChange} onBlur={handleBlur} disabled={step !== 'form'} />
                    <span id="toggle-password-btn" className="toggle-password" onClick={() => {
                        const input = document.getElementById('password');
                        input.type = input.type === 'password' ? 'text' : 'password';
                        document.getElementById('toggle-password-btn').textContent = input.type === 'password' ? 'Show' : 'Hide';
                    }}>Show</span>
                    <div id="password-error" className="field-error"></div>
                    
                    {/* Password Strength Meter */}
                    <div className="password-strength-container" id="password-strength-container" style={{ display: formData.password && step === 'form' ? 'block' : 'none' }}>
                        <div className="password-strength-bar">
                            <div className={`password-strength-fill ${passStrength}`} id="password-strength-fill" style={{ width: `${(score / 6) * 100}%` }}></div>
                        </div>
                        <div className={`password-strength-text ${passStrength}`} id="password-strength-text">{passStrength === 'weak' ? 'Weak password' : passStrength === 'medium' ? 'Medium strength' : 'Strong password'}</div>
                    </div>
                </div>
                
                {/* Confirm Password Input */}
                <div className="password-group" id="confirm-group" onMouseEnter={(e) => e.currentTarget.classList.add('focused')} onMouseLeave={(e) => e.currentTarget.classList.remove('focused')}>
                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Re-enter password" required value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} disabled={step !== 'form'} />
                    <span id="toggle-confirm-btn" className="toggle-password" onClick={() => {
                        const input = document.getElementById('confirmPassword');
                        input.type = input.type === 'password' ? 'text' : 'password';
                        document.getElementById('toggle-confirm-btn').textContent = input.type === 'password' ? 'Show' : 'Hide';
                    }}>Show</span>
                    <div id="confirm-error" className="field-error"></div>
                    
                    {/* Password Match Indicator */}
                    <div 
                        className={`password-match-indicator ${formData.confirmPassword && (passwordMatch ? 'match' : 'no-match')}`}
                        id="password-match-indicator"
                        style={{ display: formData.confirmPassword ? 'block' : 'none' }}
                    >
                        {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </div>
                </div>

                {/* Profile Setup Fields */}
                <div className="input-group" id="about-group">
                    <label htmlFor="about">About Me (optional):</label>
                    <textarea 
                        id="about" 
                        name="about" 
                        placeholder="Tell us about yourself" 
                        value={formData.about} 
                        onChange={handleChange}
                        rows="3"
                    />
                </div>
                
                <div className="input-group" id="skills-group">
                    <label htmlFor="skills">Skills (optional):</label>
                    <input 
                        id="skills" 
                        type="text" 
                        name="skills" 
                        placeholder="e.g., JavaScript, Python, React" 
                        value={formData.skills} 
                        onChange={handleChange}
                    />
                </div>
                
                <div className="input-group" id="interests-group">
                    <label htmlFor="interests">Interests (optional):</label>
                    <input 
                        id="interests" 
                        type="text" 
                        name="interests" 
                        placeholder="e.g., AI, Web Development, Blockchain" 
                        value={formData.interests} 
                        onChange={handleChange}
                    />
                </div>
                
                <div className="file-group">
                    <label htmlFor="profilePic">Profile Picture (optional):</label>
                    <input 
                        type="file" 
                        id="profilePic" 
                        name="profilePic" 
                        accept="image/*"
                        onChange={handleChange}
                    />
                </div>
                
                <div className="file-group">
                    <label htmlFor="resume">Resume PDF (optional):</label>
                    <input 
                        type="file" 
                        id="resume" 
                        name="resume" 
                        accept=".pdf"
                        onChange={handleChange}
                    />
                </div>

                {isRecruiterSignup && (
                    <div className="file-group">
                        <label htmlFor="objectFile">Upload Verification:</label>
                        <input type="file" id="objectFile" name="objectFile" onChange={handleChange} />
                    </div>
                )}

                {/* OTP Input - shown after form submission */}
                {step === 'otp' && (
                    <div className="otp-section">
                        <div className="otp-info">
                            <p>We've sent a 4-digit verification code to <strong>{formData.email}</strong></p>
                            <button 
                                type="button" 
                                className="back-link"
                                onClick={handleBackToForm}
                            >
                                ← Change email
                            </button>
                        </div>
                        <div className="input-group" id="otp-group">
                            <label htmlFor="otp">Verification Code:</label>
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
                        </div>
                        <div className="resend-section">
                            {resendCooldown > 0 ? (
                                <span className="resend-cooldown">Resend code in {resendCooldown}s</span>
                            ) : (
                                <button 
                                    type="button" 
                                    className="resend-btn"
                                    onClick={handleResendOTP}
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {step === 'authenticator' && twoFactorSetup && (
                    <div className="otp-section">
                        <div className="otp-info">
                            <p>Final step: scan this QR code in Google Authenticator (or any TOTP app).</p>
                        </div>
                        <div className="input-group" style={{ alignItems: 'center' }}>
                            <img src={twoFactorSetup.qrCodeUrl} alt="Authenticator QR code" style={{ width: 220, height: 220, borderRadius: 8 }} />
                        </div>
                        <div className="input-group">
                            <label>Manual setup key:</label>
                            <input type="text" value={twoFactorSetup.secret || ''} readOnly />
                        </div>
                        <div className="input-group" id="authenticator-code-group">
                            <label htmlFor="authenticator-code">Enter 6-digit authenticator code:</label>
                            <input
                                id="authenticator-code"
                                type="text"
                                placeholder="Enter code from app"
                                value={authenticatorCode}
                                onChange={handleAuthenticatorCodeChange}
                                maxLength={6}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                            />
                        </div>
                    </div>
                )}

                {
                    <button 
                        type="submit" 
                        id="signup-btn" 
                        className="signup-btn" 
                        aria-disabled={isButtonDisabled} 
                        disabled={isButtonDisabled}
                    >
                        {step === 'form' 
                            ? (isButtonDisabled ? 'Please complete form' : 'Continue')
                            : step === 'otp'
                                ? (isButtonDisabled ? 'Enter Code' : 'Verify & Create Account')
                                : (isButtonDisabled ? 'Enter Authenticator Code' : 'Verify Authenticator & Continue')
                        }
                    </button>
                }
                
                <p className="signin-text">
                    Already have an account? <Link to="/login">Sign In</Link>
                </p>
            </form>
        </div>
    );
}
export default Signup;