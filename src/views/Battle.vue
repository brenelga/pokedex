<template>
  <div class="battle-container">
    <!-- FRIENDS SECTION -->
    <div class="section friends-section">
        <h3>Amigos</h3>
        <div class="add-friend">
            <input v-model="friendCode" placeholder="Ingresa código de amigo" />
            <button @click="addFriend">Agregar Amigo</button>
        </div>
        <div class="friends-list">
            <div v-for="friend in friends" :key="friend.id" class="friend-item">
                <span class="friend-name">{{ friend.name }}</span>
                <button @click="selectOpponent(friend)" class="challenge-btn">Desafiar</button>
            </div>
            <p v-if="friends.length === 0">Aún no tienes amigos.</p>
        </div>
    </div>

    <!-- BATTLES LIST -->
    <div class="section battles-section">
        <h3>Batallas Activas</h3>
        <div class="battle-list">
            <div v-for="battle in battles" :key="battle.id" class="battle-item" :class="{ active: currentBattle?.id === battle.id }" @click="openBattle(battle)">
                <span>vs {{ getOpponentName(battle) }}</span>
                <span class="status">{{ battle.status }}</span>
            </div>
             <p v-if="battles.length === 0">No hay batallas activas.</p>
        </div>
    </div>

    <!-- BATTLE INTERFACE -->
    <div v-if="currentBattle" class="battle-arena">
        <div class="arena-header">
            <h3>Batalla vs {{ getOpponentName(currentBattle) }}</h3>
            <button @click="closeBattle">Cerrar</button>
        </div>
        
        <div v-if="currentBattle.status === 'waiting_for_opponent'" class="waiting">
            <p v-if="currentBattle.player2 === userId">
                ¡Has sido desafiado! Selecciona un equipo para unirte.
                <select v-model="selectedTeamId">
                    <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
                <button @click="joinBattle" :disabled="!selectedTeamId">Unirse a Batalla</button>
            </p>
            <p v-else>Esperando a que el oponente se una...</p>
        </div>

        <div v-else-if="currentBattle.status === 'active'" class="active-battle">
            <div class="logs">
                <div v-for="(log, i) in currentBattle.logs" :key="i">{{ log }}</div>
            </div>
            
            <div class="controls" v-if="isMyTurn">
                <h4>¡Tu Turno!</h4>
                <div class="moves">
                    <button @click="makeMove('Attack')">Atacar</button>
                    <button @click="makeMove('Defend')">Defender</button>
                    <button @click="makeMove('Special')">Especial</button>
                </div>
            </div>
            <div v-else class="waiting-turn">
                Esperando al oponente...
            </div>
        </div>
    </div>
    
    <!-- MODAL TO SELECT TEAM FOR NEW BATTLE -->
    <div v-if="showTeamSelect" class="modal">
        <div class="modal-content">
            <h3>Seleccionar equipo para batalla con {{ selectedFriend?.name }}</h3>
            <select v-model="selectedTeamId">
                <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <div class="modal-actions">
                <button @click="createBattle" :disabled="!selectedTeamId">Iniciar Batalla</button>
                <button @click="showTeamSelect = false">Cancelar</button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { userApi, battleApi } from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const userId = computed(() => authStore.user?.id);

const friends = ref([]);
const battles = ref([]);
const teams = ref([]);
const friendCode = ref('');

const currentBattle = ref(null);
const selectedFriend = ref(null);
const showTeamSelect = ref(false);
const selectedTeamId = ref('');

let pollInterval;

const loadData = async () => {
    try {
        const [fRes, bRes, tRes] = await Promise.all([
            userApi.getFriends(),
            battleApi.getBattles(),
            userApi.getTeams()
        ]);
        friends.value = fRes.data;
        battles.value = bRes.data;
        teams.value = tRes.data;
        
        // Update current battle if open
        if (currentBattle.value) {
            const up = battles.value.find(b => b.id === currentBattle.value.id);
            if (up) currentBattle.value = up;
        }
    } catch (e) {
        console.error(e);
    }
};

const addFriend = async () => {
    try {
        await userApi.addFriend(friendCode.value);
        friendCode.value = '';
        loadData();
    } catch (e) {
        alert(e.response?.data?.error || 'Error al agregar amigo');
    }
};

const selectOpponent = (friend) => {
    selectedFriend.value = friend;
    showTeamSelect.value = true;
};

const createBattle = async () => {
    try {
        await battleApi.create(selectedFriend.value.id, selectedTeamId.value);
        showTeamSelect.value = false;
        loadData();
    } catch (e) {
        console.error(e);
    }
};

const openBattle = (battle) => {
    currentBattle.value = battle;
};

const closeBattle = () => {
    currentBattle.value = null;
};

const joinBattle = async () => {
    try {
        await battleApi.join(currentBattle.value.id, selectedTeamId.value);
        loadData();
    } catch (e) {
        console.error(e);
    }
};

const makeMove = async (move) => {
    try {
        await battleApi.move(currentBattle.value.id, move, 0);
        loadData();
    } catch (e) {
        console.error(e);
    }
};

const getOpponentName = (battle) => {
    if (battle.player1 === userId.value) {
        const f = friends.value.find(f => f.id === battle.player2);
        return f ? f.name : 'Oponente';
    } else {
         const f = friends.value.find(f => f.id === battle.player1);
        return f ? f.name : 'Oponente';
    }
};

const isMyTurn = computed(() => {
    return currentBattle.value?.turn === userId.value;
});

onMounted(() => {
    loadData();
    pollInterval = setInterval(loadData, 2000); // Polling every 2s
});

onUnmounted(() => {
    clearInterval(pollInterval);
});
</script>

<style scoped>
.battle-container {
    padding: 20px;
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-rows: auto 1fr;
    gap: 20px;
    height: 80vh;
}
.section {
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    border: 1px solid #eee;
}
.friends-section {
    grid-row: 1 / 3;
}
.battles-section {
    grid-column: 2;
    max-height: 200px;
    overflow-y: auto;
}
.battle-arena {
    grid-column: 2;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
}

/* Friends Styles */
.friend-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
}
.add-friend {
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
}
.challenge-btn {
    padding: 4px 8px;
    background: #FF9800;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* Battle List */
.battle-item {
    padding: 10px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
}
.battle-item:hover, .battle-item.active {
    background: #f5f5f5;
}

/* Arena */
.arena-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    margin-bottom: 10px;
}
.logs {
    flex: 1;
    border: 1px solid #ddd;
    padding: 10px;
    overflow-y: auto;
    background: #fafafa;
    margin-bottom: 10px;
    max-height: 300px;
}
.controls {
    text-align: center;
}
.moves button {
    padding: 10px 20px;
    margin: 5px;
    font-size: 1.1rem;
    cursor: pointer;
}
.waiting-turn {
    text-align: center;
    font-style: italic;
    color: #666;
}

/* Modal */
.modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}
.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    min-width: 300px;
}
.modal-actions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>
