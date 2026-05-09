# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# AI Timetable Frontend

Modern React TypeScript frontend for the AI-based timetable generation system.

## Features

- **Modern UI/UX**: Material-UI (MUI) components with responsive design
- **Authentication**: JWT-based authentication with persistent login
- **State Management**: Zustand for global state, React Query for server state
- **Navigation**: React Router with protected routes
- **API Integration**: Axios for HTTP requests with interceptors
- **Type Safety**: Full TypeScript implementation

## Tech Stack

- React 18
- TypeScript
- Vite (build tool)
- Material-UI (MUI)
- React Query (@tanstack/react-query)
- Zustand (state management)
- React Router DOM
- Axios
- Date-fns (date utilities)

## Getting Started

### Prerequisites

- Node.js 18+ (recommended 20+)
- npm or yarn

### Installation

1. Navigate to frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open browser to http://localhost:5173

### Build for Production

```bash
npm run build
```

## Backend Integration

The frontend connects to the FastAPI backend at `http://localhost:8000/api/v1`.

### Demo Credentials

For testing the authentication:

- Email: `admin@example.com`
- Password: `admin123`

Note: Make sure the backend is running at http://localhost:8000

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
