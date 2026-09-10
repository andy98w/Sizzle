# Sizzle web app

The Next.js frontend contains the recipe search, saved-recipe list, ingredient browser, and guided cooking view.

Matter.js drives the ingredient and equipment interactions in the cooking view. Framer Motion handles the transition between recipe steps.

## Run locally

```bash
npm install
npm run dev
```

The app expects the API at `http://localhost:8000`. Override it with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Generated images require `NEXT_PUBLIC_OCI_PAR_URL`.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm start
```

## Main routes

- `/animated-recipe` — search and start the cooking walkthrough
- `/recipes` — saved recipes
- `/recipe/[id]` — one saved recipe
- `/ingredients` — searchable ingredient inventory
