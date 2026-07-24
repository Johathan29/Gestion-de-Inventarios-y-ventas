import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import './assets/dashboard-theme.css';
import './assets/aurora.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info);
};

// Auto-install mock API test data in development mode
// Comentado: todas las llamadas van al backend real
// if (import.meta.env.DEV || import.meta.env.VITE_MOCK_API === 'true') {
//   import('./utils/testData.js').then(({ installTestData }) => {
//     installTestData();
//   });
// }

app.mount('#app');
