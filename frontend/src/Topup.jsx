import { useEffect, useMemo, useRef, useState } from 'react';
import { createTopup, getTopup, getTopupMethods, simulatePayTopup } from './api/topup';
import './topup.css';

// Logo metode pembayaran (folder: src/assets/payment foto)
import gopayLogo from './assets/payment foto/gopay.png';
import danaLogo from './assets/payment foto/dana.webp';
import briLogo from './assets/payment foto/bri.png';
import seabankLogo from './assets/payment foto/seabank.png';

const PRESETS = [20000, 50000, 100000, 200000, 500000];

const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const errMessage = (err) =>
  err?.response?.data?.message ||
  Object.values(err?.response?.data?.errors || {})[0]?.[0] ||
  'Terjadi kesalahan. Coba lagi.';

// Kunci = nama metode di tabel metode_pembayaran (huruf kecil).
const LOGOS = {
  'gopay': gopayLogo,
  'dana': danaLogo,
  'va bri': briLogo,
  'seabank': seabankLogo,
};

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

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

// 081234567890 -> 0812-3456-7890
const formatPhone = (v) => onlyDigits(v).replace(/(\d{4})(?=\d)/g, '$1-');

// Tentukan jenis pembayaran & kode yang ditampilkan
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

function MethodLogo({ name }) {
  const src = LOGOS[name.toLowerCase().trim()];

  if (!src) {
    return (
      <span className="tu-logo tu-logo-fallback" aria-hidden="true">
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return <img className="tu-logo" src={src} alt="" />;
}

/**
 * Props:
 *  - phoneNumber: nomor telepon driver (user_profile.nomor_telepon)
 *  - onBack(): kembali ke halaman sebelumnya
 *  - onDone(saldoBaru): dipanggil saat user menekan "Kembali ke Beranda"
 */
export default function TopUp({ phoneNumber, onBack, onDone }) {
  const [step, setStep] = useState('select'); // select | pay | success
  const [methods, setMethods] = useState([]);
  const [limits, setLimits] = useState({ min: 10000, max: 5000000 });
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState(100000);
  const [topup, setTopup] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
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

  const handleCreate = async () => {
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

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const restart = () => {
    setTopup(null);
    setError('');
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
                {new Date(topup.paid_at || Date.now()).toLocaleString('id-ID', {
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
        <h2>Pilih Metode Pembayaran</h2>
        <ul className="tu-methods">
          {methods.map((m) => (
            <li key={m.id}>
              <button
                className={`tu-method ${method === m.id ? 'is-active' : ''}`}
                onClick={() => setMethod(m.id)}
                aria-pressed={method === m.id}
              >
                <MethodLogo name={m.name} />
                <span className="tu-method-text">
                  <span className="tu-method-name">{m.name}</span>
                  <span className="tu-muted">
                    {m.description}
                    {m.fee > 0 ? ` · Biaya layanan ${rupiah(m.fee)}` : ''}
                  </span>
                </span>
                {method === m.id && <span className="tu-method-check" aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="tu-error" role="alert">{error}</p>}

      <button
        className="tu-btn"
        disabled={!method || !amountValid || loading}
        onClick={handleCreate}
      >
        {loading ? 'Memproses…' : 'Lanjut Bayar'}
      </button>
    </div>
  );
}