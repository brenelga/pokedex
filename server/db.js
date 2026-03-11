import mongoose from 'mongoose';
import { CONFIG } from './config.js';
import dns from 'dns';

// Fix for SRV DNS resolution issues in some networks
dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.connect(CONFIG.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    friendCode: { type: String, unique: true },
    favorites: [Number],
    teams: [{
        id: String,
        name: String,
        members: [{
            id: Number,
            name: String,
            types: [String],
            sprite: String,
            selectedMoves: [String],
            stats: mongoose.Schema.Types.Mixed
        }]
    }],
    friends: [String], // Array of User IDs (String as they are MongoDB _ids or the legacy Date.now strings)
    pushSubscription: mongoose.Schema.Types.Mixed
}, { id: false });

const BattleSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    player1: String,
    player2: String,
    player1Team: mongoose.Schema.Types.Mixed,
    player2Team: mongoose.Schema.Types.Mixed,
    activePokemon1: { type: Number, default: 0 },
    activePokemon2: { type: Number, default: 0 },
    status: String,
    turn: String,
    logs: [String],
    lastUpdate: { type: Number, default: Date.now }
}, { id: false });

const User = mongoose.model('User', UserSchema);
const Battle = mongoose.model('Battle', BattleSchema);

class MongooseDatabase {
    constructor() {
        this.models = {
            users: User,
            battles: Battle
        };
    }

    async read(collection) {
        if (!this.models[collection]) throw new Error(`Collection ${collection} not found`);
        return await this.models[collection].find({});
    }

    // findOne remains but needs to handle predicate as an object or function
    async findOne(collection, query) {
        if (!this.models[collection]) throw new Error(`Collection ${collection} not found`);

        // If query is a function (legacy), we can't easily use it in MongoDB
        // But most calls look like u => u.id === id OR u => u.email === email
        // We'll try to convert common patterns or use find() + manual filter if needed
        // HOWEVER, it's better to update the calls in index.js to pass objects.
        // For now, let's support a simple mapping for the legacy calls.

        if (typeof query === 'function') {
            const items = await this.read(collection);
            return items.find(query);
        }

        return await this.models[collection].findOne(query);
    }

    async add(collection, item) {
        if (!this.models[collection]) throw new Error(`Collection ${collection} not found`);
        const model = new this.models[collection](item);
        return await model.save();
    }

    async update(collection, query, updates) {
        if (!this.models[collection]) throw new Error(`Collection ${collection} not found`);

        let filter = query;
        if (typeof query === 'function') {
            const item = await this.findOne(collection, query);
            if (!item) return null;
            filter = { _id: item._id };
        }

        const doc = await this.models[collection].findOne(filter);
        if (!doc) return null;

        Object.assign(doc, updates);

        // Mark paths as modified so Mixed types and arrays are saved properly
        Object.keys(updates).forEach(key => {
            doc.markModified(key);
        });

        return await doc.save();
    }
}

export const db = new MongooseDatabase();
