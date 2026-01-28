<template>
  <div class="home">
    <div class="filters">
      <input v-model="filterParams.search" placeholder="Search Pokemon..." @input="handleFilterChange('search')" />
      
      <select v-model="filterParams.region" @change="handleFilterChange('region')">
        <option value="">All Regions</option>
        <option value="1">Kanto</option>
        <option value="2">Johto</option>
        <option value="3">Hoenn</option>
        <option value="4">Sinnoh</option>
        <option value="5">Unova</option>
        <option value="6">Kalos</option>
        <option value="7">Alola</option>
        <option value="8">Galar</option>
      </select>

      <select v-model="filterParams.generation" @change="handleFilterChange('generation')">
        <option value="">All Generations</option>
        <option value="1">Gen 1</option>
        <option value="2">Gen 2</option>
        <option value="3">Gen 3</option>
        <option value="4">Gen 4</option>
        <option value="5">Gen 5</option>
        <option value="6">Gen 6</option>
        <option value="7">Gen 7</option>
        <option value="8">Gen 8</option>
      </select>

      <select v-model="filterParams.type1" @change="handleFilterChange('type1')">
        <option value="">Type 1</option>
        <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
      </select>

      <select v-model="filterParams.type2" @change="handleFilterChange('type2')">
        <option value="">Type 2</option>
        <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div v-if="pokemonStore.loading" class="loading">Loading...</div>

    <div class="pokemon-grid" v-else>
      <PokemonCard 
        v-for="p in pokemonStore.displayPokemon" 
        :key="p.name" 
        :pokemon="p"
        :isFavorite="isFavorite(p)"
        @toggle-favorite="toggleFavorite"
      />
    </div>
    
    <div class="load-more" v-if="pokemonStore.displayPokemon.length === 0 && !pokemonStore.loading">
        No Pokemon found.
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue';
import { usePokemonStore } from '../stores/pokemonStore';
import PokemonCard from '../components/PokemonCard.vue';

const pokemonStore = usePokemonStore();

const types = [
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'
];

const filterParams = reactive({
    search: '',
    region: '',
    generation: '',
    type1: '',
    type2: ''
});

const handleFilterChange = (key) => {
    pokemonStore.setFilter(key, filterParams[key]);
};

const isFavorite = (pokemon) => {
    // Basic check using URL ID or ID property
    // We need to extract ID if it's not present directly
    const id = getPokemonId(pokemon);
    return pokemonStore.favorites.some(f => f.id === id || f === id); // Handle object or ID array
};

const toggleFavorite = (id) => {
    // pokemonStore.toggleFavorite(id);
    console.log("Toggle favorite not fully implemented in store yet", id);
};

const getPokemonId = (pokemon) => {
    if (pokemon.id) return pokemon.id;
    if (pokemon.url) {
        const parts = pokemon.url.split('/');
        return Number(parts[parts.length - 2]);
    }
    return 0;
};

onMounted(() => {
    pokemonStore.initialize();
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
  gap: 10px;
  flex-wrap: wrap;
}

.filters input, .filters select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 1rem;
}

.filters input {
    width: 200px;
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

.loading {
    text-align: center;
    font-size: 1.2rem;
    color: #666;
}
</style>