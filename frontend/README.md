# Sizzle Frontend

The frontend application for the Sizzle recipe assistant. Built with Next.js 14, TypeScript, and Matter.js for physics-based animations.

## Features

- AI-powered recipe search and generation
- Interactive physics-based ingredient and equipment displays
- Step-by-step recipe slideshow with AI-generated images
- Smooth animations and transitions
- Responsive design
- Real-time recipe visualization

## Tech Stack

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Physics Engine**: Matter.js
- **HTTP Client**: Axios
- **State Management**: React Hooks

## Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Backend API running (see backend README)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file (optional - uses localhost by default):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the Application

1. Start the development server:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js app directory
│   │   ├── animated-recipe/      # Recipe animation page
│   │   ├── ingredients/          # Ingredients browser page
│   │   └── page.tsx              # Home page
│   ├── components/               # React components
│   │   ├── KitchenBackground.tsx # Kitchen scene background
│   │   ├── PhysicsCounterMatterJS.tsx # Matter.js physics component
│   │   └── SlideshowRecipe.tsx   # Recipe slideshow component
│   ├── types.ts                  # TypeScript type definitions
│   └── utils/
│       ├── constants.ts          # Physics and layout constants
│       └── index.ts              # Utility functions
├── public/                       # Static assets
└── package.json
```

## Key Components

### `PhysicsCounterMatterJS.tsx`
Physics-based animation component using Matter.js:
- Realistic physics simulation for ingredients and equipment
- Collision detection and gravity
- Optimized rendering with image caching
- Interactive drag and drop

### `SlideshowRecipe.tsx`
Recipe slideshow component:
- Step-by-step recipe display
- AI-generated step images
- Smooth slide transitions
- Image preloading for better performance

### `KitchenBackground.tsx`
Kitchen scene manager:
- Consistent background rendering
- Counter and wall positioning
- Global layout constants

## Pages

### `/` - Home Page
Recipe search and generation interface

### `/animated-recipe` - Recipe Viewer
Interactive recipe display with physics animations and step-by-step instructions

### `/ingredients` - Ingredient Browser
Browse and search available ingredients with images

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- Functional components with hooks
- Tailwind CSS for styling
- ESLint for code quality

## API Integration

The frontend communicates with the backend API at `http://localhost:8000` by default:

- `POST /recipe/generate` - Generate new recipes
- `GET /recipes` - Fetch recipe list
- `GET /recipes/{id}` - Get recipe details
- `GET /ingredients` - Browse ingredients
- `GET /equipment` - Browse equipment

## Performance Optimizations

- Image lazy loading and caching
- Matter.js engine optimization
- Component memoization
- Efficient state management
- Background image preloading

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

Note: Physics animations work best in modern browsers with hardware acceleration enabled.
