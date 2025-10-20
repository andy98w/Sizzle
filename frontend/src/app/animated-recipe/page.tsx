'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import SlideshowRecipe from '@/components/SlideshowRecipe';
import { FaUtensils, FaSearch, FaArrowRight, FaClock, FaPlayCircle } from 'react-icons/fa';
import RecipeTitle from '@/components/RecipeTitle';
import Link from 'next/link';
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

export default function AnimatedRecipePage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [matchingRecipes, setMatchingRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);

  // Prevent body scrolling on this page
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setSelectedRecipe(null);
    setMatchingRecipes([]);
    
    try {
      const response = await axios.post(`${API_URL}/recipe/parse`, { query });
      console.log("API response:", response.data);

      try {
        // Check if the response has matching_recipes array
        // The API returns { status, status_code, data: { matching_recipes: [...] } }
        const responseData = response.data.data || response.data;
        if (responseData.matching_recipes && Array.isArray(responseData.matching_recipes)) {
          const recipes = responseData.matching_recipes;

          if (recipes.length === 0) {
            setError('No recipes found for your search. Please try a different query.');
            return;
          }

          setMatchingRecipes(recipes);

          // If there's only one recipe, select it automatically and show slideshow
          if (recipes.length === 1) {
            console.log("Raw recipe from API:", recipes[0]);
            const formattedRecipe = formatRecipe(recipes[0]);
            console.log("Formatted recipe:", formattedRecipe);
            console.log("Formatted recipe ingredients:", formattedRecipe.ingredients);
            setSelectedRecipe(formattedRecipe);
            // Always show slideshow for single recipes
            setTimeout(() => setShowSlideshow(true), 50);
          } else if (recipes.length > 0) {
            // If there are multiple recipes, still select the first one but don't show slideshow yet
            console.log("Raw recipe from API:", recipes[0]);
            const formattedRecipe = formatRecipe(recipes[0]);
            console.log("Formatted recipe:", formattedRecipe);
            console.log("Formatted recipe ingredients:", formattedRecipe.ingredients);
            setSelectedRecipe(formattedRecipe);
            // Don't show slideshow yet for multiple recipes
          }
        } else if (response.data && (response.data.title || response.data.steps)) {
          // Legacy format - single recipe
          const formattedRecipe = formatRecipe(response.data);
          setSelectedRecipe(formattedRecipe);
          // Always show slideshow for single recipes
          setTimeout(() => setShowSlideshow(true), 50);
        } else {
          // No existing recipe found, let's generate one
          console.log("No matching recipes found, will attempt to generate a new recipe");
          try {
            // Update loading state with a message about generation
            setIsLoading(true);
            setError(null);

            // Create a dedicated loading message element instead of modifying existing ones
            const loadingEl = document.getElementById('generation-loading-message');
            if (loadingEl) {
              loadingEl.textContent = 'Generating a new recipe for you...';
            }

            // Use the existing /recipe/parse endpoint since /recipe/generate doesn't exist
            const generationResponse = await axios.post(`${API_URL}/recipe/parse`, {
              query: query
            });

            console.log("Generation response:", generationResponse.data);

            if (generationResponse.data && generationResponse.data.matching_recipes && generationResponse.data.matching_recipes.length > 0) {
              // Successfully got recipe(s) from API
              const recipes = generationResponse.data.matching_recipes;
              console.log("Got matching recipes:", recipes.length);

              // Select the first recipe
              const recipe = recipes[0];
              const formattedRecipe = formatRecipe(recipe);

              // Now save the generated recipe to the database if it doesn't already have an ID
              if (!formattedRecipe.id) {
                try {
                  // Save the recipe to appear in My Recipes
                  const saveResponse = await axios.post(`${API_URL}/recipes`, formattedRecipe);
                  console.log("Recipe saved with ID:", saveResponse.data.id);

                  // Update recipe with the assigned ID
                  formattedRecipe.id = saveResponse.data.id;
                } catch (saveError) {
                  console.error("Error saving generated recipe:", saveError);
                  // Continue even if save fails - we can still display the recipe
                }
              }

              setSelectedRecipe(formattedRecipe);
              setTimeout(() => setShowSlideshow(true), 50);
            } else {
              // Generation also failed
              console.error("Failed to generate recipe:", generationResponse.data);
              setError('Unable to generate a recipe. Please try with more specific ingredients or dish name.');
            }
          } catch (genError) {
            console.error("Error generating recipe:", genError);
            let errorMessage = 'Failed to generate a recipe.';

            // Check if it's an API error with a message
            if (genError.response && genError.response.data && genError.response.data.message) {
              errorMessage += ` API says: ${genError.response.data.message}`;
            } else if (genError.message) {
              errorMessage += ` Error: ${genError.message}`;
            }

            // Add recommendation
            errorMessage += ' Please try using more specific ingredients or dish names.';

            setError(errorMessage);
          } finally {
            // Always reset loading state
            setIsLoading(false);
          }
        }
      } catch (formatErr) {
        console.error("Error processing recipe data:", formatErr);
        setError('Error processing recipe data. Please try a different search.');
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
      setError('Failed to fetch the recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format recipe data to ensure consistent field names
  const formatRecipe = (recipe: any): Recipe => {
    // Basic validation - ensure recipe has required fields
    if (!recipe || typeof recipe !== 'object') {
      console.error("Invalid recipe data:", recipe);
      throw new Error("Invalid recipe data received");
    }

    // Ensure title exists, with fallback
    if (!recipe.title) {
      console.warn("Recipe missing title, using default");
      recipe.title = "Untitled Recipe";
    }

    // Ensure description exists, with fallback
    if (!recipe.description) {
      console.warn("Recipe missing description, using default");
      recipe.description = "A delicious recipe.";
    }

    // Set default servings if missing
    if (!recipe.servings || isNaN(recipe.servings)) {
      console.warn("Recipe missing servings, using default");
      recipe.servings = 2;
    }

    // Ensure steps, ingredients, and equipment are arrays
    if (!Array.isArray(recipe.steps)) {
      console.warn("Recipe missing steps, using empty array");
      recipe.steps = [];
    }

    if (!Array.isArray(recipe.ingredients)) {
      console.warn("Recipe missing ingredients, using empty array");
      recipe.ingredients = [];
    }

    if (!Array.isArray(recipe.equipment)) {
      console.warn("Recipe missing equipment, using empty array");
      recipe.equipment = [];
    }

    console.log("Formatted recipe:", {
      title: recipe.title,
      steps: recipe.steps.length,
      ingredients: recipe.ingredients.length,
      equipment: recipe.equipment.length
    });

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      prepTime: recipe.prepTime || recipe.prep_time || "10 mins",
      cookTime: recipe.cookTime || recipe.cook_time || "20 mins",
      servings: recipe.servings,
      ingredients: recipe.ingredients || [],
      equipment: recipe.equipment || [],
      steps: recipe.steps || []
    };
  };
  
  const selectRecipe = (recipe: Recipe) => {
    const formattedRecipe = formatRecipe(recipe);
    console.log("Selecting recipe:", formattedRecipe);
    setSelectedRecipe(formattedRecipe);

    // Explicitly set showSlideshow to true after a short delay
    // This ensures state updates are processed in the correct order
    setTimeout(() => {
      setShowSlideshow(true);
    }, 50);
  };


  return (
    <div className="fixed inset-0 top-[73px] overflow-hidden flex flex-col">
      {/* Slideshow Display */}
      {selectedRecipe && !isLoading && showSlideshow && (
        <SlideshowRecipe
          recipe={selectedRecipe}
          onClose={() => {
            // Always reset the slideshow state first
            setShowSlideshow(false);

            // If we have multiple recipes, keep the selected recipe to show in the list
            // Otherwise clear it completely
            if (matchingRecipes.length <= 1) {
              setSelectedRecipe(null);
            }
          }}
        />
      )}

      <div className={`container mx-auto px-6 max-w-6xl flex-1 overflow-y-auto pt-6 ${showSlideshow ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Search Header */}
        <motion.div
          className="bg-white rounded-xl shadow-md overflow-hidden mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-6">
            <motion.div 
              className="flex items-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                className="bg-primary-500 text-white p-3 rounded-full mr-3"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <FaUtensils size={24} />
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-800">
                Animated Recipe Finder
              </h1>
            </motion.div>
            
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for any recipe (e.g., sushi rice, chocolate cake)"
                className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isLoading}
              />
              <motion.button
                type="submit"
                className="bg-primary-500 text-white py-3 px-6 rounded-md font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={!query.trim() || isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaSearch />
                <span>{isLoading ? 'Searching...' : 'Find Recipe'}</span>
              </motion.button>
            </form>
          </div>
        </motion.div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600" id="generation-loading-message">Finding and animating your recipe...</p>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <motion.div 
            className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>{error}</p>
          </motion.div>
        )}
        
        {/* Recipe Search Results */}
        {matchingRecipes.length > 1 && !showSlideshow && (
          <motion.div
            className="bg-white rounded-2xl shadow-md overflow-hidden mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {matchingRecipes.length} recipes found for "{query}"
              </h2>
              <div className="space-y-4">
                {matchingRecipes.map((recipe, index) => (
                  <motion.div
                    key={recipe.id || index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer"
                    whileHover={{ scale: 1.01 }}
                    onClick={() => selectRecipe(recipe)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{recipe.title}</h3>
                        <p className="text-gray-600 text-sm line-clamp-2 mt-1">{recipe.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {(recipe.prepTime || recipe.prep_time) && (
                            <div className="flex items-center gap-1">
                              <FaClock className="text-primary-500" />
                              <span>Prep: {recipe.prepTime || recipe.prep_time}</span>
                            </div>
                          )}
                          {(recipe.cookTime || recipe.cook_time) && (
                            <div className="flex items-center gap-1">
                              <FaClock className="text-primary-500" />
                              <span>Cook: {recipe.cookTime || recipe.cook_time}</span>
                            </div>
                          )}
                          <div>
                            <span>Servings: {recipe.servings}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Use the selectRecipe function for consistency
                            selectRecipe(recipe);
                          }}
                          className="bg-primary-500 rounded-full p-3 text-white"
                          whileHover={{ scale: 1.1 }}
                          title="Start slideshow"
                        >
                          <FaPlayCircle size={20} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Generate New Recipe Button */}
              <motion.div
                className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <p className="text-gray-600 mb-4">Can't find what you're looking for?</p>
                <motion.button
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);

                    try {
                      // Generate a new recipe using the current query
                      const response = await axios.post(`${API_URL}/recipe/generate`, { query });
                      console.log("Generation response:", response.data);

                      // Handle the response
                      const responseData = response.data.data || response.data;
                      if (responseData && (responseData.title || responseData.steps)) {
                        const formattedRecipe = formatRecipe(responseData);

                        // Save the generated recipe to the database if it doesn't have an ID
                        if (!formattedRecipe.id) {
                          try {
                            const saveResponse = await axios.post(`${API_URL}/recipes`, formattedRecipe);
                            console.log("Recipe saved with ID:", saveResponse.data.id);
                            formattedRecipe.id = saveResponse.data.id;
                          } catch (saveError) {
                            console.error("Error saving generated recipe:", saveError);
                          }
                        }

                        setSelectedRecipe(formattedRecipe);
                        setIsLoading(false);
                        setTimeout(() => setShowSlideshow(true), 50);
                      } else {
                        setError('Unable to generate a recipe. Please try with more specific ingredients or dish name.');
                        setIsLoading(false);
                      }
                    } catch (error) {
                      console.error("Error generating recipe:", error);
                      setError('Failed to generate a recipe. Please try again.');
                      setIsLoading(false);
                    }
                  }}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-8 rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                >
                  <span className="flex items-center justify-center gap-2">
                    <FaUtensils />
                    <span>Generate New Recipe</span>
                  </span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}


        {/* No additional content on initial state */}
      </div>
    </div>
  );
}