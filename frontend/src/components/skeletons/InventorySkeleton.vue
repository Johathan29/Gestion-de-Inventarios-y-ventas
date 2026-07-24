<template>
  <div class="inventory-skeleton">

```
<!-- =====================================================
     HEADER & SUMMARY
====================================================== -->
<div class="mb-6">

  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">

    <div class="space-y-3">

      <!-- Title -->
      <div class="h-7 w-32 rounded-lg skeleton"></div>

      <!-- Description -->
      <div class="h-4 w-64 rounded skeleton-light"></div>

    </div>

    <!-- Export Button -->
    <div class="h-10 w-32 rounded-lg skeleton-primary"></div>

  </div>


  <!-- =================================================
       SUMMARY CARDS
  ================================================== -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-8">

    <div
      v-for="card in 4"
      :key="`summary-${card}`"
      class="rounded-xl border border-gray-200 bg-white p-5"
    >

      <div class="flex items-start justify-between gap-4">

        <!-- Content -->
        <div class="flex-1 space-y-4">

          <!-- Label -->
          <div class="h-3 w-36 rounded skeleton-light"></div>

          <!-- Value -->
          <div class="h-8 w-28 rounded skeleton"></div>

          <!-- Subtext -->
          <div class="h-3 w-48 max-w-full rounded skeleton-light"></div>

        </div>

        <!-- Icon -->
        <div class="w-11 h-11 rounded-xl skeleton-primary-light"></div>

      </div>

    </div>

  </div>

</div>


<!-- =====================================================
     INVENTORY TABS
====================================================== -->
<div class="flex items-center gap-6 border-b border-gray-200 mb-6">

  <div
    v-for="tab in 4"
    :key="`tab-${tab}`"
    class="h-10 w-24 rounded skeleton-light"
  ></div>

</div>


<!-- =====================================================
     INVENTORY TABLE CARD
====================================================== -->
<div class="nexus-card !p-0 overflow-hidden">


  <!-- =================================================
       FILTER / SEARCH BAR
  ================================================== -->
  <div
    class="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3"
    style="background: #ffffff;"
  >

    <!-- Filter Button -->
    <div class="h-9 w-24 rounded-md skeleton-border"></div>

    <!-- Search -->
    <div class="h-9 w-full sm:w-72 rounded-full skeleton-border"></div>

  </div>


  <!-- =================================================
       FILTER PANEL SKELETON
  ================================================== -->
  <div
    v-if="showFilterPanel"
    class="px-4 py-4 border-b border-gray-200"
    style="background: #f8fafc;"
  >

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <div
        v-for="filter in 2"
        :key="`filter-${filter}`"
        class="space-y-2"
      >

        <div class="h-3 w-20 rounded skeleton-light"></div>

        <div class="h-10 w-full rounded-lg skeleton-border"></div>

      </div>

    </div>

  </div>


  <!-- =================================================
       INVENTORY TABLE
  ================================================== -->
  <div class="hidden md:block">

    <!-- Table Header -->
    <div
      class="grid grid-cols-[70px_1.5fr_1fr_120px_120px_120px_100px] gap-4 items-center px-6 py-4 border-b border-gray-200"
      style="background: #f8fafc;"
    >

      <div
        v-for="header in 7"
        :key="`inventory-header-${header}`"
        class="h-3 rounded skeleton-light"
        :class="header === 2 ? 'w-32' : 'w-20'"
      ></div>

    </div>


    <!-- Table Rows -->
    <div
      v-for="row in 8"
      :key="`inventory-row-${row}`"
      class="grid grid-cols-[70px_1.5fr_1fr_120px_120px_120px_100px] gap-4 items-center px-6 py-4 border-b border-gray-100"
    >

      <!-- Image / Icon -->
      <div class="w-10 h-10 rounded-lg skeleton-image"></div>


      <!-- Product -->
      <div class="space-y-2">

        <div class="h-4 w-44 rounded skeleton"></div>

        <div class="h-3 w-24 rounded skeleton-light"></div>

      </div>


      <!-- SKU / Category -->
      <div class="space-y-2">

        <div class="h-4 w-28 rounded skeleton-primary-light"></div>

        <div class="h-3 w-20 rounded skeleton-light"></div>

      </div>


      <!-- Stock -->
      <div class="h-4 w-16 rounded skeleton"></div>


      <!-- Status -->
      <div class="h-6 w-24 rounded-full skeleton-badge"></div>


      <!-- Last Movement -->
      <div class="h-4 w-24 rounded skeleton-light"></div>


      <!-- Actions -->
      <div class="flex gap-2">

        <div class="w-8 h-8 rounded-md skeleton-light"></div>

        <div class="w-8 h-8 rounded-md skeleton-light"></div>

      </div>

    </div>

  </div>


  <!-- =================================================
       MOBILE INVENTORY LIST
  ================================================== -->
  <div class="md:hidden">

    <div
      v-for="item in 6"
      :key="`mobile-inventory-${item}`"
      class="p-4 border-b border-gray-100"
    >

      <div class="flex items-start gap-3">

        <!-- Product Image -->
        <div class="w-12 h-12 rounded-lg shrink-0 skeleton-image"></div>


        <!-- Product Info -->
        <div class="flex-1 min-w-0 space-y-3">

          <div class="flex justify-between gap-3">

            <div class="h-4 w-40 rounded skeleton"></div>

            <div class="w-5 h-5 rounded skeleton-light"></div>

          </div>

          <div class="h-3 w-24 rounded skeleton-light"></div>

          <div class="flex items-center gap-3">

            <div class="h-4 w-20 rounded skeleton-primary-light"></div>

            <div class="h-6 w-20 rounded-full skeleton-badge"></div>

          </div>

        </div>

      </div>

    </div>

  </div>


  <!-- =================================================
       PAGINATION
  ================================================== -->
  <div
    class="p-4 flex flex-col sm:flex-row justify-between items-center gap-4"
    style="background: #f8fafc; border-top: 1px solid #e2e8f0;"
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
```

  </div>
</template>

<script setup>
defineProps({
  showFilterPanel: {
    type: Boolean,
    default: false
  }
});
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


/* Main */

.skeleton {
  background: #e2e8f0;
}


/* Light */

.skeleton-light {
  background: #f1f5f9;
}


/* Input / Border */

.skeleton-border {
  background: #ffffff;
  border: 1px solid #e2e8f0;
}


/* Primary */

.skeleton-primary {
  background: #ddd6fe;
}


/* Primary Light */

.skeleton-primary-light {
  background: #ede9fe;
}


/* Image */

.skeleton-image {
  background: #f5f3ff;
}


/* Badge */

.skeleton-badge {
  background: #f1f5f9;
}


/* =====================================================
   SHIMMER
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

  animation: inventory-skeleton-shimmer 1.6s infinite;

}


/* =====================================================
   ANIMATION
===================================================== */

@keyframes inventory-skeleton-shimmer {

  100% {
    transform: translateX(100%);
  }

}

</style>
