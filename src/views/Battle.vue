<template>
  <div class="battle-container">
    <!-- FRIENDS SECTION -->
    <div class="section friends-section">
        <h3>Friends</h3>
        <div class="add-friend">
            <input v-model="friendCode" placeholder="Enter Friend Code" />
            <button @click="addFriend">Add Friend</button>
        </div>
        <div class="friends-list">
            <div v-for="friend in friends" :key="friend.id" class="friend-item">
                <span class="friend-name">{{ friend.name }}</span>
                <div class="friend-actions">
                    <button @click="selectOpponent(friend)" class="challenge-btn">Challenge</button>
                    <button @click="removeFriend(friend.id)" class="remove-friend-btn" title="Remove Friend">✕</button>
                </div>
            </div>
            <p v-if="friends.length === 0">No friends yet.</p>
        </div>
    </div>

    <!-- BATTLES LIST -->
    <div class="section battles-section">
        <h3>Active Battles</h3>
        <div class="battle-list">
            <div v-for="battle in battles" :key="battle.id" class="battle-item" :class="{ active: currentBattle?.id === battle.id }" @click="openBattle(battle)">
                <span>vs {{ getOpponentName(battle) }}</span>
                <span class="status">{{ battle.status }}</span>
            </div>
             <p v-if="battles.length === 0">No active battles.</p>
        </div>
    </div>

    <!-- BATTLE INTERFACE -->
    <div v-if="currentBattle" class="battle-arena">
        <div class="arena-header">
            <h3>Battle vs {{ getOpponentName(currentBattle) }}</h3>
            <div class="header-buttons">
                <button v-if="currentBattle.status !== 'finished'" @click="forfeitBattle" class="forfeit-btn">Forfeit</button>
                <button @click="closeBattle">Close</button>
            </div>
        </div>
        
        <div v-if="currentBattle.status === 'waiting_for_opponent'" class="waiting">
            <p v-if="currentBattle.player2 === userId">
                You have been challenged! Select a team to join.
                <select v-model="selectedTeamId">
                    <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
                <button @click="joinBattle" :disabled="!selectedTeamId">Join Battle</button>
            </p>
            <p v-else>Waiting for opponent to join...</p>
        </div>

        <div v-else-if="currentBattle.status === 'active' || currentBattle.status === 'finished'" class="active-battle">
            <div class="battlefield">
                <!-- Opponent -->
                <div class="pokemon opponent-pokemon">
                    <div class="stats-box">
                        <span class="name">{{ oppActivePokemon?.name }}</span>
                        <div class="hp-bar-container">
                            <div class="hp-bar" :style="{ width: ((oppActivePokemon?.currentHp / oppActivePokemon?.maxHp) * 100) + '%' }" :class="hpColor(oppActivePokemon)"></div>
                        </div>
                        <span class="hp-text">{{ oppActivePokemon?.currentHp }} / {{ oppActivePokemon?.maxHp }}</span>
                    </div>
                    <div class="platform">
                        <img :src="oppActivePokemon?.sprite" />
                    </div>
                </div>

                <!-- Player -->
                <div class="pokemon player-pokemon">
                    <div class="platform">
                        <img :src="myActivePokemon?.sprite" />
                    </div>
                    <div class="stats-box">
                        <span class="name">{{ myActivePokemon?.name }}</span>
                        <div class="hp-bar-container">
                            <div class="hp-bar" :style="{ width: ((myActivePokemon?.currentHp / myActivePokemon?.maxHp) * 100) + '%' }" :class="hpColor(myActivePokemon)"></div>
                        </div>
                        <span class="hp-text">{{ myActivePokemon?.currentHp }} / {{ myActivePokemon?.maxHp }}</span>
                    </div>
                </div>
            </div>

            <div class="logs" ref="logsContainer">
                <div v-for="(log, i) in currentBattle.logs" :key="i">{{ log }}</div>
            </div>
            
            <div class="controls" v-if="currentBattle.status !== 'finished' && isMyTurn">
                <h4>What will {{ myActivePokemon?.name }} do?</h4>
                <div class="actions-grid">
                    <button class="action-btn fight-btn" @click="showMoves = true; showSwitch = false" v-if="!showMoves && !showSwitch">FIGHT</button>
                    <button class="action-btn switch-btn" @click="showSwitch = true; showMoves = false" v-if="!showMoves && !showSwitch">SWITCH</button>
                    
                    <template v-if="showMoves">
                        <div class="moves-grid">
                            <button v-for="move in myMoves" :key="move" @click="makeMove(move)" class="move-btn">
                                {{ move.replace('-', ' ') }}
                            </button>
                        </div>
                        <button v-if="myMoves.length === 0" disabled>No moves selected!</button>
                        <button class="back-btn" @click="showMoves = false">BACK</button>
                    </template>

                    <template v-if="showSwitch">
                        <div class="switch-list">
                            <button v-for="(p, i) in myTeam?.members" :key="p.id" 
                                    @click="switchPokemon(i)" 
                                    :disabled="p.currentHp === 0 || i === myActiveIndex"
                                    class="switch-option">
                                <img :src="p.sprite" class="mini-sprite"/> 
                                <span>{{ p.name }}</span>
                                <span>HP: {{ p.currentHp }}/{{ p.maxHp }}</span>
                            </button>
                        </div>
                        <button class="back-btn" @click="showSwitch = false">BACK</button>
                    </template>
                </div>
            </div>
            <div v-else-if="currentBattle.status !== 'finished'" class="waiting-turn">
                Waiting for opponent...
            </div>
            <div v-else class="finished-message">
                <h2>Battle Finished!</h2>
                <p>{{ currentBattle.logs?.[currentBattle.logs.length - 1] }}</p>
            </div>
        </div>
    </div>
    
    <!-- MODAL TO SELECT TEAM FOR NEW BATTLE -->
    <div v-if="showTeamSelect" class="modal">
        <div class="modal-content">
            <h3>Select Team to Battle {{ selectedFriend?.name }}</h3>
            <select v-model="selectedTeamId">
                <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <div class="modal-actions">
                <button @click="createBattle" :disabled="!selectedTeamId">Start Battle</button>
                <button @click="showTeamSelect = false">Cancel</button>
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

