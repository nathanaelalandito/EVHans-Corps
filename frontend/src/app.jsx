import React, { useState } from 'react';
import Welcome from './Welcome';
import Registrasi from './Registrasi';
import Login from './Login';
import DriverDashboard from './DriverDashboard';
import KelolaKendaraan from './KelolaKendaraan';
import Bantuan from './Bantuan';
import { getStoredUser, getStoredToken, logout } from './api/auth';
import OperatorDashboard from './OpsDashboard'; // Perhatikan ejaannya
import ChargerMonitor from './ChargerMonitor';

export default function App() {
    // Kalau sudah ada token tersimpan (login sebelumnya), langsung ke dashboard.
    const [user, setUser] = useState(getStoredUser);
    const [currentPage, setCurrentPage] = useState(() => {
        if (!getStoredToken()) return 'welcome';
        
        const storedUser = getStoredUser() || {};
        const email = storedUser.email || '';
        const peran = storedUser.peran || '';

        if (peran === 'admin' || email.endsWith('@admin.ac.id')) {
            return 'admin-dashboard';
        } else if (peran === 'operator' || email.endsWith('@ops.ac.id')) {
            return 'operator-dashboard';
        } else {
            return 'dashboard'; // Default ke driver dashboard
        }
    });

    const handleLoginSuccess = (userData) => {
        setUser(userData);
    
        // Cek peran dari backend atau dari ekstensi email
        const email = userData.email || '';
        const peran = userData.peran || '';
    
        if (peran === 'admin' || email.endsWith('@admin.ac.id')) {
            setCurrentPage('admin-dashboard');
        } else if (peran === 'operator' || email.endsWith('@ops.ac.id')) {
            setCurrentPage('operator-dashboard');
        } else {
            setCurrentPage('dashboard'); // Driver dashboard default
        }
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
                <DriverDashboard
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToVehicles={() => setCurrentPage('vehicles')}
                    onNavigateToHelp={() => setCurrentPage('help')}
                />
            )}
            {currentPage === 'vehicles' && (
                <KelolaKendaraan onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'help' && (
                <Bantuan onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage == 'operator-dashboard' && (
                <OperatorDashboard 
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToPort={() => setCurrentPage('port')}
                    onNavigateToOpsReport={() => setCurrentPage('ops-Report')}
                />
            )}
            {currentPage == 'port' &&(
                <ChargerMonitor
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToOpsDash={() => setCurrentPage('operator-dashboard')}
                    onNavigateToOpsReport={() => setCurrentPage('ops-Report')}
                />
            )}
            {currentPage == 'ops-report' &&(
                <ChargerMonitor
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToOpsDash={() => setCurrentPage('operator-dashboard')}
                    onNavigateToOpsReport={() => setCurrentPage('ops-Report')}
                />
            )}
            {currentPage == 'admin-dashboard' && (
                <AdminDaashboard onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}
