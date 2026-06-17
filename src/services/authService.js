import api from './api';

export async function requestOtp(phone) {
  const { data } = await api.post('/request-otp', { phone });
  return data;
}

export async function verifyOtp(phone, otp) {
  const { data } = await api.post('/verify-otp', { phone, otp });
  return { user: data.user, token: data.token };
}

export function logout() {
  return { success: true };
}
