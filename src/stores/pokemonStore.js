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
            region: '',
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
            // Can add pagination logic here locally or in component
            return state.filteredList;
        }
    },

    actions: {
        async initialize() {
            if (this.allPokemon.length === 0) {
                await this.fetchAllPokemon();
            }
            // Load user data
            await this.fetchFavorites();
        },

        async fetchAllPokemon() {
            this.loading = true;
            try {
                // Initial fetch - get a large chunk or handle pagination gracefully.
                // For client-side filtering efficiency, we typically need a large set or 
                // we rely on specific API filter endpoints and merging.
                // Approach: Default view = load first 50. 
                // Filters: Fetch IDs from PokeAPI, then intersect.
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

                // 1. Process Region (Pokedex)
                if (this.filters.region) {
                    const data = await pokeApi.getPokedex(this.filters.region);
                    const names = data.pokemon_entries.map(e => e.pokemon_species.name);
                    candidateSets.push(new Set(names));
                }

                // 2. Process Generation
                if (this.filters.generation) {
                    const data = await pokeApi.getGeneration(this.filters.generation);
                    const names = data.pokemon_species.map(s => s.name);
                    candidateSets.push(new Set(names));
                }

                // 3. Process Type 1
                if (this.filters.type1) {
                    const data = await pokeApi.getType(this.filters.type1);
                    // Filter slot 1 strictly if needed, or just contains type
                    const names = data.pokemon.map(p => p.pokemon.name);
                    candidateSets.push(new Set(names));
                }

                // 4. Process Type 2
                if (this.filters.type2) {
                    const data = await pokeApi.getType(this.filters.type2);
                    const names = data.pokemon.map(p => p.pokemon.name);
                    candidateSets.push(new Set(names));
                }

                // Intersection
                let finalNames = null;
                if (candidateSets.length > 0) {
                    // Start with the first set
                    finalNames = candidateSets[0];
                    // Intersect with the rest
                    for (let i = 1; i < candidateSets.length; i++) {
                        finalNames = new Set([...finalNames].filter(x => candidateSets[i].has(x)));
                    }
                }

                // Search Query (Client side on result)
                let results = [];

                if (finalNames !== null) {
                    // If we have API filter results, map them to objects
                    // We might not have URLs for all, but we can construct basic objects or fetch details if needed
                    // For list view, name is often enough, or construct simple url if standard
                    results = Array.from(finalNames).map(name => ({
                        name: name,
                        url: `https://pokeapi.co/api/v2/pokemon/${name}/` // Approximation to keep compatible
                    }));
                } else {
                    // No API filters, use allPokemon (or fetch more if needed)
                    // If "allPokemon" is small, we might want to fetch everything if no filters?
                    // For now, reset to 'allPokemon' cache
                    if (this.allPokemon.length === 0) await this.fetchAllPokemon();
                    results = this.allPokemon;
                }

                // Apply text search
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
            // Logic to toggle
            // ...
        }
    }
});