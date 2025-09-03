import api from './client';

export const reportsApi = {
  sales: (params: any) => api.get('/reports/sales', { params }).then(r => r.data),
  inventory: (params: any) => api.get('/reports/inventory', { params }).then(r => r.data),
  customers: (params: any) => api.get('/reports/customers', { params }).then(r => r.data),
  suppliers: (params: any) => api.get('/reports/suppliers', { params }).then(r => r.data),
  profitLoss: (params: any) => api.get('/reports/profit-loss', { params }).then(r => r.data),
  stockMovements: (params: any) => api.get('/reports/stock-movements', { params }).then(r => r.data),
  topProducts: (params: any) => api.get('/reports/top-products', { params }).then(r => r.data),
  staffPerformance: (params: any) => api.get('/reports/staff-performance', { params }).then(r => r.data),
  deliveryPerformance: (params: any) => api.get('/reports/delivery-performance', { params }).then(r => r.data),
  inventoryTurnover: (params: any) => api.get('/reports/inventory-turnover', { params }).then(r => r.data),
  damageCost: (params: any) => api.get('/damages/cost-report', { params }).then(r => r.data),
  export: (params: { type: string; format: 'pdf' | 'excel'; startDate?: string; endDate?: string }) =>
    api.get('/reports/export', { params, responseType: 'blob' as const }).then(r => r.data),
};

export default reportsApi;
