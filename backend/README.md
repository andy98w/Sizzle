# Sizzle API

The FastAPI service searches and stores recipes, creates new recipe data, and runs step-image jobs. Recipe records live in Supabase; generated images are uploaded to OCI Object Storage.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` with the services you plan to use:

```env
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-key
OCI_BUCKET_NAME=your-bucket
OCI_CONFIG_FILE=~/.oci/config
OCI_CONFIG_PROFILE=DEFAULT
OCI_NAMESPACE=your-namespace
OCI_REGION=your-region
API_HOST=0.0.0.0
API_PORT=8000
```

Start the service:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI is available at `http://localhost:8000/docs`.

## Routes

- `GET /api-status` — API and database status
- `POST /recipe/parse` — search saved recipes
- `POST /recipe/generate` — create a recipe
- `GET /recipes` — paginated recipe list
- `GET /recipes/{id}` — recipe details
- `POST /recipes/{id}/generate-step-images` — queue images for the steps
- `GET /ingredients` — ingredient search
- `GET /equipment` — equipment search

## Modules

- `app.py` defines the HTTP routes.
- `recipe_assistant.py` builds structured recipe data.
- `recipe_helpers.py` reads and writes recipe records.
- `image_generator.py` creates step-image prompts and images.
- `background_tasks.py` runs image jobs with a thread pool.
- `oci_storage.py` uploads images.

The API can return recipes even if a later image or storage job fails. Check the server logs for those partial failures.
