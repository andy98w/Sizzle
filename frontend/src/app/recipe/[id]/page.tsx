'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import RecipeStepCarousel from '@/components/RecipeStepCarousel';
import RecipeTitle from '@/components/RecipeTitle';
import { API_URL } from '@/config';
import { Recipe } from '@/types';
import { LoadingSpinner, ErrorMessage } from '@/components/shared';
import { handleFetchError } from '@/utils';

export default function RecipeDetailPage() {
  const params = useParams();
  const recipeId = params?.id;
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Define fetchRecipe outside of useEffect so it can be used by the retry button
  const fetchRecipe = async () => {
    if (!recipeId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/recipes/${recipeId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Recipe not found');
        }
        throw new Error('Failed to fetch recipe');
      }
      
      const data = await response.json();
      
      // Ensure both naming conventions are available
      const formattedRecipe: Recipe = {
        ...data,
        prepTime: data.prep_time || data.prepTime,
        cookTime: data.cook_time || data.cookTime,
        prep_time: data.prep_time || data.prepTime,
        cook_time: data.cook_time || data.cookTime,
      };
      
      setRecipe(formattedRecipe);
    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError(handleFetchError(err, 'Failed to load recipe'));
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    
    fetchRecipe();
  }, [recipeId]);
  
  if (isLoading) {
    return (
      <div className="h-full min-h-screen">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white rounded-xl shadow-md p-8 flex justify-center">
            <LoadingSpinner size="lg" text="Loading recipe..." />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-full min-h-screen">
        <div className="container mx-auto px-4 max-w-5xl">
          <ErrorMessage 
            message={error} 
            onRetry={() => fetchRecipe()}
          />
        </div>
      </div>
    );
  }
  
  if (!recipe) {
    return (
      <div className="h-full min-h-screen">
        <div className="container mx-auto px-4 max-w-5xl">
          <ErrorMessage 
            title="Recipe Not Found" 
            message="The recipe you're looking for doesn't exist or has been removed."
            className="bg-white rounded-xl shadow-md p-8 text-center"
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Recipe Header */}
        <RecipeTitle
          title={recipe.title}
          description={recipe.description}
          prepTime={recipe.prepTime}
          cookTime={recipe.cookTime}
          servings={recipe.servings}
        />
        
        {/* Recipe Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <RecipeStepCarousel recipe={recipe} />
        </motion.div>
      </div>
    </div>
  );
}