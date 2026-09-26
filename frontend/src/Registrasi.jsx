import React, { useState } from 'react';
import axios from 'axios';
import './registrasi.css';

export default function Registrasi({ onBackToWelcome, onNavigateToLogin }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        nomor_telepon: '',
        alamat: '',
        tanggal_lahir: '',
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverMessage, setServerMessage] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setServerMessage('');

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/register', formData);
            setServerMessage(response.data.message);
            
            // Kosongkan form setelah berhasil registrasi
            setFormData({
                name: '',
                email: '',
                password: '',
                nomor_telepon: '',
                alamat: '',
                tanggal_lahir: '',
            });

        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors);
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
                <h2>Buat Akun Baru</h2>
                <p className="subtitle">Masukkan data diri kamu dengan lengkap</p>

                {serverMessage && (
                    <div className={`alert ${serverMessage.includes('berhasil') ? 'alert-success' : 'alert-error'}`}>
                        {serverMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nama Panjang</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Nama Lengkap Kamu"
                        />
                        {errors.name && <span className="error-text">{errors.name[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="nama@email.com (atau @admin.ac.id / @ops.ac.id)"
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
                            placeholder="Minimal 6 karakter"
                        />
                        {errors.password && <span className="error-text">{errors.password[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Nomor Telepon</label>
                        <input
                            type="text"
                            name="nomor_telepon"
                            value={formData.nomor_telepon}
                            onChange={handleChange}
                            required
                            placeholder="08123456789"
                        />
                        {errors.nomor_telepon && <span className="error-text">{errors.nomor_telepon[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Alamat</label>
                        <textarea
                            name="alamat"
                            value={formData.alamat}
                            onChange={handleChange}
                            required
                            rows="2"
                            placeholder="Alamat domisili saat ini"
                        />
                        {errors.alamat && <span className="error-text">{errors.alamat[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Tanggal Lahir</label>
                        <input
                            type="date"
                            name="tanggal_lahir"
                            value={formData.tanggal_lahir}
                            onChange={handleChange}
                            required
                        />
                        {errors.tanggal_lahir && <span className="error-text">{errors.tanggal_lahir[0]}</span>}
                    </div>

                    <button type="submit" disabled={loading} className="btn-submit">
                        {loading ? 'Memproses...' : 'Daftar Sekarang'}
                    </button>
                </form>

                {onNavigateToLogin && (
                    <p className="subtitle" style={{ marginTop: '1rem' }}>
                        Sudah punya akun?{' '}
                        <button type="button" onClick={onNavigateToLogin} className="btn-back" style={{ display: 'inline' }}>
                            Masuk di sini
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
}