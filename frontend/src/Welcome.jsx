import { useState } from 'react';
import { FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import './welcome.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg'; // Sesuaikan lokasi logo kamu
import { login } from './api/auth';

/** Layar awal yang menyediakan akses ke login dan registrasi pengemudi. */
export default function Welcome({ onNavigateToRegister, onLoginSuccess, registrationMessage }) {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [serverMessage, setServerMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    /** Menyimpan perubahan kredensial pada formulir login awal. */
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /** Mengirim kredensial ke layanan autentikasi dan memproses responsnya. */
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
            <main className="welcome-shell">
                <section className="welcome-brand" aria-labelledby="welcome-heading">
                    <div className="logo-wrapper">
                        <img src={logoECH} alt="Logo EVHUB" className="welcome-logo" />
                    </div>
                    <p className="welcome-eyebrow">EV CHARGE HUB</p>
                    <h1 id="welcome-heading" className="welcome-title">Energi perjalananmu, selalu siap.</h1>
                    <p className="welcome-desc">
                        Temukan charger, pantau sesi, dan bayar dengan aman dalam satu tempat.
                    </p>
                    <ul className="welcome-benefits" aria-label="Manfaat EVHUB">
                        <li><FiCheck aria-hidden="true" /> Status charger yang jelas</li>
                        <li><FiCheck aria-hidden="true" /> Pembayaran melalui dompet digital</li>
                        <li><FiCheck aria-hidden="true" /> Riwayat sesi mudah dilacak</li>
                    </ul>
                </section>

                <section className="welcome-card" aria-labelledby="login-heading">
                    <p className="auth-kicker">Selamat datang kembali</p>
                    <h2 id="login-heading">Masuk ke EVHUB</h2>
                    <p className="auth-subtitle">Gunakan akunmu untuk melanjutkan perjalanan.</p>

                    {registrationMessage && <div className="welcome-alert welcome-alert--success" role="status">{registrationMessage}</div>}
                    {serverMessage && <div className="welcome-alert" role="alert">{serverMessage}</div>}

                    <form className="welcome-login-form" onSubmit={handleSubmit} noValidate>
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
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? 'welcome-email-error' : undefined}
                        />
                        {errors.email && <span id="welcome-email-error" className="welcome-error">{errors.email[0]}</span>}
                    </div>

                    <div className="welcome-field">
                        <label htmlFor="welcome-password">Password</label>
                        <div className="password-field">
                            <input
                                id="welcome-password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Masukkan password"
                                autoComplete="current-password"
                                required
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'welcome-password-error' : undefined}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                            >
                                {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                            </button>
                        </div>
                        {errors.password && <span id="welcome-password-error" className="welcome-error">{errors.password[0]}</span>}
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>

                    <p className="auth-register">
                        Belum punya akun?{' '}
                        <button type="button" onClick={onNavigateToRegister}>Buat akun</button>
                    </p>
                </section>
            </main>
        </div>
    );
}
