import React, { useState } from 'react';
import Welcome from './Welcome';
import Registrasi from './Registrasi';

export default function App() {
    const [currentPage, setCurrentPage] = useState('welcome');

    return (
        <div>
            {currentPage === 'welcome' && (
                <Welcome onNavigateToRegister={() => setCurrentPage('register')} />
            )}
            {currentPage === 'register' && (
                <Registrasi onBackToWelcome={() => setCurrentPage('welcome')} />
            )}
        </div>
    );
}