<template>
  <div class="space-y-8 animate-pulse">


<!-- ================= HEADER ================= -->
<div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
  <div class="space-y-3">
    <div class="h-8 w-64 rounded-xl bg-slate-200"></div>
    <div class="h-4 w-96 max-w-full rounded-lg bg-slate-100"></div>
  </div>

  <div class="flex items-center bg-white border border-slate-100 rounded-2xl p-1.5 w-fit">
    <div class="h-9 w-12 rounded-xl bg-slate-200"></div>
    <div class="h-9 w-12 rounded-xl bg-slate-100 ml-1"></div>
    <div class="h-9 w-12 rounded-xl bg-slate-100 ml-1"></div>

    <div class="w-px h-5 bg-slate-200 mx-2"></div>

    <div class="h-9 w-36 rounded-xl bg-slate-100"></div>
  </div>
</div>

<!-- ================= KPI CARDS ================= -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">

  <div
    v-for="index in 4"
    :key="`kpi-${index}`"
    class="rounded-[28px] p-8 border border-slate-100 bg-white"
  >
    <div class="flex justify-between items-start mb-6">
      <div class="space-y-3">
        <div class="h-3 w-28 rounded bg-slate-200"></div>
        <div class="h-9 w-32 rounded-xl bg-slate-200"></div>
      </div>

      <div class="w-12 h-12 rounded-2xl bg-slate-100"></div>
    </div>

    <div class="flex items-center gap-2">
      <div class="h-6 w-14 rounded-md bg-slate-100"></div>
      <div class="h-3 w-20 rounded bg-slate-100"></div>
    </div>
  </div>

</div>

<!-- ================= MAIN CHARTS ================= -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

  <!-- Main Chart -->
  <div class="lg:col-span-2 rounded-[28px] p-8 border border-slate-100 bg-white">

    <div class="flex justify-between items-center mb-8">
      <div class="space-y-3">
        <div class="h-5 w-40 rounded-lg bg-slate-200"></div>
        <div class="h-3 w-64 rounded bg-slate-100"></div>
      </div>

      <div class="h-8 w-24 rounded-lg bg-slate-100"></div>
    </div>

    <div class="h-[300px] rounded-2xl bg-slate-50 relative overflow-hidden">
      <div class="absolute inset-x-6 bottom-8 h-px bg-slate-200"></div>
      <div class="absolute inset-x-6 bottom-20 h-px bg-slate-200"></div>
      <div class="absolute inset-x-6 bottom-32 h-px bg-slate-200"></div>
      <div class="absolute inset-x-6 bottom-44 h-px bg-slate-200"></div>

      <div class="absolute bottom-8 left-10 right-10 h-44">
        <div
          class="absolute bottom-0 left-0 w-full h-full opacity-40"
          style="
            clip-path: polygon(
              0% 90%,
              10% 75%,
              20% 82%,
              30% 50%,
              40% 62%,
              50% 35%,
              60% 55%,
              70% 25%,
              80% 42%,
              90% 18%,
              100% 30%,
              100% 100%,
              0% 100%
            );
            background: #cbd5e1;
          "
        ></div>

        <div
          class="absolute left-0 right-0 bottom-0 h-1 rounded-full bg-slate-300"
        ></div>
      </div>
    </div>
  </div>

  <!-- Doughnut Chart -->
  <div class="rounded-[28px] p-8 border border-slate-100 bg-white">

    <div class="flex justify-between items-center mb-8">
      <div class="space-y-3">
        <div class="h-5 w-48 rounded-lg bg-slate-200"></div>
        <div class="h-3 w-40 rounded bg-slate-100"></div>
      </div>

      <div class="w-5 h-5 rounded bg-slate-100"></div>
    </div>

    <div class="h-[300px] flex items-center justify-center">

      <div class="relative w-48 h-48 rounded-full border-[28px] border-slate-200">
        <div class="absolute inset-0 rounded-full border-[28px] border-transparent border-t-slate-300 border-r-slate-300 rotate-45"></div>
      </div>

    </div>
  </div>

</div>

<!-- ================= SECONDARY CHARTS ================= -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

  <div
    v-for="index in 2"
    :key="`chart-${index}`"
    class="rounded-[28px] p-8 border border-slate-100 bg-white"
  >

    <div class="flex justify-between items-center mb-8">

      <div class="space-y-3">
        <div class="h-5 w-44 rounded-lg bg-slate-200"></div>
        <div class="h-3 w-56 rounded bg-slate-100"></div>
      </div>

      <div class="w-10 h-10 rounded-xl bg-slate-100"></div>

    </div>

    <div class="h-[260px] rounded-2xl bg-slate-50 relative overflow-hidden">

      <div class="absolute inset-x-6 bottom-8 h-px bg-slate-200"></div>
      <div class="absolute inset-x-6 bottom-20 h-px bg-slate-200"></div>
      <div class="absolute inset-x-6 bottom-32 h-px bg-slate-200"></div>
      <div class="absolute inset-x-6 bottom-44 h-px bg-slate-200"></div>

      <div class="absolute bottom-8 left-8 right-8 flex items-end justify-between gap-3 h-40">

        <div
          v-for="bar in 10"
          :key="bar"
          class="flex-1 rounded-t-md bg-slate-200"
          :style="{ height: `${35 + ((bar * 17) % 55)}%` }"
        ></div>

      </div>

    </div>

  </div>

</div>

