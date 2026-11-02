import api from './client';

export async function getPaymentHistory() {
    const { data } = await api.get('/payments/history');
    return data.data ?? data;
}

export async function getPaymentDetail(id) {
    const { data } = await api.get(`/payments/${id}`);
    return data.data ?? data;
}
