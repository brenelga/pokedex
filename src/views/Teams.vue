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
                <span class="member-name">{{ member.name }}</span>
                
                <div class="selected-moves" v-if="member.selectedMoves?.length">
                    <span v-for="m in member.selectedMoves" :key="m" class="mini-move">{{ m }}</span>
                </div>
                
                <button @click="openMoveSelector(index)" class="moves-btn">Moves ({{ member.selectedMoves?.length || 0 }}/4)</button>
                <button @click="removeMember(index)" class="remove-btn">x</button>
            </div>
            <div v-for="n in (6 - currentTeam.members.length)" :key="'empty'+n" class="member-slot empty">
                <span>Empty Slot</span>
            </div>
        </div>

        <!-- MOVE SELECTOR MODAL -->
        <div v-if="showMoveSelector" class="modal">
            <div class="modal-content move-selector">
                <h3>Select Moves for {{ currentMember.name }}</h3>
                <p class="subtitle">Select up to 4 moves</p>
                <div class="moves-list-selector">
                    <div v-for="m in currentMemberMoves" :key="m.move.name" 
                         class="move-option" 
                         :class="{ selected: isMoveSelected(m.move.name) }"
                         @click="toggleMove(m.move.name)">
                        {{ m.move.name.replace('-', ' ') }}
                    </div>
                </div>
                <div class="modal-actions">
                    <button @click="closeMoveSelector">Done</button>
                </div>
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

// Move Selection
const showMoveSelector = ref(false);
const editingMemberIndex = ref(-1);
const currentMemberMoves = ref([]);
const currentMember = computed(() => editingMemberIndex.value !== -1 ? currentTeam.value.members[editingMemberIndex.value] : null);

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
        sprite: searchResult.value.sprites.front_default,
        selectedMoves: [],
        allMoves: searchResult.value.moves // Temporary store to avoid re-fetching
    });
    searchResult.value = null;
    searchQuery.value = '';
};

const openMoveSelector = async (index) => {
    editingMemberIndex.value = index;
    const member = currentTeam.value.members[index];
    
    if (member.allMoves) {
        currentMemberMoves.value = member.allMoves;
    } else {
        // Fetch if not available (shouldn't happen on new add, but maybe on edit)
        try {
            const data = await pokeApi.getPokemonDetails(member.id);
            member.allMoves = data.moves;
            currentMemberMoves.value = data.moves;
        } catch (e) {
            console.error(e);
        }
    }
    showMoveSelector.value = true;
};

const closeMoveSelector = () => {
    showMoveSelector.value = false;
    editingMemberIndex.value = -1;
};

const isMoveSelected = (moveName) => {
    return currentMember.value?.selectedMoves?.includes(moveName);
};

const toggleMove = (moveName) => {
    const member = currentMember.value;
    if (!member.selectedMoves) member.selectedMoves = [];
    
    const idx = member.selectedMoves.indexOf(moveName);
    if (idx !== -1) {
        member.selectedMoves.splice(idx, 1);
    } else {
        if (member.selectedMoves.length < 4) {
            member.selectedMoves.push(moveName);
        } else {
            alert('Maximum 4 moves allowed');
        }
    }
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

/* Moves UI */
.moves-btn {
    margin-top: auto;
    width: 90%;
    padding: 5px;
    font-size: 0.8rem;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.selected-moves {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
    margin: 5px 0;
}

.mini-move {
    background: #e3f2fd;
    color: #1565c0;
    font-size: 0.65rem;
    padding: 1px 4px;
    border-radius: 4px;
    text-transform: capitalize;
}

.move-selector {
    max-width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.moves-list-selector {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 15px 0;
    padding: 10px;
}

.move-option {
    padding: 10px;
    background: #f5f5f5;
    border-radius: 6px;
    cursor: pointer;
    text-align: center;
    text-transform: capitalize;
    font-size: 0.9rem;
    border: 2px solid transparent;
}

.move-option:hover {
    background: #eee;
}

.move-option.selected {
    background: #e3f2fd;
    border-color: #2196F3;
    color: #1976D2;
    font-weight: bold;
}

.subtitle {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 10px;
}

.modal {
    z-index: 1000;
}
</style>
