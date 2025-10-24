import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaClock, FaUser } from 'react-icons/fa';
import { RecipeAnimation, IngredientVisual, EquipmentVisual, getIngredientImageUrl, getEquipmentImageUrl } from './AnimationLibrary';
import { Recipe, RecipeStep, Ingredient, Equipment } from '@/types';
import PhysicsCounter from './PhysicsCounterMatterJS';
import { getImageUrl } from '@/utils';
import { API_URL } from '@/config';

interface SlideshowRecipeProps {
  recipe: Recipe;
  onClose: () => void;
}

const SlideshowRecipe: React.FC<SlideshowRecipeProps> = ({ recipe, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Reference to the physics counter component
  const physicsCounterRef = useRef<{
    exitAnimation: (direction?: 1 | -1) => void;
    exitAnimationNext: () => void;
    exitAnimationPrev: () => void;
  }>(null);

  // Total number of slides: title slide + ingredients/equipment slide + all steps
  const totalSlides = 2 + recipe.steps.length;

  // Format times for consistency
  const prepTime = recipe.prepTime || recipe.prep_time || '';
  const cookTime = recipe.cookTime || recipe.cook_time || '';

  // Animation states for synchronization
  const [ingredientsAnimating, setIngredientsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
  const [previousSlide, setPreviousSlide] = useState(0);
  const [isEntering, setIsEntering] = useState(false);

  // Store enriched recipe with URLs populated
  const [enrichedRecipe, setEnrichedRecipe] = useState(recipe);

  // Create refs for all step physics counters
  const stepPhysicsRefs = useRef<Array<any>>([]);

  // Preload only the images needed for THIS recipe
  useEffect(() => {
    const preloadAllImages = async () => {
      try {
        console.log('🔄 Starting image preload for recipe:', recipe.title);
        const imagesToPreload: string[] = [];

        // Create a deep copy of recipe to enrich with URLs
        const recipeClone = JSON.parse(JSON.stringify(recipe));

        // Collect ingredient images from recipe - fetch URLs if needed
        if (recipeClone.ingredients) {
          console.log(`📦 Fetching URLs for ${recipeClone.ingredients.length} recipe ingredients`);
          for (let i = 0; i < recipeClone.ingredients.length; i++) {
            const ingredient = recipeClone.ingredients[i];
            let url = ingredient.url || ingredient.imageUrl;
            if (!url && ingredient.name) {
              // Fetch from database
              console.log(`🔍 Fetching URL for ingredient: ${ingredient.name}`);
              url = await getIngredientImageUrl(ingredient.name);
              // Store URL in the cloned object
              recipeClone.ingredients[i].imageUrl = url;
            }
            if (url) {
              imagesToPreload.push(url);
              console.log(`✅ Added ingredient image: ${ingredient.name}`);
            }
          }
        }

        // Collect equipment images from recipe - fetch URLs if needed
        if (recipeClone.equipment) {
          console.log(`🔧 Fetching URLs for ${recipeClone.equipment.length} recipe equipment`);
          for (let i = 0; i < recipeClone.equipment.length; i++) {
            const equipment = recipeClone.equipment[i];
            let url = equipment.url || equipment.imageUrl;
            if (!url && equipment.name) {
              // Fetch from database
              console.log(`🔍 Fetching URL for equipment: ${equipment.name}`);
              url = await getEquipmentImageUrl(equipment.name);
              // Store URL in the cloned object
              recipeClone.equipment[i].imageUrl = url;
            }
            if (url) {
              imagesToPreload.push(url);
              console.log(`✅ Added equipment image: ${equipment.name}`);
            }
          }
        }

        // Collect images from recipe steps - fetch URLs if needed
        if (recipeClone.steps) {
          console.log(`📝 Processing ${recipeClone.steps.length} recipe steps`);
          for (let stepIdx = 0; stepIdx < recipeClone.steps.length; stepIdx++) {
            const step = recipeClone.steps[stepIdx];
            console.log(`📝 Step ${stepIdx + 1} has ${step.ingredients?.length || 0} ingredients and ${step.equipment?.length || 0} equipment`);
            if (step.ingredients) {
              for (let i = 0; i < step.ingredients.length; i++) {
                const ingredient = step.ingredients[i];
                let url = ingredient.url || ingredient.imageUrl;
                // Convert relative URLs to absolute
                if (url && url.startsWith('/')) {
                  url = `${API_URL}${url}`;
                  recipeClone.steps[stepIdx].ingredients[i].url = url;
                  console.log(`🔗 Converted ingredient URL to: ${url}`);
                }
                if (!url && ingredient.name) {
                  // Fetch from database
                  console.log(`🔍 Fetching URL for step ingredient: ${ingredient.name}`);
                  url = await getIngredientImageUrl(ingredient.name);
                  // Store URL in the cloned object
                  recipeClone.steps[stepIdx].ingredients[i].imageUrl = url;
                }
                if (url) {
                  imagesToPreload.push(url);
                }
              }
            }
            if (step.equipment) {
              for (let i = 0; i < step.equipment.length; i++) {
                const equipment = step.equipment[i];
                let url = equipment.url || equipment.imageUrl;
                // Convert relative URLs to absolute
                if (url && url.startsWith('/')) {
                  url = `${API_URL}${url}`;
                  recipeClone.steps[stepIdx].equipment[i].url = url;
                  console.log(`🔗 Converted equipment URL to: ${url}`);
                }
                if (!url && equipment.name) {
                  // Fetch from database
                  console.log(`🔍 Fetching URL for step equipment: ${equipment.name}`);
                  url = await getEquipmentImageUrl(equipment.name);
                  // Store URL in the cloned object
                  recipeClone.steps[stepIdx].equipment[i].imageUrl = url;
                }
                if (url) {
                  imagesToPreload.push(url);
                }
              }
            }
          }
        }

        // Update enriched recipe state
        setEnrichedRecipe(recipeClone);

        // Remove duplicates
        const uniqueImages = Array.from(new Set(imagesToPreload)).filter(url => url);
        console.log(`📋 Total unique images to preload: ${uniqueImages.length}`);

        if (uniqueImages.length === 0) {
          console.log('⚠️ No images to preload');
          setAllImagesLoaded(true);
          setLoadingProgress(100);
          return;
        }

        // Batch load images in groups of 10 for better performance
        const BATCH_SIZE = 10;
        let loadedCount = 0;

        for (let i = 0; i < uniqueImages.length; i += BATCH_SIZE) {
          const batch = uniqueImages.slice(i, i + BATCH_SIZE);
          console.log(`⏳ Loading batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} images)`);

          const batchPromises = batch.map(url => {
            return new Promise<void>((resolve) => {
              const img = new Image();

              img.onload = () => {
                loadedCount++;
                const progress = Math.round((loadedCount / uniqueImages.length) * 100);
                setLoadingProgress(progress);
                console.log(`✓ Loaded ${loadedCount}/${uniqueImages.length} (${progress}%)`);
                resolve();
              };

              img.onerror = () => {
                loadedCount++;
                const progress = Math.round((loadedCount / uniqueImages.length) * 100);
                setLoadingProgress(progress);
                console.warn(`⚠️ Failed to load image:`, url);
                resolve(); // Resolve anyway to not block loading
              };

              img.src = url;
            });
          });

          // Wait for this batch to complete before starting the next
          await Promise.all(batchPromises);
        }

        console.log('🎉 All images preloaded successfully!');
        setAllImagesLoaded(true);
      } catch (error) {
        console.error('❌ Error during image preloading:', error);
        setAllImagesLoaded(true);
        setLoadingProgress(100);
      }
    };

    preloadAllImages();
  }, [recipe]);

  // Function to change slides after animation completes
  function changeSlide(dir: number) {
    setDirection(dir);
    setPreviousSlide(currentSlide);
    setCurrentSlide(currentSlide + dir);
    setIngredientsAnimating(false);

    // Trigger entry animation for new slide
    setIsEntering(true);
    setTimeout(() => setIsEntering(false), 50);
  }

  // Navigation functions
  function goToNext() {
    if (currentSlide < totalSlides - 1) {
      // If we're on the ingredients slide (slide 1), trigger the animation
      if (currentSlide === 1 && physicsCounterRef.current) {
        setIngredientsAnimating(true);
        setAnimationDirection(1);
        physicsCounterRef.current.exitAnimationNext();
        // Animation will call changeSlide() after completion
      }
      // If we're on a step slide (>= 2), trigger the step physics animation
      else if (currentSlide >= 2) {
        const stepIndex = currentSlide - 2;
        const stepRef = stepPhysicsRefs.current[stepIndex];
        if (stepRef) {
          setIngredientsAnimating(true);
          setAnimationDirection(1);
          stepRef.exitAnimationNext();
          // Animation will call changeSlide() after completion
        } else {
          setDirection(1);
          setCurrentSlide(currentSlide + 1);
        }
      }
      else {
        setDirection(1);
        setCurrentSlide(currentSlide + 1);
      }
    }
  }

  function goToPrevious() {
    if (currentSlide > 0) {
      // If we're on the ingredients slide (slide 1), trigger the animation in reverse
      if (currentSlide === 1 && physicsCounterRef.current) {
        setIngredientsAnimating(true);
        setAnimationDirection(-1);
        physicsCounterRef.current.exitAnimationPrev();
        // Animation will call changeSlide() after completion
      }
      // If we're on a step slide (>= 2), trigger the step physics animation
      else if (currentSlide >= 2) {
        const stepIndex = currentSlide - 2;
        const stepRef = stepPhysicsRefs.current[stepIndex];
        if (stepRef) {
          setIngredientsAnimating(true);
          setAnimationDirection(-1);
          stepRef.exitAnimationPrev();
          // Animation will call changeSlide() after completion
        } else {
          setDirection(-1);
          setCurrentSlide(currentSlide - 1);
        }
      }
      else {
        setDirection(-1);
        setCurrentSlide(currentSlide - 1);
      }
    }
  }
  
  function handleClose() {
    if (onClose) {
      onClose();
    }
  }
  
  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlide]);
  
  // Animation variants
  const slideVariants = {
    enter: (direction: number) => {
      // For horizontal navigation: left button (direction = -1) brings content from left
      // right button (direction = 1) brings content from right
      return {
        x: direction < 0 ? '-100%' : '100%',
        opacity: 0,
        scale: 1
      };
    },
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 1,
    }),
  };
  
  // Transition configuration for slides
  const slideTransition = { 
    type: 'spring', 
    stiffness: 300, 
    damping: 30,
    duration: 0.5 
  };
  
  // Render dot indicators
  const renderDots = () => {
    return (
      <div className="flex justify-center mt-4 mb-2 gap-1" style={{ zIndex: 20000, position: 'relative' }}>
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            className={`transition-all duration-300 ${
              currentSlide === index ? 'bg-primary-500' : 'bg-gray-300'
            }`}
            style={{ 
              pointerEvents: 'auto',
              cursor: 'pointer',
              zIndex: 20000,
              position: 'relative',
              width: currentSlide === index ? '12px' : '8px',
              height: currentSlide === index ? '12px' : '8px',
              borderRadius: '50%',
              margin: '0 4px', // Add more spacing
              boxShadow: '0 0 4px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const direction = index > currentSlide ? 1 : -1;
              setDirection(direction);
              setCurrentSlide(index);
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    );
  };
  
  // Consistent styling with Tailwind classes
  const transparentStyle = { backgroundColor: 'transparent' };

  // Hide the navigation and make body unscrollable when slideshow is active
  useEffect(() => {
    // Store original state
    const original = document.body.style.overflow;
    
    // Add a class to body to help with styling
    document.body.classList.add('slideshow-open');
    document.body.style.overflow = 'hidden';
    
    // Cleanup
    return () => {
      document.body.classList.remove('slideshow-open');
      document.body.style.overflow = original;
    };
  }, []);

  // Show loading screen until all images are loaded
  if (!allImagesLoaded) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          zIndex: 99999
        }}
      >
        {/* Close button even during loading */}
        <button
          onClick={handleClose}
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 100000,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            border: 'none',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333',
            pointerEvents: 'auto'
          }}
          aria-label="Close slideshow"
        >
          ✕
        </button>

        <div style={{ textAlign: 'center' }}>
          {/* Loading spinner */}
          <div
            style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(34, 197, 94, 0.2)',
              borderTopColor: 'rgb(34, 197, 94)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}
          />
        </div>

        {/* Spinner animation */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Render the slideshow with a special class for detection
  return (
    <>
      {/* Standalone close button outside of any container */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Close button clicked');
          handleClose();
        }}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 50000,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          border: 'none',
          padding: 0,
          pointerEvents: 'auto'
        }}
        aria-label="Close slideshow"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    
      <div
        className="fixed inset-0 flex items-center justify-center z-[9500] slideshow-active"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'transparent',
          backdropFilter: 'none',
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}>
      {/* Removed custom background - now using the global background */}
      
      <motion.div
        className="relative w-full h-full overflow-hidden"
        initial={{ y: "-100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.5
        }}
      >
        
        {/* Slide content */}
        <div className="h-full relative overflow-hidden flex justify-center">
          <div className="w-full max-w-7xl">
            <AnimatePresence initial={false} custom={direction}>
              {/* First slide - Title and basic info */}
              {currentSlide === 0 && (
                <motion.div
                  key="title-slide"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ 
                    type: 'spring', 
                    stiffness: 300, 
                    damping: 30,
                    duration: 0.5 
                  }}
                  className="absolute inset-0 flex flex-col w-full"
                >
                  <div className="flex-1 flex flex-col items-center justify-start pt-6 md:pt-10 p-12 md:p-16 text-center pb-32">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-800 max-w-4xl">
                      {recipe.title}
                    </h1>
                    
                    {recipe.description && (
                      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                        {recipe.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap justify-center gap-12 mt-6">
                      {prepTime && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-3">
                            <FaClock className="text-primary-600 text-3xl" />
                          </div>
                          <p className="text-sm text-gray-500">Prep Time</p>
                          <p className="font-semibold text-xl text-gray-700">{prepTime}</p>
                        </div>
                      )}
                      
                      {cookTime && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-3">
                            <FaClock className="text-primary-600 text-3xl" />
                          </div>
                          <p className="text-sm text-gray-500">Cook Time</p>
                          <p className="font-semibold text-xl text-gray-700">{cookTime}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-3">
                          <FaUser className="text-primary-600 text-3xl" />
                        </div>
                        <p className="text-sm text-gray-500">Servings</p>
                        <p className="font-semibold text-xl text-gray-700">{recipe.servings}</p>
                      </div>
                    </div>
                    
                    <motion.div 
                      className="mt-12 text-gray-600 flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, y: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="mr-2">Swipe or use arrow keys to navigate</span>
                      <FaArrowRight />
                    </motion.div>
                  </div>
                </motion.div>
              )}
              
              {/* Second slide - Interactive physics-based counter with ingredients and equipment */}
              {/* Keep this mounted but hidden to preserve state */}
              <div
                key="ingredients-equipment-slide"
                className="absolute inset-0 flex flex-col w-full"
                style={{
                  visibility: currentSlide === 1 ? 'visible' : 'hidden',
                  pointerEvents: currentSlide === 1 ? 'auto' : 'none',
                  zIndex: currentSlide === 1 ? 1 : -1,
                  // No animation - keep items in place
                  transform: 'none',
                  opacity: 1
                }}
              >
                <div className="flex-1 flex flex-col p-4 md:p-8 h-full m-4" style={{ pointerEvents: 'auto', position: 'relative' }}>
                  {/* Title section - black text */}
                  <motion.div
                    className="p-4 mb-4 ingredients-title transition-opacity duration-300"
                    style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}
                    animate={{
                      x: ingredientsAnimating && currentSlide === 1
                        ? animationDirection === 1
                          ? [0, 60, 50, -600]
                          : [0, -60, -50, 600]
                        : currentSlide === 1
                          ? 0
                          : (currentSlide < 1 ? 600 : -600),
                      opacity: ingredientsAnimating && currentSlide === 1
                        ? [1, 1, 1, 0]
                        : currentSlide === 1
                          ? 1
                          : 0
                    }}
                    transition={{
                      duration: ingredientsAnimating && currentSlide === 1 ? 0.6 : 0.49,
                      times: ingredientsAnimating && currentSlide === 1 ? [0, 0.25, 0.35, 1] : undefined,
                      ease: ingredientsAnimating && currentSlide === 1 ? ["easeOut", "easeOut", "easeIn"] : "easeOut"
                    }}
                  >
                    <h2 className="text-3xl font-bold text-center text-black">
                      Ingredients & Equipment
                    </h2>
                    <p className="text-center text-black">
                      Drag and interact with the items on the counter
                    </p>
                  </motion.div>

                  {/* Full viewport physics container */}
                  <div style={{ position: 'static', width: '100%', height: '100%' }}>
                    <PhysicsCounter
                      ref={physicsCounterRef}
                      ingredients={enrichedRecipe.ingredients?.length > 0
                        ? enrichedRecipe.ingredients
                        : enrichedRecipe.steps?.flatMap(s => s.ingredients || []).filter((item, index, self) =>
                            index === self.findIndex(t => t.name === item.name)
                          ) || []
                      }
                      equipment={enrichedRecipe.equipment?.length > 0
                        ? enrichedRecipe.equipment
                        : enrichedRecipe.steps?.flatMap(s => s.equipment || []).filter((item, index, self) =>
                            index === self.findIndex(t => t.name === item.name)
                          ) || []
                      }
                      onSlideChange={(dir) => changeSlide(dir || 1)}
                      isVisible={currentSlide === 1}
                    />
                  </div>
                </div>
              </div>
              
              {enrichedRecipe.steps.map((step, stepIndex) => {
                const slideNumber = stepIndex + 2;
                const isVisible = currentSlide === slideNumber;
                const isCurrentlyAnimating = ingredientsAnimating && currentSlide === slideNumber;
                const wasJustEntered = currentSlide === slideNumber && previousSlide !== slideNumber;
                const entryDirection = wasJustEntered ? (currentSlide > previousSlide ? 1 : -1) : 0;

                return (
                  <div
                    key={`step-${stepIndex}`}
                    className="absolute inset-0 flex flex-col md:flex-row w-full m-4"
                    style={{
                      visibility: isVisible ? 'visible' : 'hidden',
                      pointerEvents: isVisible ? 'auto' : 'none',
                      zIndex: isVisible ? 1 : -1,
                      opacity: 1
                    }}
                  >
                    {/* Step image and physics on the left */}
                    <div className="md:w-1/2 relative h-full" style={{ backgroundColor: 'transparent', border: 'none' }}>
                      {/* Physics counter with ONLY this step's ingredients/equipment - extends full screen */}
                      <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                        <PhysicsCounter
                          ref={(el) => { stepPhysicsRefs.current[stepIndex] = el; }}
                          ingredients={step.ingredients || []}
                          equipment={step.equipment || []}
                          onSlideChange={(dir) => changeSlide(dir || 1)}
                          isVisible={isVisible}
                        />
                      </div>

                    {/* Step image overlay (if available) - positioned near top */}
                    {step.image_url && (
                      <motion.div
                        className="absolute top-16 left-8 right-8 flex items-start justify-center pointer-events-none"
                        style={{ zIndex: 9000 }}
                        animate={{
                          x: isCurrentlyAnimating
                            ? animationDirection === 1
                              ? [0, 60, 50, -600]
                              : [0, -60, -50, 600]
                            : isVisible
                              ? 0
                              : (slideNumber > currentSlide ? 600 : -600),
                          opacity: isCurrentlyAnimating
                            ? [1, 1, 1, 0]
                            : isVisible
                              ? 1
                              : 0
                        }}
                        transition={{
                          duration: isCurrentlyAnimating ? 0.6 : 0.9,
                          times: isCurrentlyAnimating ? [0, 0.25, 0.35, 1] : undefined,
                          ease: isCurrentlyAnimating ? ["easeOut", "easeOut", "easeIn"] : [0.16, 1, 0.3, 1]
                        }}
                      >
                        <img
                          src={step.image_url}
                          alt={`Step ${stepIndex + 1}`}
                          className="rounded-lg shadow-2xl"
                          style={{
                            maxHeight: '40vh',
                            maxWidth: '85%',
                            width: 'auto',
                            height: 'auto',
                            display: 'block'
                          }}
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Step instructions and ingredients/equipment */}
                  <motion.div
                    className="md:w-1/2 p-6 md:p-10 flex flex-col custom-scrollbar overflow-y-auto h-full"
                    style={{ backgroundColor: 'transparent', border: 'none' }}
                    animate={{
                      x: isCurrentlyAnimating
                        ? animationDirection === 1
                          ? [0, 60, 50, -600]
                          : [0, -60, -50, 600]
                        : isVisible
                          ? 0
                          : (slideNumber > currentSlide ? 600 : -600),
                      opacity: isCurrentlyAnimating
                        ? [1, 1, 1, 0]
                        : isVisible
                          ? 1
                          : 0
                    }}
                    transition={{
                      duration: isCurrentlyAnimating ? 0.6 : 0.9,
                      times: isCurrentlyAnimating ? [0, 0.25, 0.35, 1] : undefined,
                      ease: isCurrentlyAnimating ? ["easeOut", "easeOut", "easeIn"] : [0.16, 1, 0.3, 1]
                    }}
                  >
                    <div className="sticky top-0 z-10 pb-2" style={{ backgroundColor: 'transparent' }}>
                      <h2 className="text-3xl font-bold mb-4 text-gray-800">
                        Step {stepIndex + 1}
                      </h2>
                    </div>

                    <p className="text-xl mb-6 text-gray-700 leading-relaxed">
                      {step.instruction}
                    </p>

                    <div className="flex flex-col space-y-4 mb-16">
                      {step.ingredients && step.ingredients.length > 0 && (
                        <div className="bg-primary-50 p-4 md:p-6 rounded-lg border border-primary-100">
                          <h3 className="font-bold text-lg mb-3 text-primary-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            Ingredients for this step:
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {step.ingredients.map((ingredient, index) => (
                              <IngredientVisual
                                key={index}
                                ingredient={ingredient.name}
                                quantity={ingredient.quantity}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {step.equipment && step.equipment.length > 0 && (
                        <div className="bg-blue-50 p-4 md:p-6 rounded-lg border border-blue-100">
                          <h3 className="font-bold text-lg mb-3 text-blue-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                            </svg>
                            Equipment for this step:
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {step.equipment.map((item, index) => (
                              <EquipmentVisual
                                key={index}
                                equipment={item.name}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add some bottom padding for better scrolling */}
                      <div className="h-8"></div>
                    </div>
                  </motion.div>
                </div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Navigation controls - with transparent background */}
        <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 flex flex-col items-center pb-20">
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
            {renderDots()}
            
            <div className="flex justify-between w-full max-w-2xl pt-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (currentSlide > 0) {
                    goToPrevious();
                  }
                }}
                disabled={currentSlide === 0}
                className={`p-4 rounded-full shadow-md ${
                  currentSlide === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-primary-600 hover:bg-primary-50'
                }`}
                style={{ 
                  pointerEvents: 'auto', 
                  cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
                  zIndex: 20000, // Even higher z-index
                  position: 'relative',
                  boxShadow: '0 0 8px rgba(0,0,0,0.2)'
                }}
                aria-label="Previous slide"
              >
                <FaArrowLeft size={24} />
              </button>
              
              <div className="flex items-center" style={{ zIndex: 20000, position: 'relative' }}>
                <span className="font-medium text-gray-700">
                  {currentSlide + 1} / {totalSlides}
                </span>
              </div>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (currentSlide < totalSlides - 1) {
                    goToNext();
                  }
                }}
                disabled={currentSlide === totalSlides - 1}
                className={`p-4 rounded-full shadow-md ${
                  currentSlide === totalSlides - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-primary-600 hover:bg-primary-50'
                }`}
                style={{ 
                  pointerEvents: 'auto', 
                  cursor: currentSlide === totalSlides - 1 ? 'not-allowed' : 'pointer',
                  zIndex: 20000, // Even higher z-index
                  position: 'relative',
                  boxShadow: '0 0 8px rgba(0,0,0,0.2)'
                }}
                aria-label="Next slide"
              >
                <FaArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    </>
  );
};

export default SlideshowRecipe;