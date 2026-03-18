import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { CONFIG } from './config.js';
import crypto from 'crypto';
import cache from './cache.js';
import { sendPushToUser } from './push.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existingUser = await db.findOne('users', u => u.email === email);
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const friendCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // Simple 6 char code

        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            friendCode,
            favorites: [], // Array of Pokemon IDs
            teams: [],     // Array of Team objects { name, members: [] }
            friends: []    // Array of User IDs
        };

        await db.add('users', newUser);

        const token = jwt.sign({ id: newUser.id, email: newUser.email }, CONFIG.JWT_SECRET);
        res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, friendCode: newUser.friendCode } });
    } catch (e) {
        console.error('Registration Error:', e);
        res.status(500).json({ error: 'Internal server error', details: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.findOne('users', u => u.email === email);
        if (!user) return res.status(400).json({ error: 'User not found' });

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, email: user.email }, CONFIG.JWT_SECRET);
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, friendCode: user.friendCode } });
        } else {
            res.status(403).json({ error: 'Invalid password' });
        }
    } catch (e) {
        console.error('Login Error:', e);
        res.status(500).json({ error: 'Internal server error', details: e.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    const user = await db.findOne('users', u => u.id === req.user.id);
    if (!user) return res.sendStatus(404);
    const { password, ...safeUser } = user.toObject ? user.toObject() : user;
    res.json(safeUser);
}, (err, req, res, next) => {
    console.error('Auth Me Error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// --- USER FEATURES ---

// Favorites
app.get('/api/user/favorites', authenticateToken, async (req, res) => {
    const cacheKey = `favorites_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.json(cachedData);
    }

    const user = await db.findOne('users', u => u.id === req.user.id);
    const favorites = user.favorites || [];

    cache.set(cacheKey, favorites);
    res.json(favorites);
});

app.post('/api/user/favorites', authenticateToken, async (req, res) => {
    const { pokemonId } = req.body;
    const user = await db.findOne('users', u => u.id === req.user.id);

    let favorites = user.favorites || [];
    if (favorites.includes(pokemonId)) {
        favorites = favorites.filter(id => id !== pokemonId);
    } else {
        favorites.push(pokemonId);
    }

    await db.update('users', u => u.id === req.user.id, { favorites });

    // Invalidate cache
    cache.del(`favorites_${req.user.id}`);

    res.json(favorites);
});

// Teams
app.get('/api/user/teams', authenticateToken, async (req, res) => {
    const cacheKey = `teams_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.json(cachedData);
    }

    const user = await db.findOne('users', u => u.id === req.user.id);
    const teams = user.teams || [];

    cache.set(cacheKey, teams);
    res.json(teams);
});

app.post('/api/user/teams', authenticateToken, async (req, res) => {
    const { team } = req.body; // Expect { id, name, members: [pokemon] }
    const user = await db.findOne('users', u => u.id === req.user.id);

    let teams = user.teams || [];
    if (team.id) {
        // Update existing
        const index = teams.findIndex(t => t.id === team.id);
        if (index !== -1) teams[index] = team;
        else teams.push(team);
    } else {
        // Create new
        team.id = Date.now().toString();
        teams.push(team);
    }

    await db.update('users', u => u.id === req.user.id, { teams });

    // Invalidate cache
    cache.del(`teams_${req.user.id}`);

    res.json(teams);
});

app.delete('/api/user/teams/:teamId', authenticateToken, async (req, res) => {
    const { teamId } = req.params;
    const user = await db.findOne('users', u => u.id === req.user.id);
    const teams = (user.teams || []).filter(t => t.id !== teamId);
    await db.update('users', u => u.id === req.user.id, { teams });

    // Invalidate cache
    cache.del(`teams_${req.user.id}`);

    res.json(teams);
});

// Friends
app.post('/api/friends/add', authenticateToken, async (req, res) => {
    const { friendCode } = req.body;
    const friend = await db.findOne('users', u => u.friendCode === friendCode);

    if (!friend) return res.status(404).json({ error: 'Friend not found' });
    if (friend.id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    const user = await db.findOne('users', u => u.id === req.user.id);
    if (user.friends && user.friends.includes(friend.id)) {
        return res.status(400).json({ error: 'Already friends' });
    }

    const friends = [...(user.friends || []), friend.id];
    await db.update('users', u => u.id === req.user.id, { friends });

    // Also add current user to friend's list (mutual)
    const friendFriends = [...(friend.friends || []), user.id];
    await db.update('users', u => u.id === friend.id, { friends: friendFriends });

    res.json({ message: 'Friend added', friend: { id: friend.id, name: friend.name } });

    // Invalidate cache for both users
    cache.del(`friends_${req.user.id}`);
    cache.del(`friends_${friend.id}`);

    // Send push notification to friend
    sendPushToUser(friend, {
        title: '¡Nueva invitación!',
        body: `${user.name} te ha añadido como amigo.`,
        icon: '/pwa-192x192.png',
        data: { url: '/friends' }
    });
});

app.get('/api/friends', authenticateToken, async (req, res) => {
    const cacheKey = `friends_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.json(cachedData);
    }

    const user = await db.findOne('users', u => u.id === req.user.id);
    const friendsPromises = (user.friends || []).map(async fid => {
        const f = await db.findOne('users', u => u.id === fid);
        return f ? { id: f.id, name: f.name, friendCode: f.friendCode } : null;
    });
    const friends = (await Promise.all(friendsPromises)).filter(Boolean);

    cache.set(cacheKey, friends);
    res.json(friends);
});

// --- BATTLE ROUTES ---
// Simple Turn-Based System
// 1. Create Battle (Challenge friend)
// 2. Poll Battle State
// 3. Make Move

app.post('/api/battles/create', authenticateToken, async (req, res) => {
    const { opponentId, myTeamId } = req.body;

    const user = await db.findOne('users', u => u.id === req.user.id);
    const opponent = await db.findOne('users', u => u.id === opponentId);

    const myTeam = user.teams.find(t => t.id === myTeamId);
    if (myTeam) {
        myTeam.members = myTeam.members.map(m => {
            const hpStat = m.stats?.hp || 100;
            const maxHp = Math.floor((2 * hpStat * 50) / 100) + 50 + 10;
            return { ...m, maxHp, currentHp: maxHp };
        });
    }

    const battle = {
        id: Date.now().toString(),
        player1: req.user.id,
        player2: opponentId,
        player1Team: myTeam,
        player2Team: null, // Opponent needs to join
        status: 'waiting_for_opponent',
        turn: req.user.id,
        logs: [`Battle created by ${user.name}`],
        lastUpdate: Date.now()
    };

    await db.add('battles', battle);
    res.json(battle);

    // Send push notification to opponent
    sendPushToUser(opponent, {
        title: '¡Reto de batalla!',
        body: `${user.name} te ha retado a una batalla.`,
        icon: '/pwa-192x192.png',
        data: { url: '/battle' }
    });
});

app.get('/api/battles', authenticateToken, async (req, res) => {
    const battles = (await db.read('battles')).filter(b =>
        (b.player1 === req.user.id || b.player2 === req.user.id)
    );
    res.json(battles);
});

app.post('/api/battles/:id/join', authenticateToken, async (req, res) => {
    const { teamId } = req.body;
    const battle = await db.findOne('battles', b => b.id === req.params.id);

    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.player2 !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const user = await db.findOne('users', u => u.id === req.user.id);
    const team = user.teams.find(t => t.id === teamId);
    if (team) {
        team.members = team.members.map(m => {
            const hpStat = m.stats?.hp || 100;
            const maxHp = Math.floor((2 * hpStat * 50) / 100) + 50 + 10;
            return { ...m, maxHp, currentHp: maxHp };
        });
    }

    if (!team) return res.status(400).json({ error: 'Team not found' });

    await db.update('battles', b => b.id === req.params.id, {
        player2Team: team,
        status: 'active',
        logs: [...battle.logs, `${user.name} joined the battle!`]
    });

    res.json(await db.findOne('battles', b => b.id === req.params.id));
});

app.post('/api/battles/:id/move', authenticateToken, async (req, res) => {
    const { action, moveName, switchIndex } = req.body; // action: 'move' or 'switch'
    const battle = await db.findOne('battles', b => b.id === req.params.id);
    const user = await db.findOne('users', u => u.id === req.user.id);

    if (battle.turn !== req.user.id) return res.status(400).json({ error: 'Not your turn' });

    const isP1 = battle.player1 === req.user.id;
    const opponentId = isP1 ? battle.player2 : battle.player1;
    let log = '';
    let nextTurn = opponentId;

    if (action === 'switch') {
        const teamKey = isP1 ? 'player1Team' : 'player2Team';
        const activeKey = isP1 ? 'activePokemon1' : 'activePokemon2';

        const newActive = battle[teamKey].members[switchIndex];
        if (!newActive || newActive.currentHp === 0) return res.status(400).json({ error: 'Invalid switch' });

        log = `Player switched to ${newActive.name}!`;

        await db.update('battles', b => b.id === req.params.id, {
            [activeKey]: switchIndex,
            turn: nextTurn,
            logs: [...battle.logs, log],
            lastUpdate: Date.now()
        });
    } else if (action === 'move') {
        try {
            let moveData = cache.get(`move_${moveName}`);
            if (!moveData) {
                const response = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
                moveData = await response.json();
                cache.set(`move_${moveName}`, moveData);
            }

            const myTeamKey = isP1 ? 'player1Team' : 'player2Team';
            const oppTeamKey = !isP1 ? 'player1Team' : 'player2Team';
            const myActiveKey = isP1 ? 'activePokemon1' : 'activePokemon2';
            const oppActiveKey = !isP1 ? 'activePokemon1' : 'activePokemon2';

            const attacker = battle[myTeamKey].members[battle[myActiveKey]];
            const defender = battle[oppTeamKey].members[battle[oppActiveKey]];

            if (attacker.currentHp === 0) return res.status(400).json({ error: 'Active Pokemon is fainted' });

            const power = moveData.power || 0;
            const damageClass = moveData.damage_class?.name || 'physical';

            let damage = 0;
            if (power > 0) {
                let A = 0, D = 0;
                if (damageClass === 'physical') {
                    A = attacker.stats?.attack || 50;
                    D = defender.stats?.defense || 50;
                } else {
                    A = attacker.stats?.['special-attack'] || 50;
                    D = defender.stats?.['special-defense'] || 50;
                }

                const STAB = attacker.types?.includes(moveData.type.name) ? 1.5 : 1;

                // Daño basado directamente en las estadísticas base
                damage = Math.floor(power * (A / D) * STAB);
                if (damage < 1) damage = 1; // Mínimo 1 de daño
            }

            defender.currentHp = Math.max(0, defender.currentHp - damage);
            log = `${attacker.name} used ${moveName.replace('-', ' ')}! `;
            if (damage > 0) {
                log += `It dealt ${damage} damage to ${defender.name}.`;
            } else {
                log += `It did no damage.`;
            }

            if (defender.currentHp === 0) {
                log += ` ${defender.name} fainted!`;
            }

            // Check win condition
            const oppFaintedCount = battle[oppTeamKey].members.filter(m => m.currentHp === 0).length;
            let newStatus = battle.status;
            if (oppFaintedCount === battle[oppTeamKey].members.length) {
                newStatus = 'finished';
                log += ` Battle Finished! ${user.name} wins by team wipe!`;
            }

            await db.update('battles', b => b.id === req.params.id, {
                player1Team: battle.player1Team,
                player2Team: battle.player2Team,
                status: newStatus,
                turn: newStatus === 'finished' ? null : nextTurn,
                logs: [...battle.logs, log],
                lastUpdate: Date.now()
            });

        } catch (e) {
            console.error("Move error", e);
            return res.status(500).json({ error: 'Failed to execute move' });
        }
    }

    res.json(await db.findOne('battles', b => b.id === req.params.id));
});

app.post('/api/battles/:id/forfeit', authenticateToken, async (req, res) => {
    const battle = await db.findOne('battles', b => b.id === req.params.id);
    const user = await db.findOne('users', u => u.id === req.user.id);

    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status === 'finished') return res.status(400).json({ error: 'Battle already finished' });

    let log = `${user.name} forfeited the match. `;
    const opponentId = battle.player1 === user.id ? battle.player2 : battle.player1;
    const opponent = await db.findOne('users', u => u.id === opponentId);
    log += `${opponent ? opponent.name : 'Opponent'} wins!`;

    await db.update('battles', b => b.id === req.params.id, {
        status: 'finished',
        turn: null,
        logs: [...battle.logs, log],
        lastUpdate: Date.now()
    });

    res.json(await db.findOne('battles', b => b.id === req.params.id));
});

app.get('/api/battles/:id', authenticateToken, async (req, res) => {
    const battle = await db.findOne('battles', b => b.id === req.params.id);
    res.json(battle);
});

// --- PUSH NOTIFICATIONS ---
app.post('/api/push/subscribe', authenticateToken, async (req, res) => {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription required' });

    await db.update('users', u => u.id === req.user.id, { pushSubscription: subscription });
    res.json({ message: 'Subscribed to push notifications' });
});

// --- FRONTEND SERVING ---
app.use(express.static(distPath));

// Catch-all route for SPA navigation - must be the last route
app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const HOST = '0.0.0.0'; // Esto permite conexiones externas

app.listen(CONFIG.PORT, HOST, () => {
    console.log(`✅ Servidor local: http://localhost:${CONFIG.PORT}`);
    console.log(`✅ Acceso externo: http://TU_IP_PRIVADA:${CONFIG.PORT}`);
});
