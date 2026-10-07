import React, { useState } from 'react';
import Welcome from './Welcome';
import Registrasi from './Registrasi';
import Login from './Login';
import DriverDashboard from './DriverDashboard';
import OperatorAdminDashboard from './OperatorAdminDashboard';
import KelolaKendaraan from './KelolaKendaraan';
import Bantuan from './Bantuan';
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

    const isStaff = ['operator', 'admin'].includes(user?.peran);

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
                    onLoginSuccess={handleLoginSuccess}
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
                isStaff ? (
                    <OperatorAdminDashboard user={user} onLogout={handleLogout} />
                ) : (
                    <DriverDashboard
                        user={user}
                        onLogout={handleLogout}
                        onNavigateToVehicles={() => setCurrentPage('vehicles')}
                        onNavigateToHelp={() => setCurrentPage('help')}
                    />
                )
            )}
            {currentPage === 'vehicles' && (
                <KelolaKendaraan onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'help' && (
                <Bantuan onBack={() => setCurrentPage('dashboard')} />
            )}
        </div>
    );
}
