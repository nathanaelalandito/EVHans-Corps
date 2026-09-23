import React, { useState } from 'react';
import axios from 'axios';
import './Registrasi.css';

function Registrasi() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // Mengirim data ke backend Laravel API (role diatur otomatis oleh backend)
      const response = await axios.post('http://127.0.0.1:8000/api/register', formData);
      
      setIsSuccess(true);
      setMessage(response.data.message || 'Registrasi akun berhasil!');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: ''
      });
    } catch (error) {
      setIsSuccess(false);
      if (error.response && error.response.data.errors) {
        const errorList = error.response.data.errors;
        const firstError = Object.values(errorList)[0][0];
        setMessage(firstError);
      } else {
        setMessage('Gagal terhubung ke server backend Laravel.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ev-container">
      <div className="ev-card">
        <div className="ev-header">
          <h2>EV ChargeHub</h2>
          <p>Sistem Manajemen & Charging Kendaraan Listrik</p>
        </div>

        {message && (
          <div className={`ev-alert ${isSuccess ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ev-form">
          <div className="input-group">
            <label>Nama Lengkap</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Masukkan nama lengkap"
              required 
            />
          </div>

          <div className="input-group">
            <label>Alamat Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="nama@email.com"
              required 
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Minimal 6 karakter"
              required 
            />
          </div>

          <button type="submit" className="ev-button" disabled={loading}>
            {loading ? 'Memproses...' : 'Daftar Akun'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Registrasi;