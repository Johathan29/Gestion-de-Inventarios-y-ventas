import { useNotificationsStore } from '../stores/notifications';

/**
 * Composable para disparar notificaciones toast desde cualquier componente.
 *
 * const toast = useToast();
 * toast.success('Producto agregado al carrito');
 * toast.error('No se pudo guardar');
 * toast.info('Sesión expirada');
 * toast.warning('Stock bajo');
 */
export function useToast() {
  const store = useNotificationsStore();

  return {
    success: (message, title) => store.success(message, title),
    error: (message, title) => store.error(message, title),
    info: (message, title) => store.info(message, title),
    warning: (message, title) => store.warning(message, title),
    remove: (id) => store.remove(id),
  };
}
