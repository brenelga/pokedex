# Pokedex PWA with Battle System

A Progressive Web Application (PWA) built with Vue 3 and Node.js/Express. Features Pokemon browsing, favorites, team building, and a real-time (polling) battle system against friends.

## Features

-   **Authentication**: Register and Login (JWT).
-   **Pokedex**: Browse, Search, filter Pokemon. Detailed views with stats and evolution chain using functionality from [PokeAPI](https://pokeapi.co/).
-   **Favorites**: Save your favorite Pokemon.
-   **Team Builder**: Create multiple teams of up to 6 Pokemon.
-   **Social**: Add friends via Friend Code.
-   **Battles**: Challenge friends to battles. Turn-based system.
-   **PWA**: Installable on mobile/desktop, offline supported (caching).

## Prerequisites

-   Node.js (v16+)
-   npm

## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running the App

You need to run both the Backend and Frontend.

### 1. Start the Backend Server
This runs the Node.js/Express server on port 3000.
```bash
node server/index.js
```

### 2. Start the Frontend (Vite)
Open a new terminal:
```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Deployment

To build the PWA for production:
```bash
npm run build
npm run preview
```

## Structure

-   `server/`: Node.js Backend
    -   `data/`: JSON file storage for Users and Battles.
-   `src/`: Vue 3 Frontend
    -   `views/`: Page components.
    -   `stores/`: Pinia state management.
    -   `services/`: API wrappers.
