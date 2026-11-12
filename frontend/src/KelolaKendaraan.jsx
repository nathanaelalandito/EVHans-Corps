import React, { useEffect, useMemo, useState } from 'react';
import './kelolaKendaraan.css';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from './api/vehicle';

// Pilihan tipe konektor — value harus sama persis dengan enum di backend
// (lihat migration `vehicle.tipe_konektor`).
const KONEKTOR_OPTIONS = [
    { value: 'type_2', label: 'Type 2', hint: 'AC' },
    { value: 'ccs2', label: 'CCS2', hint: 'AC · DC cepat' },
    { value: 'chademo', label: 'CHAdeMO', hint: 'DC cepat' },
    { value: 'gbt', label: 'GB/T', hint: 'AC · DC' },
];

const konektorLabel = (value) =>
    KONEKTOR_OPTIONS.find((o) => o.value === value)?.label ?? value;

const EMPTY_FORM = { merek: '', model: '', nomor_polisi: '', tipe_konektor: 'type_2' };

// Plat ditampilkan dengan spasi & huruf besar: "b1234ev" -> "B 1234 EV".
function formatPlat(raw) {
    const p = String(raw || '').replace(/\s+/g, '').toUpperCase();
    const m = p.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
    return m ? `${m[1]} ${m[2]} ${m[3]}`.trim() : p;
}

// Ambil pesan error yang enak dibaca dari response axios (baik {message}
// maupun {errors: {field: [..]}} ala Laravel) — sama seperti di DriverDashboard.
function extractErrorMessage(error, fallback) {
    const data = error?.response?.data;
    if (!data) return fallback;
    if (data.errors) {
        const first = Object.values(data.errors)[0];
        if (Array.isArray(first)) return first[0];
    }
    if (data.message) return data.message;
    return fallback;
}