<!-- ================= SALES + ACTIVITY ================= -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

  <!-- Recent Sales -->
  <div class="lg:col-span-2 rounded-[28px] p-8 border border-slate-100 bg-white">

    <div class="flex justify-between items-center mb-8">

      <div class="space-y-3">
        <div class="h-5 w-40 rounded-lg bg-slate-200"></div>
        <div class="h-3 w-64 rounded bg-slate-100"></div>
      </div>

      <div class="h-4 w-20 rounded bg-slate-100"></div>

    </div>

    <div class="space-y-5">

      <div
        v-for="row in 5"
        :key="`sale-${row}`"
        class="flex items-center gap-4"
      >

        <div class="h-4 w-20 rounded bg-slate-100"></div>

        <div class="flex items-center gap-3 flex-1">
          <div class="w-8 h-8 rounded-full bg-slate-200"></div>
          <div class="h-4 w-32 rounded bg-slate-100"></div>
        </div>

        <div class="h-4 w-20 rounded bg-slate-100"></div>

        <div class="h-6 w-20 rounded-full bg-slate-100"></div>

      </div>

    </div>

  </div>

  <!-- Activity -->
  <div class="rounded-[28px] p-8 border border-slate-100 bg-white">

    <div class="flex justify-between items-center mb-8">

      <div class="space-y-3">
        <div class="h-5 w-28 rounded-lg bg-slate-200"></div>
        <div class="h-3 w-40 rounded bg-slate-100"></div>
      </div>

      <div class="h-4 w-16 rounded bg-slate-100"></div>

    </div>

    <div class="space-y-6">

      <div
        v-for="activity in 4"
        :key="`activity-${activity}`"
        class="flex gap-4"
      >

        <div class="w-10 h-10 rounded-xl bg-slate-100 shrink-0"></div>

        <div class="flex-1 space-y-2">
          <div class="h-4 w-full rounded bg-slate-100"></div>
          <div class="h-3 w-32 rounded bg-slate-50"></div>
        </div>

      </div>

    </div>

  </div>

</div>

<!-- ================= TOP PRODUCTS + STOCK ================= -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

  <!-- Top Products -->
  <div class="lg:col-span-2 rounded-[28px] p-8 border border-slate-100 bg-white">

    <div class="space-y-3 mb-8">
      <div class="h-5 w-64 rounded-lg bg-slate-200"></div>
      <div class="h-3 w-72 rounded bg-slate-100"></div>
    </div>

    <div class="space-y-5">

      <div
        v-for="product in 5"
        :key="`product-${product}`"
        class="flex items-center gap-4"
      >

        <div class="w-7 h-7 rounded-full bg-slate-200"></div>

        <div class="flex-1 h-4 rounded bg-slate-100"></div>

        <div class="w-20 h-4 rounded bg-slate-100"></div>

        <div class="w-24 h-4 rounded bg-slate-100"></div>

      </div>

    </div>

  </div>

  <!-- Stock Alerts -->
  <div class="rounded-[28px] p-8 border border-slate-100 bg-white">

    <div class="flex justify-between items-center mb-8">

      <div class="space-y-3">
        <div class="h-5 w-32 rounded-lg bg-slate-200"></div>
        <div class="h-3 w-48 rounded bg-slate-100"></div>
      </div>

      <div class="h-4 w-16 rounded bg-slate-100"></div>

    </div>

    <div class="space-y-4">

      <div
        v-for="alert in 4"
        :key="`alert-${alert}`"
        class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50"
      >

        <div class="flex-1 space-y-2 min-w-0">
          <div class="h-4 w-32 rounded bg-slate-200"></div>
          <div class="h-3 w-40 rounded bg-slate-100"></div>
        </div>

        <div class="h-6 w-16 rounded-full bg-slate-200"></div>

      </div>

    </div>

  </div>

</div>

<!-- ================= ACTIVE OFFERS ================= -->
<div class="rounded-[28px] p-8 border border-slate-100 bg-white">

  <div class="flex justify-between items-center mb-6">

    <div class="space-y-3">
      <div class="h-5 w-40 rounded-lg bg-slate-200"></div>
      <div class="h-3 w-64 rounded bg-slate-100"></div>
    </div>

    <div class="h-4 w-20 rounded bg-slate-100"></div>

  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

    <div
      v-for="offer in 4"
      :key="`offer-${offer}`"
      class="p-4 rounded-2xl border border-slate-100"
    >

      <div class="flex justify-between mb-4">
        <div class="h-4 w-28 rounded bg-slate-200"></div>
        <div class="h-5 w-12 rounded-full bg-slate-100"></div>
      </div>

      <div class="h-3 w-full rounded bg-slate-100 mb-2"></div>
      <div class="h-3 w-3/4 rounded bg-slate-100 mb-4"></div>

      <div class="h-3 w-32 rounded bg-slate-50"></div>

    </div>

  </div>

</div>

<!-- ================= FOOTER ================= -->
<footer class="mt-8 pt-8 pb-4 flex flex-col sm:flex-row justify-between items-center gap-4">

  <div class="h-4 w-48 rounded bg-slate-100"></div>

  <div class="flex items-center gap-2">
    <div class="w-2 h-2 rounded-full bg-slate-200"></div>
    <div class="h-4 w-48 rounded bg-slate-100"></div>
  </div>

</footer>


  </div>
</template>

<script setup>
// Skeleton estático.
// No requiere llamadas API ni lógica adicional.
</script>
