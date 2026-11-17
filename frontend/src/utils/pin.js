/** PIN enam digit lemah jika semua digit sama atau naik/turun tanpa wrap-around. */
export function isWeakPin(pin) {
  const value = String(pin ?? '');
  if (!/^\d{6}$/.test(value)) return false;
  if (/^(\d)\1{5}$/.test(value)) return true;
  const digits = [...value].map(Number);
  return digits.slice(1).every((digit, index) => digit === digits[index] + 1)
    || digits.slice(1).every((digit, index) => digit === digits[index] - 1);
}
