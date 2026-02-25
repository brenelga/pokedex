<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { requestPermission } from './services/push'

const authStore = useAuthStore()
const router = useRouter()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)

const logout = () => {
  authStore.logout()
  router.push('/login')
}

// Subscribe to push notifications when authenticated
watch(isAuthenticated, (val) => {
  if (val) {
    requestPermission()
  }
}, { immediate: true })
</script>

<template>
  <header v-if="isAuthenticated">
    <div class="wrapper">
      <nav>
        <div class="logo">PokéApp</div>
        <div class="links">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/favorites">Favorites</RouterLink>
          <RouterLink to="/teams">Teams</RouterLink>
          <RouterLink to="/battle">Battle</RouterLink>
        </div>
        <div class="user-actions">
           <span class="username">{{ user ? user.name : 'User' }}</span>
           <span v-if="user" class="friend-code">Code: {{ user.friendCode }}</span>
           <button @click="logout" class="logout-btn">Logout</button>
        </div>
      </nav>
    </div>
  </header>
  
  <main>
    <RouterView />
  </main>
</template>

<style>
/* Global Styles */
body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f4f4f4;
}

main {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>

<style scoped>
header {
  background-color: #ef5350;
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: 1px;
}

.links {
  display: flex;
  gap: 20px;
}

.links a {
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.links a:hover, .links a.router-link-active {
  background-color: rgba(255,255,255,0.2);
}

.user-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.friend-code {
  font-size: 0.8rem;
  background: rgba(0,0,0,0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.logout-btn {
  background: white;
  color: #ef5350;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.logout-btn:hover {
  background-color: #ffebee;
}

@media (max-width: 768px) {
  nav {
    flex-direction: column;
    gap: 15px;
  }
  .links {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>