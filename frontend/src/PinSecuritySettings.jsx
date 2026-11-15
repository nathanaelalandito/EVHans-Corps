import { useState } from "react";
import { FiArrowLeft, FiLock, FiX } from "react-icons/fi";
import { changePin, createPin, resetPin } from "./api/wallet";

/** Panjang PIN Dompet yang diterima backend (digits:6). */
const PIN_LENGTH = 6;

/** Memilih pesan error API yang bisa langsung ditampilkan kepada pengemudi. */
function extractErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (data.message) return data.message;
  if (data.errors) {
    const first = Object.values(data.errors)[0];
    return Array.isArray(first) ? first[0] : fallback;
  }
  return fallback;
}

/** Menyisakan angka saja dan membatasi panjang input PIN maksimal 6 digit. */
function normalizePin(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, PIN_LENGTH);
}

/** Mengubah waktu berakhirnya kunci dompet menjadi jam yang mudah dibaca. */
function formatLockedUntil(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const EMPTY_FORM = { pinLama: "", pinBaru: "", pinKonfirmasi: "", password: "" };

/**
 * Layar "PIN Keamanan" di panel Pengaturan Driver.
 * Props:
 *  - wallet: hasil GET /api/wallet (pin_sudah_diset, terkunci, terkunci_sampai)
 *  - onWalletChanged(): memuat ulang data dompet setelah PIN berubah
 *  - onBack(): kembali ke menu Pengaturan
 *  - onClose(): menutup panel Pengaturan
 */
export default function PinSecuritySettings({ wallet, onWalletChanged, onBack, onClose }) {
  const [view, setView] = useState("status"); // status | create | change | reset
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasPin = Boolean(wallet?.pin_sudah_diset);
  const locked = Boolean(wallet?.terkunci);
  const lockedUntil = formatLockedUntil(wallet?.terkunci_sampai);

  /** Membuat handler input PIN yang hanya menerima angka. */
  const handlePinField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: normalizePin(e.target.value) }));
  };

  /** Membuka salah satu formulir PIN dengan isian dan pesan yang bersih. */
  const openForm = (nextView) => {
    setForm(EMPTY_FORM);
    setError("");
    setNotice("");
    setView(nextView);
  };

  /** Kembali ke ringkasan status PIN tanpa menyimpan isian formulir. */
  const backToStatus = () => {
    setForm(EMPTY_FORM);
    setError("");
    setView("status");
  };

  /** Menjalankan aksi PIN, lalu menyegarkan status dompet dan menampilkan hasilnya. */
  const submitAction = async (action, successFallback, failureFallback) => {
    setSubmitting(true);
    setError("");
    try {
      const result = await action();
      setNotice(result?.message || successFallback);
      setForm(EMPTY_FORM);
      setView("status");
      await onWalletChanged?.();
    } catch (err) {
      setError(extractErrorMessage(err, failureFallback));
      // 423 = dompet baru saja terkunci; status di layar perlu ikut diperbarui.
      if (err?.response?.status === 423) onWalletChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  /** Membuat PIN pertama setelah memeriksa panjang dan konfirmasinya. */
  const handleCreate = (e) => {
    e.preventDefault();
    if (form.pinBaru.length !== PIN_LENGTH) {
      setError(`PIN harus terdiri dari ${PIN_LENGTH} digit angka.`);
      return;
    }
    if (form.pinBaru !== form.pinKonfirmasi) {
      setError("Konfirmasi PIN tidak sama dengan PIN baru.");
      return;
    }
    submitAction(
      () => createPin(form.pinBaru, form.pinKonfirmasi),
      "PIN berhasil dibuat.",
      "Gagal membuat PIN. Coba lagi.",
    );
  };

  /** Mengganti PIN setelah memeriksa PIN lama, PIN baru, dan konfirmasinya. */
  const handleChange = (e) => {
    e.preventDefault();
    if (form.pinLama.length !== PIN_LENGTH) {
      setError(`PIN lama harus ${PIN_LENGTH} digit angka.`);
      return;
    }
    if (form.pinBaru.length !== PIN_LENGTH) {
      setError(`PIN baru harus terdiri dari ${PIN_LENGTH} digit angka.`);
      return;
    }
    if (form.pinBaru === form.pinLama) {
      setError("PIN baru tidak boleh sama dengan PIN lama.");
      return;
    }
    if (form.pinBaru !== form.pinKonfirmasi) {
      setError("Konfirmasi PIN baru tidak sama.");
      return;
    }
    submitAction(
      () => changePin(form.pinLama, form.pinBaru, form.pinKonfirmasi),
      "PIN berhasil diubah.",
      "Gagal mengubah PIN. Coba lagi.",
    );
  };

  /** Mengatur ulang PIN yang terlupa dengan memverifikasi password akun. */
  const handleReset = (e) => {
    e.preventDefault();
    if (!form.password) {
      setError("Masukkan password akun Anda.");
      return;
    }
    if (form.pinBaru.length !== PIN_LENGTH) {
      setError(`PIN baru harus terdiri dari ${PIN_LENGTH} digit angka.`);
      return;
    }
    if (form.pinBaru !== form.pinKonfirmasi) {
      setError("Konfirmasi PIN baru tidak sama.");
      return;
    }
    submitAction(
      () => resetPin(form.password, form.pinBaru, form.pinKonfirmasi),
      "PIN berhasil diatur ulang.",
      "Gagal mengatur ulang PIN. Coba lagi.",
    );
  };

  /** Merender satu kolom PIN 6 digit bernomor dengan label yang terhubung. */
  const renderPinField = (id, label, field, options = {}) => (
    <>
      <label className="settings-pin-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="settings-pin-input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={PIN_LENGTH}
        value={form[field]}
        onChange={handlePinField(field)}
        autoFocus={options.autoFocus}
        disabled={submitting}
      />
    </>
  );

  /** Merender tombol Batal dan Simpan yang dipakai semua formulir PIN. */
  const renderActions = (submitLabel) => (
    <div className="settings-pin-form-actions">
      <button
        type="button"
        className="settings-pin-cancel"
        onClick={backToStatus}
        disabled={submitting}
      >
        Batal
      </button>
      <button type="submit" className="settings-pin-submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : submitLabel}
      </button>
    </div>
  );

  return (
    <div className="settings-subscreen">
      <div className="settings-panel-header">
        <button
          className="settings-back-btn"
          onClick={view === "status" ? onBack : backToStatus}
          aria-label={view === "status" ? "Kembali ke pengaturan" : "Kembali ke status PIN"}
        >
          <FiArrowLeft aria-hidden="true" />
        </button>
        <span className="settings-panel-title">PIN Keamanan</span>
        <button
          className="mapdash-notif-close"
          onClick={onClose}
          aria-label="Tutup pengaturan"
        >
          <FiX aria-hidden="true" />
        </button>
      </div>

      {notice && view === "status" && (
        <p className="settings-pin-success" role="status">
          {notice}
        </p>
      )}

      {view === "status" && (
        <div className="settings-pin-status">
          {!wallet ? (
            <>
              <p className="settings-pin-desc">
                Status PIN belum dapat dimuat. Periksa koneksi lalu coba lagi.
              </p>
              <button
                type="button"
                className="settings-pin-submit"
                onClick={() => onWalletChanged?.()}
              >
                Muat Ulang
              </button>
            </>
          ) : (
            <>
              <div className="settings-pin-status-row">
                <span className="settings-pin-status-icon">
                  <FiLock aria-hidden="true" />
                </span>
                <div>
                  <p className="settings-pin-status-title">
                    {hasPin ? "PIN aktif" : "PIN belum dibuat"}
                  </p>
                  {hasPin && (
                    <p className="settings-pin-status-sub" aria-hidden="true">
                      ••••••
                    </p>
                  )}
                </div>
              </div>

              <p className="settings-pin-desc">
                {hasPin
                  ? `PIN ${PIN_LENGTH} digit melindungi transaksi dompet, termasuk memulai sesi charging.`
                  : `Buat PIN ${PIN_LENGTH} digit untuk melindungi transaksi dompet. PIN wajib dimiliki sebelum memulai sesi charging.`}
              </p>

              {locked && (
                <p className="settings-pin-error" role="alert">
                  Dompet terkunci sementara karena terlalu banyak PIN salah
                  {lockedUntil ? `. Coba lagi setelah pukul ${lockedUntil}.` : "."}
                </p>
              )}

              {hasPin ? (
                <>
                  <button
                    type="button"
                    className="settings-pin-submit"
                    onClick={() => openForm("change")}
                  >
                    Ubah PIN
                  </button>
                  <button
                    type="button"
                    className="settings-pin-cancel settings-pin-secondary"
                    onClick={() => openForm("reset")}
                  >
                    Lupa PIN? Atur ulang
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="settings-pin-submit"
                  onClick={() => openForm("create")}
                >
                  Buat PIN
                </button>
              )}
            </>
          )}
        </div>
      )}

      {view === "create" && (
        <form className="settings-pin-form" onSubmit={handleCreate} noValidate>
          <p className="settings-pin-desc">
            Gunakan {PIN_LENGTH} digit angka yang mudah Anda ingat namun sulit ditebak.
          </p>
          {renderPinField("pin-baru", "PIN baru", "pinBaru", { autoFocus: true })}
          {renderPinField("pin-konfirmasi", "Ulangi PIN baru", "pinKonfirmasi")}
          {error && (
            <p className="settings-pin-error" role="alert">
              {error}
            </p>
          )}
          {renderActions("Simpan PIN")}
        </form>
      )}

      {view === "change" && (
        <form className="settings-pin-form" onSubmit={handleChange} noValidate>
          {renderPinField("pin-lama", "PIN lama", "pinLama", { autoFocus: true })}
          {renderPinField("pin-baru", "PIN baru", "pinBaru")}
          {renderPinField("pin-konfirmasi", "Ulangi PIN baru", "pinKonfirmasi")}
          {error && (
            <p className="settings-pin-error" role="alert">
              {error}
            </p>
          )}
          {renderActions("Simpan PIN")}
        </form>
      )}

      {view === "reset" && (
        <form className="settings-pin-form" onSubmit={handleReset} noValidate>
          <p className="settings-pin-desc">
            Masukkan password akun untuk membuat PIN baru tanpa PIN lama.
          </p>
          <label className="settings-pin-label" htmlFor="pin-reset-password">
            Password akun
          </label>
          <input
            id="pin-reset-password"
            className="settings-pin-input settings-pin-input--text"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            autoFocus
            disabled={submitting}
          />
          {renderPinField("pin-baru", "PIN baru", "pinBaru")}
          {renderPinField("pin-konfirmasi", "Ulangi PIN baru", "pinKonfirmasi")}
          {error && (
            <p className="settings-pin-error" role="alert">
              {error}
            </p>
          )}
          {renderActions("Atur Ulang PIN")}
        </form>
      )}
    </div>
  );
}
