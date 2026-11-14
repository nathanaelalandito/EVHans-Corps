import { useEffect, useState } from 'react';
import { FaBuilding, FaTimes, FaUser } from 'react-icons/fa';
import api from './api/client';
import OperatorStationPicker from './OperatorStationPicker';
import { PHONE_MAX_DIGITS, PHONE_PATTERN, normalizePhone } from './utils/phone';
import './operatorSettingsModal.css';

/**
 * Satu sumber pengaturan Operator.
 * Menyatukan profil, station aktif, preferensi operasional, dan aksi keluar
 * supaya ikon gear memiliki perilaku yang sama di setiap modul.
 */
export default function OperatorSettingsModal({ user, onClose, refreshInterval, onRefreshIntervalChange, onStationChange }) {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ nomor_telepon: '', alamat: '' });
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const assignment = profile?.assignment;

    useEffect(() => {
        let mounted = true;
        api.get('/operator/profile').then(({ data }) => {
            if (!mounted) return;
            const result = data.data || null;
            setProfile(result);
            setForm({ nomor_telepon: result?.profile?.nomor_telepon || '', alamat: result?.profile?.alamat || '' });
        }).catch(() => {});
        return () => { mounted = false; };
    }, [user]);
    /** Menyimpan hanya data kontak yang memang berada dalam wewenang operator. */
    const saveProfile = async event => {
        event.preventDefault(); setSaving(true); setNotice('');
        try { const { data } = await api.put('/operator/profile', form); setNotice(data.message); }
        catch (error) { setNotice(error.response?.data?.message || 'Informasi akun tidak dapat disimpan.'); }
        finally { setSaving(false); }
    };

    return <div className="os-modal-backdrop" onClick={onClose}>
        <section className="os-modal" role="dialog" aria-modal="true" aria-label="Pengaturan" onClick={event => event.stopPropagation()}>
            <header><div><p>PENGATURAN</p><h2>Pengaturan</h2></div><button aria-label="Tutup pengaturan" onClick={onClose}><FaTimes /></button></header>
            <form className="os-section os-account-form" onSubmit={saveProfile}><h3><FaUser />Akun operator</h3><label>Nama lengkap<input value={profile?.profile?.nama_lengkap || user?.profile?.nama_lengkap || user?.name || '—'} readOnly /></label><label>Nomor telepon<input type="tel" inputMode="numeric" pattern={PHONE_PATTERN} value={form.nomor_telepon} maxLength={PHONE_MAX_DIGITS} onChange={event => setForm({ ...form, nomor_telepon: normalizePhone(event.target.value) })} required /></label><label>Alamat<input value={form.alamat} onChange={event => setForm({ ...form, alamat: event.target.value })} placeholder="Alamat domisili operator" /></label><label>Email akun<input value={profile?.user?.email || user?.email || '—'} readOnly /></label>{notice && <span className="os-notice">{notice}</span>}<button className="os-save" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan perubahan'}</button></form>
            <div className="os-section"><h3><FaBuilding />Lokasi kerja</h3><OperatorStationPicker onStationChange={onStationChange} /><span>{assignment?.alamat || 'Lokasi kerja belum ditetapkan oleh admin.'}</span></div>
            <div className="os-section os-preference"><div><h3>Pembaruan otomatis</h3><span>Sinkronisasi data untuk halaman yang sedang dibuka.</span></div><select value={refreshInterval} onChange={event => onRefreshIntervalChange(Number(event.target.value))}><option value={15}>15 detik</option><option value={30}>30 detik</option><option value={60}>1 menit</option></select></div>
        </section>
    </div>;
}
