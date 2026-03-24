import axios from 'axios';
import { saveRequest, getRequests, deleteRequest } from './indexedDB';

const api = axios.create({
    baseURL: '/api',
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

// Response interceptor for offline handling
api.interceptors.response.use(
    response => response,
    async error => {
        if (!error.response && error.message === 'Network Error') {
            const { config } = error;
            console.log('Network Error detected, saving request to IndexedDB:', config.url);

            try {
                // Save request to IndexedDB
                await saveRequest({
                    url: config.url,
                    method: config.method,
                    headers: config.headers,
                    data: config.data
                });

                // Register background sync if available
                if ('serviceWorker' in navigator && 'SyncManager' in window) {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.sync.register('sync-offline-requests');
                    console.log('Background Sync registered: sync-offline-requests');
                } else {
                    console.log('SyncManager not supported (Firefox/Safari). Will rely on local window online event fallback.');
                }
            } catch (dbError) {
                console.error('Failed to save offline request:', dbError);
            }
        }
        return Promise.reject(error);
    }
);

// Fallback for browsers that do not support Background Sync API (Firefox, Safari)
window.addEventListener('online', async () => {
    console.log('Network restored. Replaying offline requests (fallback)...');
    try {
        const requests = await getRequests();
        for (const req of requests) {
            try {
                const fetchOptions = {
                    method: req.method,
                    headers: req.headers,
                    body: typeof req.data === 'string' ? req.data : (req.data ? JSON.stringify(req.data) : undefined)
                };
                // We use fetch so we bypass Axios interceptors and don't accidentally re-queue on failure
                const response = await fetch(req.url, fetchOptions);

                if (response.ok) {
                    await deleteRequest(req.id);
                    console.log(`Fallback sync successful: ${req.url}`);
                } else if (response.status >= 400 && response.status < 500) {
                    await deleteRequest(req.id);
                }
            } catch (err) {
                console.error(`Failed to replay request ${req.url}`, err);
            }
        }
    } catch (e) {
        console.error('Error in online event fallback:', e);
    }
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
    deleteFriend: (friendId) => api.delete(`/friends/${friendId}`),
    getFriends: () => api.get('/friends')
};

export const battleApi = {
    create: (opponentId, myTeamId) => api.post('/battles/create', { opponentId, myTeamId }),
    join: (battleId, teamId) => api.post(`/battles/${battleId}/join`, { teamId }),
    getBattles: () => api.get('/battles'),
    getBattle: (id) => api.get(`/battles/${id}`),
    move: (battleId, payload) => api.post(`/battles/${battleId}/move`, payload),
    forfeit: (battleId) => api.post(`/battles/${battleId}/forfeit`)
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
    },
    getEncounters: async (url) => {
        const response = await axios.get(url);
        return response.data;
    }
};

export default api;
