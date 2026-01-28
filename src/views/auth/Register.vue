<template>
  <div class="auth-container">
    <h2>Registrarse</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label>Nombre</label>
        <input type="text" v-model="name" required />
      </div>
      <div class="form-group">
        <label>Correo</label>
        <input type="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label>Contraseña</label>
        <input type="password" v-model="password" required />
      </div>
      <button type="submit">Registrarse</button>
    </form>
    <p>¿Ya tienes cuenta? <router-link to="/login">Iniciar Sesión</router-link></p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';

const name = ref('');
const email = ref('');
const password = ref('');
const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
  const success = await authStore.register(name.value, email.value, password.value);
  if (success) {
    router.push('/');
  } else {
    alert('Registro fallido');
  }
};
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
}
input {
  width: 100%;
  padding: 0.5rem;
}
button {
  width: 100%;
  padding: 0.75rem;
  background-color: #ff5252;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
</style>
