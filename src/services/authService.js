import api from './api';

export async function login(phone, password) {
  const { data } = await api.post('/login', { phone, password });
  return { success: true, user: data.user, token: data.token };
}

export function logout() {
  return { success: true };
}
