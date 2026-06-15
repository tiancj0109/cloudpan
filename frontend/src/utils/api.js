import axios from 'axios';
import { message } from 'antd';

const api = axios.create({
    baseURL: '/cloudpan-api',
    // timeout: 10000, // Removed to support large file uploads
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath !== `${process.env.PUBLIC_URL}/login`) {
                window.location.href = `${process.env.PUBLIC_URL}/login?redirect=${encodeURIComponent(currentPath)}`;
            }
        } else {
            message.error(error.response?.data?.message || 'Network Error');
        }
        return Promise.reject(error);
    }
);

export default api;
