<template>
  <div class="teams-container">
    <div class="header-actions">
      <h2>My Teams</h2>
      <button @click="startNewTeam" v-if="!isEditing">+ New Team</button>
    </div>

    <!-- LIST MODE -->
    <div v-if="!isEditing" class="team-list">
        <div v-for="team in teams" :key="team.id" class="team-card">
            <h3>{{ team.name }}</h3>
            <div class="team-sprites">
                <img v-for="p in team.members" :key="p.id" :src="p.sprite" :title="p.name">
            </div>
            <div class="team-actions">
                <button @click="editTeam(team)">Edit</button>
                <button @click="deleteTeam(team.id)">Delete</button>
            </div>
        </div>
        <p v-if="teams.length === 0">No teams created yet.</p>
    </div>

    <!-- EDIT MODE -->
    <div v-else class="team-editor">
        <div class="editor-header">
            <input v-model="currentTeam.name" placeholder="Team Name" class="team-name-input" />
            <div class="editor-actions">
                <button @click="saveTeam" :disabled="!isValidTeam">Save</button>
                <button @click="cancelEdit" class="secondary">Cancel</button>
            </div>
        </div>

        <div class="members-grid">
            <div v-for="(member, index) in currentTeam.members" :key="index" class="member-slot filled">
                <img :src="member.sprite" alt="">
                <span>{{ member.name }}</span>
                <button @click="removeMember(index)" class="remove-btn">x</button>
            </div>
            <div v-for="n in (6 - currentTeam.members.length)" :key="'empty'+n" class="member-slot empty">
                <span>Empty Slot</span>
            </div>
        </div>

        <div class="add-pokemon">
            <h4>Add Pokemon</h4>
            <div class="search-box">
                <input v-model="searchQuery" @keyup.enter="searchPokemon" placeholder="Enter Pokemon Name or ID" />
                <button @click="searchPokemon">Search</button>
            </div>
            <div v-if="searchResult" class="search-result">
                <img :src="searchResult.sprites.front_default" alt="">
                <span>{{ searchResult.name }}</span>
                <button @click="addMember">Add to Team</button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { userApi, pokeApi } from '../services/api';

const teams = ref([]);
const isEditing = ref(false);
const currentTeam = ref({ name: '', members: [] });
const searchQuery = ref('');
const searchResult = ref(null);

const loadTeams = async () => {
    try {
        const res = await userApi.getTeams();
        teams.value = res.data;
    } catch (e) {
        console.error(e);
    }
};

const startNewTeam = () => {
    currentTeam.value = { name: 'New Team', members: [] };
    isEditing.value = true;
    searchResult.value = null;
    searchQuery.value = '';
};

const editTeam = (team) => {
    currentTeam.value = JSON.parse(JSON.stringify(team)); // Deep copy
    isEditing.value = true;
    searchResult.value = null;
    searchQuery.value = '';
};

const cancelEdit = () => {
    isEditing.value = false;
};

const deleteTeam = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
        await userApi.deleteTeam(id);
        loadTeams();
    } catch (e) {
        console.error(e);
    }
};

const searchPokemon = async () => {
    if (!searchQuery.value) return;
    try {
        const data = await pokeApi.getPokemonDetails(searchQuery.value.toLowerCase());
        searchResult.value = data;
    } catch (e) {
        alert('Pokemon not found');
        searchResult.value = null;
    }
};

const addMember = () => {
    if (!searchResult.value) return;
    if (currentTeam.value.members.length >= 6) {
        alert('Team is full (max 6)');
        return;
    }
    
    currentTeam.value.members.push({
        id: searchResult.value.id,
        name: searchResult.value.name,
        sprite: searchResult.value.sprites.front_default
    });
    searchResult.value = null;
    searchQuery.value = '';
};

const removeMember = (index) => {
    currentTeam.value.members.splice(index, 1);
};

const saveTeam = async () => {
    try {
        await userApi.saveTeam(currentTeam.value);
        isEditing.value = false;
        loadTeams();
    } catch (e) {
        console.error(e);
    }
};

const isValidTeam = computed(() => {
    return currentTeam.value.name && currentTeam.value.members.length > 0;
});

onMounted(loadTeams);
</script>

<style scoped>
.teams-container {
    padding: 20px;
}
.header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.header-actions button {
    padding: 8px 16px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* List Styles */
.team-card {
    background: white;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.team-sprites {
    display: flex;
    gap: 10px;
    margin: 10px 0;
    background: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
}
.team-sprites img {
    width: 50px;
    height: 50px;
}

/* Editor Styles */
.editor-header {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}
.team-name-input {
    flex: 1;
    font-size: 1.2rem;
    padding: 5px;
}
.members-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}
.member-slot {
    height: 120px;
    border: 2px dashed #ccc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    border-radius: 8px;
}
.member-slot.filled {
    border: 2px solid #4caf50;
    background: #e8f5e9;
}
.remove-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #ef5350;
    color: white;
    border: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
}
.search-box {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}
.search-result {
    display: flex;
    align-items: center;
    gap: 10px;
    background: white;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
</style>
