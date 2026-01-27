import { defineStore } from 'pinia';
import { authApi } from '../services/api';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
    },
    actions: {
        async login(email, password) {
            try {
                const response = await authApi.login({ email, password });
                this.setAuth(response.data);
                return true;
            } catch (error) {
                console.error('Login failed', error);
                return false;
            }
        },
        async register(name, email, password) {
            try {
                const response = await authApi.register({ name, email, password });
                this.setAuth(response.data);
                return true;
            } catch (error) {
                console.error('Registration failed', error);
                return false;
            }
        },
        setAuth(data) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        },
        logout() {
            this.token = null;
            this.user = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
});
