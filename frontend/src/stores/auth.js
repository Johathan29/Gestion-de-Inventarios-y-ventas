import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authAPI } from '../api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const isAuthenticated = computed(() => !!user.value);
  const userPermissions = computed(() => user.value?.permissions || {});
  const companyId = computed(() => user.value?.company_id || '00000000-0000-0000-0000-000000000001');

  const login = async (credentials) => {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await authAPI.login(credentials);
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      user.value = data.user;
      return data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al iniciar sesión';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const register = async (userData) => {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await authAPI.register(userData);
      return data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al registrarse';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = sessionStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout({ refreshToken });
      }
    } catch (err) {
      // Ignore errors on logout
    } finally {
      clearAuth();
    }
  };

  const clearAuth = () => {
    user.value = null;
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  };

  const fetchProfile = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) return;
      const { data } = await authAPI.me();
      user.value = data;
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuth();
      }
    }
  };

  const forgotPassword = async (email) => {
    try {
      const { data } = await authAPI.forgotPassword({ email });
      return data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al solicitar recuperación';
      throw err;
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const { data } = await authAPI.resetPassword({ token, password });
      return data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al restablecer contraseña';
      throw err;
    }
  };

  const updateProfile = (profileData) => {
    user.value = { ...user.value, ...profileData };
  };

  return {
    user, loading, error, isAuthenticated, userPermissions, companyId,
    login, register, logout, clearAuth, fetchProfile, updateProfile,
    forgotPassword, resetPassword
  };
});
