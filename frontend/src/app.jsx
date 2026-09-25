import React, { useState } from 'react';
import Welcome from './Welcome';
import Registrasi from './Registrasi';
import Login from './Login';
import DriverDashboard from './DriverDashboard';
import { getStoredUser, getStoredToken, logout } from './api/auth';

export default function App() {
    // Kalau sudah ada token tersimpan (login sebelumnya), langsung ke dashboard.
    const [user, setUser] = useState(getStoredUser);
    const [currentPage, setCurrentPage] = useState(
        getStoredToken() ? 'dashboard' : 'welcome'
    );

    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser);
        setCurrentPage('dashboard');
    };

    const handleLogout = async () => {
        await logout().catch(() => {}); // tetap keluar meski request logout gagal
        setUser(null);
        setCurrentPage('welcome');
    };

    return (
        <div>
            {currentPage === 'welcome' && (
                <Welcome
                    onNavigateToRegister={() => setCurrentPage('register')}
                    onNavigateToLogin={() => setCurrentPage('login')}
                />
            )}
            {currentPage === 'register' && (
                <Registrasi
                    onBackToWelcome={() => setCurrentPage('welcome')}
                    onNavigateToLogin={() => setCurrentPage('login')}
                />
            )}
            {currentPage === 'login' && (
                <Login
                    onBackToWelcome={() => setCurrentPage('welcome')}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}
            {currentPage === 'dashboard' && (
                <DriverDashboard user={user} onLogout={handleLogout} />
            )}
        </div>
    );
}
