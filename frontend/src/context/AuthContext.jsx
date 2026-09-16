import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user_profile');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    // Dynamic API URL for deployed vs local
    const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '');

    useEffect(() => {
        // Check if token exists and verify with backend
        const initializeAuth = async () => {
            const savedToken = localStorage.getItem('token');
            if (savedToken) {
                try {
                    const res = await fetch(`${baseUrl}/api/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${savedToken}`
                        }
                    });

                    if (res.ok) {
                        const userData = await res.json();
                        setUser(userData);
                        localStorage.setItem('user_profile', JSON.stringify(userData));
                    } else if (res.status === 401 || res.status === 403) {
                        // Only logout on explicit invalid/expired credential response
                        logout();
                    }
                } catch (err) {
                    console.warn("Backend verification transient error, keeping existing session:", err);
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, [baseUrl]);

    const login = async (email, password) => {
        try {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user_profile', JSON.stringify(data.user));
                setToken(data.access_token);
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.detail || 'Login failed' };
            }
        } catch (err) {
            return { success: false, error: 'Network error occurred. Please check backend server.' };
        }
    };

    const register = async (username, email, password) => {
        try {
            const res = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user_profile', JSON.stringify(data.user));
                setToken(data.access_token);
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.detail || 'Registration failed' };
            }
        } catch (err) {
            return { success: false, error: 'Network error occurred. Please check backend server.' };
        }
    };

    const loginAsGuest = () => {
        const guestUser = { id: 'guest', username: 'Guest Reader', email: 'guest@dispatch.news' };
        localStorage.setItem('token', 'guest-token');
        localStorage.setItem('user_profile', JSON.stringify(guestUser));
        setToken('guest-token');
        setUser(guestUser);
        return { success: true };
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_profile');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, loginAsGuest }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
