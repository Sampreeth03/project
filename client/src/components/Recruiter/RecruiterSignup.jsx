// client/src/components/Recruiter/RecruiterSignup.jsx

import React, { useState, useEffect, useRef } from 'react';
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
import '../../styles/AuthFormStyles.css';
import '../../styles/RecruiterSignup.css';

const STEPS = {
    FORM: 1,
    OTP: 2,
    DOCUMENT: 3
};

function RecruiterSignup() {
    const [currentStep, setCurrentStep] = useState(STEPS.FORM);
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        confirmPassword: '',
        companyName: ''
    });
    const [otp, setOtp] = useState(['', '', '', '']);
    const [companyDocument, setCompanyDocument] = useState(null);
    const [documentPreview, setDocumentPreview] = useState(null);
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    
    const otpRefs = [useRef(), useRef(), useRef(), useRef()];
    const navigate = useNavigate();

    // Resend timer countdown
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    // Validation helpers
    const getValidationMessages = (data) => ({
        nameMsg: validateName(data.name),
        emailMsg: validateEmail(data.email.trim()),
        passMsg: validatePassword(data.password),
        confMsg: validateConfirm(data.confirmPassword, data.password)
    });

    const isFormValid = () => {
        const { nameMsg, emailMsg, passMsg, confMsg } = getValidationMessages(formData);
        return !nameMsg && !emailMsg && !passMsg && !confMsg;
    };

    // Form handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError('');
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

    // Step 1: Submit form and send OTP
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!isFormValid()) {
            setError('Please fill in all required fields correctly.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/recruiter/signup/init', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                companyName: formData.companyName
            });

            if (response.data.success) {
                setCurrentStep(STEPS.OTP);
                setResendTimer(60);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send verification code');
            shakeElement('signup-container2');
        } finally {
            setLoading(false);
        }
    };

    // OTP input handlers
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only keep last digit
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 3) {
            otpRefs[index + 1].current?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        // Handle backspace - go to previous input
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs[index - 1].current?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        const newOtp = [...otp];
        
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        
        // Focus last filled input or next empty one
        const focusIndex = Math.min(pastedData.length, 3);
        otpRefs[focusIndex]?.current?.focus();
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 4) {
            setError('Please enter the complete 4-digit code');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/recruiter/signup/verify-otp', {
                email: formData.email,
                otp: otpString
            });

            if (response.data.success) {
                setCurrentStep(STEPS.DOCUMENT);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid verification code');
            setOtp(['', '', '', '']);
            otpRefs[0].current?.focus();
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (resendTimer > 0) return;
        
        setLoading(true);
        try {
            const response = await axios.post('/api/recruiter/signup/resend-otp', {
                email: formData.email
            });

            if (response.data.success) {
                setResendTimer(60);
                setError('');
                setOtp(['', '', '', '']);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // Document upload handler
    const handleDocumentChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                setError('Please upload a PDF or image file (JPG, PNG)');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }

            setCompanyDocument(file);
            setError('');
            
            // Preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setDocumentPreview(reader.result);
                reader.readAsDataURL(file);
            } else {
                setDocumentPreview(null);
            }
        }
    };

    // Step 3: Complete signup with document
    const handleCompleteSignup = async () => {
        if (!companyDocument) {
            setError('Please upload a company verification document');
            return;
        }

        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('email', formData.email);
            formDataToSend.append('companyDocument', companyDocument);

            const response = await axios.post('/api/recruiter/signup/complete', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                navigate(response.data.redirectPath || '/recruiter-home');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to complete signup');
        } finally {
            setLoading(false);
        }
    };

    // Password strength
    const { strength: passStrength, score } = calculatePasswordStrength(formData.password);
    const passwordMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

    // Render Step 1: Basic Info Form
    const renderFormStep = () => (
        <form className="signup-form" onSubmit={handleFormSubmit}>
            <h2>Recruiter Sign Up</h2>
            
            {/* Progress Stepper */}
            <div className="signup-stepper">
                <div className="step active">
                    <span className="step-number">1</span>
                    <span className="step-label">Account Info</span>
                </div>
                <div className="step-line"></div>
                <div className="step">
                    <span className="step-number">2</span>
                    <span className="step-label">Verify Email</span>
                </div>
                <div className="step-line"></div>
                <div className="step">
                    <span className="step-number">3</span>
                    <span className="step-label">Upload Document</span>
                </div>
            </div>

            {error && <p className="error">{error}</p>}

            {/* Name Input */}
            <div className="input-group" id="name-group">
                <label htmlFor="name">Full Name *</label>
                <input 
                    id="name" 
                    type="text" 
                    name="name" 
                    placeholder="Enter your full name" 
                    required 
                    value={formData.name} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                />
            </div>
            
            {/* Email Input */}
            <div className="input-group" id="email-group">
                <label htmlFor="email">Official Email *</label>
                <input 
                    id="email" 
                    type="email" 
                    name="email" 
                    placeholder="Enter your official email" 
                    required 
                    value={formData.email} 
                    onChange={handleChange} 
                    onBlur={handleBlur} 
                />
            </div>

            {/* Company Name */}
            <div className="input-group" id="companyName-group">
                <label htmlFor="companyName">Company Name</label>
                <input 
                    id="companyName" 
                    type="text" 
                    name="companyName" 
                    placeholder="Enter your company name" 
                    value={formData.companyName} 
                    onChange={handleChange} 
                />
            </div>
            
            {/* Password Input */}
            <div className="password-group" id="password-group">
                <label htmlFor="password">Password *</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="Create a strong password" 
                    required 
                    value={formData.password} 
                    onChange={handleChange} 
                    onBlur={handleBlur}
                />
                <span className="toggle-password" onClick={() => {
                    const input = document.getElementById('password');
                    input.type = input.type === 'password' ? 'text' : 'password';
                }}>Show</span>
                
                {formData.password && (
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
            <div className="password-group" id="confirmPassword-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input 
                    type="password" 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    placeholder="Re-enter password" 
                    required 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    onBlur={handleBlur}
                />
                <span className="toggle-password" onClick={() => {
                    const input = document.getElementById('confirmPassword');
                    input.type = input.type === 'password' ? 'text' : 'password';
                }}>Show</span>
                
                {formData.confirmPassword && (
                    <div className={`password-match-indicator ${passwordMatch ? 'match' : 'no-match'}`}>
                        {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </div>
                )}
            </div>

            <button 
                type="submit" 
                className="signup-btn" 
                disabled={!isFormValid() || loading}
            >
                {loading ? 'Sending Code...' : 'Continue'}
            </button>
            
            <p className="signin-text">
                Already have an account? <Link to="/login">Sign In</Link>
            </p>
        </form>
    );

    // Render Step 2: OTP Verification
    const renderOtpStep = () => (
        <div className="otp-verification">
            <h2>Verify Your Email</h2>
            
            {/* Progress Stepper */}
            <div className="signup-stepper">
                <div className="step completed">
                    <span className="step-number">✓</span>
                    <span className="step-label">Account Info</span>
                </div>
                <div className="step-line active"></div>
                <div className="step active">
                    <span className="step-number">2</span>
                    <span className="step-label">Verify Email</span>
                </div>
                <div className="step-line"></div>
                <div className="step">
                    <span className="step-number">3</span>
                    <span className="step-label">Upload Document</span>
                </div>
            </div>

            <p className="otp-message">
                We've sent a 4-digit verification code to<br />
                <strong>{formData.email}</strong>
            </p>

            {error && <p className="error">{error}</p>}

            <div className="otp-inputs" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={otpRefs[index]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="otp-input"
                        autoFocus={index === 0}
                    />
                ))}
            </div>

            <button 
                className="signup-btn" 
                onClick={handleVerifyOTP}
                disabled={otp.join('').length !== 4 || loading}
            >
                {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="resend-section">
                <p>Didn't receive the code?</p>
                <button 
                    className="resend-btn"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || loading}
                >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
            </div>

            <button 
                className="back-btn"
                onClick={() => setCurrentStep(STEPS.FORM)}
            >
                ← Back to form
            </button>
        </div>
    );

    // Render Step 3: Document Upload
    const renderDocumentStep = () => (
        <div className="document-upload">
            <h2>Upload Company Document</h2>
            
            {/* Progress Stepper */}
            <div className="signup-stepper">
                <div className="step completed">
                    <span className="step-number">✓</span>
                    <span className="step-label">Account Info</span>
                </div>
                <div className="step-line active"></div>
                <div className="step completed">
                    <span className="step-number">✓</span>
                    <span className="step-label">Verify Email</span>
                </div>
                <div className="step-line active"></div>
                <div className="step active">
                    <span className="step-number">3</span>
                    <span className="step-label">Upload Document</span>
                </div>
            </div>

            <p className="document-message">
                To verify your recruiter status, please upload a company-related document such as:
            </p>
            <ul className="document-list">
                <li>Company ID Card</li>
                <li>Authorization Letter</li>
                <li>Official Company Letterhead</li>
                <li>Business Card with Company Details</li>
            </ul>

            {error && <p className="error">{error}</p>}

            <div className="file-upload-area">
                <label className="file-label">Company Document:</label>
                <input
                    type="file"
                    id="companyDocument"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentChange}
                />
                {companyDocument && (
                    <p className="file-selected-name">Selected: {companyDocument.name}</p>
                )}
                {documentPreview && (
                    <div className="document-preview">
                        <img src={documentPreview} alt="Document preview" />
                    </div>
                )}
            </div>

            <button 
                className="signup-btn" 
                onClick={handleCompleteSignup}
                disabled={!companyDocument || loading}
            >
                {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
        </div>
    );

    return (
        <div className="signup-container2" id="signup-container2">
            {currentStep === STEPS.FORM && renderFormStep()}
            {currentStep === STEPS.OTP && renderOtpStep()}
            {currentStep === STEPS.DOCUMENT && renderDocumentStep()}
        </div>
    );
}

export default RecruiterSignup;
