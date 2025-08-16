import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const getCrons = () => axios.get(`${API_BASE}/crons`);
export const createCron = (data) => axios.post(`${API_BASE}/crons`, data);
export const updateCron = (id, data) => axios.put(`${API_BASE}/crons/${id}`, data);
export const deleteCron = (id) => axios.delete(`${API_BASE}/crons/${id}`);
