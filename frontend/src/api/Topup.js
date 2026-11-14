import client from './client';
export const getTopupMethods = async () => (await client.get('/topup/methods')).data.data;
export const createTopup = async ({ method, amount, pin }) => (await client.post('/topup', { method, amount, pin })).data.data;
export const getTopup = async (reference) => (await client.get(`/topup/${reference}`)).data.data;
export const simulatePayTopup = async (reference) => (await client.post(`/topup/${reference}/simulate-pay`)).data.data;
