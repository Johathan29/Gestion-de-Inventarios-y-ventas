import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true);
  const sidebarMobileOpen = ref(false);
  const darkMode = ref(localStorage.getItem('darkMode') === 'true');

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value;
  };

  const toggleSidebarMobile = () => {
    sidebarMobileOpen.value = !sidebarMobileOpen.value;
  };

  const closeSidebarMobile = () => {
    sidebarMobileOpen.value = false;
  };

  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value;
    localStorage.setItem('darkMode', darkMode.value);
    if (darkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const initTheme = () => {
    if (darkMode.value) {
      document.documentElement.classList.add('dark');
    }
  };

  const pageTitle = ref('');
  const pageBreadcrumb = ref([]);

  const setPage = (title, breadcrumb = []) => {
    pageTitle.value = title;
    pageBreadcrumb.value = breadcrumb;
  };

  return {
    sidebarOpen, sidebarMobileOpen, darkMode, pageTitle, pageBreadcrumb,
    toggleSidebar, toggleSidebarMobile, closeSidebarMobile, toggleDarkMode, initTheme, setPage
  };
});