const showMoves = ref(false);
const showSwitch = ref(false);

const logsContainer = ref(null);

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
            if (up) {
                const logsChanged = currentBattle.value.logs?.length !== up.logs?.length;
                currentBattle.value = up;
                if (logsChanged) {
                    setTimeout(() => {
                        if (logsContainer.value) {
                            logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
                        }
                    }, 50);
                }
            }
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
        alert(e.response?.data?.error || 'Error adding friend');
    }
};

const removeFriend = async (friendId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    try {
        await userApi.deleteFriend(friendId);
        loadData();
    } catch (e) {
        alert(e.response?.data?.error || 'Error removing friend');
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
    showMoves.value = false;
    showSwitch.value = false;
};

const joinBattle = async () => {
    try {
        await battleApi.join(currentBattle.value.id, selectedTeamId.value);
        loadData();
    } catch (e) {
        console.error(e);
    }
};

const makeMove = async (moveName) => {
    try {
        await battleApi.move(currentBattle.value.id, { action: 'move', moveName });
        showMoves.value = false;
        loadData();
    } catch (e) {
        alert(e.response?.data?.error || 'Error making move');
    }
};

const forfeitBattle = async () => {
    if (!confirm('Are you sure you want to forfeit this battle?')) return;
    try {
        await battleApi.forfeit(currentBattle.value.id);
        loadData();
    } catch (e) {
        alert(e.response?.data?.error || 'Error forfeiting');
    }
};

const switchPokemon = async (index) => {
    try {
        await battleApi.move(currentBattle.value.id, { action: 'switch', switchIndex: index });
        showSwitch.value = false;
        loadData();
    } catch (e) {
        alert(e.response?.data?.error || 'Error switching pokemon');
    }
};

const getOpponentName = (battle) => {
    if (battle.player1 === userId.value) {
        const f = friends.value.find(f => f.id === battle.player2);
        return f ? f.name : 'Opponent';
    } else {
         const f = friends.value.find(f => f.id === battle.player1);
        return f ? f.name : 'Opponent';
    }
};

const isMyTurn = computed(() => {
    return currentBattle.value?.turn === userId.value;
});

const isPlayer1 = computed(() => currentBattle.value?.player1 === userId.value);

const myActiveIndex = computed(() => {
    if (!currentBattle.value) return 0;
    return isPlayer1.value ? currentBattle.value.activePokemon1 : currentBattle.value.activePokemon2;
});

const oppActiveIndex = computed(() => {
    if (!currentBattle.value) return 0;
    return !isPlayer1.value ? currentBattle.value.activePokemon1 : currentBattle.value.activePokemon2;
});

const myTeam = computed(() => {
    if (!currentBattle.value) return null;
    return isPlayer1.value ? currentBattle.value.player1Team : currentBattle.value.player2Team;
});

const oppTeam = computed(() => {
    if (!currentBattle.value) return null;
    return !isPlayer1.value ? currentBattle.value.player1Team : currentBattle.value.player2Team;
});

const myActivePokemon = computed(() => myTeam.value?.members?.[myActiveIndex.value]);
const oppActivePokemon = computed(() => oppTeam.value?.members?.[oppActiveIndex.value]);

const myMoves = computed(() => {
    if (myActivePokemon.value?.selectedMoves?.length > 0) {
        return myActivePokemon.value.selectedMoves;
    }
    return ['Attack', 'Defend', 'Special']; // Fallback
});

const hpColor = (pokemon) => {
    if (!pokemon || !pokemon.maxHp) return 'hp-high';
    const percent = pokemon.currentHp / pokemon.maxHp;
    if (percent > 0.5) return 'hp-high';
    if (percent > 0.2) return 'hp-medium';
    return 'hp-low';
}

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
.friend-actions {
    display: flex;
    gap: 5px;
}
.remove-friend-btn {
    padding: 4px 8px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
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
.header-buttons {
    display: flex;
    gap: 10px;
}
.forfeit-btn {
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
}
.logs {
    flex: 1;
    border: 1px solid #ddd;
    padding: 10px;
    overflow-y: auto;
    background: #fafafa;
    margin-bottom: 10px;
    max-height: 200px;
}
.controls {
    background: #f0f0f0;
    padding: 15px;
    border-radius: 8px;
    border: 2px solid #ddd;
}
.actions-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-top: 10px;
}
.action-btn {
    padding: 15px 30px;
    font-size: 1.2rem;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    flex: 1;
    min-width: 120px;
}
.fight-btn { background: #f44336; color: white; }
.switch-btn { background: #2196F3; color: white; }

.moves-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    width: 100%;
}
.move-btn {
    padding: 15px;
    background: #FFCA28;
    border: 2px solid #FFA000;
    border-radius: 8px;
    font-weight: bold;
    text-transform: capitalize;
    cursor: pointer;
}
.move-btn:hover { background: #FFD54F; }

.switch-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    width: 100%;
}
.switch-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px;
    background: white;
    border: 2px solid #ccc;
    border-radius: 8px;
    cursor: pointer;
}
.switch-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #eee;
}
.mini-sprite { width: 40px; height: 40px; }
.back-btn {
    padding: 10px;
    background: #9e9e9e;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    margin-top: 10px;
}

