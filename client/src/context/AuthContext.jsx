import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
// THIS LINE IS CRITICAL:
axios.defaults.withCredentials = true;; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // State to hold user data (id, name, email, role)
    const [user, setUser] = useState(null); 

    const loginUser = (userData) => {
        // Called by Login.jsx on successful API response
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

    return (
        <AuthContext.Provider value={{ user, loginUser, logoutUser, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);