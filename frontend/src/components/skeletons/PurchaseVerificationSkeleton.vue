<template>
  <div class="animate-pulse">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <!-- Page Header Skeleton -->
        <div class="space-y-3">
          <div class="h-8 w-64 rounded-lg bg-gray-200"></div>
          <div class="h-4 w-80 max-w-full rounded bg-gray-200"></div>
        </div>
      </div>

      <!-- Summary Cards Skeleton -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div v-for="card in 3" :key="card" class="nexus-card p-5">
          <div class="flex items-start justify-between">
            <div class="space-y-3">
              <div class="h-4 w-40 rounded bg-gray-200"></div>
              <div class="h-8 w-20 rounded bg-gray-200"></div>
              <div class="h-3 w-48 rounded bg-gray-200"></div>
            </div>

            <div class="w-12 h-12 rounded-xl bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inventory Tabs Skeleton -->
    <div class="flex gap-6 border-b border-gray-200 mb-6 overflow-hidden">
      <div v-for="tab in 4" :key="tab" class="h-10 w-32 rounded-t bg-gray-200"></div>
    </div>

    <!-- Main Content Card -->
    <div class="nexus-card !p-0 overflow-hidden">
      <!-- Filter Bar Skeleton -->
      <div
        class="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3"
      >
        <div class="h-9 w-40 rounded-md bg-gray-200"></div>
      </div>

      <!-- Purchases List Skeleton -->
      <div class="divide-y divide-gray-100">
        <div v-for="purchase in 5" :key="purchase" class="p-4">
          <div class="flex items-start justify-between gap-4">
            <!-- Purchase Information -->
            <div class="flex-1 min-w-0 space-y-3">
              <!-- Purchase Number + Status + Date -->
              <div class="flex items-center gap-3">
                <div class="h-5 w-32 rounded bg-gray-200"></div>
                <div class="h-5 w-24 rounded-full bg-gray-200"></div>
                <div class="h-4 w-28 rounded bg-gray-200"></div>
              </div>

              <!-- Supplier -->
              <div class="h-4 w-64 max-w-full rounded bg-gray-200"></div>

              <!-- Product Items -->
              <div class="flex flex-wrap gap-2">
                <div v-for="item in 3" :key="item" class="h-6 w-32 rounded bg-gray-200"></div>
              </div>
            </div>

            <!-- Action -->
            <div class="shrink-0">
              <div class="h-9 w-28 rounded-lg bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Skeleton -->
      <div class="px-4 py-3 border-t border-gray-100 flex justify-center">
        <div class="flex items-center gap-2">
          <div class="h-8 w-24 rounded-md bg-gray-200"></div>
          <div class="h-8 w-16 rounded-md bg-gray-200"></div>
          <div class="h-8 w-24 rounded-md bg-gray-200"></div>
        </div>
      </div>
    </div>
  </div>
</template>
