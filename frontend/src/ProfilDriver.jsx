import { useEffect, useState } from "react";
import "./ProfilDriver.css";
// sesuaikan dengan instance axios/fetch yang sudah kamu punya di folder api/
import api from "./api/axiosInstance"; 

function hitungUmur(tanggalLahir) {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  const now = new Date();
  let umur = now.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    now.getMonth() < lahir.getMonth() ||
    (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
  if (belumUlangTahun) umur--;
  return umur;
}

export default function ProfilDriver({ onBack }) {
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/driver/profile") // sesuaikan endpoint backend Laravel-mu
      .then((res) => setProfil(res.data.data ?? res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="profil-driver-loading">Memuat profil...</div>;
  if (error) return <div className="profil-driver-error">Gagal memuat profil: {error}</div>;
  if (!profil) return null;

  return (
    <div className="profil-driver-container">
      <div className="profil-driver-header">
        <button onClick={onBack} className="btn-back">←</button>
        <h2>Profil Saya</h2>
      </div>

      <div className="profil-driver-card">
        <div className="profil-driver-avatar">👤</div>
        <h3>{profil.nama_lengkap}</h3>
        <span className={`badge status-${profil.status_akun}`}>
          {profil.status_akun}
        </span>
      </div>

      <div className="profil-driver-detail">
        <div className="detail-item">
          <span className="label">ID Pengguna</span>
          <span className="value">{profil.id_user}</span>
        </div>
        <div className="detail-item">
          <span className="label">Peran</span>
          <span className="value">{profil.peran}</span>
        </div>
        <div className="detail-item">
          <span className="label">Email</span>
          <span className="value">
            {profil.email}{" "}
            {profil.email_verified ? "✅" : "⚠️ belum diverifikasi"}
          </span>
        </div>
        <div className="detail-item">
          <span className="label">Nomor Telepon</span>
          <span className="value">{profil.nomor_telepon ?? "-"}</span>
        </div>
        <div className="detail-item">
          <span className="label">Tanggal Lahir</span>
          <span className="value">{profil.tanggal_lahir ?? "-"}</span>
        </div>
        <div className="detail-item">
          <span className="label">Umur</span>
          <span className="value">{profil.umur ?? "-"} tahun</span>
        </div>
        <div className="detail-item">
          <span className="label">Alamat</span>
          <span className="value">{profil.alamat ?? "-"}</span>
        </div>
      </div>

      <button className="btn-edit-profil">Edit Profil</button>
    </div>
  );
}