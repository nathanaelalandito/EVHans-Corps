import React, { useState } from 'react';
import './registrasi.css';
import { login } from './api/auth';

export default function Login({ onBackToWelcome, onLoginSuccess }) {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverMessage, setServerMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setServerMessage('');

        try {
            const user = await login(formData.email, formData.password);
            onLoginSuccess(user);
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors || {});
            } else if (error.response && error.response.data?.message) {
                setServerMessage(error.response.data.message);
            } else {
                setServerMessage('Terjadi kesalahan pada server. Silakan coba lagi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <button type="button" onClick={onBackToWelcome} className="btn-back">
                    ← Kembali ke Beranda
                </button>
                <h2>Masuk Akun</h2>
                <p className="subtitle">Masuk untuk mengakses dompet & sesi charging kamu</p>

                {serverMessage && <div className="alert alert-error">{serverMessage}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="nama@email.com"
                        />
                        {errors.email && <span className="error-text">{errors.email[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Password akun kamu"
                        />
                        {errors.password && <span className="error-text">{errors.password[0]}</span>}
                    </div>

                    <button type="submit" disabled={loading} className="btn-submit">
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>
            </div>
        </div>
    );
}
