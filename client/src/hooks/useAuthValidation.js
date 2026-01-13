// client/src/hooks/useAuthValidation.js (Core Logic from EJS)

export function validateName(v) {
    if (!v || !v.trim()) return 'Name is required.';
    const trimmed = v.trim();
    const regex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/; 
    if (!regex.test(trimmed)) return 'Name must contain only characters.';
    return '';
}

export function validateEmail(v) {
    if (!v) return 'Email is required.';
    const value = String(v).trim();
    // Updated regex to allow numbers, dots, underscores, and hyphens in email
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(value) ? '' : 'Enter a valid email address.';
}

export function validatePassword(v) {
    if (!v) return 'Password is required.';
    // Regex based on EJS: 6+ chars, 1 Uppercase, 1 Special Char
    const re = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
    return re.test(v) ? '' : 'Password must satisfy criteria.';
}

export function validateConfirm(v, pw) {
    if (!v) return 'Please confirm your password.';
    return v === pw ? '' : 'Passwords do not match.';
}

export function calculatePasswordStrength(password) {
    if (!password) return { strength: 'none', score: 0 }; 
    let score = 0;
    
    if (password.length >= 6) score++; 
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++; 
    if (/[a-z]/.test(password)) score++; 
    if (/\d/.test(password)) score++; 
    if (/[!@#$%^&*]/.test(password)) score++; 

    if (score <= 2) return { strength: 'weak', score: score }; 
    if (score <= 4) return { strength: 'medium', score: score }; 
    return { strength: 'strong', score: score }; 
}

export function shakeElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }
}