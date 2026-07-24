<template>
  <div class="card-grid-skeleton animate-pulse">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div class="space-y-3">
        <div class="h-8 w-40 rounded-xl bg-slate-200"></div>
        <div class="h-4 w-56 rounded-lg bg-slate-100"></div>
      </div>
      <div class="h-10 w-36 rounded-xl bg-slate-200"></div>
    </div>

    <!-- Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="'card-'+i" class="rounded-2xl border border-slate-100 bg-white overflow-hidden">
        <!-- Image -->
        <div class="h-40 bg-slate-200"></div>

        <!-- Content -->
        <div class="p-5 space-y-4">
          <!-- Title -->
          <div class="space-y-2">
            <div class="h-4 w-3/4 rounded bg-slate-200"></div>
            <div class="h-3 w-1/2 rounded bg-slate-100"></div>
          </div>

          <!-- Badge -->
          <div class="flex gap-2">
            <div class="h-6 w-20 rounded-full bg-slate-200"></div>
            <div class="h-6 w-16 rounded-full bg-slate-100"></div>
          </div>

          <!-- Meta -->
          <div class="h-3 w-2/3 rounded bg-slate-100"></div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <div class="h-9 w-20 rounded-lg bg-slate-100"></div>
            <div class="h-9 w-24 rounded-lg bg-slate-200"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
