import React, { useState } from 'react';
import Welcome from './Welcome';
import Registrasi from './Registrasi';
import Login from './Login';
import DriverDashboard from './DriverDashboard';
import OperatorAdminDashboard from './OperatorAdminDashboard';
import KelolaKendaraan from './KelolaKendaraan';
import Bantuan from './Bantuan';
import { getStoredUser, getStoredToken, logout } from './api/auth';
import { clearWalletCache } from './api/wallet';
import OperatorDashboard from './OpsDashboard';
import ChargerMonitor from './ChargerMonitor';
import OpsReport from './OpsReport';
import ProfilOps from './ProfilOps';
import ChargerDetail from './ChargerDetail';
import DompetDigital from './DompetDigital';
import TopUp from './Topup';
import RiwayatTransaksi from './RiwayatTransaksi';

export default function App() {
    const [user, setUser] = useState(getStoredUser);
    
    // 1. STATE UNTUK MENYIMPAN DATA CHARGER YANG DIPILIH
    const [selectedCharger, setSelectedCharger] = useState(null);

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
            return 'dashboard';
        }
    });

    const handleLoginSuccess = (userData) => {
        setUser(userData);
    
        const email = userData.email || '';
        const peran = userData.peran || '';
    
        if (peran === 'admin' || email.endsWith('@admin.ac.id')) {
            setCurrentPage('admin-dashboard');
        } else if (peran === 'operator' || email.endsWith('@ops.ac.id')) {
            setCurrentPage('operator-dashboard');
        } else {
            setCurrentPage('dashboard');
        }
    };

    const isStaff = ['operator', 'admin'].includes(user?.peran);

    const handleLogout = async () => {
        clearWalletCache();
        await logout().catch(() => {});
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
                        onNavigateToWallet={() => setCurrentPage('wallet')}
                        onNavigateToTopUp={() => setCurrentPage('topup')}
                        onNavigateToRiwayat={() => setCurrentPage('riwayat')}
                    />
                )
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
            {currentPage === 'riwayat' && (
                <RiwayatTransaksi onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'vehicles' && (
                <KelolaKendaraan onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'help' && (
                <Bantuan onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'operator-dashboard' && (
                <OperatorDashboard 
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToCharger={() => setCurrentPage('charger')}
                    onNavigateToOpsReport={() => setCurrentPage('ops-report')}
                    onNavigateToOpsProfil={() => setCurrentPage('profil')}
                />
            )}

            {/* HALAMAN MANAGE CHARGER (GRID) */}
            {currentPage === 'charger' && (
                <ChargerMonitor
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToOpsDash={() => setCurrentPage('operator-dashboard')}
                    onNavigateToOpsReport={() => setCurrentPage('ops-report')}
                    onNavigateToOpsProfil={() => setCurrentPage('profil')}
                    // KIRIM FUNGSI UNTUK PINDAH KE DETAIL CHARGER:
                    onNavigateToDetail={(charger) => {
                        setSelectedCharger(charger);
                        setCurrentPage('chargerdetail');
                    }}
                />
            )}

            {/* HALAMAN DETAIL CHARGER BESERTA TARIF & PORT */}
            {currentPage === 'chargerdetail' && (
                <ChargerDetail
                    user={user}
                    charger={selectedCharger}
                    onBack={() => setCurrentPage('charger')}
                    onLogout={handleLogout}
                    onNavigateToOpsDash={() => setCurrentPage('operator-dashboard')}
                    onNavigateToCharger={() => setCurrentPage('charger')}
                    onNavigateToOpsReport={() => setCurrentPage('ops-report')}
                    onNavigateToOpsProfil={() => setCurrentPage('profil')}
                />
            )}

            {currentPage === 'ops-report' && (
                <OpsReport
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToOpsDash={() => setCurrentPage('operator-dashboard')}
                    onNavigateToCharger={() => setCurrentPage('charger')}
                    onNavigateToOpsProfil={() => setCurrentPage('profil')}
                />
            )}
            {currentPage === 'profil' && (
                <ProfilOps
                    user={user}
                    onLogout={handleLogout}
                    onNavigateToOpsDash={() => setCurrentPage('operator-dashboard')}
                    onNavigateToCharger={() => setCurrentPage('charger')}
                    onNavigateToOpsReport={() => setCurrentPage('ops-report')}
                />
            )}
            {currentPage === 'admin-dashboard' && (
                <OperatorAdminDashboard user={user} onLogout={handleLogout} />
            )}
        </div>
    );
}