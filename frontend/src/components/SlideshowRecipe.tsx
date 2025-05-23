import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaClock, FaUser } from 'react-icons/fa';
import { RecipeAnimation, IngredientVisual, EquipmentVisual } from './AnimationLibrary';
import { Recipe, RecipeStep, Ingredient, Equipment } from '@/types';
import PhysicsCounter from './PhysicsCounter';
import { getImageUrl } from '@/utils';

interface SlideshowRecipeProps {
  recipe: Recipe;
  onClose: () => void;
}

const SlideshowRecipe: React.FC<SlideshowRecipeProps> = ({ recipe, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  
  // Reference to the physics counter component
  const physicsCounterRef = useRef<{ exitAnimation: () => void }>(null);
  
  // Total number of slides: title slide + ingredients/equipment slide + all steps
  const totalSlides = 2 + recipe.steps.length;
  
  // Format times for consistency
  const prepTime = recipe.prepTime || recipe.prep_time || '';
  const cookTime = recipe.cookTime || recipe.cook_time || '';
  
  // These functions are used by keyboard events
  function goToNext() {
    if (currentSlide < totalSlides - 1) {
      // If we're on the ingredients slide (slide 1), trigger the animation
      if (currentSlide === 1 && physicsCounterRef.current) {
        setIngredientsAnimating(true);
        setAnimationDirection(1);
        physicsCounterRef.current.exitAnimationNext();
        // Animation will call changeSlide() after completion
      } else {
        changeSlide(1);
      }
    }
  }
  
  // Animation states for synchronization
  const [ingredientsAnimating, setIngredientsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
  const [isChangingSlide, setIsChangingSlide] = useState(false);
  
  // Function to change slides after animation completes
  function changeSlide(dir: number) {
    setDirection(dir);
    setCurrentSlide(currentSlide + dir);
    setIngredientsAnimating(false);
    setIsChangingSlide(true);
    
    // Add a shorter delay before allowing another slide change
    setTimeout(() => {
      setIsChangingSlide(false);
    }, 300); // Shorter cool-down period that won't block navigation
  }
  
  function goToPrevious() {
    if (currentSlide > 0) {
      // If we're on the ingredients slide (slide 1), trigger the animation in reverse
      if (currentSlide === 1 && physicsCounterRef.current) {
        setIngredientsAnimating(true);
        setAnimationDirection(-1);
        physicsCounterRef.current.exitAnimationPrev();
        // Animation will call changeSlide() after completion
      } else {
        changeSlide(-1);
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
      // Add check to not process keys if the slide is changing
      if (isChangingSlide) return;
      
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
  }, [currentSlide, isChangingSlide]); // Add isChangingSlide as dependency
  
  // Animation variants
  const slideVariants = {
    enter: (direction: number) => {
      // For initial load (direction = 0), fall from top
      if (currentSlide <= 1 && direction === 0) {
        return {
          y: '100%',
          opacity: 0,
          scale: 0.8
        };
      }
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

  // Render the slideshow with a special class for detection
  return (
    <>
      {/* Standalone close button outside of any container */}
      <button
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: 'calc(1rem + 50px)', // Positioned below navbar
          right: '1rem',
          zIndex: 9800, // High but below navbar
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
          padding: 0
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
          overflow: 'visible', // Allow content to overflow
          pointerEvents: 'auto', // Ensure interactions work
          marginTop: '50px' // Add space for navbar
        }}>
      {/* Removed custom background - now using the global background */}
      
      <motion.div 
        className="relative w-full h-full overflow-visible"
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
        <div className="h-full relative overflow-visible flex justify-center">
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
                  <div className="flex-1 flex flex-col items-center justify-start pt-6 md:pt-10 p-12 md:p-16 text-center rounded-3xl shadow-lg m-4 mt-16 pb-32 frosted-glass">
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
              {currentSlide === 1 && (
                <motion.div
                  key="ingredients-equipment-slide"
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
                  <div className="flex-1 flex flex-col p-4 md:p-8 h-full m-4" style={{ pointerEvents: 'auto', position: 'relative' }}>
                    {/* Title section - black text */}
                    <motion.div
                      className="p-4 mb-4 ingredients-title transition-opacity duration-300" 
                      style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}
                      animate={{
                        x: ingredientsAnimating
                          ? animationDirection === 1 
                            ? ['0%', '5%', '4%', '-100%']
                            : ['0%', '-5%', '-4%', '100%']
                          : '0%'
                      }}
                      transition={{
                        duration: 1.05, // Increased to match total physics animation (0.3 + 0.75)
                        times: [0, 0.29, 0.38, 1],
                        ease: ["easeOut", "easeOut", "easeIn"]
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
                        ingredients={recipe.ingredients}
                        equipment={recipe.equipment}
                        onSlideChange={(dir) => changeSlide(dir || 1)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Step slides */}
              {currentSlide > 1 && (
                <motion.div
                  key={`step-${currentSlide}`}
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
                  className="absolute inset-0 flex flex-col md:flex-row w-full m-4"
                >
                  {/* Step number and animation */}
                  <div className="md:w-1/2 rounded-l-3xl shadow-lg p-10 md:p-12 flex flex-col items-center justify-center frosted-glass">
                    <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-8">
                      <span className="text-4xl font-bold text-primary-600">
                        {currentSlide - 1}
                      </span>
                    </div>
                    
                    <div className="w-full max-w-xl flex justify-center">
                      <RecipeAnimation 
                        action={recipe.steps[currentSlide - 2].action}
                        ingredients={recipe.steps[currentSlide - 2].ingredients.map(i => i.name)}
                        equipment={recipe.steps[currentSlide - 2].equipment.map(e => e.name)}
                        size="large"
                      />
                    </div>
                  </div>
                  
                  {/* Step instructions and ingredients/equipment */}
                  <div className="md:w-1/2 rounded-r-3xl shadow-lg p-6 md:p-10 flex flex-col custom-scrollbar overflow-y-auto h-full frosted-glass">
                    <div className="sticky top-0 z-10 pb-2 frosted-glass">
                      <h2 className="text-3xl font-bold mb-4 text-gray-800">
                        Step {currentSlide - 1}
                      </h2>
                    </div>
                    
                    <p className="text-xl mb-6 text-gray-700 leading-relaxed">
                      {recipe.steps[currentSlide - 2].instruction}
                    </p>
                    
                    <div className="flex flex-col space-y-4 mb-16">
                      {recipe.steps[currentSlide - 2].ingredients.length > 0 && (
                        <div className="bg-primary-50 p-4 md:p-6 rounded-lg border border-primary-100">
                          <h3 className="font-bold text-lg mb-3 text-primary-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            Ingredients for this step:
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {recipe.steps[currentSlide - 2].ingredients.map((ingredient, index) => (
                              <IngredientVisual
                                key={index}
                                ingredient={ingredient.name}
                                quantity={ingredient.quantity}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {recipe.steps[currentSlide - 2].equipment.length > 0 && (
                        <div className="bg-blue-50 p-4 md:p-6 rounded-lg border border-blue-100">
                          <h3 className="font-bold text-lg mb-3 text-blue-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                            </svg>
                            Equipment for this step:
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {recipe.steps[currentSlide - 2].equipment.map((item, index) => (
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Navigation controls - with transparent background */}
        <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 flex flex-col items-center pb-6">
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