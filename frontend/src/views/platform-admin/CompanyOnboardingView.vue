<template>
  <div class="onb-container">
    <div class="onb-card">
      <!-- Header -->
      <div class="onb-header">
        <div class="onb-logo">
          <span class="onb-logo-icon">🏢</span>
        </div>
        <h1 class="onb-title">Crear Nueva Empresa</h1>
        <p class="onb-subtitle">Configura una nueva empresa con su panel, usuarios y presencia web</p>
      </div>

      <!-- Stepper -->
      <div class="onb-stepper">
        <div v-for="(s, i) in steps" :key="i" class="onb-step" :class="{ active: step === i, done: step > i }">
          <div class="onb-step-circle">
            <span v-if="step > i">✓</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="onb-step-label">{{ s }}</span>
        </div>
      </div>

      <!-- Step 1: Company Info -->
      <div v-if="step === 0" class="onb-form">
        <h2 class="onb-form-title">Información de la Empresa</h2>
        <div class="onb-grid">
          <div class="onb-field">
            <label>Nombre de la Empresa *</label>
            <input v-model="form.name" class="onb-input" placeholder="Ej: Mi Empresa S.A." />
          </div>
          <div class="onb-field">
            <label>Nombre Comercial</label>
            <input v-model="form.commercial_name" class="onb-input" placeholder="Nombre que ven los clientes" />
          </div>
        </div>
        <div class="onb-grid">
          <div class="onb-field">
            <label>RUC / ID Fiscal</label>
            <input v-model="form.ruc" class="onb-input" placeholder="1799999999001" />
          </div>
          <div class="onb-field">
            <label>Slug (URL amigable)</label>
            <input v-model="form.slug" class="onb-input" placeholder="mi-empresa" />
          </div>
        </div>
        <div class="onb-grid">
          <div class="onb-field">
            <label>Email de Contacto</label>
            <input v-model="form.email" class="onb-input" type="email" placeholder="admin@empresa.com" />
          </div>
          <div class="onb-field">
            <label>Teléfono</label>
            <input v-model="form.phone" class="onb-input" placeholder="+593 99 999 9999" />
          </div>
        </div>
        <div class="onb-field">
          <label>Dirección Fiscal</label>
          <input v-model="form.fiscal_address" class="onb-input" placeholder="Av. Principal 123, Quito" />
        </div>
        <div class="onb-grid">
          <div class="onb-field">
            <label>Tipo de Negocio</label>
            <select v-model="form.business_type_id" class="onb-input">
              <option :value="null">Seleccionar...</option>
              <option v-for="bt in businessTypes" :key="bt.id" :value="bt.id">{{ bt.name }}</option>
            </select>
          </div>
          <div class="onb-field">
            <label>Sitio Web</label>
            <input v-model="form.website" class="onb-input" placeholder="https://empresa.com" />
          </div>
        </div>
      </div>

      <!-- Step 2: Subscription Plan -->
      <div v-if="step === 1" class="onb-form">
        <h2 class="onb-form-title">Plan de Suscripción</h2>
        <div class="onb-plans-grid">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="onb-plan-card"
            :class="{ selected: form.subscription_plan_id === plan.id }"
            @click="form.subscription_plan_id = plan.id"
          >
            <div class="onb-plan-tier">{{ plan.tier }}</div>
            <div class="onb-plan-name">{{ plan.name }}</div>
            <div class="onb-plan-price">${{ plan.price_monthly }}<span>/mes</span></div>
            <div class="onb-plan-features">
              <div v-for="(val, key) in (plan.features || {})" :key="key" class="onb-plan-feature">
                <span v-if="val">✓</span><span v-else class="onb-plan-no">✗</span>
                {{ key.replace(/_/g, ' ') }}
              </div>
            </div>
          </div>
        </div>
        <div class="onb-info-box">
          <span>ℹ️</span> Se iniciará un periodo de prueba de 14 días con todas las funciones del plan seleccionado.
        </div>
      </div>

      <!-- Step 3: Dashboard Configuration -->
      <div v-if="step === 2" class="onb-form">
        <h2 class="onb-form-title">Configuración del Dashboard</h2>
        <p class="onb-form-desc">Selecciona los widgets que aparecerán en el panel de la empresa</p>
        <div class="onb-widgets-grid">
          <div
            v-for="widget in defaultWidgets"
            :key="widget.type"
            class="onb-widget-card"
            :class="{ selected: widget.visible }"
            @click="widget.visible = !widget.visible"
          >
            <div class="onb-widget-icon">{{ widget.icon }}</div>
            <div class="onb-widget-info">
              <div class="onb-widget-name">{{ widget.title }}</div>
              <div class="onb-widget-desc">{{ widget.description }}</div>
            </div>
            <div class="onb-widget-toggle">
              <div class="onb-toggle" :class="{ on: widget.visible }">
                <div class="onb-toggle-dot"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Admin User -->
      <div v-if="step === 3" class="onb-form">
        <h2 class="onb-form-title">Administrador de la Empresa</h2>
        <p class="onb-form-desc">Crea el usuario administrador que tendrá acceso al panel</p>
        <div class="onb-grid">
          <div class="onb-field">
            <label>Nombre del Admin *</label>
            <input v-model="form.admin_name" class="onb-input" placeholder="Juan Pérez" />
          </div>
          <div class="onb-field">
            <label>Email del Admin *</label>
            <input v-model="form.admin_email" class="onb-input" type="email" placeholder="admin@empresa.com" />
          </div>
        </div>
        <div class="onb-field">
          <label>Contraseña Temporal</label>
          <input v-model="form.admin_password" class="onb-input" type="password" placeholder="Mínimo 8 caracteres" />
          <span class="onb-hint">Se enviará un email de bienvenida al admin</span>
        </div>
      </div>

      <!-- Step 5: Review & Create -->
      <div v-if="step === 4" class="onb-form">
        <h2 class="onb-form-title">Revisar y Crear</h2>

        <div class="onb-review-section">
          <h3>📋 Datos de la Empresa</h3>
          <div class="onb-review-grid">
            <div class="onb-review-item"><span>Nombre:</span><strong>{{ form.name }}</strong></div>
            <div class="onb-review-item"><span>Slug:</span><strong>{{ form.slug }}</strong></div>
            <div class="onb-review-item"><span>RUC:</span><strong>{{ form.ruc || '—' }}</strong></div>
            <div class="onb-review-item"><span>Email:</span><strong>{{ form.email || '—' }}</strong></div>
            <div class="onb-review-item"><span>Teléfono:</span><strong>{{ form.phone || '—' }}</strong></div>
            <div class="onb-review-item"><span>Tipo:</span><strong>{{ getBusinessTypeName(form.business_type_id) }}</strong></div>
          </div>
        </div>

        <div class="onb-review-section">
          <h3>💳 Suscripción</h3>
          <div class="onb-review-grid">
            <div class="onb-review-item"><span>Plan:</span><strong>{{ getPlanName(form.subscription_plan_id) }}</strong></div>
            <div class="onb-review-item"><span>Periodo:</span><strong>14 días de prueba</strong></div>
          </div>
        </div>

        <div class="onb-review-section">
          <h3>📊 Dashboard</h3>
          <div class="onb-review-tags">
            <span v-for="w in defaultWidgets.filter(w => w.visible)" :key="w.type" class="onb-tag">
              {{ w.icon }} {{ w.title }}
            </span>
          </div>
        </div>

        <div class="onb-review-section">
          <h3>👤 Administrador</h3>
          <div class="onb-review-grid">
            <div class="onb-review-item"><span>Nombre:</span><strong>{{ form.admin_name }}</strong></div>
            <div class="onb-review-item"><span>Email:</span><strong>{{ form.admin_email }}</strong></div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="onb-nav">
        <button v-if="step > 0" class="onb-btn onb-btn-outline" @click="step--">
          ← Anterior
        </button>
        <div v-else></div>
        <div class="onb-nav-right">
          <button class="onb-btn onb-btn-outline" @click="$router.back()">Cancelar</button>
          <button
            v-if="step < steps.length - 1"
            class="onb-btn onb-btn-primary"
            @click="nextStep"
            :disabled="!canProceed"
          >
            Siguiente →
          </button>
          <button
            v-else
            class="onb-btn onb-btn-success"
            @click="createCompany"
            :disabled="creating"
          >
            {{ creating ? '⏳ Creando...' : '✅ Crear Empresa' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { platformAdminAPI } from '../../api';
import Swal from 'sweetalert2';

const router = useRouter();

const steps = ['Información', 'Plan', 'Dashboard', 'Admin', 'Revisar'];
const step = ref(0);
const creating = ref(false);

const businessTypes = ref([]);
const plans = ref([]);

const form = ref({
  name: '',
  commercial_name: '',
  slug: '',
  ruc: '',
  email: '',
  phone: '',
  fiscal_address: '',
  business_type_id: null,
  website: '',
  subscription_plan_id: null,
  admin_name: '',
  admin_email: '',
  admin_password: 'Admin123!',
});

const defaultWidgets = ref([
  { type: 'kpi', title: 'Ventas del Mes', description: 'KPI con ingresos mensuales', icon: '💰', visible: true },
  { type: 'kpi', title: 'Clientes Activos', description: 'Total de clientes activos', icon: '👥', visible: true },
  { type: 'chart', title: 'Gráfico de Ventas', description: 'Tendencia de ventas mensual', icon: '📈', visible: true },
  { type: 'table', title: 'Productos Top', description: 'Los productos más vendidos', icon: '📦', visible: true },
  { type: 'list', title: 'Últimos Pedidos', description: 'Pedidos recientes', icon: '🛒', visible: true },
  { type: 'status', title: 'Estado del Inventario', description: 'Alertas de stock bajo', icon: '⚠️', visible: false },
  { type: 'kpi', title: 'Ingresos Anuales', description: 'Acumulado del año', icon: '📊', visible: false },
  { type: 'chart', title: 'Gráfico de Clientes', description: 'Nuevos clientes por mes', icon: '📉', visible: false },
]);

const canProceed = computed(() => {
  if (step.value === 0) return form.value.name.trim().length >= 2;
  if (step.value === 1) return true; // plan optional
  if (step.value === 2) return true; // widgets have defaults
  if (step.value === 3) return form.value.admin_name.trim() && form.value.admin_email.trim();
  return true;
});

const nextStep = () => { if (canProceed.value) step.value++; };

const getBusinessTypeName = (id) => businessTypes.value.find(bt => bt.id === id)?.name || '—';
const getPlanName = (id) => plans.value.find(p => p.id === id)?.name || 'Sin plan (trial básico)';

const createCompany = async () => {
  creating.value = true;
  try {
    const payload = {
      name: form.value.name,
      slug: form.value.slug,
      commercial_name: form.value.commercial_name,
      ruc: form.value.ruc,
      email: form.value.email,
      phone: form.value.phone,
      fiscal_address: form.value.fiscal_address,
      business_type_id: form.value.business_type_id,
      website: form.value.website,
      subscription_plan_id: form.value.subscription_plan_id,
      admin_name: form.value.admin_name,
      admin_email: form.value.admin_email,
      admin_password: form.value.admin_password,
      settings: {},
      dashboard_config: {
        layout: 'default',
        widgets: defaultWidgets.value.filter(w => w.visible).map(w => ({
          type: w.type,
          title: w.title,
          visible: true,
        })),
      },
    };

    const res = await platformAdminAPI.createCompany(payload);
    const company = res.data?.data?.company;

    await Swal.fire({
      icon: 'success',
      title: '¡Empresa Creada!',
      html: `
        <p><strong>${company?.name || form.value.name}</strong></p>
        <p>14 días de prueba activados</p>
        <p>Admin: ${form.value.admin_email}</p>
      `,
      confirmButtonText: 'Ir a la empresa',
    });

    if (company?.id) {
      router.push(`/app/platform/companies/${company.id}`);
    } else {
      router.push('/app/platform/companies');
    }
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error al crear empresa',
      text: err.response?.data?.error || err.message || 'Error desconocido',
    });
  } finally {
    creating.value = false;
  }
};

