import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cashRegisterAPI } from '../api';

export const useCashRegisterStore = defineStore('cashRegister', () => {
  const currentSession = ref(null);
  const sessions = ref([]);
  const movements = ref([]);
  const summary = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const isOpen = computed(() => currentSession.value?.status === 'open');

  const fetchCurrentSession = async () => {
    try {
      const res = await cashRegisterAPI.getCurrentSession();
      currentSession.value = res.data || null;
    } catch (err) {
      currentSession.value = null;
    }
  };

  const fetchSessions = async (params = {}) => {
    try {
      loading.value = true;
      const res = await cashRegisterAPI.getSessions(params);
      sessions.value = res.data || [];
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      loading.value = false;
    }
  };

  const openSession = async (data) => {
    try {
      loading.value = true;
      const res = await cashRegisterAPI.openSession(data);
      currentSession.value = res.data;
      return res.data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al abrir sesión';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const closeSession = async (id, data) => {
    try {
      loading.value = true;
      const res = await cashRegisterAPI.closeSession(id, data);
      currentSession.value = null;
      return res.data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al cerrar sesión';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchMovements = async (sessionId, params = {}) => {
    try {
      loading.value = true;
      const res = await cashRegisterAPI.getMovements(sessionId, params);
      movements.value = res.data || [];
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      loading.value = false;
    }
  };

  const registerMovement = async (data) => {
    try {
      loading.value = true;
      const res = await cashRegisterAPI.registerMovement(data);
      movements.value.unshift(res.data);
      return res.data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al registrar movimiento';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSummary = async (params = {}) => {
    try {
      const res = await cashRegisterAPI.getSummary(params);
      summary.value = res.data;
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const clearError = () => { error.value = null; };

  return {
    currentSession, sessions, movements, summary, loading, error, isOpen,
    fetchCurrentSession, fetchSessions, openSession, closeSession,
    fetchMovements, registerMovement, fetchSummary, clearError
  };
});
