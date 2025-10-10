# Pokecat Hunt -- Frontend (Standalone)

This is the **frontend client** for the **Pokecat Hunt** project — a real-time, location-based cat-catching game inspired by Pokémon GO.
It is built with **React 19**, **Vite**, and **Leaflet**.

> Note: This version is **standalone** and does not connect to any backend or database. All Pokecats, spawning, and captures are simulated locally in the browser.

---

## Overview

The frontend displays a real-time interactive map that shows wild Pokecats around the player's location.
Players can start a session, move across the map, and catch Pokecats before they disappear.

Since this is a standalone version:

* Pokecats are spawned randomly near the user.
* Captures are stored locally in the state (no backend persistence).
* Generated cats in the Creator scene cannot be saved permanently.

---

## Tech Stack

* **React 19** + **TypeScript**
* **Vite 7** for bundling and HMR
* **Leaflet** + **React-Leaflet** for interactive maps
* **Zustand** for state management
* **Sass (SCSS)** for component-based styling
* **Vitest** + **Testing Library** for unit testing

---

## Folder Structure

```
apps/frontend/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable React components
│   ├── scenes/              # Game scenes (MapView, CatchView, CreatorScene, etc.)
│   ├── stores/              # Zustand stores
│   ├── icons/               # SVG icon components
│   ├── styles/              # Global SCSS theme
│   ├── utils/               # Helper functions
│   └── main.tsx             # Entry point
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Test configuration
├── vitest.setup.ts          # Test setup (Testing Library, etc.)
├── tsconfig.app.json
└── README.md                # This file
```

---

## Available Scripts

### Development

```bash
pnpm dev
```

Starts the Vite dev server at **[http://localhost:5173](http://localhost:5173)**.

### Build

```bash
pnpm build
```

Builds the production bundle to `dist/`.

### Preview

```bash
pnpm preview
```

Serves the built frontend locally for testing.

### Lint

```bash
pnpm lint
```

Runs ESLint on the project.

### Test

```bash
pnpm test
```

Runs unit tests using **Vitest**.

### Test (UI Mode)

```bash
pnpm test:ui
```

Opens **Vitest UI** to view and debug test results in real-time.

---

## Testing

This project uses [Vitest](https://vitest.dev/) together with [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) for component testing.

Snapshot files (`__snapshots__/`) are automatically generated when using `toMatchSnapshot()` assertions,
but they are **ignored in `.gitignore`** to avoid unnecessary version noise.

---

## Integration

This standalone frontend does **not require backend services**.

All Pokecat spawning, movement, capture, and CreatorScene operations are simulated entirely in the browser using local state.

> In a full version with backend, services would include:
>
> * **Backend (Express + Socket.IO)** for spawn & catch events
> * **Go service** for `/api/cats` data
> * **Node.js storage** for Pokecat images

---

## Environment Variables

No backend is used, so environment variables are **optional**.
You can define variables like API URLs if integrating with a future backend, e.g.:

```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:3000
```

---

## Docker Usage

You can still build and run the frontend inside Docker:

### Build the Docker image

```bash
docker build -t pokecat-frontend .
```

### Run the container

```bash
docker run -it --rm -p 5173:5173 pokecat-frontend
```

The app will be available at **[http://localhost:5173](http://localhost:5173)**.

---

## Styling

SCSS is organized using **BEM naming conventions** for maintainability and clarity.
Global styles are defined in `src/styles/App.scss` and imported from `main.tsx`.

Animations and transitions (such as fade-out effects) use CSS transitions to keep performance smooth.

---

## License

This sub-project inherits the main [Pokecat Hunt License](../../LICENSE).

---

## Notes

* This frontend is part of a **monorepo** managed with **pnpm workspaces**.
* All Pokecat interactions are **simulated locally**.
* The CreatorScene now includes a **fallback** message when backend features are not available.

---

## Roadmap

* Add player profile and collection UI
* Improve mobile responsiveness
* Expand visual effects (rarity glow, capture animation)
* Add offline caching and local save for standalone captures
