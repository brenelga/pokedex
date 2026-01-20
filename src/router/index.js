import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {path: '/', component: () => import('@/views/Home.vue')},
  {path: '/signup', component: () => import('@/views/Register.vue')},
  {path: '/login', component: () => import('@/views/Login.vue')},
  {path: '/pokemon/:id', component: () => import('@/views/PokemonDetail.vue')},
  {path: '/favorites', component: () => import('@/views/Favorites.vue')},
  {path: '/teams', component: () => import('@/views/Teams.vue')},
  {path: '/battle', component: () => import('@/views/Battle.vue')}
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
