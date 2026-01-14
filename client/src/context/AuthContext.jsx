import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
// THIS LINE IS CRITICAL:
axios.defaults.withCredentials = true;; 

const AuthContext = createContext(null);

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
                    setUser({ ...response.data.user, isNewSignup: false });
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
        setUser(userData);
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