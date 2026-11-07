import { useEffect, useMemo, useRef, useState } from 'react';
import { createTopup, getTopup, getTopupMethods, simulatePayTopup } from './api/Topup';
import { verifyPin } from './api/wallet';
import './Topup.css';

const PRESETS = [20000, 50000, 100000, 200000, 500000];

/** Memformat nominal top up ke format rupiah. */
const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

/** Mengubah sisa waktu instruksi pembayaran menjadi menit dan detik. */
const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

/** Mengambil pesan error top up dari respons backend jika tersedia. */
const errMessage = (err) =>
  err?.response?.data?.message ||
  Object.values(err?.response?.data?.errors || {})[0]?.[0] ||
  'Terjadi kesalahan. Coba lagi.';

// 'phone' = bayar ke nomor telepon (e-wallet), 'va' = Virtual Account
const PAYMENT_KIND = {
  'gopay': 'phone',
  'dana': 'phone',
  'va bri': 'va',
  'seabank': 'va',
};

// Kode bank (prefix VA). SESUAIKAN dengan kode resmi dari bank/payment gateway Anda.
const BANK_CODES = {
  'va bri': '77777',
  'seabank': '90100',
};

/** Menghapus seluruh karakter nonangka dari input pembayaran. */
const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

// 081234567890 -> 0812-3456-7890
/** Mengelompokkan digit nomor telepon agar mudah dibaca. */
const formatPhone = (v) => onlyDigits(v).replace(/(\d{4})(?=\d)/g, '$1-');

// Tentukan jenis pembayaran & kode yang ditampilkan
/** Menentukan nomor tujuan dan instruksi sesuai jenis metode top up. */
function getPayInfo(topup, phoneNumber) {
  const key = String(topup.method_name || '').toLowerCase().trim();
  const kind = PAYMENT_KIND[key] || (topup.type === 'va' ? 'va' : 'phone');
  const phone = onlyDigits(topup.phone_number || phoneNumber);

  if (kind === 'va') {
    const bankCode = BANK_CODES[key] || '';
    // Nomor telepon tanpa angka 0 di depan: 0812xxx -> 812xxx
    return { kind, phone, code: phone ? bankCode + phone.replace(/^0/, '') : '' };
  }
  return { kind, phone, code: phone };
}

/**
 * Props:
 *  - phoneNumber: nomor telepon driver (user_profile.nomor_telepon)
 *  - onBack(): kembali ke halaman sebelumnya
 *  - onDone(saldoBaru): dipanggil saat user menekan "Kembali ke Beranda"
 */
