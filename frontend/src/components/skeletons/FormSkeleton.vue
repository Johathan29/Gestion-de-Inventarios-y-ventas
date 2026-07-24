<template>
  <div class="form-skeleton animate-pulse">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div class="space-y-3">
        <div class="h-8 w-48 rounded-xl bg-slate-200"></div>
        <div class="h-4 w-64 rounded-lg bg-slate-100"></div>
      </div>
      <div class="flex gap-3">
        <div class="h-10 w-24 rounded-xl bg-slate-100"></div>
        <div class="h-10 w-32 rounded-xl bg-slate-200"></div>
      </div>
    </div>

    <!-- Form Card -->
    <div class="rounded-2xl border border-slate-100 bg-white p-8">
      <div class="space-y-6">
        <!-- Row 1 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <div class="h-3 w-24 rounded bg-slate-100"></div>
            <div class="h-11 w-full rounded-xl bg-slate-200"></div>
          </div>
          <div class="space-y-2">
            <div class="h-3 w-24 rounded bg-slate-100"></div>
            <div class="h-11 w-full rounded-xl bg-slate-200"></div>
          </div>
        </div>

        <!-- Row 2 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-2">
            <div class="h-3 w-24 rounded bg-slate-100"></div>
            <div class="h-11 w-full rounded-xl bg-slate-200"></div>
          </div>
          <div class="space-y-2">
            <div class="h-3 w-24 rounded bg-slate-100"></div>
            <div class="h-11 w-full rounded-xl bg-slate-200"></div>
          </div>
          <div class="space-y-2">
            <div class="h-3 w-24 rounded bg-slate-100"></div>
            <div class="h-11 w-full rounded-xl bg-slate-200"></div>
          </div>
        </div>

        <!-- Textarea -->
        <div class="space-y-2">
          <div class="h-3 w-24 rounded bg-slate-100"></div>
          <div class="h-24 w-full rounded-xl bg-slate-200"></div>
        </div>

        <!-- Items Section -->
        <div class="border-t border-slate-100 pt-6">
          <div class="h-5 w-36 rounded bg-slate-200 mb-4"></div>
          <div v-for="i in 3" :key="i" class="flex items-center gap-4 p-4 rounded-xl bg-slate-50 mb-3">
            <div class="flex-1 space-y-2">
              <div class="h-3 w-32 rounded bg-slate-100"></div>
              <div class="h-8 w-full rounded-lg bg-slate-200"></div>
            </div>
            <div class="w-20 space-y-2">
              <div class="h-3 w-12 rounded bg-slate-100"></div>
              <div class="h-8 w-full rounded-lg bg-slate-200"></div>
            </div>
            <div class="w-24 space-y-2">
              <div class="h-3 w-16 rounded bg-slate-100"></div>
              <div class="h-8 w-full rounded-lg bg-slate-200"></div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-slate-100 shrink-0 mt-5"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
