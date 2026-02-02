import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta de la carpeta donde vive este archivo config.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey_pokedex_123',
    // Esto hace que la ruta siempre sea mi-proyecto/server/data
    DATA_DIR: path.resolve(__dirname, './data') 
};