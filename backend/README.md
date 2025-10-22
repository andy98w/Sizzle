# Sizzle Backend

The backend server for the Sizzle recipe assistant application. This service provides recipe generation, storage, and retrieval functionality.

## Features

- AI-powered recipe generation using GPT-4
- DALL-E 3 integration for automatic step image generation
- Parallel image generation for faster recipe creation
- Database integration with Supabase (PostgreSQL)
- Image storage with Oracle Cloud Infrastructure (OCI)
- Recipe overwrite functionality to prevent duplicates
- Background task processing for async operations
- RESTful API with comprehensive endpoints

## Setup

### Prerequisites

- Python 3.9 or higher
- OpenAI API key with access to GPT-4 and DALL-E 3
- Supabase account and project
- Oracle Cloud Infrastructure account for object storage

### Installation

1. Create a virtual environment:

```bash
python -m venv venv
```

2. Activate the virtual environment:

```bash
# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file with the required configuration (see Environment Variables section below).

## Running the Application

1. Activate the virtual environment:

```bash
source venv/bin/activate  # On macOS/Linux
```

2. Start the backend server:

```bash
python app.py
```

Or using uvicorn directly:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

3. The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access the API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Environment Variables

The following environment variables can be configured in the `.env` file:

### Supabase Configuration
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon/service key

### API Configuration
- `API_PORT`: Port for the API server (default: 8000)
- `API_HOST`: Host for the API server (default: 0.0.0.0)
- `API_DEBUG`: Enable debug mode (default: False)
- `API_CORS_ORIGINS`: Allowed origins for CORS (default: *)

### OpenAI Configuration
- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: Model to use for recipe generation (default: gpt-4)
- `OPENAI_TIMEOUT`: Timeout for OpenAI API calls (default: 60)

### Oracle Cloud Configuration
- `OCI_BUCKET_NAME`: OCI bucket name for image storage
- `OCI_CONFIG_FILE`: Path to OCI config file (default: ~/.oci/config)
- `OCI_CONFIG_PROFILE`: OCI config profile (default: DEFAULT)
- `OCI_NAMESPACE`: OCI namespace
- `OCI_REGION`: OCI region (e.g., us-ashburn-1)

## Project Structure

```
backend/
├── app.py                  # Main FastAPI application
├── config.py               # Configuration settings
├── database.py             # Database connection and operations
├── recipe_assistant.py     # Recipe generation with OpenAI GPT-4
├── recipe_helpers.py       # Recipe database operations
├── image_generator.py      # DALL-E 3 image generation
├── background_tasks.py     # Async/parallel task processing
├── oci_storage.py          # Oracle Cloud storage integration
├── utils.py                # Utility functions and logging
├── requirements.txt        # Python dependencies
├── scripts/
│   └── add_step_images.sql # Database migration for step images
└── static/                 # Static files directory
    └── images/
        └── steps/          # Generated step images
```

## API Endpoints

- `GET /api-status` - Check API and dependency status
- `POST /recipe/parse` - Search for existing recipes
- `POST /recipe/generate` - Generate new recipe with AI
- `GET /recipes` - List all recipes (paginated)
- `GET /recipes/{id}` - Get recipe with full details
- `POST /recipes/{id}/generate-step-images` - Generate images for steps
- `GET /ingredients` - List ingredients with search
- `GET /equipment` - List equipment with search

## Key Modules

### `recipe_helpers.py`
Handles all recipe database operations including:
- Recipe creation and updates
- Automatic overwrite of duplicate recipes
- Ingredient and equipment linking
- Step creation with background image generation

### `image_generator.py`
DALL-E 3 integration for generating cooking images:
- Custom prompt engineering for consistent style
- Automatic upload to OCI storage
- Duplicate prevention with deterministic naming

### `background_tasks.py`
Async task processing:
- Parallel image generation for multiple steps
- ThreadPoolExecutor-based task management
- Non-blocking recipe creation

## Development

### Code Style

This project follows PEP 8 guidelines for Python code style.