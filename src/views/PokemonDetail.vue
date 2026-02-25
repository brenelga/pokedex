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

        <div class="info-and-stats">
            <div class="physical-info">
                <div class="info-item">
                    <span class="label">Height</span>
                    <span class="value">{{ pokemon.height / 10 }} m</span>
                </div>
                <div class="info-item">
                    <span class="label">Weight</span>
                    <span class="value">{{ pokemon.weight / 10 }} kg</span>
                </div>
            </div>

            <div class="stats">
                <h3>Base Stats</h3>
                <div v-for="stat in pokemon.stats" :key="stat.stat.name" class="stat-row">
                    <span class="stat-name">{{ formatStat(stat.stat.name) }}</span>
                    <div class="stat-bar-container">
                        <div class="stat-bar" :style="{ width: (stat.base_stat / 255 * 100) + '%', backgroundColor: getStatColor(stat.stat.name) }"></div>
                    </div>
                    <span class="stat-value">{{ stat.base_stat }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="details-grid">
        <div class="abilities-section" v-if="pokemon.abilities?.length">
            <h3>Abilities</h3>
            <div class="abilities-list">
                <div v-for="a in pokemon.abilities" :key="a.ability.name" class="ability-card">
                    <span class="ability-name">{{ capitalize(a.ability.name.replace('-', ' ')) }}</span>
                    <span v-if="a.is_hidden" class="hidden-badge">Hidden</span>
                </div>
            </div>
        </div>

        <div class="encounters-section" v-if="encounters.length">
            <h3>Possible Encounters</h3>
            <div class="encounters-list">
                <div v-for="enc in encounters" :key="enc.location_area.name" class="encounter-item">
                    {{ capitalize(enc.location_area.name.replace(/-/g, ' ')) }}
                </div>
            </div>
        </div>
    </div>

    <div class="moves-section" v-if="pokemon.moves?.length">
        <h3>Moves</h3>
        <div class="moves-grid">
            <div v-for="m in displayedMoves" :key="m.move.name" class="move-row">
                <span class="move-name">{{ capitalize(m.move.name.replace('-', ' ')) }}</span>
                <span class="move-method">{{ m.version_group_details[0]?.move_learn_method.name || 'learn' }}</span>
                <span class="move-level" v-if="m.version_group_details[0]?.level_learned_at > 0">
                    Lvl {{ m.version_group_details[0].level_learned_at }}
                </span>
            </div>
        </div>
        <button v-if="pokemon.moves.length > 20 && !showAllMoves" @click="showAllMoves = true" class="show-more-btn">
            Show All {{ pokemon.moves.length }} Moves
        </button>
    </div>

    <div class="evolution-chain" v-if="evolutionChain.length">
        <h3>Evolution Chain</h3>
        <div class="evo-row">
            <div v-for="evo in evolutionChain" :key="evo.species_name" class="evo-item" @click="goToPokemon(evo.species_name)">
                <img :src="getImage(evo.id)" :alt="evo.species_name">
                <span>{{ capitalize(evo.species_name) }}</span>
            </div>
        </div>
    </div>
  </div>
  <div v-else-if="loadingError" class="error-container">
      <p>{{ loadingError }}</p>
      <button @click="loadData">Retry</button>
  </div>
  <div v-else class="loading">Loading...</div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pokeApi } from '../services/api';

const route = useRoute();
const router = useRouter();
const pokemon = ref(null);
const evolutionChain = ref([]);
const encounters = ref([]);
const showAllMoves = ref(false);
const loadingError = ref(null);

const displayedMoves = computed(() => {
    if (!pokemon.value || !pokemon.value.moves) return [];
    if (showAllMoves.value) return pokemon.value.moves;
    return pokemon.value.moves.slice(0, 20);
});

