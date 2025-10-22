# Sizzle - Animated Recipe Assistant

An AI-powered recipe assistant with animated step-by-step cooking instructions and AI-generated images.

## Features

- AI-generated recipes with detailed ingredients and instructions
- Automatic step image generation using DALL-E 3
- Physics-based ingredient and equipment animations using Matter.js
- Interactive slideshow recipe display
- Recipe search and database storage
- Automatic recipe overwrite to prevent duplicates
- Parallel image generation for faster recipe creation

## Project Structure

The project is split into two main parts:

- `backend/`: Python FastAPI backend with LangChain integration
- `frontend/`: Next.js frontend with animations via Framer Motion

## Tech Stack

**Frontend:**
- Next.js 14 (React) with TypeScript
- Matter.js for physics-based animations
- Tailwind CSS for styling
- Axios for API communication

**Backend:**
- Python 3.9+ with FastAPI
- LangChain with OpenAI GPT-4
- OpenAI DALL-E 3 for image generation
- Supabase (PostgreSQL) for database
- Oracle Cloud Infrastructure (OCI) for object storage
- Background task processing with ThreadPoolExecutor

**AI/ML:**
- OpenAI GPT-4 for recipe generation
- OpenAI DALL-E 3 for step image generation
- Custom prompt engineering for consistent image style

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment and install dependencies:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Create a `.env` file with required environment variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   OCI_NAMESPACE=your_oci_namespace
   OCI_BUCKET_NAME=your_oci_bucket_name
   OCI_REGION=your_oci_region
   OCI_CONFIG_FILE=~/.oci/config
   OCI_CONFIG_PROFILE=DEFAULT
   ```

4. Start the backend server:
   ```
   uvicorn app:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Features Explained

### Recipe Generation
- Natural language recipe queries powered by GPT-4
- Automatic search for existing recipes to prevent duplicates
- Structured recipe data with ingredients, equipment, and detailed steps
- Automatic saving to Supabase database

### Image Generation
- DALL-E 3 integration for step-by-step cooking images
- Parallel image generation for faster recipe creation
- Automatic image upload to OCI object storage
- Deterministic naming to prevent duplicate images
- Background processing to improve user experience

### Physics Animations
- Matter.js-based physics engine for realistic ingredient movement
- Interactive ingredient and equipment displays
- Smooth transitions and animations
- Optimized image loading and caching

## API Endpoints

- `GET /api-status` - Check API and database status
- `POST /recipe/parse` - Search for existing recipes
- `POST /recipe/generate` - Generate new recipe with AI
- `GET /recipes` - List all recipes with pagination
- `GET /recipes/{id}` - Get specific recipe with full data
- `POST /recipes/{id}/generate-step-images` - Generate images for recipe steps
- `GET /ingredients` - List ingredients with search
- `GET /equipment` - List equipment with search

## Architecture

```
Frontend (Next.js)
    ↓
Backend API (FastAPI)
    ↓
┌─────────────┬──────────────┬─────────────┐
│   OpenAI    │   Supabase   │     OCI     │
│   (AI Gen)  │  (Database)  │  (Storage)  │
└─────────────┴──────────────┴─────────────┘
```

## TODO

- [ ] Add user authentication and profiles
- [ ] Implement recipe rating and favorites
- [ ] Add cooking timers and notifications
- [ ] Create mobile-responsive design
- [ ] Add recipe sharing functionality
- [ ] Implement recipe collections/cookbooks
- [ ] Add nutritional information
- [ ] Support for dietary restrictions and filters
- [ ] Recipe modification and saving custom versions
- [ ] Shopping list generation from recipes