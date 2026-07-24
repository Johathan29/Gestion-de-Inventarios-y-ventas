<template>
  <div class="detail-skeleton animate-pulse">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div class="space-y-3">
        <div class="h-8 w-56 rounded-xl bg-slate-200"></div>
        <div class="h-4 w-80 rounded-lg bg-slate-100"></div>
      </div>
      <div class="flex gap-2">
        <div class="h-10 w-28 rounded-xl bg-slate-100"></div>
        <div class="h-10 w-28 rounded-xl bg-slate-200"></div>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div v-for="i in 3" :key="'stat-'+i" class="rounded-2xl border border-slate-100 bg-white p-6">
        <div class="space-y-3">
          <div class="h-3 w-24 rounded bg-slate-100"></div>
          <div class="h-7 w-20 rounded bg-slate-200"></div>
          <div class="h-3 w-36 rounded bg-slate-100"></div>
        </div>
      </div>
    </div>

    <!-- Detail Card -->
    <div class="rounded-2xl border border-slate-100 bg-white overflow-hidden">
      <!-- Tabs -->
      <div class="flex gap-1 p-4 border-b border-slate-100">
        <div v-for="i in 3" :key="'tab-'+i" class="h-9 w-28 rounded-lg" :class="i === 1 ? 'bg-slate-200' : 'bg-slate-100'"></div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="i in 6" :key="'field-'+i" class="space-y-2">
              <div class="h-3 w-20 rounded bg-slate-100"></div>
              <div class="h-5 w-full rounded bg-slate-200"></div>
            </div>
          </div>

          <!-- Table -->
          <div class="border-t border-slate-100 pt-6">
            <div class="h-5 w-32 rounded bg-slate-200 mb-4"></div>
            <div v-for="i in 4" :key="'row-'+i" class="flex items-center gap-4 py-3 border-b border-slate-50">
              <div class="h-10 w-10 rounded-lg bg-slate-100"></div>
              <div class="flex-1 h-4 rounded bg-slate-200"></div>
              <div class="w-20 h-4 rounded bg-slate-100"></div>
              <div class="w-24 h-4 rounded bg-slate-100"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
