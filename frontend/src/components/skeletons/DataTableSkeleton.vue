<template>
  <div class="w-full">
    <!-- =====================================================
     PAGE HEADER SKELETON
====================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <!-- Title -->
      <div class="space-y-3">
        <div class="h-7 w-32 rounded-lg skeleton"></div>

        <div class="h-4 w-72 max-w-full rounded skeleton-light"></div>
      </div>

      <!-- Search + Button -->
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <!-- Search -->
        <div class="h-[44px] w-full sm:w-64 rounded-full skeleton-border"></div>

        <!-- New Product -->
        <div class="h-[44px] w-36 rounded-lg skeleton-primary"></div>
      </div>
    </div>

    <!-- =====================================================
     MAIN CARD
====================================================== -->
    <div class="nexus-card !p-0 overflow-hidden flex flex-col" style="min-height: 500px">
      <!-- =================================================
       TOOLBAR
  ================================================== -->
      <div
        class="p-4 border-b border-gray-200 flex justify-between items-center"
        style="background: #ffffff"
      >
        <!-- Left Controls -->
        <div class="flex gap-2">
          <!-- Filter -->
          <div class="h-9 w-24 rounded-md skeleton-border"></div>

          <!-- Sort -->
          <div class="h-9 w-28 rounded-md skeleton-border"></div>
        </div>

        <!-- View Toggle -->
        <div class="flex items-center gap-2">
          <div class="hidden sm:block h-4 w-12 rounded skeleton-light"></div>

          <div class="h-9 w-16 rounded-md skeleton-border"></div>
        </div>
      </div>

      <!-- =================================================
       TABLE SKELETON - DESKTOP
  ================================================== -->
      <div class="hidden md:block">
        <!-- Table Header -->
        <div
          class="grid grid-cols-[90px_70px_1.5fr_1fr_120px_100px_100px_100px] gap-4 items-center px-6 py-4 border-b border-gray-200"
          style="background: #f8fafc"
        >
          <div
            v-for="header in 8"
            :key="`table-header-${header}`"
            class="h-3 rounded skeleton-light"
            :class="header === 3 ? 'w-24' : 'w-16'"
          ></div>
        </div>

        <!-- Table Rows -->
        <div
          v-for="row in 8"
          :key="`table-row-${row}`"
          class="grid grid-cols-[90px_70px_1.5fr_1fr_120px_100px_100px_100px] gap-4 items-center px-6 py-4 border-b border-gray-100"
        >
          <!-- SKU -->
          <div class="h-4 w-16 rounded skeleton-primary-light"></div>

          <!-- Image -->
          <div class="w-12 h-12 rounded-md skeleton-image"></div>

          <!-- Name -->
          <div class="space-y-2">
            <div class="h-4 w-40 rounded skeleton"></div>
            <div class="h-3 w-20 rounded skeleton-light"></div>
          </div>

          <!-- Category -->
          <div class="h-6 w-24 rounded-full skeleton-badge"></div>

          <!-- Price -->
          <div class="h-4 w-20 rounded skeleton"></div>

          <!-- Stock -->
          <div class="h-4 w-12 rounded skeleton"></div>

          <!-- Status -->
          <div class="h-6 w-16 rounded-full skeleton-badge"></div>

          <!-- Actions -->
          <div class="flex gap-2">
            <div class="w-8 h-8 rounded-md skeleton-light"></div>
            <div class="w-8 h-8 rounded-md skeleton-light"></div>
          </div>
        </div>
      </div>

      <!-- =================================================
       GRID SKELETON - DESKTOP
  ================================================== -->
      <div class="hidden md:block p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="card in 8"
            :key="`grid-card-${card}`"
            class="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <!-- Image -->
            <div class="aspect-[4/3] skeleton-image relative overflow-hidden">
              <div class="skeleton-shimmer"></div>
            </div>

            <!-- Body -->
            <div class="p-3">
              <!-- Name + Featured -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-3/4 rounded skeleton"></div>

                  <div class="h-3 w-1/2 rounded skeleton-light"></div>
                </div>

                <div class="w-4 h-4 rounded skeleton-light"></div>
              </div>

              <!-- Price + Stock -->
              <div class="flex items-center justify-between mt-3">
                <div class="h-5 w-24 rounded skeleton-primary-light"></div>

                <div class="h-4 w-16 rounded skeleton-light"></div>
              </div>

              <!-- Category + Status -->
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div class="h-5 w-24 rounded-full skeleton-badge"></div>

                <div class="h-4 w-16 rounded skeleton-light"></div>
              </div>

              <!-- Buttons -->
              <div class="flex gap-2 mt-3">
                <div class="flex-1 h-8 rounded-lg skeleton-primary"></div>

                <div class="w-16 h-8 rounded-lg skeleton-border"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- =================================================
       GRID / TABLE PAGINATION
  ================================================== -->
      <div
        class="p-4 mt-auto flex flex-col sm:flex-row justify-between items-center gap-4"
        style="background: #f8fafc; border-top: 1px solid #e2e8f0"
      >
        <!-- Counter -->
        <div class="h-4 w-64 rounded skeleton-light"></div>

        <!-- Buttons -->
        <div class="flex gap-2">
          <div class="h-9 w-24 rounded-md skeleton-border"></div>

          <div class="h-9 w-28 rounded-md skeleton-border"></div>
        </div>
      </div>
    </div>

    <!-- =====================================================
     MOBILE SKELETON
