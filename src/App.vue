<template>
  <div class="font-sans antialiased text-gray-900">
    
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <footer class="bg-black text-white py-4 text-center text-xs uppercase tracking-widest">
      &copy; 2026 Pokédex MX
    </footer>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

body {
  margin: 0;
  background-color: #f3f4f6;
}
</style>