const loadData = async () => {
    pokemon.value = null;
    evolutionChain.value = [];
    encounters.value = [];
    loadingError.value = null;
    const id = route.params.id;
    console.log('Loading detailed data for ID:', id);
    
    try {
        // 1. Get Details
        console.log('Fetching details...');
        const data = await pokeApi.getPokemonDetails(id);
        console.log('Details loaded:', data.name);
        pokemon.value = data;

        // 2. Get Species for Evo Chain URL
        // We use the species name from details as it's more reliable for variations
        const speciesName = data.species.name;
        console.log('Fetching species for:', speciesName);
        const species = await pokeApi.getSpecies(speciesName);
        console.log('Species loaded:', species.name);
        
        // 3. Get Evo Chain
        console.log('Fetching evo chain...');
        const evoData = await pokeApi.getEvolutionChain(species.evolution_chain.url);
        parseEvolutionChain(evoData.chain);
        console.log('Evo chain parsed');

        // 4. Get Encounters
        console.log('Fetching encounters...');
        const encData = await pokeApi.getEncounters(data.location_area_encounters);
        encounters.value = encData.slice(0, 10); // Show first 10 locations
        console.log('Encounters loaded');

    } catch (e) {
        console.error('Error loading pokemon details', e);
        loadingError.value = "Failed to load Pokémon details. Please check the name or ID.";
        if (e.response && e.response.status === 404) {
            loadingError.value = `Pokémon "${id}" not found in PokéAPI.`;
        }
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
    object-fit: contain;
    filter: drop-shadow(0 5px 15px rgba(0,0,0,0.1));
}

.info-and-stats {
    flex: 1;
    min-width: 300px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.physical-info {
    display: flex;
    justify-content: space-around;
    background: #fdfdfd;
    padding: 15px;
    border-radius: 12px;
    border: 1px solid #f0f0f0;
}

.info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.info-item .label {
    font-size: 0.75rem;
    color: #999;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
}

.info-item .value {
    font-size: 1.2rem;
    font-weight: bold;
    color: #333;
}

.stats {
    width: 100%;
}

.stat-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
}

.stat-name {
    width: 45px;
    font-weight: bold;
    font-size: 0.85rem;
    color: #666;
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
    transition: width 0.5s ease-out;
}

.details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 30px;
}

.abilities-section, .encounters-section {
    background: #fafafa;
    padding: 20px;
    border-radius: 16px;
    border: 1px solid #f0f0f0;
}

.abilities-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.ability-card {
    background: white;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.ability-name {
    font-weight: bold;
    color: #333;
    font-size: 0.95rem;
}

.hidden-badge {
    font-size: 0.65rem;
    background: #fff3e0;
    color: #ef6c00;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
    text-transform: uppercase;
}

.encounters-list {
    max-height: 150px;
    overflow-y: auto;
    padding-right: 8px;
}

.encounter-item {
    font-size: 0.9rem;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    color: #555;
}

.encounter-item:last-child {
    border-bottom: none;
}

.evolution-chain {
    margin-top: 30px;
    text-align: center;
    padding: 20px;
    background: #fcfcfc;
    border-radius: 16px;
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

/* Moves Section */
.moves-section {
    margin-top: 40px;
    border-top: 2px solid #f0f0f0;
    padding-top: 20px;
}

.moves-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
}

.move-row {
    background: #f8f9fa;
    padding: 10px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
}

.move-name {
    font-weight: bold;
    color: #333;
}

.move-method {
    background: #e0e0e0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #666;
}

.move-level {
    color: #4caf50;
    font-weight: bold;
}

.show-more-btn {
    margin-top: 20px;
    width: 100%;
    padding: 10px;
    background: #f0f0f0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
}

.show-more-btn:hover {
    background: #e0e0e0;
}

.error-container {
    text-align: center;
    padding: 40px;
    background: #ffeeee;
    border-radius: 12px;
    color: #c62828;
}

.error-container button {
    margin-top: 10px;
    padding: 8px 16px;
    background: #c62828;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
</style>
