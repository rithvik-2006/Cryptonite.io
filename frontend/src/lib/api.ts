import axios from 'axios';

// Gateway Fastify API for Markets/Tokens/Infrastructure
export const gatewayApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080',
  timeout: 10000,
});

// Brain FastAPI for Recommendations/Signals
export const brainApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BRAIN_URL || 'http://localhost:8000',
  timeout: 15000,
});

// Generic interceptors
const handleRequest = (config: any) => config;
const handleError = (error: any) => {
  console.error('API Error:', error?.response?.data || error.message);
  return Promise.reject(error);
};

gatewayApi.interceptors.request.use(handleRequest, handleError);
gatewayApi.interceptors.response.use((res) => res.data, handleError);

brainApi.interceptors.request.use(handleRequest, handleError);
brainApi.interceptors.response.use((res) => res.data, handleError);
