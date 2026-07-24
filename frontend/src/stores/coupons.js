import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { couponsAPI, promotionsAPI } from '../api';

export const useCouponStore = defineStore('coupons', () => {
  const coupons = ref([]);
  const promotions = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // --- Coupons ---
  const fetchCoupons = async (params = {}) => {
    try {
      loading.value = true;
      const res = await couponsAPI.getAll(params);
      coupons.value = res.data || [];
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      loading.value = false;
    }
  };

  const createCoupon = async (data) => {
    try {
      loading.value = true;
      const res = await couponsAPI.create(data);
      await fetchCoupons();
      return res.data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al crear cupón';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCoupon = async (id, data) => {
    try {
      const res = await couponsAPI.update(id, data);
      const idx = coupons.value.findIndex(c => c.id === id);
      if (idx !== -1) coupons.value[idx] = res.data;
      return res.data;
    } catch (err) {
      error.value = 'Error al actualizar cupón';
      throw err;
    }
  };

  const deleteCoupon = async (id) => {
    try {
      await couponsAPI.delete(id);
      coupons.value = coupons.value.filter(c => c.id !== id);
    } catch (err) {
      error.value = 'Error al eliminar cupón';
      throw err;
    }
  };

  const validateCoupon = async (code) => {
    try {
      const res = await couponsAPI.validate(code);
      return res.data;
    } catch (err) {
      return { valid: false, message: err.response?.data?.error?.message || 'Cupón inválido' };
    }
  };

  // --- Promotions ---
  const fetchPromotions = async (params = {}) => {
    try {
      loading.value = true;
      const res = await promotionsAPI.getAll(params);
      promotions.value = res.data || [];
    } catch (err) {
      console.error('Error fetching promotions:', err);
    } finally {
      loading.value = false;
    }
  };

  const createPromotion = async (data) => {
    try {
      loading.value = true;
      const res = await promotionsAPI.create(data);
      await fetchPromotions();
      return res.data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al crear promoción';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePromotion = async (id, data) => {
    try {
      const res = await promotionsAPI.update(id, data);
      const idx = promotions.value.findIndex(p => p.id === id);
      if (idx !== -1) promotions.value[idx] = res.data;
      return res.data;
    } catch (err) {
      error.value = 'Error al actualizar promoción';
      throw err;
    }
  };

  const deletePromotion = async (id) => {
    try {
      await promotionsAPI.delete(id);
      promotions.value = promotions.value.filter(p => p.id !== id);
    } catch (err) {
      error.value = 'Error al eliminar promoción';
      throw err;
    }
  };

  const clearError = () => { error.value = null; };

  return {
    coupons, promotions, loading, error,
    fetchCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon,
    fetchPromotions, createPromotion, updatePromotion, deletePromotion,
    clearError
  };
});