.waiting-turn {
    text-align: center;
    font-style: italic;
    color: #666;
    padding: 20px;
}
.finished-message {
    text-align: center;
    color: #f44336;
    padding: 20px;
}

/* Battlefield Styles */
.battlefield {
    min-height: 250px;
    background: #e8f5e9;
    border-radius: 8px;
    margin-bottom: 20px;
    position: relative;
    padding: 20px;
    border: 2px solid #a5d6a7;
}

.pokemon {
    display: flex;
    align-items: flex-end;
    gap: 20px;
    position: absolute;
}
.opponent-pokemon { top: 20px; right: 20px; }
.player-pokemon { bottom: 20px; left: 20px; flex-direction: row-reverse; }

.platform {
    width: 120px;
    height: 40px;
    background: rgba(0,0,0,0.1);
    border-radius: 50%;
    position: relative;
}
.platform img {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 96px;
    height: 96px;
    image-rendering: pixelated;
}

.stats-box {
    background: #fffdf2;
    border: 3px solid #333;
    border-radius: 8px 8px 8px 0;
    padding: 10px;
    min-width: 180px;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.2);
}
.player-pokemon .stats-box { border-radius: 8px 8px 0 8px; }

.stats-box .name {
    font-weight: bold;
    text-transform: uppercase;
    display: block;
    margin-bottom: 5px;
}

.hp-bar-container {
    width: 100%;
    height: 10px;
    background: #ccc;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid #999;
}

.hp-bar {
    height: 100%;
    transition: width 0.3s ease, background-color 0.3s ease;
}

.hp-high { background: #4caf50; }
.hp-medium { background: #ffeb3b; border-right: 1px solid #fbc02d; } /* Added border for visibility */
.hp-low { background: #f44336; }

.hp-text {
    font-size: 0.8rem;
    display: block;
    text-align: right;
    margin-top: 3px;
    font-family: monospace;
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

/* Responsiveness for Mobile */
@media (max-width: 768px) {
    .battle-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        height: auto;
    }
    .friends-section, .battles-section, .battle-arena {
        grid-column: 1;
        grid-row: auto;
    }
    .battlefield {
        min-height: 250px;
        padding: 10px;
    }
    .platform {
        width: 80px;
        height: 30px;
    }
    .platform img {
        width: 70px;
        height: 70px;
        bottom: 5px;
    }
    .pokemon {
        gap: 10px;
    }
    .opponent-pokemon { top: 10px; right: 10px; }
    .player-pokemon { bottom: 10px; left: 10px; }
    .stats-box {
        min-width: 140px;
        padding: 5px;
    }
    .stats-box .name {
        font-size: 0.9em;
    }
    .action-btn {
        padding: 10px 20px;
        font-size: 1rem;
    }
}
</style>
