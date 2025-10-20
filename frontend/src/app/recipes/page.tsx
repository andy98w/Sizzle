'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaUtensils, FaClock, FaUsers, FaArrowRight } from 'react-icons/fa';
import { API_URL } from '@/config';

interface Recipe {
  id: number;
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  servings: number;
  created_at: string;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/recipes`);
        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }
        
        const data = await response.json();
        setRecipes(data.recipes || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  return (
    <div className="h-full min-h-screen pt-6">

      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          className="bg-white rounded-xl shadow-md p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mr-4">
              <FaUtensils size={24} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Recipe Collection</h1>
          </div>
          
          <p className="text-gray-600 mb-6">
            Browse your favorite recipes or search for new ones to try.
          </p>
          
          <Link 
            href="/animated-recipe"
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            <span>Create New Recipe</span>
            <FaArrowRight className="ml-2" />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-md p-8 flex justify-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading recipes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-8">
            <p>{error}</p>
          </div>
        ) : recipes.length === 0 ? (
          <motion.div 
            className="bg-white rounded-xl shadow-md p-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <FaUtensils className="text-gray-400 text-3xl" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Recipes Found</h2>
            <p className="text-gray-600 mb-6">
              Your recipe collection is empty. Create a new recipe to get started!
            </p>
            <Link 
              href="/animated-recipe"
              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              <span>Create New Recipe</span>
              <FaArrowRight className="ml-2" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                className="bg-white rounded-xl shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Link href={`/recipe/${recipe.id}`}>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1">{recipe.title}</h2>
                    <p className="text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>
                    
                    <div className="flex justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <FaClock className="mr-1" /> {recipe.prep_time}
                      </div>
                      <div className="flex items-center">
                        <FaClock className="mr-1" /> {recipe.cook_time}
                      </div>
                      <div className="flex items-center">
                        <FaUsers className="mr-1" /> {recipe.servings}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}