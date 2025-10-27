'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SlideshowRecipe from '@/components/SlideshowRecipe';
import RecipeTitle from '@/components/RecipeTitle';
import { FaPlay, FaClock, FaUser } from 'react-icons/fa';
import Link from 'next/link';

// Sample recipe ID - Scrambled Eggs (Recipe 19)
const SAMPLE_RECIPE_ID = 19;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function RecipePage() {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSlideshow, setShowSlideshow] = useState(false); // Start with slideshow closed until recipe loads

  // Fetch the sample recipe from the API
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await fetch(`${API_URL}/recipes/${SAMPLE_RECIPE_ID}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch recipe: ${response.status}`);
        }
        const data = await response.json();
        setRecipe(data.data);
        setLoading(false);
        setShowSlideshow(true); // Auto-start slideshow once recipe is loaded
      } catch (error) {
        console.error('Error fetching recipe:', error);
        setLoading(false);
      }
    };

    fetchRecipe();
  }, []);

  // Proper handler to close the slideshow
  const handleClose = () => {
    setShowSlideshow(false);
  };

  // Start the slideshow
  const startSlideshow = () => {
    setShowSlideshow(true);
  };

  // Prevent body scrolling when slideshow is active
  React.useEffect(() => {
    if (showSlideshow) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showSlideshow]);

  if (loading) {
    return (
      <div className="fixed inset-0 top-[73px] overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700 mb-4">Loading recipe...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="fixed inset-0 top-[73px] overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-600 mb-4">Failed to load recipe</div>
          <Link href="/" className="text-primary-600 hover:text-primary-800 underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-[73px] overflow-hidden flex flex-col">
      {/* Slideshow Display */}
      {showSlideshow && (
        <SlideshowRecipe
          recipe={recipe}
          onClose={handleClose}
        />
      )}

      {/* Recipe Overview Page - only shown when slideshow is not active */}
      <div className={`container mx-auto px-4 max-w-5xl flex-1 overflow-y-auto pt-6 ${showSlideshow ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <motion.div 
          className="bg-white rounded-2xl shadow-md overflow-hidden mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              {recipe.title}
            </h1>
            
            <p className="text-gray-600 mb-8">{recipe.description}</p>
            
            <div className="flex flex-wrap gap-8 mb-8">
              {recipe.prepTime && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
                    <FaClock className="text-primary-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-500">Prep Time</p>
                  <p className="font-semibold text-lg text-gray-700">{recipe.prepTime}</p>
                </div>
              )}
              
              {recipe.cookTime && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
                    <FaClock className="text-primary-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-500">Cook Time</p>
                  <p className="font-semibold text-lg text-gray-700">{recipe.cookTime}</p>
                </div>
              )}
              
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
                  <FaUser className="text-primary-600 text-2xl" />
                </div>
                <p className="text-sm text-gray-500">Servings</p>
                <p className="font-semibold text-lg text-gray-700">{recipe.servings}</p>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <motion.button
                onClick={startSlideshow}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-primary-600"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <FaPlay />
                <span>Start Recipe Slideshow</span>
              </motion.button>
            </div>
            
            <div className="flex justify-center mt-4">
              <Link href="/" className="text-primary-600 hover:text-primary-800 underline">
                Return to Home
              </Link>
            </div>
          </div>
        </motion.div>
        
        {/* Recipe Ingredients & Equipment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <motion.div 
            className="bg-white rounded-xl shadow-md p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mt-2 mr-2"></span>
                  <span>
                    <span className="font-medium">{ingredient.name}</span>
                    {ingredient.quantity && <span className="text-gray-600"> - {ingredient.quantity}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-xl shadow-md p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Equipment</h2>
            <ul className="space-y-2">
              {recipe.equipment.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2"></span>
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
      {/* Using global KitchenBackground component instead of local backgrounds */}
    </div>
  );
}