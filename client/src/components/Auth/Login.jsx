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
    const [clientError, setClientError] = useState('');
    const [serverError, setServerError] = useState('');
    const [capsWarning, setCapsWarning] = useState(false);
    const [emailSuggestion, setEmailSuggestion] = useState(null);
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);
    
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    // --- Validation and Button State Management ---
    useEffect(() => {
        const emailValid = !validateEmail(formData.email.trim());
        const passValid = !validatePassword(formData.password);
        
        setIsButtonDisabled(!(emailValid && passValid));
    }, [formData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
        
        const emailMsg = validateEmail(formData.email.trim());
        const passMsg = validatePassword(formData.password);

        if (emailMsg || passMsg) {
            setClientError(emailMsg || passMsg);
            // Replicates EJS submit error shake/focus logic
            const targetId = emailMsg ? 'email' : 'password';
            shakeElement(`${targetId}-group`); 
            document.getElementById(targetId).focus();
            return;
        }

        setServerError('');
        
        try {
            const response = await axios.post('/api/login', formData);

            if (response.data.success) {
                loginUser(response.data.user);
                navigate(response.data.redirectPath || '/home'); 
            }
        } catch (err) {
            shakeElement('login-container'); 
            setServerError(err.response?.data?.error || 'Login failed. Check your credentials.');
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

                <div className="forgot-password-row">
                    <a href="#" role="button" aria-label="Forgot your password (coming soon)">Forgot your password?</a>
                </div>

                <button 
                    type="submit" 
                    id="login-btn" 
                    className="login-btn" 
                    aria-disabled={isButtonDisabled} 
                    disabled={isButtonDisabled}
                >
                    {isButtonDisabled ? 'Enter Details' : 'Login'}
                </button>

                <p className="signup-text">
                    Don't have an account? <a href="/signup">Sign Up</a>
                </p>
            </form>
        </div>
    );
}
export default Login;