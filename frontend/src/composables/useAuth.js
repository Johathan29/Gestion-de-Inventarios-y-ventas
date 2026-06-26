import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';

export function useAuth() {
  const store = useAuthStore();

  const isLoggedIn = computed(() => !!store.user);
  const user = computed(() => store.user);
  const userRole = computed(() => store.user?.role_name);
  const userPermissions = computed(() => store.user?.permissions || {});

  const hasPermission = (module, action) => {
    const perms = userPermissions.value;
    return perms[module]?.includes(action) || perms.admin?.includes('access') || false;
  };

  const can = (module, action) => hasPermission(module, action);

  const isAdmin = computed(() => store.user?.role_id === 1);
  const isSupervisor = computed(() => store.user?.role_id === 2);
  const isCashier = computed(() => store.user?.role_id === 3);

  const userInitials = computed(() => {
    if (!store.user?.name) return '??';
    return store.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });

  return {
    isLoggedIn,
    user,
    userRole,
    userPermissions,
    hasPermission,
    can,
    isAdmin,
    isSupervisor,
    isCashier,
    userInitials,
    ...store
  };
}