onMounted(async () => {
  try {
    const [btRes, planRes] = await Promise.all([
      platformAdminAPI.getBusinessTypes(),
      platformAdminAPI.getPlans(),
    ]);
    businessTypes.value = btRes.data?.data || btRes.data || [];
    plans.value = planRes.data?.data || planRes.data || [];
  } catch (e) {
    console.warn('Failed to load business types/plans:', e.message);
  }
});
</script>

<style scoped>
.onb-container { display: flex; justify-content: center; padding: 30px 20px; min-height: calc(100vh - 80px); }
.onb-card { background: #fff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); max-width: 800px; width: 100%; padding: 36px; }

/* Header */
.onb-header { text-align: center; margin-bottom: 28px; }
.onb-logo { width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.onb-logo-icon { font-size: 28px; }
.onb-title { font-family: 'Inter', sans-serif; font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 0; }
.onb-subtitle { font-size: 0.9rem; color: #94a3b8; margin: 6px 0 0; }

/* Stepper */
.onb-stepper { display: flex; justify-content: center; gap: 8px; margin-bottom: 32px; }
.onb-step { display: flex; align-items: center; gap: 6px; }
.onb-step-circle { width: 30px; height: 30px; border-radius: 50%; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; transition: all 0.3s; }
.onb-step.active .onb-step-circle { background: #3b82f6; color: #fff; }
.onb-step.done .onb-step-circle { background: #10b981; color: #fff; }
.onb-step-label { font-size: 0.78rem; color: #94a3b8; font-weight: 500; }
.onb-step.active .onb-step-label { color: #1e293b; font-weight: 600; }

/* Form */
.onb-form-title { font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0 0 6px; }
.onb-form-desc { font-size: 0.88rem; color: #94a3b8; margin: 0 0 20px; }
.onb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.onb-field { margin-bottom: 16px; }
.onb-field label { display: block; font-weight: 600; font-size: 0.82rem; color: #475569; margin-bottom: 4px; }
.onb-input { width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.88rem; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; }
.onb-input:focus { border-color: #3b82f6; }
.onb-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; display: block; }

/* Plans */
.onb-plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px; }
.onb-plan-card { border: 2px solid #e2e8f0; border-radius: 14px; padding: 20px; cursor: pointer; transition: all 0.2s; text-align: center; }
.onb-plan-card:hover { border-color: #3b82f6; }
.onb-plan-card.selected { border-color: #3b82f6; background: #eff6ff; }
.onb-plan-tier { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; }
.onb-plan-name { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 4px 0; }
.onb-plan-price { font-size: 1.5rem; font-weight: 800; color: #3b82f6; }
.onb-plan-price span { font-size: 0.8rem; font-weight: 400; color: #94a3b8; }
.onb-plan-features { margin-top: 12px; text-align: left; }
.onb-plan-feature { font-size: 0.78rem; color: #475569; padding: 2px 0; }
.onb-plan-feature span:first-child { margin-right: 4px; }
.onb-plan-no { color: #cbd5e1; }
.onb-info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; font-size: 0.85rem; color: #1e40af; display: flex; gap: 8px; align-items: center; }

/* Widgets */
.onb-widgets-grid { display: flex; flex-direction: column; gap: 10px; }
.onb-widget-card { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.onb-widget-card:hover { border-color: #3b82f6; }
.onb-widget-card.selected { border-color: #10b981; background: #f0fdf4; }
.onb-widget-icon { font-size: 1.5rem; width: 40px; text-align: center; flex-shrink: 0; }
.onb-widget-info { flex: 1; }
.onb-widget-name { font-weight: 700; font-size: 0.88rem; color: #1e293b; }
.onb-widget-desc { font-size: 0.78rem; color: #94a3b8; }
.onb-toggle { width: 44px; height: 24px; border-radius: 12px; background: #e2e8f0; position: relative; transition: background 0.3s; flex-shrink: 0; }
.onb-toggle.on { background: #10b981; }
.onb-toggle-dot { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: 3px; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.onb-toggle.on .onb-toggle-dot { transform: translateX(20px); }

/* Review */
.onb-review-section { margin-bottom: 20px; }
.onb-review-section h3 { font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0 0 10px; }
.onb-review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.onb-review-item { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 8px; font-size: 0.85rem; }
.onb-review-item span { color: #64748b; }
.onb-review-item strong { color: #1e293b; }
.onb-review-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.onb-tag { padding: 6px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 0.82rem; font-weight: 500; color: #166534; }

/* Navigation */
.onb-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.onb-nav-right { display: flex; gap: 10px; }
.onb-btn { padding: 10px 22px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.88rem; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.onb-btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.onb-btn-primary:hover { background: #2563eb; }
.onb-btn-success { background: #10b981; color: #fff; border-color: #10b981; }
.onb-btn-success:hover { background: #059669; }
.onb-btn-outline { border-color: #e2e8f0; color: #475569; background: #fff; }
.onb-btn-outline:hover { border-color: #94a3b8; }
.onb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
