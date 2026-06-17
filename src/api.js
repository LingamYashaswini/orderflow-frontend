import axios from 'axios';

const API = axios.create({
  baseURL: 'https://orderflow-backend-5wcq.onrender.com/api',
});

// Distributor APIs
export const getDistributors = () => API.get('/distributors');
export const getDistributor = (id) => API.get(`/distributors/${id}`);
export const createDistributor = (data) => API.post('/distributors', data);
export const updateDistributor = (id, data) => API.put(`/distributors/${id}`, data);
export const deleteDistributor = (id) => API.delete(`/distributors/${id}`);

// Order APIs
export const getOrders = () => API.get('/orders');
export const getOrdersByDistributor = (distributorId) => API.get(`/orders/distributor/${distributorId}`);
export const createOrder = (data) => API.post('/orders', data);
export const updateOrder = (id, data) => API.put(`/orders/${id}`, data);
export const deleteOrder = (id) => API.delete(`/orders/${id}`);
export const login = (data) => API.post('/login', data);
export const getPayments = () => API.get('/payments');
export const createPayment = (data) => API.post('/payments', data);
export const deletePayment = (id) => API.delete(`/payments/${id}`);
export const updatePayment = (id, data) => API.put(`/payments/${id}`, data);