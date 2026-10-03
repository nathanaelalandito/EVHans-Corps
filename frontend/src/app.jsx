import { useState } from 'react';
import Welcome from './Welcome';
import Registrasi from './Registrasi';
import Login from './Login';
import DriverDashboard from './DriverDashboard';
import KelolaKendaraan from './KelolaKendaraan';
import Bantuan from './Bantuan';
import DompetDigital from './DompetDigital';
import { getStoredUser, getStoredToken, logout } from './api/auth';
import { clearWalletCache } from './api/wallet';
import TopUp from './Topup';

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
        clearWalletCache();
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
                        onNavigateToWallet={() => setCurrentPage('wallet')}
                        onNavigateToTopUp={() => setCurrentPage('topup')}
                />
            )}
            {currentPage === 'wallet' && (
                <DompetDigital onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'topup' && (
            <TopUp
                onBack={() => setCurrentPage('dashboard')}
                onDone={() => setCurrentPage('dashboard')}
            />
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