/** Alur memilih metode, membuat instruksi, dan menyelesaikan top up saldo. */
export default function TopUp({ phoneNumber, onBack, onDone, wallet, skipPinConfirmation = false, onManagePin }) {
  const [step, setStep] = useState('select'); // select | pay | success
  const [methods, setMethods] = useState([]);
  const [limits, setLimits] = useState({ min: 10000, max: 5000000 });
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState(100000);
  const [topup, setTopup] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(skipPinConfirmation);
  const [hideBalance] = useState(() => localStorage.getItem('ev_hide_saldo') === '1');
  const pollRef = useRef(null);

  useEffect(() => {
    getTopupMethods()
      .then((d) => {
        setMethods(d.methods);
        setLimits({ min: d.min_amount, max: d.max_amount });
      })
      .catch((e) => setError(errMessage(e)));
  }, []);

  useEffect(() => {
    if (step !== 'pay' || !topup) return undefined;

    const tick = setInterval(() => setNow(Date.now()), 1000);
    pollRef.current = setInterval(async () => {
      try {
        const latest = await getTopup(topup.reference);
        setTopup(latest);
        if (latest.status === 'paid') setStep('success');
      } catch {
        /* abaikan error jaringan sesaat */
      }
    }, 3000);

    return () => {
      clearInterval(tick);
      clearInterval(pollRef.current);
    };
  }, [step, topup?.reference]); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = useMemo(
    () => (topup ? new Date(topup.expires_at).getTime() - now : 0),
    [topup, now]
  );
  const expired = step === 'pay' && topup && (topup.status === 'expired' || remaining <= 0);

  const amountValid = amount >= limits.min && amount <= limits.max;
  const walletActive = !wallet?.status_dompet || String(wallet.status_dompet).toLowerCase() === 'aktif';
  const selectedMethod = methods.find((item) => String(item.id) === String(method));
  const paymentFee = Number(selectedMethod?.fee ?? 0);
  const paymentTotal = amount + paymentFee;

  /** Membuat instruksi pembayaran setelah Driver melewati konfirmasi PIN. */
  const createPaymentInstruction = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await createTopup({ method, amount });
      setTopup(data);
      setNow(Date.now());
      setStep('pay');
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  /** Meminta PIN sebelum instruksi Top Up dibuat. */
  const handleCreate = () => {
    if (pinVerified) {
      createPaymentInstruction();
      return;
    }
    setError('');
    setShowPinPrompt(true);
  };

  /** Memverifikasi PIN lalu membuat instruksi pembayaran Top Up. */
  const handleConfirmPin = async (event) => {
    event.preventDefault();
    if (pin.length !== 6) {
      setError('PIN harus terdiri dari 6 digit angka.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyPin(pin);
      setPinVerified(true);
      setShowPinPrompt(false);
      setPin('');
      await createPaymentInstruction();
    } catch (verificationError) {
      setError(errMessage(verificationError));
    } finally {
      setLoading(false);
    }
  };

  /** Menjalankan pembayaran simulasi dan mengirim saldo baru ke pemanggil. */
  const handleSimulate = async () => {
    setError('');
    try {
      const data = await simulatePayTopup(topup.reference);
      setTopup(data);
      setStep('success');
    } catch (e) {
      setError(errMessage(e));
    }
  };

  /** Menyalin nomor rekening atau referensi instruksi ke clipboard. */
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  /** Mengulang alur top up dengan menghapus instruksi dan error lama. */
  const restart = () => {
    setTopup(null);
    setError('');
    setPin('');
    setPinVerified(skipPinConfirmation);
    setShowPinPrompt(false);
    setStep('select');
  };

  /* ---------- Langkah 3: berhasil ---------- */
  if (step === 'success' && topup) {
    return (
      <div className="tu-page">
        <div className="tu-success">
          <div className="tu-check" aria-hidden="true">✓</div>
          <h1>Pembayaran Berhasil!</h1>
          <p>Saldo dompet Anda sudah bertambah.</p>

          <dl className="tu-detail">
            <div><dt>Nominal Top Up</dt><dd>{rupiah(topup.amount)}</dd></div>
            <div><dt>Metode Pembayaran</dt><dd>{topup.method_name}</dd></div>
            <div><dt>Kode Transaksi</dt><dd>{topup.reference}</dd></div>
            <div>
              <dt>Tanggal</dt>
              <dd>
                {new Date(topup.paid_at || now).toLocaleString('id-ID', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </dd>
            </div>
            {typeof topup.saldo === 'number' && (
              <div><dt>Saldo Sekarang</dt><dd>{rupiah(topup.saldo)}</dd></div>
            )}
          </dl>

          <button className="tu-btn" onClick={() => onDone?.(topup.saldo)}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Langkah 2: tampilkan nomor / kode VA ---------- */
  if (step === 'pay' && topup) {
    const { kind, code } = getPayInfo(topup, phoneNumber);
    const isVA = kind === 'va';

    return (
      <div className="tu-page">
        <header className="tu-header">
          <button className="tu-icon-btn" onClick={restart} aria-label="Ganti metode">←</button>
          <h1>{topup.method_name}</h1>
        </header>

        <section className="tu-card tu-pay">
          <p className="tu-muted">
            {isVA
              ? `Transfer ke Virtual Account ${topup.method_name} berikut`
              : `Bayar melalui aplikasi ${topup.method_name} ke nomor berikut`}
          </p>

          {code ? (
            <div className="tu-va">
              <span className="tu-va-number">{isVA ? code : formatPhone(code)}</span>
              <button className="tu-copy" onClick={() => handleCopy(code)}>
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
          ) : (
            <p className="tu-error" role="alert">
              Nomor telepon driver belum tersedia. Lengkapi nomor telepon di profil Anda.
            </p>
          )}

          <div className="tu-timer" aria-live="polite">
            <span className="tu-muted">Berlaku hingga</span>
            <strong className={expired ? 'tu-expired' : ''}>
              {expired ? 'Kedaluwarsa' : formatCountdown(remaining)}
            </strong>
          </div>

          <div className="tu-amount">
            <span className="tu-muted">Nominal Top Up</span>
            <strong>{rupiah(topup.amount)}</strong>
          </div>

          {topup.total > topup.amount && (
            <div className="tu-amount">
              <span className="tu-muted">Total yang dibayar (termasuk biaya layanan)</span>
              <strong>{rupiah(topup.total)}</strong>
            </div>
          )}

          <p className="tu-note">
            Pastikan nominal sesuai. Saldo akan masuk otomatis setelah pembayaran terkonfirmasi.
          </p>
        </section>

        {error && <p className="tu-error" role="alert">{error}</p>}

        {expired ? (
          <button className="tu-btn" onClick={restart}>Buat Kode Baru</button>
        ) : (
          <p className="tu-waiting">Menunggu pembayaran…</p>
        )}

        {import.meta.env.DEV && !expired && (
          <button className="tu-btn" onClick={handleSimulate}>
            Simulasi bayar
          </button>
        )}
      </div>
    );
  }

  /* ---------- Langkah 1: pilih nominal + metode ---------- */
  return (
    <div className="tu-page">
      <header className="tu-header">
        <button className="tu-icon-btn" onClick={onBack} aria-label="Kembali">←</button>
        <h1>Top Up Saldo</h1>
      </header>

      <section className="tu-card tu-wallet-summary" aria-label="Ringkasan saldo dompet">
        <div>
          <span className="tu-muted">Saldo tersedia</span>
          <strong>{hideBalance ? 'Rp ••••••' : rupiah(wallet?.saldo_tersedia ?? Math.max(0, Number(wallet?.saldo ?? 0) - Number(wallet?.saldo_hold ?? 0)))}</strong>
        </div>
        <div>
          <span className="tu-muted">Saldo tertahan</span>
          <strong>{hideBalance ? 'Rp ••••••' : rupiah(wallet?.saldo_hold ?? 0)}</strong>
        </div>
      </section>

      <section className="tu-card">
        <h2>Nominal</h2>
        <input
          className="tu-input"
          type="text"
          inputMode="numeric"
          value={amount ? rupiah(amount) : ''}
          onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
          aria-label="Nominal top up"
        />
        <div className="tu-chips">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`tu-chip ${amount === p ? 'is-active' : ''}`}
              onClick={() => setAmount(p)}
            >
              {rupiah(p)}
            </button>
          ))}
        </div>
        {!amountValid && (
          <p className="tu-error">
            Nominal harus antara {rupiah(limits.min)} dan {rupiah(limits.max)}.
          </p>
        )}
      </section>

      <section className="tu-card">
        <label className="tu-label" htmlFor="tu-payment-method">Metode Pembayaran</label>
        <select
          id="tu-payment-method"
          className="tu-select"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          disabled={methods.length === 0}
          required
        >
          <option value="" disabled>
            {methods.length ? 'Pilih metode pembayaran' : 'Metode pembayaran belum tersedia'}
          </option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}{m.fee > 0 ? ` · Biaya ${rupiah(m.fee)}` : ''}
            </option>
          ))}
        </select>
        {method && selectedMethod?.description && (
          <p className="tu-muted tu-method-description">
            {selectedMethod.description}
          </p>
        )}
      </section>

      {method && amountValid && (
        <section className="tu-card tu-order-summary" aria-label="Ringkasan pembayaran">
          <h2>Ringkasan Top Up</h2>
          <div><span>Nominal Top Up</span><strong>{rupiah(amount)}</strong></div>
          <div><span>Metode Pembayaran</span><strong>{selectedMethod?.name}</strong></div>
          <div><span>Biaya layanan</span><strong>{rupiah(paymentFee)}</strong></div>
          <div className="tu-order-total"><span>Total pembayaran</span><strong>{rupiah(paymentTotal)}</strong></div>
        </section>
      )}

      {error && <p className="tu-error" role="alert">{error}</p>}

      {showPinPrompt ? (
        <form className="tu-card tu-pin-confirm" onSubmit={handleConfirmPin}>
          <h2>Konfirmasi PIN</h2>
          <p className="tu-muted">Masukkan PIN untuk membuat instruksi pembayaran.</p>
          <label className="tu-label" htmlFor="tu-confirm-pin">PIN Dompet</label>
          <input
            id="tu-confirm-pin"
            className="tu-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
          />
          <button className="tu-btn" type="submit" disabled={loading || pin.length !== 6}>
            {loading ? 'Memeriksa PIN…' : 'Konfirmasi & Lanjut Bayar'}
          </button>
          <button className="tu-text-btn" type="button" onClick={() => { setShowPinPrompt(false); setPin(''); setError(''); }}>
            Kembali ke ringkasan
          </button>
        </form>
      ) : (
        <>
          <button
            className="tu-btn"
            disabled={!method || !amountValid || loading || !walletActive}
            onClick={handleCreate}
          >
            {loading ? 'Memproses…' : 'Lanjut Bayar'}
          </button>
          <button type="button" className="tu-text-btn" onClick={onManagePin}>
            Kelola PIN
          </button>
          {!walletActive && <p className="tu-error" role="alert">Dompet sedang tidak aktif. Hubungi bantuan sebelum melakukan Top Up.</p>}
        </>
      )}
    </div>
  );
}
