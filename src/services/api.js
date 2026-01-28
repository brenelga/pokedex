import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for JWT
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me')
};

export const userApi = {
    getFavorites: () => api.get('/user/favorites'),
    toggleFavorite: (pokemonId) => api.post('/user/favorites', { pokemonId }),
    getTeams: () => api.get('/user/teams'),
    saveTeam: (team) => api.post('/user/teams', { team }),
    deleteTeam: (teamId) => api.delete(`/user/teams/${teamId}`),
    addFriend: (friendCode) => api.post('/friends/add', { friendCode }),
    getFriends: () => api.get('/friends')
};

export const battleApi = {
    create: (opponentId, myTeamId) => api.post('/battles/create', { opponentId, myTeamId }),
    join: (battleId, teamId) => api.post(`/battles/${battleId}/join`, { teamId }),
    getBattles: () => api.get('/battles'),
    getBattle: (id) => api.get(`/battles/${id}`),
    move: (battleId, move, pokemonIndex) => api.post(`/battles/${battleId}/move`, { move, pokemonIndex })
};

export const pokeApi = {
    getPokemonList: async (limit = 20, offset = 0) => {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
        return response.data;
    },
    getPokemonDetails: async (nameOrId) => {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
        return response.data;
    },
    getSpecies: async (nameOrId) => {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${nameOrId}`);
        return response.data;
    },
    getEvolutionChain: async (url) => {
        const response = await axios.get(url);
        return response.data;
    },
    getType: async (type) => {
        const response = await axios.get(`https://pokeapi.co/api/v2/type/${type}`);
        return response.data;
    },
    getPokedex: async (id) => {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokedex/${id}`);
        return response.data;
    },
    getGeneration: async (id) => {
        const response = await axios.get(`https://pokeapi.co/api/v2/generation/${id}`);
        return response.data;
    }
};

export default api;
