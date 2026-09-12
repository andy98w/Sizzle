# Sizzle

Sizzle turns a dish name or a list of ingredients into a recipe you can cook one step at a time. It searches saved recipes first. When none fit, it can create a recipe, save it, and produce an illustration for each step.

The cooking view uses Matter.js to place ingredients and equipment on a virtual counter as the user moves through the instructions.

The counter has pause and keyboard controls, with a static layout for reduced
motion. Physics updates use element transforms rather than per-frame React
state. [Rendering notes and checks](docs/cooking-performance.md) describe the
fixed-scene measurement and the development-only test page.

## Repository layout

- `frontend/` — Next.js, TypeScript, Tailwind CSS, Framer Motion, and Matter.js
- `backend/` — FastAPI, recipe generation, image jobs, and persistence
- `terraform/` — OCI compute, networking, and object storage
- `scripts/` — deployment helpers

## Services

| Service | Purpose |
| --- | --- |
| OpenAI | recipe JSON and step-image prompts |
| Supabase | recipes, ingredients, equipment, and steps |
| OCI Object Storage | generated images |
| OCI Compute | application host |

## Local setup

### API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENAI_API_KEY=your-key
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-key
OCI_NAMESPACE=your-namespace
OCI_BUCKET_NAME=your-bucket
OCI_REGION=your-region
OCI_CONFIG_FILE=~/.oci/config
OCI_CONFIG_PROFILE=DEFAULT
```

Start the API:

```bash
uvicorn app:app --reload
```

### Web app

```bash
cd frontend
npm install
npm run dev
```

The web app opens at `http://localhost:3000` and expects the API at `http://localhost:8000`. Set `NEXT_PUBLIC_API_URL` to use another address.

## API routes

- `POST /recipe/parse` — search saved recipes from a natural-language query
- `POST /recipe/generate` — create and save a recipe
- `GET /recipes` — list saved recipes
- `GET /recipes/{id}` — return one recipe and its steps
- `POST /recipes/{id}/generate-step-images` — start step-image jobs
- `GET /ingredients` — search ingredients
- `GET /equipment` — search equipment

## Deployment

The Terraform configuration provisions an OCI VM and object-storage bucket. Nginx proxies the Next.js and FastAPI processes, which run under PM2. See [DEPLOYMENT.md](DEPLOYMENT.md) and [terraform/README.md](terraform/README.md).

Do not commit `.env`, OCI keys, pre-authenticated object-storage URLs, or `terraform.tfvars`.
