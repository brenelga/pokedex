<template>
  <div class="detail-container" v-if="pokemon">
    <div class="header">
        <h1>{{ capitalize(pokemon.name) }} <span class="number">#{{ pokemon.id }}</span></h1>
        <div class="types">
            <span v-for="type in pokemon.types" :key="type.type.name" :class="['type-badge', type.type.name]">
                {{ capitalize(type.type.name) }}
            </span>
        </div>
    </div>

    <div class="content">
        <div class="main-image">
            <img :src="getImage(pokemon.id)" :alt="pokemon.name">
        </div>

        <div class="stats">
            <h3>Estadísticas Base</h3>
            <div v-for="stat in pokemon.stats" :key="stat.stat.name" class="stat-row">
                <span class="stat-name">{{ formatStat(stat.stat.name) }}</span>
                <div class="stat-bar-container">
                    <div class="stat-bar" :style="{ width: (stat.base_stat / 255 * 100) + '%', backgroundColor: getStatColor(stat.stat.name) }"></div>
                </div>
                <span class="stat-value">{{ stat.base_stat }}</span>
            </div>
        </div>
    </div>

    <div class="evolution-chain" v-if="evolutionChain.length">
        <h3>Cadena Evolutiva</h3>
        <div class="evo-row">
            <div v-for="evo in evolutionChain" :key="evo.species_name" class="evo-item" @click="goToPokemon(evo.species_name)">
                <img :src="getImage(evo.id)" :alt="evo.species_name">
                <span>{{ capitalize(evo.species_name) }}</span>
            </div>
        </div>
    </div>
  </div>
  <div v-else class="loading">Cargando...</div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pokeApi } from '../services/api';

const route = useRoute();
const router = useRouter();
const pokemon = ref(null);
const evolutionChain = ref([]);

const loadData = async () => {
    pokemon.value = null;
    evolutionChain.value = [];
    const id = route.params.id;
    
    try {
        // 1. Get Details
        const data = await pokeApi.getPokemonDetails(id);
        pokemon.value = data;

        // 2. Get Species for Evo Chain URL
        const species = await pokeApi.getSpecies(id);
        
        // 3. Get Evo Chain
        const evoData = await pokeApi.getEvolutionChain(species.evolution_chain.url);
        parseEvolutionChain(evoData.chain);

    } catch (e) {
        console.error('Error loading pokemon details', e);
    }
};

const parseEvolutionChain = (chain) => {
    const evos = [];
    let current = chain;
    
    while (current) {
        // Extract ID from url
        const urlParts = current.species.url.split('/');
        const id = urlParts[urlParts.length - 2];
        
        evos.push({
            species_name: current.species.name,
            id: id
        });
        
        current = current.evolves_to[0]; // Simplified: taking first path
    }
    evolutionChain.value = evos;
};

const getImage = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const formatStat = (s) => {
    const map = { 'hp': 'HP', 'attack': 'Atk', 'defense': 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', 'speed': 'Spd' };
    return map[s] || s;
};
const getStatColor = (s) => {
    return s === 'hp' ? '#ff5252' : '#4caf50'; // Simplified colors
};

const goToPokemon = (name) => {
    router.push(`/pokemon/${name}`);
};

watch(() => route.params.id, () => {
    loadData();
});

onMounted(loadData);
</script>

<style scoped>
.detail-container {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.header {
    text-align: center;
    margin-bottom: 20px;
}

.types {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.type-badge {
    padding: 5px 15px;
    border-radius: 20px;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
    /* Add specific type colors later */
    background: #777; 
}
.type-badge.fire { background: #F08030; }
.type-badge.water { background: #6890F0; }
.type-badge.grass { background: #78C850; }
.type-badge.electric { background: #F8D030; }
/* Add more... */

.content {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
}

.main-image img {
    width: 200px;
    height: 200px;
}

.stats {
    flex: 1;
    min-width: 300px;
}

.stat-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}

.stat-name {
    width: 50px;
    font-weight: bold;
    font-size: 0.9rem;
}

.stat-bar-container {
    flex: 1;
    background: #eee;
    height: 10px;
    border-radius: 5px;
    margin: 0 10px;
    overflow: hidden;
}

.stat-bar {
    height: 100%;
}

.evolution-chain {
    margin-top: 30px;
    text-align: center;
}

.evo-row {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin-top: 15px;
}

.evo-item {
    cursor: pointer;
    transition: transform 0.2s;
}

.evo-item:hover {
    transform: scale(1.1);
}

.evo-item img {
    width: 80px;
    height: 80px;
}
</style>
