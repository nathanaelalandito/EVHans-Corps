/** Batas panjang nomor telepon (jumlah digit angka) yang berlaku di seluruh aplikasi. */
export const PHONE_MAX_DIGITS = 15;

/** Pola HTML untuk atribut `pattern` pada input nomor telepon (1 sampai 15 digit angka). */
export const PHONE_MIN_DIGITS = 8;
export const PHONE_PATTERN = `[0-9]{${PHONE_MIN_DIGITS},${PHONE_MAX_DIGITS}}`;
export const PHONE_VALIDATION_MESSAGE = 'Nomor telepon 8 sampai 15 digit angka.';

/** Membuang karakter non-angka lalu memotong hasilnya maksimal PHONE_MAX_DIGITS digit. */
export function normalizePhone(value) {
    return String(value ?? '').replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
}
