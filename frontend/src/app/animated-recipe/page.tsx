'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { FaArrowRight, FaClock, FaPlayCircle, FaSearch } from 'react-icons/fa';
import SlideshowRecipe from '@/components/SlideshowRecipe';
import { API_URL } from '@/config';

interface Recipe {
  id?: number;
  title: string;
  description: string;
  prepTime?: string;
  prep_time?: string;
  cookTime?: string;
  cook_time?: string;
  servings: number;
  ingredients: any[];
  equipment: any[];
  steps: any[];
}

const sampleSearches = ['chicken, rice, scallions', 'weeknight tomato pasta', 'mushroom fried rice'];

export default function AnimatedRecipePage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [matchingRecipes, setMatchingRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const formatRecipe = (recipe: any): Recipe => {
    if (!recipe || typeof recipe !== 'object') {
      throw new Error('Invalid recipe data received');
    }

    return {
      id: recipe.id,
      title: recipe.title || 'Untitled recipe',
      description: recipe.description || 'No description was saved for this recipe.',
      prepTime: recipe.prepTime || recipe.prep_time || '10 mins',
      cookTime: recipe.cookTime || recipe.cook_time || '20 mins',
      servings: recipe.servings && !isNaN(recipe.servings) ? recipe.servings : 2,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      equipment: Array.isArray(recipe.equipment) ? recipe.equipment : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    };
  };

  const selectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(formatRecipe(recipe));
    setTimeout(() => setShowSlideshow(true), 50);
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setSelectedRecipe(null);
    setMatchingRecipes([]);

    try {
      const response = await axios.post(`${API_URL}/recipe/parse`, { query });
      const responseData = response.data.data || response.data;

      if (Array.isArray(responseData.matching_recipes)) {
        const recipes = responseData.matching_recipes.map(formatRecipe);
        setMatchingRecipes(recipes);
        if (recipes.length === 0) {
          setError('No saved recipes match that search. Create one below or try different ingredients.');
        }
      } else if (responseData.title || responseData.steps) {
        selectRecipe(formatRecipe(responseData));
      } else {
        setError('The recipe data was incomplete. Try a different search.');
      }
    } catch {
      setError('The recipe service is not responding. Check that the API is running and search again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRecipe = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/recipe/generate`, { query });
      const responseData = response.data.data || response.data;

      if (!responseData || (!responseData.title && !responseData.steps)) {
        setError('The recipe could not be created. Add a dish name or more specific ingredients.');
        return;
      }

      const recipe = formatRecipe(responseData);
      if (!recipe.id) {
        try {
          const saveResponse = await axios.post(`${API_URL}/recipes`, recipe);
          recipe.id = saveResponse.data.id;
        } catch {
          // The walkthrough still works if saving fails.
        }
      }
      setMatchingRecipes([recipe]);
    } catch {
      setError('The recipe could not be created. Check that the API is running and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sizzle-search-page fixed inset-0 top-[68px] overflow-hidden flex flex-col">
      {selectedRecipe && !isLoading && showSlideshow && (
        <SlideshowRecipe
          recipe={selectedRecipe}
          onClose={() => {
            setShowSlideshow(false);
            if (matchingRecipes.length <= 1) setSelectedRecipe(null);
          }}
        />
      )}

      <div className={`sizzle-scroll flex-1 overflow-y-auto ${showSlideshow ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <section className="recipe-search-hero">
          <div className="sizzle-shell">
            <div className="hero-copy-block">
              <p className="kitchen-note">Recipe search + guided cooking</p>
              <h1>Tell us what is<br />in the kitchen.</h1>
              <p className="hero-deck">
                Search the saved recipe box by dish or ingredient. Pick a result to open the step-by-step cooking view.
              </p>
            </div>

            <form onSubmit={handleSearch} className="order-ticket" aria-label="Recipe search">
              <div className="ticket-topline"><span>Kitchen ticket</span><span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
              <label htmlFor="recipe-query">Dish or ingredients</label>
              <div className="ticket-input-row">
                <input
                  id="recipe-query"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g. salmon, lemon, potatoes"
                  disabled={isLoading}
                />
                <button type="submit" disabled={!query.trim() || isLoading} aria-label="Search saved recipes">
                  <FaSearch aria-hidden="true" />
                </button>
              </div>
              <div className="sample-searches" aria-label="Example searches">
                {sampleSearches.map((sample) => (
                  <button key={sample} type="button" onClick={() => setQuery(sample)}>{sample}</button>
                ))}
              </div>
              <div className="ticket-actions">
                <button className="search-button" type="submit" disabled={!query.trim() || isLoading}>
                  {isLoading ? 'Checking the recipe box…' : 'Search saved recipes'}
                </button>
                <button className="create-button" type="button" onClick={handleCreateRecipe} disabled={!query.trim() || isLoading}>
                  Create a recipe
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="results-section" aria-live="polite">
          <div className="sizzle-shell">
            {isLoading && (
              <div className="working-state" id="generation-loading-message">
                <span className="working-dot" /> Checking recipes…
              </div>
            )}

            {error && <div className="recipe-error"><strong>Nothing to show yet.</strong><span>{error}</span></div>}

            {!isLoading && matchingRecipes.length === 0 && !error && (
              <div className="empty-prep-list">
                <span>01</span><p>Enter a dish or a few ingredients.</p>
                <span>02</span><p>Search the saved recipe box—or create a new recipe.</p>
                <span>03</span><p>Open the cooking view and move through each step.</p>
              </div>
            )}

            {matchingRecipes.length > 0 && !showSlideshow && (
              <div className="recipe-results">
                <div className="results-heading">
                  <h2>{matchingRecipes.length === 1 ? '1 recipe' : `${matchingRecipes.length} recipes`}</h2>
                  <p>Matches for “{query}”</p>
                </div>
                <div className="result-list">
                  {matchingRecipes.map((recipe, index) => (
                    <button key={recipe.id || index} className="recipe-result" type="button" onClick={() => selectRecipe(recipe)}>
                      <span className="result-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="result-main"><strong>{recipe.title}</strong><small>{recipe.description}</small></span>
                      <span className="result-meta">
                        <span><FaClock /> {recipe.prepTime || recipe.prep_time} prep</span>
                        <span><FaClock /> {recipe.cookTime || recipe.cook_time} cook</span>
                        <span>{recipe.servings} servings</span>
                      </span>
                      <span className="result-open"><FaPlayCircle /><span>Cook this</span><FaArrowRight /></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
