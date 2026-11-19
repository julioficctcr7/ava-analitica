import axios from 'axios';

const base = (typeof window !== 'undefined' && window.APP_BASE_URL) ? window.APP_BASE_URL : '';

const api = axios.create({
    baseURL: `${base}/api`,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('dedte_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export function extraerError(err) {
    const res = err?.response?.data;
    if (res?.errors) {
        const primero = Object.values(res.errors).flat()[0];
        if (primero) return primero;
    }
    return res?.message || 'Error de comunicación con el servidor.';
}

export default api;