====================================================== -->
    <div class="md:hidden space-y-4 mt-4">
      <div v-for="card in 6" :key="`mobile-card-${card}`" class="nexus-card overflow-hidden">
        <!-- Card Header -->
        <div class="p-4">
          <div class="flex items-start gap-3">
            <!-- Image -->
            <div class="w-14 h-14 rounded-lg shrink-0 skeleton-image"></div>

            <!-- Content -->
            <div class="flex-1 min-w-0 space-y-3">
              <!-- Name + Arrow -->
              <div class="flex items-start justify-between gap-2">
                <div class="h-4 w-40 rounded skeleton"></div>

                <div class="w-5 h-5 rounded skeleton-light"></div>
              </div>

              <!-- SKU -->
              <div class="h-3 w-24 rounded skeleton-light"></div>

              <!-- Price + Stock + Status -->
              <div class="flex items-center flex-wrap gap-3">
                <div class="h-4 w-20 rounded skeleton-primary-light"></div>

                <div class="h-4 w-24 rounded skeleton-light"></div>

                <div class="h-6 w-16 rounded-full skeleton-badge"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination -->
      <div
        class="p-4 flex flex-col sm:flex-row justify-between items-center gap-4"
        style="background: #f8fafc; border-top: 1px solid #e2e8f0"
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
  // Componente visual de carga.
  // No requiere props, API ni lógica adicional.
</script>

<style scoped>
  /* =====================================================
   BASE SKELETON
===================================================== */

  .skeleton,
  .skeleton-light,
  .skeleton-border,
  .skeleton-primary,
  .skeleton-primary-light,
  .skeleton-image,
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

  /* Border / Input Skeleton */

  .skeleton-border {
    background: #ffffff;
    border: 1px solid #e2e8f0;
  }

  /* Primary Button Skeleton */

  .skeleton-primary {
    background: #ddd6fe;
  }

  /* Primary Text Skeleton */

  .skeleton-primary-light {
    background: #ede9fe;
  }

  /* Image Skeleton */

  .skeleton-image {
    background: #f5f3ff;
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
  .skeleton-primary::after,
  .skeleton-primary-light::after,
  .skeleton-image::after,
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

    animation: skeleton-shimmer 1.6s infinite;
  }

  /* Image Overlay */

  .skeleton-shimmer {
    position: absolute;

    inset: 0;

    transform: translateX(-100%);

    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);

    animation: skeleton-shimmer 1.6s infinite;
  }

  /* Animation */

  @keyframes skeleton-shimmer {
    100% {
      transform: translateX(100%);
    }
  }
</style>
