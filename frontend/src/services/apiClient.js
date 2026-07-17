import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 20000
});

export function getApiErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
}

export default apiClient;
