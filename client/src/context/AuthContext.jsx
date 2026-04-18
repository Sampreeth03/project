import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

axios.defaults.withCredentials = true;
if (apiBaseUrl) {
    axios.defaults.baseURL = apiBaseUrl;
}

const AuthContext = createContext(null);

function normalizeRole(role) {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'student') return 'user';
    return normalized;
}

function normalizeUser(userData) {
    if (!userData) return null;
    return {
        ...userData,
        role: normalizeRole(userData.role)
    };
}

export const AuthProvider = ({ children }) => {
    // State to hold user data (id, name, email, role, onboardingCompleted, isNewSignup)
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check session on mount
    React.useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await axios.get('/api/home');
                if (response.data.success && response.data.user) {
                    // Existing session users are NOT new signups (they're returning users)
                    setUser(normalizeUser({ ...response.data.user, isNewSignup: false }));
                }
            } catch (error) {
                console.log('No active session');
            } finally {
                setLoading(false);
            }
        };
        checkSession();
    }, []);

    const loginUser = (userData) => {
        // Called by Login.jsx or Signup.jsx on successful API response
        // isNewSignup flag comes from the API response (true for signup, false for login)
        setUser(normalizeUser(userData));
    };

    const logoutUser = async () => {
        try {
            // Hit the Express API logout endpoint, which destroys the server-side session
            await axios.get('/api/logout'); 
        } catch (error) {
            console.error("Logout error:", error);
        }
        // Clear client-side state
        setUser(null);
    };

    // Mark onboarding as completed in local state
    const markOnboardingComplete = () => {
        if (user) {
            setUser({ ...user, onboardingCompleted: true, isNewSignup: false });
        }
    };

    if (loading) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, loginUser, logoutUser, markOnboardingComplete, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);