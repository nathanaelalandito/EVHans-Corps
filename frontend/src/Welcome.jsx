import React, { useState } from 'react';
import './welcome.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg'; // Sesuaikan lokasi logo kamu
import { login } from './api/auth';

export default function Welcome({ onNavigateToRegister, onLoginSuccess }) {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [serverMessage, setServerMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setServerMessage('');
        setLoading(true);

        try {
            const user = await login(formData.email, formData.password);
            onLoginSuccess(user);
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors || {});
            } else if (error.response && error.response.data?.message) {
                setServerMessage(error.response.data.message);
            } else {
                setServerMessage('Login gagal. Periksa email dan password, lalu coba lagi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="welcome-container">
            <div className="welcome-card">
                <div className="logo-wrapper">
                    <img src={logoECH} alt="EV Charge Hub Logo" className="welcome-logo" />
                </div>
                
                <h1 className="welcome-title">EV CHARGE HUB</h1>
                <p className="welcome-tagline">Cara Cepat & Mudah Charging</p>
                
                <p className="welcome-desc">
                    Temukan station terdekat, mulai sesi charging, dan bayar aman lewat Dompet Digital.
                </p>

                {serverMessage && <div className="welcome-alert">{serverMessage}</div>}

                <form className="welcome-login-form" onSubmit={handleSubmit}>
                    <div className="welcome-field">
                        <label htmlFor="welcome-email">Email</label>
                        <input
                            id="welcome-email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="nama@email.com"
                            autoComplete="email"
                            required
                        />
                        {errors.email && <span className="welcome-error">{errors.email[0]}</span>}
                    </div>

                    <div className="welcome-field">
                        <label htmlFor="welcome-password">Password</label>
                        <input
                            id="welcome-password"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Masukkan password"
                            autoComplete="current-password"
                            required
                        />
                        {errors.password && <span className="welcome-error">{errors.password[0]}</span>}
                    </div>

                    <button type="button" className="forgot-password-link">
                        Lupa Password?
                    </button>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Memproses...' : 'Login Akun'}
                    </button>
                </form>

                <button onClick={onNavigateToRegister} className="btn-secondary">
                    Buat Akun Baru
                </button>
            </div>
        </div>
    );
}
