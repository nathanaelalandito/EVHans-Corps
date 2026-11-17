import { useState } from "react";
import { FiArrowLeft, FiEye, FiEyeOff, FiLock, FiX } from "react-icons/fi";
import { changePin, createPin, resetPin } from "./api/wallet";
import { isWeakPin } from "./utils/pin";

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
const WEAK_PIN_MESSAGE = "Jangan gunakan enam digit yang sama atau urutan naik/turun, seperti 123456 atau 654321.";

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [visibleFields, setVisibleFields] = useState({});
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasPin = Boolean(wallet?.pin_sudah_diset);
  const locked = Boolean(wallet?.terkunci);
  const lockedUntil = formatLockedUntil(wallet?.terkunci_sampai);

  /** Membuat handler input PIN yang hanya menerima angka. */
  const handlePinField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: normalizePin(e.target.value) }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError("");
  };

  /** Membuka salah satu formulir PIN dengan isian dan pesan yang bersih. */
  const openForm = (nextView) => {
    setForm(EMPTY_FORM);
    setError("");
    setFieldErrors({});
    setVisibleFields({});
    setNotice("");
    setView(nextView);
  };

  /** Kembali ke ringkasan status PIN tanpa menyimpan isian formulir. */
  const backToStatus = () => {
    setForm(EMPTY_FORM);
    setError("");
    setFieldErrors({});
    setVisibleFields({});
    setFieldErrors({});
    setVisibleFields({});
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
      setFieldErrors({});
      setVisibleFields({});
      setView("status");
      await onWalletChanged?.();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors) {
        const fieldMap = { pin: "pinBaru", pin_lama: "pinLama", pin_baru: "pinBaru", pin_baru_confirmation: "pinKonfirmasi", password: "password" };
        const mapped = {};
        Object.entries(apiErrors).forEach(([key, messages]) => {
          const field = fieldMap[key];
          if (field) mapped[field] = Array.isArray(messages) ? messages[0] : String(messages);
        });
        setFieldErrors(mapped);
        setError(Object.keys(mapped).length ? "" : extractErrorMessage(err, failureFallback));
      } else {
        setError(extractErrorMessage(err, failureFallback));
      }
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
      setFieldErrors({ pinBaru: `PIN harus terdiri dari ${PIN_LENGTH} digit angka.` });
      return;
    }
    if (isWeakPin(form.pinBaru)) {
      setFieldErrors({ pinBaru: WEAK_PIN_MESSAGE });
      return;
    }
    if (form.pinBaru !== form.pinKonfirmasi) {
      setFieldErrors({ pinKonfirmasi: "Konfirmasi PIN tidak sama dengan PIN baru." });
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
      setFieldErrors({ pinLama: `PIN lama harus ${PIN_LENGTH} digit angka.` });
      return;
    }
    if (form.pinBaru.length !== PIN_LENGTH) {
      setFieldErrors({ pinBaru: `PIN baru harus terdiri dari ${PIN_LENGTH} digit angka.` });
      return;
    }
    if (form.pinBaru === form.pinLama) {
      setFieldErrors({ pinBaru: "PIN baru tidak boleh sama dengan PIN lama." });
      return;
    }
    if (isWeakPin(form.pinBaru)) {
      setFieldErrors({ pinBaru: WEAK_PIN_MESSAGE });
      return;
    }
    if (form.pinBaru !== form.pinKonfirmasi) {
      setFieldErrors({ pinKonfirmasi: "Konfirmasi PIN baru tidak sama." });
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
      setFieldErrors({ password: "Masukkan password akun Anda." });
      return;
    }
    if (form.pinBaru.length !== PIN_LENGTH) {
      setFieldErrors({ pinBaru: `PIN baru harus terdiri dari ${PIN_LENGTH} digit angka.` });
      return;
    }
    if (isWeakPin(form.pinBaru)) {
      setFieldErrors({ pinBaru: WEAK_PIN_MESSAGE });
      return;
    }
    if (form.pinBaru !== form.pinKonfirmasi) {
      setFieldErrors({ pinKonfirmasi: "Konfirmasi PIN baru tidak sama." });
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
    <div className="settings-pin-field">
      <label className="settings-pin-label" htmlFor={id}>
        {label}
      </label>
      <div className="settings-pin-control">
        <input
          id={id}
          name={field}
          className="settings-pin-input"
          type={visibleFields[field] ? "text" : "password"}
          inputMode="numeric"
          autoComplete="off"
          maxLength={PIN_LENGTH}
          value={form[field]}
          onChange={handlePinField(field)}
          autoFocus={options.autoFocus}
          disabled={submitting}
          aria-describedby={fieldErrors[field] ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="settings-pin-toggle"
          aria-label={`${visibleFields[field] ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`}
          aria-pressed={Boolean(visibleFields[field])}
          onClick={() => setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }))}
          disabled={submitting}
        >
          {visibleFields[field] ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </button>
      </div>
      {fieldErrors[field] && <small id={`${id}-error`} className="settings-pin-field-error" role="alert">{fieldErrors[field]}</small>}
    </div>
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
            Gunakan {PIN_LENGTH} digit angka yang mudah Anda ingat namun sulit ditebak. {WEAK_PIN_MESSAGE}
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
          <p className="settings-pin-desc">{WEAK_PIN_MESSAGE}</p>
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
            Masukkan password akun untuk membuat PIN baru tanpa PIN lama. {WEAK_PIN_MESSAGE}
          </p>
          <label className="settings-pin-label" htmlFor="pin-reset-password">
            Password akun
          </label>
          <input
            id="pin-reset-password"
            className="settings-pin-input settings-pin-input--text"
            type={visibleFields.password ? "text" : "password"}
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, password: e.target.value }));
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
              setError("");
            }}
            autoFocus
            disabled={submitting}
          />
          <button type="button" className="settings-pin-toggle" aria-label={`${visibleFields.password ? "Sembunyikan" : "Tampilkan"} password akun`} aria-pressed={Boolean(visibleFields.password)} onClick={() => setVisibleFields((prev) => ({ ...prev, password: !prev.password }))} disabled={submitting}>
            {visibleFields.password ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
          </button>
          {fieldErrors.password && <small className="settings-pin-field-error" role="alert">{fieldErrors.password}</small>}
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
