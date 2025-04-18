'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import RecipeStepCarousel from '@/components/RecipeStepCarousel';
import RecipeTitle from '@/components/RecipeTitle';

interface Recipe {
  id: number;
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  servings: number;
  ingredients: any[];
  equipment: any[];
  steps: any[];
}

export default function RecipeDetailPage() {
  const params = useParams();
  const recipeId = params?.id;
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRecipe = async () => {
      if (!recipeId) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:8000/recipes/${recipeId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Recipe not found');
          }
          throw new Error('Failed to fetch recipe');
        }
        
        const data = await response.json();
        
        // Transform the data to match the expected format
        const formattedRecipe = {
          ...data,
          prepTime: data.prep_time,
          cookTime: data.cook_time,
          // Add any other transformations needed
        };
        
        setRecipe(formattedRecipe);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching recipe:', err);
        setError(err.message || 'Failed to load recipe');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecipe();
  }, [recipeId]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white rounded-xl shadow-md p-8 flex justify-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading recipe...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-8">
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Recipe Not Found</h2>
            <p>The recipe you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-10">
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