import { defineStore } from "pinia";

export const usePokemonStore = defineStore('pokemon', {
    state: () => ({
        favorites: [],
        teams: [],
        currentPokemon: null
    }),
    actions: {
        async fetchFavorites() {

        },
        async toogleFavorites(pokemonId) {

        }
    }
});