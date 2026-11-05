import client from './client';
/** Mengambil daftar metode pembayaran yang tersedia untuk top up. */
export const getTopupMethods = async () => (await client.get('/topup/methods')).data.data;
/** Membuat instruksi top up dengan metode dan nominal yang dipilih. */
export const createTopup = async ({ method, amount }) => (await client.post('/topup', { method, amount })).data.data;
/** Memeriksa status instruksi top up berdasarkan nomor referensi. */
export const getTopup = async (reference) => (await client.get(`/topup/${reference}`)).data.data;
/** Menjalankan simulasi pembayaran top up pada alur demo. */
export const simulatePayTopup = async (reference) => (await client.post(`/topup/${reference}/simulate-pay`)).data.data;
