'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import RecipeStepCarousel from '@/components/RecipeStepCarousel';
import { IngredientVisual, EquipmentVisual } from '@/components/AnimationLibrary';
import { FaUtensils, FaSearch } from 'react-icons/fa';
import RecipeTitle from '@/components/RecipeTitle';

// API URL - would normally be in environment variables
const API_URL = 'http://localhost:8000';

export default function AnimatedRecipePage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/recipe/parse`, { query });
      setRecipe(response.data);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      setError('Failed to fetch the recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Search Header */}
        <motion.div 
          className="bg-white rounded-2xl shadow-md overflow-hidden mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-8">
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
              <p className="text-gray-600">Finding and animating your recipe...</p>
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
        
        
        {/* Recipe Display */}
        {recipe && !isLoading && (
          <>
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
          </>
        )}
        
        {/* Initial state - no search yet */}
        {!recipe && !isLoading && !error && (
          <motion.div 
            className="bg-white rounded-2xl shadow-md p-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2 text-center md:text-left">
                <h2 className="text-3xl font-bold mb-4">Discover Recipes with Animation</h2>
                <p className="text-gray-600 mb-6">
                  Search for any recipe and get beautiful animated step-by-step instructions that make cooking easy and fun.
                </p>
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-100">
                  <h3 className="font-medium text-primary-800 mb-2">Try these recipes:</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Sushi Rice', 'Pasta Carbonara', 'Chocolate Cake', 'Thai Green Curry', 'Guacamole'].map((suggestion) => (
                      <motion.button
                        key={suggestion}
                        onClick={() => {
                          setQuery(suggestion);
                          setTimeout(() => handleSearch({ preventDefault: () => {} } as any), 100);
                        }}
                        className="bg-white px-3 py-1 rounded-full text-sm border border-primary-200 text-primary-700"
                        whileHover={{ scale: 1.05, backgroundColor: '#f0f9f6' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/2 flex justify-center">
                <motion.div 
                  className="w-64 h-64 bg-primary-100 rounded-full flex items-center justify-center relative overflow-hidden"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                    <FaUtensils className="text-primary-500 text-5xl" />
                  </div>
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-10 h-20 bg-primary-300 rounded-full"
                      style={{ 
                        transformOrigin: 'center 128px', 
                        transform: `rotate(${i * 45}deg)` 
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.2,
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}