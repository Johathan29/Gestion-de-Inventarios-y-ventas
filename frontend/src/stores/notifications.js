import { defineStore } from 'pinia';

let seed = 0;

/**
 * Store global de notificaciones toast.
 * Uso: const notif = useNotificationsStore(); notif.success('Producto guardado');
 */
export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    toasts: [],
  }),
  actions: {
    add({ type = 'success', message = '', title = '', duration = 4000 }) {
      const id = ++seed;
      this.toasts.push({ id, type, message, title });
      if (duration > 0) {
        setTimeout(() => this.remove(id), duration);
      }
      return id;
    },
    success(message, title = '') {
      return this.add({ type: 'success', message, title });
    },
    error(message, title = 'Error') {
      return this.add({ type: 'error', message, title, duration: 6000 });
    },
    info(message, title = 'Información') {
      return this.add({ type: 'info', message, title });
    },
    warning(message, title = 'Advertencia') {
      return this.add({ type: 'warning', message, title, duration: 5000 });
    },
    remove(id) {
      const idx = this.toasts.findIndex((t) => t.id === id);
      if (idx !== -1) this.toasts.splice(idx, 1);
    },
  },
});
