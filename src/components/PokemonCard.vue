<template>
  <div class="pokemon-card" @click="goToDetail">
    <div class="image-container">
       <img :src="getImage(pokemonId)" :alt="pokemon.name" loading="lazy">
    </div>
    <div class="info">
      <span class="number">#{{ pokemonId }}</span>
      <h3>{{ capitalize(pokemon.name) }}</h3>
      <div class="actions">
        <button @click.stop="toggleFavorite" :class="{ active: isFavorite }" title="Add to Favorites">
          ❤️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  pokemon: Object,
  isFavorite: Boolean
});

const emit = defineEmits(['toggle-favorite']);
const router = useRouter();

const pokemonId = computed(() => {
  // Extract ID from URL
  if (props.pokemon.url) {
    const parts = props.pokemon.url.split('/');
    return parts[parts.length - 2];
  }
  return props.pokemon.id; // Fallback if full object provided
});

const getImage = (id) => {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const goToDetail = () => {
    router.push(`/pokemon/${pokemonId.value}`);
};

const toggleFavorite = () => {
    const id = Number(pokemonId.value);
    emit('toggle-favorite', id);
};
</script>

<style scoped>
.pokemon-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pokemon-card:hover {
  transform: translateY(-5px);
}

.image-container {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  margin-bottom: 10px;
}

.image-container img {
  width: 100px;
  height: 100px;
  object-fit: contain;
}

.info {
  width: 100%;
}

.number {
  color: #888;
  font-size: 0.9rem;
}

h3 {
  margin: 5px 0;
  font-size: 1.1rem;
  color: #333;
}

.actions button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s;
  opacity: 0.3;
}

.actions button.active {
  opacity: 1;
  transform: scale(1.1);
}

.actions button:hover {
  opacity: 0.7;
}
</style>
