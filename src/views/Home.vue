<template>
  <div class="home">
    <div class="filters">
      <input v-model="searchQuery" placeholder="Search Pokemon..." @input="handleSearch" />
      <!-- Add Type filter dropdown later -->
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div class="pokemon-grid" v-else>
      <PokemonCard 
        v-for="p in displayPokemon" 
        :key="p.name" 
        :pokemon="p"
        :isFavorite="isFavorite(p)"
        @toggle-favorite="updateFavorites"
      />
    </div>
    
    <div class="load-more" v-if="!searchQuery && !loading">
        <button @click="loadMore">Load More</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { pokeApi, userApi } from '../services/api';
import PokemonCard from '../components/PokemonCard.vue';

const allPokemon = ref([]); // List of { name, url }
const displayedList = ref([]);
const favorites = ref([]);
const loading = ref(false);
const offset = ref(0);
const limit = 50;
const searchQuery = ref('');

const loadPokemon = async () => {
    loading.value = true;
    try {
        const data = await pokeApi.getPokemonList(limit, offset.value);
        allPokemon.value = [...allPokemon.value, ...data.results];
        offset.value += limit;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const loadFavorites = async () => {
    try {
        const res = await userApi.getFavorites();
        favorites.value = res.data;
    } catch (e) {
        console.error(e);
    }
};

const updateFavorites = (id) => {
    if (favorites.value.includes(id)) {
        favorites.value = favorites.value.filter(fid => fid !== id);
    } else {
        favorites.value.push(id);
    }
};

const isFavorite = (pokemon) => {
    const id = Number(pokemon.url ? pokemon.url.split('/')[pokemon.url.split('/').length - 2] : pokemon.id);
    return favorites.value.includes(id);
};

const displayPokemon = computed(() => {
    if (searchQuery.value) {
        return allPokemon.value.filter(p => p.name.includes(searchQuery.value.toLowerCase()));
    }
    return allPokemon.value;
});

const handleSearch = () => {
    // If we want detailed search we might need to search API
    // For now client side filtering of loaded pokemon
};

const loadMore = () => {
    loadPokemon();
};

onMounted(() => {
    loadPokemon();
    loadFavorites();
});
</script>

<style scoped>
.home {
  padding: 20px 0;
}

.filters {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.filters input {
  padding: 10px;
  width: 100%;
  max-width: 400px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 1rem;
}

.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.load-more {
    text-align: center;
    margin-top: 2rem;
}

.load-more button {
    padding: 10px 30px;
    background: #ef5350;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 1rem;
}

.loading {
    text-align: center;
    font-size: 1.2rem;
    color: #666;
}
</style>