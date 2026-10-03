// Asumsi: ./client.js mengekspor instance axios (default export) yang sudah
// membawa baseURL + token Sanctum. Sesuaikan jika bentuknya berbeda.
import client from './client';
export const getTopupMethods = async () => {
  const res = await client.get('/topup/methods');
  return res.data.data;
};
export const createTopup = async ({ method, amount }) => {
  const res = await client.post('/topup', { method, amount });
  return res.data.data;
};
export const getTopup = async (reference) => {
  const res = await client.get(`/topup/${reference}`);
  return res.data.data;
};

// Hanya untuk development (backend menolak jika APP_DEBUG=false)
export const simulatePayTopup = async (reference) => {
  const res = await client.post(`/topup/${reference}/simulate-pay`);
  return res.data.data;
};