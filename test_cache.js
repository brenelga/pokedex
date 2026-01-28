
// Global fetch is available in Node 20+

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api';
const USERS_FILE = 'server/data/users.json';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log('Starting Cache Verification...');

    // 1. Register/Login
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`Registering user ${email}...`);
    let res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    let data = await res.json();
    if (!res.ok) {
        console.error('Registration failed:', data);
        process.exit(1);
    }

    const token = data.token;
    console.log('Got token.');

    // 2. Add a favorite to populate cache
    console.log('Adding favorite 1...');
    res = await fetch(`${BASE_URL}/user/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pokemonId: 1 })
    });
    data = await res.json();
    console.log('Favorites from API:', data); // Should be [1]

    // 3. Get favorites (Hits cache and stores it)
    console.log('Fetching favorites (Prime Cache)...');
    res = await fetch(`${BASE_URL}/user/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    console.log('Favorites from API:', data); // Should be [1]

    // 4. Modify DB file manually
    console.log('Manually modifying users.json...');
    const dbPath = path.resolve(USERS_FILE);
    const users = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        console.error('User not found in DB file!');
        process.exit(1);
    }

    // Add '2' to favorites in file ONLY
    users[userIndex].favorites.push(2);
    fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
    console.log('Modified DB file. Favorites in file:', users[userIndex].favorites); // [1, 2]

    // 5. Get favorites again. Should be served from CACHE (so [1], ignoring the file change)
    console.log('Fetching favorites (Expect Cache Hit)...');
    res = await fetch(`${BASE_URL}/user/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    console.log('Favorites from API:', data);

    let failed = false;
    if (data.includes(2)) {
        console.error('FAIL: API returned new data! Cache was bypassed or not working.');
        failed = true;
    } else {
        console.log('SUCCESS: API returned old data (Cache Hit).');
    }

    // 6. Invalidate Cache by adding another favorite via API
    console.log('Adding favorite 3 via API (Should Invalidate Cache)...');
    res = await fetch(`${BASE_URL}/user/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pokemonId: 3 })
    });
    data = await res.json();
    console.log('Favorites from API (After Post):', data); // Should be [1, 2, 3]

    if (data.includes(2) && data.includes(3)) {
        console.log('SUCCESS: API returned all data including manual edit. Cache was invalidated.');
    } else {
        console.error('FAIL: missing data. Data:', data);
        failed = true;
    }

    if (failed) process.exit(1);
    console.log('VERIFICATION COMPLETE: ALL CHECKS PASSED.');
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
