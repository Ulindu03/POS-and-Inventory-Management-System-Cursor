import client from './client';

export interface UserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'cashier' | 'sales_rep';
  language?: 'en' | 'si';
}

export const usersApi = {
  list(config?: any) {
    return client.get('/users', config);
  },
  create(data: UserInput) {
    return client.post('/users', data);
  },
  update(id: string, data: Partial<Omit<UserInput, 'password'>>) {
    return client.put(`/users/${id}`, data);
  },
  setActive(id: string, isActive: boolean) {
    return client.patch(`/users/${id}/active`, { isActive });
  },
  setRole(id: string, role: 'admin' | 'cashier' | 'sales_rep') {
    return client.patch(`/users/${id}/role`, { role });
  },
  delete(id: string) {
    return client.delete(`/users/${id}`);
  },
};
