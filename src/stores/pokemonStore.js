import { defineStore } from "pinia";
import { pokeApi, userApi } from '../services/api';

export const usePokemonStore = defineStore('pokemon', {
    state: () => ({
        // Data
        allPokemon: [], // Base list (all fetched or cached)
        filteredList: [], // Result of filters

        // UI State
        loading: false,
        error: null,

        // Filters
        filters: {
            search: '',
            generation: '',
            type1: '',
            type2: ''
        },

        // User Data
        favorites: [],
        teams: [],
        currentPokemon: null
    }),

    getters: {
        displayPokemon: (state) => {
            return state.filteredList;
        }
    },

    actions: {
        async initialize() {
            if (this.allPokemon.length === 0) {
                await this.fetchAllPokemon();
            }
            await this.fetchFavorites();
        },

        async fetchAllPokemon() {
            this.loading = true;
            try {
                const data = await pokeApi.getPokemonList(151, 0); // Start with Gen 1 size for demo
                this.allPokemon = data.results;
                this.filteredList = this.allPokemon;
            } catch (e) {
                this.error = e;
            } finally {
                this.loading = false;
            }
        },

        async setFilter(key, value) {
            this.filters[key] = value;
            await this.applyFilters();
        },

        async applyFilters() {
            this.loading = true;
            try {
                let candidateSets = [];

                if (this.filters.generation) {
                    const data = await pokeApi.getGeneration(this.filters.generation);
                    const names = data.pokemon_species.map(s => s.name);
                    candidateSets.push(new Set(names));
                }

                if (this.filters.type1) {
                    const data = await pokeApi.getType(this.filters.type1);
                    const names = data.pokemon.map(p => p.pokemon.name);
                    candidateSets.push(new Set(names));
                }

                if (this.filters.type2) {
                    const data = await pokeApi.getType(this.filters.type2);
                    const names = data.pokemon.map(p => p.pokemon.name);
                    candidateSets.push(new Set(names));
                }

                let finalNames = null;
                if (candidateSets.length > 0) {
                    finalNames = candidateSets[0];
                    for (let i = 1; i < candidateSets.length; i++) {
                        finalNames = new Set([...finalNames].filter(x => candidateSets[i].has(x)));
                    }
                }

                let results = [];

                if (finalNames !== null) {
                    
                    results = Array.from(finalNames).map(name => ({
                        name: name,
                        url: `https://pokeapi.co/api/v2/pokemon/${name}/` 
                    }));
                } else {
                    if (this.allPokemon.length === 0) await this.fetchAllPokemon();
                    results = this.allPokemon;
                }

                if (this.filters.search) {
                    const term = this.filters.search.toLowerCase();
                    results = results.filter(p => p.name.includes(term));
                }

                this.filteredList = results;

            } catch (e) {
                console.error("Filter error", e);
                this.error = e;
            } finally {
                this.loading = false;
            }
        },

        async fetchFavorites() {
            try {
                const res = await userApi.getFavorites();
                this.favorites = res.data;
            } catch (e) {
                console.error(e);
            }
        },

        async toggleFavorite(pokemon) {
        }
    }
});