<template>
  <div class="w-full">
    <!-- =====================================================
     INVENTORY TABS
====================================================== -->
    <div class="mb-6">
      <div class="flex items-center gap-6 border-b border-gray-200">
        <div
          v-for="tab in 4"
          :key="`inventory-tab-${tab}`"
          class="h-10 w-28 rounded skeleton-light"
        ></div>
      </div>
    </div>

    <!-- =====================================================
     PAGE HEADER
====================================================== -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
      <!-- Header -->
      <div class="space-y-3">
        <!-- Title -->
        <div class="h-7 w-64 rounded-lg skeleton"></div>

        <!-- Description -->
        <div class="h-4 w-72 rounded skeleton-light"></div>
      </div>

      <!-- Type Filter -->
      <div class="h-10 w-full sm:w-48 rounded-lg skeleton-border"></div>
    </div>

    <!-- =====================================================
     DESKTOP TABLE
====================================================== -->
    <div class="hidden md:block">
      <div class="nexus-card !p-0 overflow-hidden">
        <!-- Table Header -->
        <div
          class="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_1.2fr_100px] gap-4 items-center px-6 py-4 border-b border-gray-200"
          style="background: #f8fafc"
        >
          <div
            v-for="header in 6"
            :key="`movement-header-${header}`"
            class="h-3 rounded skeleton-light"
            :class="header === 2 ? 'w-32' : 'w-20'"
          ></div>
        </div>

        <!-- Table Rows -->
        <div
          v-for="row in 8"
          :key="`movement-row-${row}`"
          class="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_1.2fr_100px] gap-4 items-center px-6 py-4 border-b border-gray-100"
        >
          <!-- Product ID -->
          <div class="h-4 w-28 rounded skeleton-primary-light"></div>

          <!-- Product -->
          <div class="space-y-2">
            <div class="h-4 w-44 rounded skeleton"></div>

            <div class="h-3 w-24 rounded skeleton-light"></div>
          </div>

          <!-- Type -->
          <div class="h-6 w-24 rounded-full skeleton-badge"></div>

          <!-- Quantity -->
          <div class="h-4 w-16 rounded skeleton"></div>

          <!-- Reference -->
          <div class="h-4 w-32 rounded skeleton-light"></div>

          <!-- Date -->
          <div class="h-4 w-28 rounded skeleton-light"></div>
        </div>

        <!-- Pagination -->
        <div
          class="p-4 flex flex-col sm:flex-row justify-between items-center gap-4"
          style="background: #f8fafc; border-top: 1px solid #e2d6c8"
        >
          <!-- Counter -->
          <div class="h-4 w-64 rounded skeleton-light"></div>

          <!-- Pagination Buttons -->
          <div class="flex gap-2">
            <div class="h-9 w-24 rounded-md skeleton-border"></div>

            <div class="h-9 w-28 rounded-md skeleton-border"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- =====================================================
     MOBILE MOVEMENT CARDS
====================================================== -->
    <div class="md:hidden space-y-4">
      <div v-for="movement in 6" :key="`mobile-movement-${movement}`" class="dt-card-sm p-4">
        <!-- Product ID + Type -->
        <div class="flex items-center justify-between mb-3">
          <!-- Product ID -->
          <div class="h-4 w-28 rounded skeleton-primary-light"></div>

          <!-- Type Badge -->
          <div class="h-6 w-24 rounded-full skeleton-badge"></div>
        </div>

        <!-- Product Name -->
        <div class="h-4 w-48 rounded skeleton mb-4"></div>

        <!-- Details -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Quantity -->
          <div class="space-y-2">
            <div class="h-3 w-16 rounded skeleton-light"></div>

            <div class="h-5 w-20 rounded skeleton"></div>
          </div>

          <!-- Reference -->
          <div class="space-y-2">
            <div class="h-3 w-20 rounded skeleton-light"></div>

            <div class="h-4 w-28 rounded skeleton-light"></div>
          </div>

          <!-- Date -->
          <div class="col-span-2 space-y-2">
            <div class="h-3 w-12 rounded skeleton-light"></div>

            <div class="h-4 w-36 rounded skeleton-light"></div>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination -->
      <div
        class="p-4 flex flex-col sm:flex-row justify-between items-center gap-4"
        style="background: #f8fafc; border-top: 1px solid #e2d6c8"
      >
        <div class="h-4 w-64 rounded skeleton-light"></div>

        <div class="flex gap-2">
          <div class="h-9 w-24 rounded-md skeleton-border"></div>

          <div class="h-9 w-28 rounded-md skeleton-border"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  // Skeleton visual de movimientos de inventario.
  // No requiere API ni lógica adicional.
</script>

<style scoped>
  /* =====================================================
   BASE SKELETON
===================================================== */

  .skeleton,
  .skeleton-light,
  .skeleton-border,
  .skeleton-primary-light,
  .skeleton-badge {
    position: relative;

    overflow: hidden;
  }

  /* Main Skeleton */

  .skeleton {
    background: #e2e8f0;
  }

  /* Light Skeleton */

  .skeleton-light {
    background: #f1f5f9;
  }

  /* Input / Border Skeleton */

  .skeleton-border {
    background: #ffffff;

    border: 1px solid #e2e8f0;
  }

  /* Brown / Primary Accent */

  .skeleton-primary-light {
    background: #e9dfd4;
  }

  /* Badge Skeleton */

  .skeleton-badge {
    background: #f1f5f9;
  }

  /* =====================================================
   SHIMMER EFFECT
===================================================== */

  .skeleton::after,
  .skeleton-light::after,
  .skeleton-border::after,
  .skeleton-primary-light::after,
  .skeleton-badge::after {
    content: '';

    position: absolute;

    inset: 0;

    transform: translateX(-100%);

    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.65) 50%,
      transparent 100%
    );

    animation: movement-skeleton-shimmer 1.6s infinite;
  }

  /* =====================================================
   ANIMATION
===================================================== */

  @keyframes movement-skeleton-shimmer {
    100% {
      transform: translateX(100%);
    }
  }
</style>
