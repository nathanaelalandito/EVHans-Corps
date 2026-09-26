import React from 'react';
import './welcome.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg'; // Sesuaikan lokasi logo kamu

export default function Welcome({ onNavigateToRegister, onNavigateToLogin }) {
    return (
        <div className="welcome-container">
            <div className="welcome-card">
                <div className="logo-wrapper">
                    <img src={logoECH} alt="EV Charge Hub Logo" className="welcome-logo" />
                </div>
                
                <h1 className="welcome-title">EV CHARGE HUB</h1>
                <p className="welcome-tagline">Your Route to Charging</p>
                
                <p className="welcome-desc">
                    Temukan dan akses stasiun pengisian kendaraan listrik terdekat dengan mudah, cepat, dan ramah lingkungan.
                </p>

                <div className="welcome-actions">
                    <button onClick={onNavigateToLogin} className="btn-primary">
                        Login Akun
                    </button>
                    
                    <button onClick={onNavigateToRegister} className="btn-primary">
                        Buat Akun Baru
                    </button>
                </div>
            </div>
        </div>
    );
}