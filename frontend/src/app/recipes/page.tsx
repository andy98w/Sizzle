'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaClock, FaUsers } from 'react-icons/fa';
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
        const response = await fetch(API_URL + '/recipes?limit=50');
        if (!response.ok) throw new Error('Recipe request failed');
        const data = await response.json();
        setRecipes(data.data?.recipes || []);
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('The recipe service is not responding. Check that the API is running, then reload this page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  return (
    <div className="collection-page">
      <div className="sizzle-shell">
        <header className="collection-header">
          <div>
            <p>Your recipe box</p>
            <h1>Saved recipes</h1>
          </div>
          <Link href="/animated-recipe">Find something to cook <FaArrowRight /></Link>
        </header>

        {isLoading ? (
          <div className="working-state"><span className="working-dot" /> Loading recipes…</div>
        ) : error ? (
          <div className="recipe-error"><strong>Recipes did not load.</strong><span>{error}</span></div>
        ) : recipes.length === 0 ? (
          <div className="collection-empty">
            <h2>The recipe box is empty.</h2>
            <p>Search for a dish or enter a few ingredients to add the first one.</p>
            <Link href="/animated-recipe">Search recipes <FaArrowRight /></Link>
          </div>
        ) : (
          <div className="collection-list">
            {recipes.map((recipe, index) => (
              <Link key={recipe.id} href={'/recipe/' + recipe.id} className="collection-row">
                <span className="result-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="result-main"><strong>{recipe.title}</strong><small>{recipe.description}</small></span>
                <span className="result-meta">
                  <span><FaClock /> {recipe.prep_time} prep</span>
                  <span><FaClock /> {recipe.cook_time} cook</span>
                  <span><FaUsers /> {recipe.servings}</span>
                </span>
                <FaArrowRight className="collection-arrow" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
