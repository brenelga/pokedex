import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { CONFIG } from './config.js';
import crypto from 'crypto';
import cache from './cache.js';
import { sendPushToUser } from './push.js';

const app = express();

app.use(cors());
app.use(express.json());

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

        const existingUser = db.findOne('users', u => u.email === email);
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

        db.add('users', newUser);

        const token = jwt.sign({ id: newUser.id, email: newUser.email }, CONFIG.JWT_SECRET);
        res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, friendCode: newUser.friendCode } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.findOne('users', u => u.email === email);
        if (!user) return res.status(400).json({ error: 'User not found' });

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, email: user.email }, CONFIG.JWT_SECRET);
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, friendCode: user.friendCode } });
        } else {
            res.status(403).json({ error: 'Invalid password' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = db.findOne('users', u => u.id === req.user.id);
    if (!user) return res.sendStatus(404);
    const { password, ...safeUser } = user;
    res.json(safeUser);
});

// --- USER FEATURES ---

// Favorites
app.get('/api/user/favorites', authenticateToken, (req, res) => {
    const cacheKey = `favorites_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.json(cachedData);
    }

    const user = db.findOne('users', u => u.id === req.user.id);
    const favorites = user.favorites || [];

    cache.set(cacheKey, favorites);
    res.json(favorites);
});

app.post('/api/user/favorites', authenticateToken, (req, res) => {
    const { pokemonId } = req.body;
    const user = db.findOne('users', u => u.id === req.user.id);

    let favorites = user.favorites || [];
    if (favorites.includes(pokemonId)) {
        favorites = favorites.filter(id => id !== pokemonId);
    } else {
        favorites.push(pokemonId);
    }

    db.update('users', u => u.id === req.user.id, { favorites });

    // Invalidate cache
    cache.del(`favorites_${req.user.id}`);

    res.json(favorites);
});

// Teams
app.get('/api/user/teams', authenticateToken, (req, res) => {
    const cacheKey = `teams_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.json(cachedData);
    }

    const user = db.findOne('users', u => u.id === req.user.id);
    const teams = user.teams || [];

    cache.set(cacheKey, teams);
    res.json(teams);
});

app.post('/api/user/teams', authenticateToken, (req, res) => {
    const { team } = req.body; // Expect { id, name, members: [pokemon] }
    const user = db.findOne('users', u => u.id === req.user.id);

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

    db.update('users', u => u.id === req.user.id, { teams });

    // Invalidate cache
    cache.del(`teams_${req.user.id}`);

    res.json(teams);
});

app.delete('/api/user/teams/:teamId', authenticateToken, (req, res) => {
    const { teamId } = req.params;
    const user = db.findOne('users', u => u.id === req.user.id);
    const teams = (user.teams || []).filter(t => t.id !== teamId);
    db.update('users', u => u.id === req.user.id, { teams });

    // Invalidate cache
    cache.del(`teams_${req.user.id}`);

    res.json(teams);
});

