import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Obtener la ruta de la carpeta donde vive este archivo config.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey_pokedex_123',
    // Esto hace que la ruta siempre sea mi-proyecto/server/data
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_EMAIL: process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    MONGODB_URI: process.env.MONGODB_URI
};
