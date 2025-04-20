'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

type Ingredient = {
  name: string;
  imageUrl: string;
  prompt: string;
};

export default function IngredientsPage() {
  // Basic states
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [generatedPrompts, setGeneratedPrompts] = useState<Record<string, string>>({});
  const [customPrompt, setCustomPrompt] = useState('');
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [dbPopulated, setDbPopulated] = useState(false);
  
  // Initialize cost counter with a default value
  const [costCounter, setCostCounter] = useState(0);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyWithoutImages, setShowOnlyWithoutImages] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const itemsPerPage = 50; // Show 50 ingredients per page
  
  // Use an effect to load from localStorage on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load saved cost
      const savedCost = localStorage.getItem('ingredientGenerationCost');
      if (savedCost) {
        setCostCounter(parseInt(savedCost));
      }
      
      // Load saved page
      const savedPage = localStorage.getItem('ingredientsCurrentPage');
      if (savedPage) {
        setCurrentPage(parseInt(savedPage));
      }
      
      // Load saved filters
      const savedShowWithoutImages = localStorage.getItem('ingredientsShowOnlyWithoutImages');
      if (savedShowWithoutImages) {
        setShowOnlyWithoutImages(savedShowWithoutImages === 'true');
      }
      
      const savedSearch = localStorage.getItem('ingredientsSearchQuery');
      if (savedSearch) {
        setSearchQuery(savedSearch);
      }
    }
  }, []);
  
  // Save user preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ingredientGenerationCost', costCounter.toString());
    }
  }, [costCounter]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ingredientsCurrentPage', currentPage.toString());
    }
  }, [currentPage]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ingredientsShowOnlyWithoutImages', showOnlyWithoutImages.toString());
    }
  }, [showOnlyWithoutImages]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ingredientsSearchQuery', searchQuery);
    }
  }, [searchQuery]);
  
  // Default prompt template
  const defaultPromptTemplate = '2D flat icon of cooking {ingredient}, emoji style, minimal cartoon vector art, transparent background';
  
  // Function to check if database is populated with ingredients
  const checkDatabase = async () => {
    try {
      
      // Check ingredients in the database
      const response = await fetch('http://localhost:8000/ingredients?limit=1');
      const data = await response.json();
      
      console.log('Ingredients data:', data);
      
      if (data.total > 0) {
        // Database has ingredients
        console.log(`Database contains ${data.total} ingredients`);
        setDbPopulated(true);
        
        // Use the total from the API, not from fallback timer
        if (data.total !== totalIngredients) {
          setTotalIngredients(data.total);
          console.log(`Setting total ingredients to ${data.total}`);
        }
      } else {
        console.log('No ingredients found in database');
        setDbPopulated(false);
        setTotalIngredients(0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking database:', error);
      setLoading(false);
    }
  };
  
  // Fetch ingredients from the database with pagination
  const fetchPagedIngredients = async (page: number) => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`http://localhost:8000/ingredients?limit=${itemsPerPage}&offset=${offset}`);
      const data = await response.json();
      
      // Update total count if available
      if (data.total !== undefined) {
        setTotalIngredients(data.total);
      }
      
      // Map the data to our expected format
      const formattedIngredients = data.ingredients.map((item: any) => ({
        name: item.name,
        imageUrl: item.url || '',
        prompt: item.prompt || defaultPromptTemplate.replace('{ingredient}', item.name)
      }));
      
      setIngredients(formattedIngredients);
      
      // Also update the generated images from the fetched data
      const imagesMap: Record<string, string> = {};
      const promptsMap: Record<string, string> = {};
      
      formattedIngredients.forEach(ingredient => {
        if (ingredient.imageUrl) {
          imagesMap[ingredient.name] = ingredient.imageUrl;
          promptsMap[ingredient.name] = ingredient.prompt;
        }
      });
      
      setGeneratedImages(prev => ({...prev, ...imagesMap}));
      setGeneratedPrompts(prev => ({...prev, ...promptsMap}));
      
      setLoading(false);
    } catch (error) {
      console.error(`Error fetching ingredients for page ${page}:`, error);
      setLoading(false);
    }
  };
  
  // Check database on first load
  useEffect(() => {
    const cleanupDatabase = async () => {
      checkDatabase();
    };
    
    cleanupDatabase();
    
    // Important - don't let local fallback override actual database count
    const localTimeout = setTimeout(() => {
      if (ingredients.length === 0 && totalIngredients === 0) {
        console.log("No ingredients loaded from database, creating some locally");
        setIngredients([
          { name: "Salt", imageUrl: "", prompt: defaultPromptTemplate.replace("{ingredient}", "Salt") },
          { name: "Pepper", imageUrl: "", prompt: defaultPromptTemplate.replace("{ingredient}", "Pepper") },
          { name: "Garlic", imageUrl: "", prompt: defaultPromptTemplate.replace("{ingredient}", "Garlic") },
          { name: "Onion", imageUrl: "", prompt: defaultPromptTemplate.replace("{ingredient}", "Onion") },
          { name: "Tomato", imageUrl: "", prompt: defaultPromptTemplate.replace("{ingredient}", "Tomato") }
        ]);
        // Only set total if it's still 0
        if (totalIngredients === 0) {
          setTotalIngredients(5);
        }
      }
    }, 5000); // Wait 5 seconds to see if database loads
    
    return () => clearTimeout(localTimeout);
  }, [totalIngredients]);
  
  // Fetch ingredients whenever the page changes or database is populated
  useEffect(() => {
    if (dbPopulated) {
      fetchPagedIngredients(currentPage);
    }
  }, [currentPage, dbPopulated, itemsPerPage]);
  
  // Prevent the totalIngredients from being reset by the local fallback
  useEffect(() => {
    // Re-fetch the total count periodically to ensure it's accurate
    const intervalId = setInterval(() => {
      if (dbPopulated) {
        // Just fetch the total without changing pages
        fetch('http://localhost:8000/ingredients?limit=1')
          .then(response => response.json())
          .then(data => {
            if (data.total > 0 && data.total !== totalIngredients) {
              console.log(`Updating total from ${totalIngredients} to ${data.total}`);
              setTotalIngredients(data.total);
            }
          })
          .catch(err => console.error('Error refreshing total count:', err));
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [dbPopulated, totalIngredients]);
  
  // Generate image for an ingredient
  const generateImage = async (ingredient: Ingredient) => {
    try {
      const prompt = defaultPromptTemplate.replace('{ingredient}', ingredient.name);
      setGeneratedPrompts({...generatedPrompts, [ingredient.name]: prompt});
      
      // Show loading state
      setGeneratedImages({...generatedImages, [ingredient.name]: 'loading'});
      
      const response = await fetch(`http://localhost:8000/generate/ingredient/${encodeURIComponent(ingredient.name)}`);
      const data = await response.json();
      
      if (data.success) {
        setGeneratedImages({...generatedImages, [ingredient.name]: data.image_url});
        
        // Only increment cost counter if this was a new generation, not from cache
        if (!data.cached) {
          setCostCounter(costCounter + 3); // 3 cents per image
          console.log(`Generated new image for ${ingredient.name} (cost: $0.03)`);
        } else {
          console.log(`Using cached image for ${ingredient.name} (no cost)`);
        }
      } else {
        // Handle error
        setGeneratedImages({...generatedImages, [ingredient.name]: 'error'});
        console.error(`Failed to generate image: ${data.detail || 'Unknown error'}`);
        alert(`Image generation failed: ${data.detail || 'API error'}`);
      }
    } catch (error) {
      console.error(`Error generating image for ${ingredient.name}:`, error);
      setGeneratedImages({...generatedImages, [ingredient.name]: 'error'});
      alert(`Network error while generating image for ${ingredient.name}`);
    }
  };
  
  // Generate images for all ingredients on the current page
  const generateAllImages = async () => {
    const confirmed = window.confirm(
      `This will generate images for all missing ingredients on this page (max ${itemsPerPage}). Continue?`
    );
    
    if (!confirmed) return;
    
    for (const ingredient of ingredients) {
      if (!ingredient.imageUrl && !generatedImages[ingredient.name]) {
        await generateImage(ingredient);
      }
    }
  };
  
  // Save an ingredient to database
  const saveIngredient = async (ingredient: Ingredient) => {
    try {
      const imageUrl = generatedImages[ingredient.name];
      if (!imageUrl) {
        console.error(`No image URL found for ${ingredient.name}`);
        return;
      }
      
      const response = await fetch('http://localhost:8000/save-ingredient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredient: ingredient.name,
          image_url: imageUrl,
          prompt: generatedPrompts[ingredient.name] || defaultPromptTemplate.replace('{ingredient}', ingredient.name),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`Successfully saved image for ${ingredient.name}`);
        // Refresh current page to show updated data
        fetchPagedIngredients(currentPage);
      }
    } catch (error) {
      console.error(`Error saving ingredient ${ingredient.name}:`, error);
    }
  };
  
  // Regenerate image with custom prompt
  const regenerateWithCustomPrompt = async () => {
    try {
      // Show loading state for the current ingredient
      setGeneratedImages({...generatedImages, [currentIngredient]: 'loading'});
      
      const response = await fetch('http://localhost:8000/generate/ingredient-with-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredient: currentIngredient,
          custom_prompt: customPrompt,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeneratedImages({...generatedImages, [currentIngredient]: data.image_url});
        setGeneratedPrompts({...generatedPrompts, [currentIngredient]: customPrompt});
        setCostCounter(costCounter + 3); // 3 cents per image
        setShowPromptModal(false);
        console.log(`Regenerated image for ${currentIngredient} with custom prompt (cost: $0.03)`);
        
        // Find the ingredient in the current page to update its URL if saved later
        const currentIngredientObj = ingredients.find(ing => ing.name === currentIngredient);
        if (currentIngredientObj) {
          // If the ingredient's image was regenerated, we may want to save it
          fetchPagedIngredients(currentPage);
        }
      } else {
        // Handle error
        setGeneratedImages({...generatedImages, [currentIngredient]: 'error'});
        console.error(`Failed to regenerate image: ${data.detail || 'Unknown error'}`);
        alert(`Image regeneration failed: ${data.detail || 'API error'}`);
      }
    } catch (error) {
      console.error(`Error regenerating image for ${currentIngredient}:`, error);
      setGeneratedImages({...generatedImages, [currentIngredient]: 'error'});
      alert(`Network error while regenerating image for ${currentIngredient}`);
    }
  };
  
  // Check if an ingredient has an image
  const hasImage = (ingredient: Ingredient): boolean => {
    return !!ingredient.imageUrl;
  };
  
  // Filter ingredients based on search query and "without images" filter
  const filteredIngredients = ingredients.filter(ingredient => {
    // Search query filter
    const matchesSearch = searchQuery === '' || 
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Without images filter
    const matchesImageFilter = !showOnlyWithoutImages || !hasImage(ingredient);
    
    return matchesSearch && matchesImageFilter;
  });
  
  // Calculate pagination values
  const totalPages = Math.ceil(totalIngredients / itemsPerPage);
  console.log(`Total ingredients: ${totalIngredients}, Items per page: ${itemsPerPage}, Total pages: ${totalPages}`);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPageDisplay = 5; // Show at most 5 page numbers at a time
    
    if (totalPages <= maxPageDisplay) {
      // Show all pages if there are 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Complex pagination logic for many pages
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // In the middle
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pageNumbers.push(i);
        }
      }
    }
    
    return pageNumbers;
  };
  
  // Handle page change
  const changePage = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo(0, 0);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Ingredient Library</h1>
      
      {/* Search and filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search ingredients
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        <div className="flex items-end">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithoutImages}
              onChange={(e) => setShowOnlyWithoutImages(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">Show only without images</span>
          </label>
        </div>
      </div>
      
      <p className="text-gray-600 mb-8">
        Showing {filteredIngredients.length} of {totalIngredients} ingredients (Page {currentPage} of {totalPages})
      </p>
      
      <div className="mb-8 flex flex-wrap gap-2">
        <button 
          onClick={generateAllImages}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Generate All Images on This Page
        </button>
        
        <button 
          onClick={() => {
            const confirmed = window.confirm("This will reset your cost counter to $0.00. Are you sure?");
            if (confirmed) {
              setCostCounter(0);
            }
          }}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Reset Cost Counter
        </button>
      </div>
      
      {/* Pagination Controls (Top) */}
      {totalPages > 1 && (
        <div className="flex justify-center mb-8">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => changePage(1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-l-md border ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              &laquo; First
            </button>
            
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 border-t border-b ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              &lt; Prev
            </button>
            
            {getPageNumbers().map(page => (
              <button
                key={`top-${page}`}
                onClick={() => changePage(page)}
                className={`px-3 py-1 border-t border-b ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-blue-500 hover:bg-blue-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 border-t border-b ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              Next &gt;
            </button>
            
            <button
              onClick={() => changePage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-r-md border ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              Last &raquo;
            </button>
          </nav>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-blue-500 flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
            <span className="text-xl">Loading ingredients...</span>
          </div>
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xl">No ingredients match your filters</span>
            <button 
              onClick={() => {setSearchQuery(''); setShowOnlyWithoutImages(false);}}
              className="mt-4 bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIngredients.map((ingredient) => {
            // Check if this ingredient has a stored image in the database
            const hasStoredImage = !!ingredient.imageUrl;
            
            // Get any temporarily generated image
            const generatedImageUrl = generatedImages[ingredient.name];
            
            // Determine which image URL to display
            let displayUrl = hasStoredImage ? ingredient.imageUrl : generatedImageUrl;
            
            return (
              <div key={ingredient.name} className="border rounded-lg p-4 shadow-md">
                <h2 className="text-xl font-semibold mb-2">{ingredient.name}</h2>
                
                <div className="relative h-40 bg-gray-100 rounded flex items-center justify-center mb-4">
                  {!displayUrl && (
                    <div className="text-gray-400">No image generated</div>
                  )}
                  
                  {displayUrl === 'loading' && (
                    <div className="text-blue-500 flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                      <span>Generating...</span>
                    </div>
                  )}
                  
                  {displayUrl === 'error' && (
                    <div className="text-red-500 flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Generation failed</span>
                    </div>
                  )}
                  
                  {displayUrl && displayUrl !== 'loading' && displayUrl !== 'error' && (
                    <div className="relative w-full h-full">
                      {/* Use direct img tag with forced refresh trick */}
                      <img 
                        src={`${displayUrl.startsWith('http') ? displayUrl : `http://localhost:8000${displayUrl}`}?t=${Date.now()}`}
                        alt={ingredient.name}
                        className="object-contain absolute inset-0 m-auto max-w-full max-h-full"
                        onError={(e) => {
                          console.error(`Failed to load image: ${displayUrl}`);
                          // Try reloading the image once
                          e.currentTarget.src = `${displayUrl.startsWith('http') ? displayUrl : `http://localhost:8000${displayUrl}`}?reload=${Date.now()}`;
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {!hasStoredImage && (
                    <>
                      {(!displayUrl || displayUrl === 'error') && (
                        <button
                          onClick={() => generateImage(ingredient)}
                          className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
                          disabled={displayUrl === 'loading'}
                        >
                          {displayUrl === 'error' ? 'Retry' : 'Generate'}
                        </button>
                      )}
                      
                      {displayUrl === 'loading' && (
                        <button
                          disabled
                          className="bg-gray-400 text-white py-1 px-3 rounded text-sm"
                        >
                          Generating...
                        </button>
                      )}
                      
                      {displayUrl && displayUrl !== 'loading' && displayUrl !== 'error' && (
                        <>
                          <button
                            onClick={() => saveIngredient(ingredient)}
                            className="bg-green-500 hover:bg-green-700 text-white py-1 px-3 rounded text-sm flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save
                          </button>
                          
                          <button
                            onClick={() => {
                              setCurrentIngredient(ingredient.name);
                              setCustomPrompt(generatedPrompts[ingredient.name] || defaultPromptTemplate.replace('{ingredient}', ingredient.name));
                              setShowPromptModal(true);
                            }}
                            className="bg-yellow-500 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Regenerate
                          </button>
                        </>
                      )}
                    </>
                  )}
                  
                  {hasStoredImage && (
                    <span className="bg-gray-200 text-gray-700 py-1 px-3 rounded text-sm">
                      ✓ Saved to Database
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Pagination Controls (Bottom) */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => changePage(1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-l-md border ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              &laquo; First
            </button>
            
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 border-t border-b ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              &lt; Prev
            </button>
            
            {getPageNumbers().map(page => (
              <button
                key={`bottom-${page}`}
                onClick={() => changePage(page)}
                className={`px-3 py-1 border-t border-b ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-blue-500 hover:bg-blue-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 border-t border-b ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              Next &gt;
            </button>
            
            <button
              onClick={() => changePage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-r-md border ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              Last &raquo;
            </button>
          </nav>
        </div>
      )}
      
      {/* Custom Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Custom Prompt for {currentIngredient}</h3>
            
            <p className="text-sm text-gray-600 mb-2">
              Modify the prompt to get a better image. The default is:
              <span className="block mt-1 italic">{defaultPromptTemplate.replace('{ingredient}', currentIngredient)}</span>
            </p>
            
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full border rounded p-2 mb-4 h-32"
              placeholder="Enter a custom prompt for the image generation"
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPromptModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
              >
                Cancel
              </button>
              
              <button
                onClick={regenerateWithCustomPrompt}
                className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cost Counter */}
      <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 z-10">
        <div className="text-sm text-gray-600">Total Generation Cost</div>
        <div className="text-xl font-bold" suppressHydrationWarning>
          ${(costCounter / 100).toFixed(2)}
        </div>
      </div>
    </div>
  );
}