// Friends
app.post('/api/friends/add', authenticateToken, (req, res) => {
    const { friendCode } = req.body;
    const friend = db.findOne('users', u => u.friendCode === friendCode);

    if (!friend) return res.status(404).json({ error: 'Friend not found' });
    if (friend.id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    const user = db.findOne('users', u => u.id === req.user.id);
    if (user.friends && user.friends.includes(friend.id)) {
        return res.status(400).json({ error: 'Already friends' });
    }

    const friends = [...(user.friends || []), friend.id];
    db.update('users', u => u.id === req.user.id, { friends });

    // Also add current user to friend's list (mutual)
    const friendFriends = [...(friend.friends || []), user.id];
    db.update('users', u => u.id === friend.id, { friends: friendFriends });

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

app.get('/api/friends', authenticateToken, (req, res) => {
    const cacheKey = `friends_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.json(cachedData);
    }

    const user = db.findOne('users', u => u.id === req.user.id);
    const friends = (user.friends || []).map(fid => {
        const f = db.findOne('users', u => u.id === fid);
        return f ? { id: f.id, name: f.name, friendCode: f.friendCode } : null;
    }).filter(Boolean);

    cache.set(cacheKey, friends);
    res.json(friends);
});

// --- BATTLE ROUTES ---
// Simple Turn-Based System
// 1. Create Battle (Challenge friend)
// 2. Poll Battle State
// 3. Make Move

app.post('/api/battles/create', authenticateToken, (req, res) => {
    const { opponentId, myTeamId } = req.body;

    const user = db.findOne('users', u => u.id === req.user.id);
    const opponent = db.findOne('users', u => u.id === opponentId);

    const myTeam = user.teams.find(t => t.id === myTeamId);

    // For opponent, we'll pick their first team or random for now, or just wait for them to join?
    // Simplified: Opponent must "Accept" or we Auto-Assign their first team
    // Let's assume we challenge them and they have to join/accept with a team.
    // BUT for simplicity, let's say the battle starts when both are ready?
    // Or: P1 creates battle. P2 sees it and joins.

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

    db.add('battles', battle);
    res.json(battle);

    // Send push notification to opponent
    sendPushToUser(opponent, {
        title: '¡Reto de batalla!',
        body: `${user.name} te ha retado a una batalla.`,
        icon: '/pwa-192x192.png',
        data: { url: '/battle' }
    });
});

app.get('/api/battles', authenticateToken, (req, res) => {
    const battles = db.read('battles').filter(b =>
        (b.player1 === req.user.id || b.player2 === req.user.id) && b.status !== 'finished'
    );
    res.json(battles);
});

app.post('/api/battles/:id/join', authenticateToken, (req, res) => {
    const { teamId } = req.body;
    const battle = db.findOne('battles', b => b.id === req.params.id);

    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.player2 !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const user = db.findOne('users', u => u.id === req.user.id);
    const team = user.teams.find(t => t.id === teamId);

    if (!team) return res.status(400).json({ error: 'Team not found' });

    db.update('battles', b => b.id === req.params.id, {
        player2Team: team,
        status: 'active',
        logs: [...battle.logs, `${user.name} joined the battle!`]
    });

    res.json(db.findOne('battles', b => b.id === req.params.id));
});

app.post('/api/battles/:id/move', authenticateToken, (req, res) => {
    const { move, pokemonIndex } = req.body; // Simplified move
    // Execute move logic (stubbed for now)
    const battle = db.findOne('battles', b => b.id === req.params.id);

    if (battle.turn !== req.user.id) return res.status(400).json({ error: 'Not your turn' });

    const isP1 = battle.player1 === req.user.id;
    const opponentId = isP1 ? battle.player2 : battle.player1;

    // Logic: Reduce HP of opponent active pokemon
    // This requires deep game logic. We'll simplify: just log the move and switch turn.

    const log = `Player ${req.user.id} used ${move || 'Attack'}!`;
    const nextTurn = opponentId;

    db.update('battles', b => b.id === req.params.id, {
        turn: nextTurn,
        logs: [...battle.logs, log],
        lastUpdate: Date.now()
    });

    res.json(db.findOne('battles', b => b.id === req.params.id));
});

app.get('/api/battles/:id', authenticateToken, (req, res) => {
    const battle = db.findOne('battles', b => b.id === req.params.id);
    res.json(battle);
});

// --- PUSH NOTIFICATIONS ---
app.post('/api/push/subscribe', authenticateToken, (req, res) => {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription required' });

    db.update('users', u => u.id === req.user.id, { pushSubscription: subscription });
    res.json({ message: 'Subscribed to push notifications' });
});

const HOST = '0.0.0.0'; // Esto permite conexiones externas

app.listen(CONFIG.PORT, HOST, () => {
    console.log(`✅ Servidor local: http://localhost:${CONFIG.PORT}`);
    console.log(`✅ Acceso externo: http://TU_IP_PRIVADA:${CONFIG.PORT}`);
});
