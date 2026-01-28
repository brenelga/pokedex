<template>
  <div class="favorites">
    <h2>Mis Favoritos</h2>
    <div v-if="loading" class="loading">Cargando...</div>
    <div v-else-if="favoritesData.length === 0" class="empty">¡Aún no hay favoritos!</div>
    <div class="pokemon-grid" v-else>
      <PokemonCard 
        v-for="p in favoritesData" 
        :key="p.id" 
        :pokemon="p"
        :isFavorite="true"
        @toggle-favorite="removeFavorite"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { userApi, pokeApi } from '../services/api';
import PokemonCard from '../components/PokemonCard.vue';

const favoritesIds = ref([]);
const favoritesData = ref([]);
const loading = ref(true);

const loadFavorites = async () => {
    loading.value = true;
    try {
        const res = await userApi.getFavorites();
        favoritesIds.value = res.data;
        
        // Fetch details for each favorite
        const promises = favoritesIds.value.map(id => pokeApi.getPokemonDetails(id));
        const results = await Promise.all(promises);
        favoritesData.value = results;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const removeFavorite = (id) => {
    favoritesData.value = favoritesData.value.filter(p => p.id !== id);
};

onMounted(loadFavorites);
</script>

<style scoped>
.favorites {
    padding: 20px;
}
h2 {
    text-align: center;
}
.pokemon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 20px;
    margin-top: 20px;
}
.empty, .loading {
    text-align: center;
    margin-top: 40px;
    font-size: 1.2rem;
    color: #888;
}
</style>