export default function KelolaKendaraan({ onBack }) {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(null); // objek kendaraan
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [toast, setToast] = useState('');

    const loadVehicles = () => {
        setLoading(true);
        setLoadError('');
        getVehicles()
            .then((data) => setVehicles(Array.isArray(data) ? data : []))
            .catch((err) => setLoadError(extractErrorMessage(err, 'Gagal memuat daftar kendaraan.')))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadVehicles();
    }, []);

    // Toast hilang otomatis.
    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(''), 2600);
        return () => clearTimeout(t);
    }, [toast]);

    // Tombol Esc menutup form / dialog yang sedang terbuka.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (deleting || submitting) return;
            setFormOpen(false);
            setConfirmDelete(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [deleting, submitting]);

    // Ringkasan untuk kartu di bawah header.
    const summary = useMemo(() => {
        const types = [...new Set(vehicles.map((v) => v.tipe_konektor))];
        return { count: vehicles.length, types };
    }, [vehicles]);

    const openAddForm = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setFormOpen(true);
    };

    const openEditForm = (vehicle) => {
        setEditingId(vehicle.id_vehicle);
        setForm({
            merek: vehicle.merek,
            model: vehicle.model,
            nomor_polisi: vehicle.nomor_polisi,
            tipe_konektor: vehicle.tipe_konektor,
        });
        setFormError('');
        setFormOpen(true);
    };

    const closeForm = () => {
        if (submitting) return;
        setFormOpen(false);
        setFormError('');
    };

    const handleFormChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError('');
        try {
            if (editingId) {
                const updated = await updateVehicle(editingId, form);
                setVehicles((prev) => prev.map((v) => (v.id_vehicle === editingId ? updated : v)));
                setToast('Kendaraan berhasil diperbarui');
            } else {
                const created = await createVehicle(form);
                setVehicles((prev) => [...prev, created]);
                setToast('Kendaraan berhasil ditambahkan');
            }
            setFormOpen(false);
        } catch (err) {
            setFormError(extractErrorMessage(err, 'Gagal menyimpan kendaraan. Periksa kembali data kamu.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await deleteVehicle(confirmDelete.id_vehicle);
            setVehicles((prev) => prev.filter((v) => v.id_vehicle !== confirmDelete.id_vehicle));
            setConfirmDelete(null);
            setToast('Kendaraan berhasil dihapus');
        } catch (err) {
            setDeleteError(extractErrorMessage(err, 'Kendaraan tidak dapat dihapus.'));
        } finally {
            setDeleting(false);
        }
    };

    const platPreview = formatPlat(form.nomor_polisi);
    const hasList = !loading && !loadError && vehicles.length > 0;

    return (
        <div className="kk-page">
            {/* ---------------- Header hijau melengkung ---------------- */}
            <header className="kk-header">
                <div className="kk-header-top">
                    <button className="kk-back-btn" onClick={onBack} aria-label="Kembali">←</button>
                    <h1 className="kk-title">Kelola Kendaraan</h1>
                    <span className="kk-header-spacer" />
                </div>
                <p className="kk-header-sub">Kendaraan listrik yang terhubung ke akunmu</p>
            </header>

            {/* Kartu ringkasan, "mengintip" di atas lengkungan header */}
            {!loading && !loadError && (
                <div className="kk-summary">
                    <div className="kk-summary-main">
                        <span className="kk-summary-count">{summary.count}</span>
                        <span className="kk-summary-label">kendaraan terdaftar</span>
                    </div>
                    <div className="kk-summary-types">
                        {summary.types.length === 0 ? (
                            <span className="kk-summary-none">Belum ada konektor</span>
                        ) : (
                            summary.types.map((t) => (
                                <span key={t} className="kk-chip">⚡ {konektorLabel(t)}</span>
                            ))
                        )}
                    </div>
                </div>
            )}

            <main className="kk-content">
                {loading && (
                    <div className="kk-list" aria-busy="true" aria-label="Memuat kendaraan">
                        {[0, 1, 2].map((i) => (
                            <div className="kk-card kk-skeleton" key={i}>
                                <span className="kk-sk kk-sk-avatar" />
                                <span className="kk-sk-lines">
                                    <span className="kk-sk kk-sk-line" />
                                    <span className="kk-sk kk-sk-line kk-sk-short" />
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && loadError && (
                    <div className="kk-state kk-state-error">
                        <span className="kk-state-icon">⚠️</span>
                        <p>{loadError}</p>
                        <button className="kk-retry-btn" onClick={loadVehicles}>Coba lagi</button>
                    </div>
                )}

                {!loading && !loadError && vehicles.length === 0 && (
                    <div className="kk-empty">
                        <span className="kk-empty-icon">🚗</span>
                        <p className="kk-empty-title">Belum ada kendaraan</p>
                        <p className="kk-empty-sub">
                            Tambahkan kendaraan listrikmu supaya lebih cepat memilih station
                            dengan konektor yang cocok.
                        </p>
                        <button className="kk-empty-cta" onClick={openAddForm}>+ Tambah Kendaraan</button>
                    </div>
                )}

                {hasList && (
                    <>
                        <h2 className="kk-section-title">Daftar Kendaraan</h2>
                        <div className="kk-list">
                            {vehicles.map((v, i) => (
                                <article
                                    className="kk-card"
                                    key={v.id_vehicle}
                                    style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}
                                >
                                    <div className="kk-card-icon">🚗</div>
                                    <div className="kk-card-info">
                                        <p className="kk-card-name">{v.merek} {v.model}</p>
                                        <div className="kk-card-meta">
                                            <span className="kk-plate">{formatPlat(v.nomor_polisi)}</span>
                                            <span className="kk-card-badge">⚡ {konektorLabel(v.tipe_konektor)}</span>
                                        </div>
                                    </div>
                                    <div className="kk-card-actions">
                                        <button
                                            className="kk-icon-btn"
                                            onClick={() => openEditForm(v)}
                                            aria-label={`Edit ${v.merek} ${v.model}`}
                                        >
                                            ✎
                                        </button>
                                        <button
                                            className="kk-icon-btn kk-icon-btn-danger"
                                            onClick={() => { setConfirmDelete(v); setDeleteError(''); }}
                                            aria-label={`Hapus ${v.merek} ${v.model}`}
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </main>

            {hasList && (
                <button className="kk-fab" onClick={openAddForm}>
                    <span className="kk-fab-plus">+</span> Tambah Kendaraan
                </button>
            )}

            {/* ---------------- Toast ---------------- */}
            {toast && (
                <div className="kk-toast" role="status">
                    <span className="kk-toast-check">✓</span> {toast}
                </div>
            )}

            {/* ---------------- Form tambah / edit kendaraan ---------------- */}
            {formOpen && (
                <div className="kk-overlay" onClick={closeForm}>
                    <form
                        className="kk-sheet"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleSubmit}
                        aria-label={editingId ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
                    >
                        <div className="kk-sheet-handle" />
                        <h2 className="kk-sheet-title">{editingId ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>

                        {/* Pratinjau plat langsung saat mengetik */}
                        <div className="kk-plate-preview" aria-hidden="true">
                            <span className="kk-plate kk-plate-lg">{platPreview || 'B 1234 EV'}</span>
                            <span className="kk-plate-preview-name">
                                {[form.merek, form.model].filter(Boolean).join(' ') || 'Merek & model kendaraan'}
                            </span>
                        </div>

                        <div className="kk-field-row">
                            <label className="kk-field">
                                <span>Merek</span>
                                <input
                                    type="text"
                                    value={form.merek}
                                    onChange={handleFormChange('merek')}
                                    placeholder="Hyundai"
                                    required
                                    maxLength={100}
                                />
                            </label>

                            <label className="kk-field">
                                <span>Model</span>
                                <input
                                    type="text"
                                    value={form.model}
                                    onChange={handleFormChange('model')}
                                    placeholder="Ioniq 5"
                                    required
                                    maxLength={50}
                                />
                            </label>
                        </div>

                        <label className="kk-field">
                            <span>Nomor Polisi</span>
                            <input
                                type="text"
                                value={form.nomor_polisi}
                                onChange={handleFormChange('nomor_polisi')}
                                placeholder="B 1234 EV"
                                required
                                autoCapitalize="characters"
                            />
                        </label>

                        <fieldset className="kk-field kk-fieldset">
                            <legend>Tipe Konektor</legend>
                            <div className="kk-konektor-grid">
                                {KONEKTOR_OPTIONS.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`kk-konektor ${form.tipe_konektor === opt.value ? 'is-selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="tipe_konektor"
                                            value={opt.value}
                                            checked={form.tipe_konektor === opt.value}
                                            onChange={handleFormChange('tipe_konektor')}
                                        />
                                        <span className="kk-konektor-name">{opt.label}</span>
                                        <span className="kk-konektor-hint">{opt.hint}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        {formError && <p className="kk-form-error" role="alert">{formError}</p>}

                        <div className="kk-sheet-actions">
                            <button type="button" className="kk-btn-secondary" onClick={closeForm} disabled={submitting}>
                                Batal
                            </button>
                            <button type="submit" className="kk-btn-primary" disabled={submitting}>
                                {submitting ? 'Menyimpan…' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ---------------- Konfirmasi hapus ---------------- */}
            {confirmDelete && (
                <div className="kk-overlay kk-overlay-center" onClick={() => !deleting && setConfirmDelete(null)}>
                    <div className="kk-confirm" onClick={(e) => e.stopPropagation()} role="alertdialog">
                        <span className="kk-confirm-icon">🗑</span>
                        <p className="kk-confirm-title">Hapus kendaraan ini?</p>
                        <p className="kk-confirm-sub">
                            {confirmDelete.merek} {confirmDelete.model} · {formatPlat(confirmDelete.nomor_polisi)}
                            <br />
                            Tindakan ini tidak bisa dibatalkan.
                        </p>
                        {deleteError && <p className="kk-form-error" role="alert">{deleteError}</p>}
                        <div className="kk-sheet-actions">
                            <button
                                type="button"
                                className="kk-btn-secondary"
                                onClick={() => setConfirmDelete(null)}
                                disabled={deleting}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                className="kk-btn-danger"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'Menghapus…' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}