import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const ensureFile = (filePath, defaultData = []) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

class JSONDatabase {
    constructor() {
        ensureDir(CONFIG.DATA_DIR);
        this.files = {
            users: path.join(CONFIG.DATA_DIR, 'users.json'),
            battles: path.join(CONFIG.DATA_DIR, 'battles.json')
        };

        // Initialize files
        ensureFile(this.files.users, []);
        ensureFile(this.files.battles, []);
    }

    read(collection) {
        if (!this.files[collection]) throw new Error(`Collection ${collection} not found`);
        const data = fs.readFileSync(this.files[collection], 'utf-8');
        return JSON.parse(data);
    }

    write(collection, data) {
        if (!this.files[collection]) throw new Error(`Collection ${collection} not found`);
        fs.writeFileSync(this.files[collection], JSON.stringify(data, null, 2));
    }

    // Helper to find item
    findOne(collection, predicate) {
        const items = this.read(collection);
        return items.find(predicate);
    }

    // Helper to add item
    add(collection, item) {
        const items = this.read(collection);
        items.push(item);
        this.write(collection, items);
        return item;
    }

    // Helper to update item
    update(collection, predicate, updates) {
        const items = this.read(collection);
        const index = items.findIndex(predicate);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            this.write(collection, items);
            return items[index];
        }
        return null;
    }
}

export const db = new JSONDatabase();
