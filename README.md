Campus Lost & Found Tracker

Project overview
Core entities:
- User
- Item
- Claim

Technology:
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Shadcn UI
- Express, MongoDB, Mongoose, and JWT API (in the sibling `itelect4-backend` repository)

Local development:

1. Start the backend from `itelect4-backend` after configuring its `.env` from `.env.example`:
   `npm install` then `npm run dev` (API at `http://localhost:4000`).
2. In this repository, copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:4000`.
3. Run `npm install` then `npm run dev` (Vite at `http://localhost:5173`).

Production build: `npm run build`

API base URL: set with `VITE_API_URL` (no trailing slash and no `/api` suffix).

Main routes:
/
/items
/items/:id
/login
/register
/claims
