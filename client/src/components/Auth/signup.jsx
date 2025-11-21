// client/src/components/Auth/Signup.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    validateName, 
    validateEmail, 
    validatePassword, 
    validateConfirm, 
    calculatePasswordStrength,
    shakeElement 
} from '../../hooks/useAuthValidation';
import '../../styles/AuthFormStyles.css'; // Load EJS styles

const totalFields = 4; // Name, Email, Password, Confirm

function Signup() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [clientError, setClientError] = useState('');
    const [serverError, setServerError] = useState('');
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);
    const [progress, setProgress] = useState(0);
    
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

        setProgress(completed);
        
        const isFormValid = !nameMsg && !emailMsg && !passMsg && !confMsg;
        setIsButtonDisabled(!isFormValid);
        
        return isFormValid;
    };

    useEffect(() => {
        updateProgressAndButton(formData);
    }, [formData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
        
        const { nameMsg, emailMsg, passMsg, confMsg } = getValidationMessages(formData);

        if (nameMsg || emailMsg || passMsg || confMsg) {
            setClientError("Please correct the invalid fields.");
            // Replicates EJS submit error shake/focus logic
            const msgMap = { name: nameMsg, email: emailMsg, password: passMsg, confirmPassword: confMsg };
            const firstInvalid = Object.keys(msgMap).find(key => msgMap[key]);
            
            if (firstInvalid) {
                shakeElement(`${firstInvalid}-group`);
                document.getElementById(firstInvalid).focus();
            }
            return;
        }

        const endpoint = isRecruiterSignup ? '/api/recruiter-signup' : '/api/signup';
        
        try {
            const response = await axios.post(endpoint, formData);

            if (response.data.success) {
                alert(response.data.message || 'Registration successful. Please log in.'); 
                navigate('/login'); 
            }
        } catch (err) {
            shakeElement('signup-container2'); 
            setServerError(err.response?.data?.error || 'Registration failed.');
        }
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
                    <input id="name" type="text" name="name" placeholder="Name" required value={formData.name} onChange={handleChange} onBlur={handleBlur} />
                    <div id="name-error" className="field-error"></div>
                </div>
                
                {/* Email Input */}
                <div className="input-group" id="email-group" onMouseEnter={(e) => e.currentTarget.classList.add('focused')} onMouseLeave={(e) => e.currentTarget.classList.remove('focused')}>
                    <input id="email" type="email" name="email" placeholder="Email" required value={formData.email} onChange={handleChange} onBlur={handleBlur} />
                    <div id="email-error" className="field-error"></div>
                </div>
                
                {/* Password Input */}
                <div className="password-group" id="password-group" onMouseEnter={(e) => e.currentTarget.classList.add('focused')} onMouseLeave={(e) => e.currentTarget.classList.remove('focused')}>
                    <input type="password" id="password" name="password" placeholder="Password" required value={formData.password} onChange={handleChange} onBlur={handleBlur}/>
                    <span id="toggle-password-btn" className="toggle-password" onClick={() => {
                        const input = document.getElementById('password');
                        input.type = input.type === 'password' ? 'text' : 'password';
                        document.getElementById('toggle-password-btn').textContent = input.type === 'password' ? 'Show' : 'Hide';
                    }}>Show</span>
                    <div id="password-error" className="field-error"></div>
                    
                    {/* Password Strength Meter */}
                    <div className="password-strength-container" id="password-strength-container" style={{ display: formData.password ? 'block' : 'none' }}>
                        <div className="password-strength-bar">
                            <div className={`password-strength-fill ${passStrength}`} id="password-strength-fill" style={{ width: `${(score / 6) * 100}%` }}></div>
                        </div>
                        <div className={`password-strength-text ${passStrength}`} id="password-strength-text">{passStrength === 'weak' ? 'Weak password' : passStrength === 'medium' ? 'Medium strength' : 'Strong password'}</div>
                    </div>
                </div>
                
                {/* Confirm Password Input */}
                <div className="password-group" id="confirm-group" onMouseEnter={(e) => e.currentTarget.classList.add('focused')} onMouseLeave={(e) => e.currentTarget.classList.remove('focused')}>
                    <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm Password" required value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur}/>
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

                {isRecruiterSignup && (
                    <div className="file-group">
                        <label htmlFor="objectFile">Upload Verification:</label>
                        <input type="file" id="objectFile" name="objectFile" />
                    </div>
                )}


                <button 
                    type="submit" 
                    id="signup-btn" 
                    className="signup-btn" 
                    aria-disabled={isButtonDisabled} 
                    disabled={isButtonDisabled}
                >
                    {isButtonDisabled ? 'Please complete form' : 'Sign Up'}
                </button>
                
                <p className="signin-text">
                    Already have an account? <a href="/login">Sign In</a>
                </p>
            </form>
        </div>
    );
}
export default Signup;