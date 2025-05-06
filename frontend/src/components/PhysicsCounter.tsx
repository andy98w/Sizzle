import React, { useEffect, useRef, useState } from 'react';
import { PHYSICS_CONSTANTS, getCounterFloorPosition } from '../utils/constants';
import { getImageUrl } from '../utils';

// Store random offsets per item to keep animations consistent
const itemOffsets: Record<string, { jiggle: number, jiggleRotate: number, swipe: number, swipeRotate: number }> = {};

// Function to get consistent random values for an item
const getItemOffsets = (id: string) => {
  if (!itemOffsets[id]) {
    // Generate and store random values on first access
    itemOffsets[id] = {
      jiggle: 20 + (Math.random() * 15),       // Random jiggle between 20-35px
      jiggleRotate: Math.random() * 10 - 5,    // Random rotation -5 to +5 degrees
      swipe: -1000 - (Math.random() * 500),    // Random between -1000 and -1500px
      swipeRotate: Math.random() * 15 - 7.5    // Random rotation -7.5 to +7.5 degrees
    };
  }
  return itemOffsets[id];
};

// Get item transform based on animation state
const getItemTransform = (item: Item, animationState: 'none' | 'jiggle' | 'swipe'): string => {
  // Always center the item at (-50%, -50%) to avoid offsets
  return 'translate(-50%, -50%)';
};

// Function to get the correct transition timing based on animation state
const getItemTransition = (animationState: 'none' | 'jiggle' | 'swipe'): string => {
  switch (animationState) {
    case 'jiggle':
      // Smoother, less jumpy animation
      return 'transform 400ms cubic-bezier(0.25, 1, 0.5, 1.3)'; 
      
    case 'swipe':
      // Longer, smoother timing
      return 'transform 600ms cubic-bezier(0.33, 0.1, 0.67, 0.9)';
      
    default:
      // Always include transform for smoother transitions
      return 'transform 200ms ease-out, box-shadow 200ms ease-in-out';
  }
};

// Function to generate a consistent color from a string
const getColorFromString = (str: string, type: 'ingredient' | 'equipment' = 'ingredient'): string => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Base colors
  const hueOffset = type === 'ingredient' ? 0 : 180; // Different hue ranges for ingredients vs equipment
  const hue = Math.abs(hash % 360) + hueOffset;
  const saturation = 70 + (hash % 20); // 70-90%
  const lightness = 45 + (hash % 15); // 45-60%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

interface Item {
  id: string;
  name: string;
  type: 'ingredient' | 'equipment';
  x: number;
  y: number;
  size: number;
  color: string;
  dragging: boolean;
  falling: boolean;
  imageUrl?: string;
  hasImageError?: boolean;
}

interface PhysicsCounterProps {
  ingredients: { name: string }[];
  equipment: { name: string }[];
  onSlideChange?: (direction?: 1 | -1) => void;
}

const PhysicsCounter = React.forwardRef<{ 
  exitAnimation: (direction?: 1 | -1) => void, 
  exitAnimationNext: () => void, 
  exitAnimationPrev: () => void 
}, PhysicsCounterProps>(({ ingredients, equipment, onSlideChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  // Use state to track the floor position (counter top)
  const [floorY, setFloorY] = useState(0);
  
  // Use the getCounterFloorPosition function from constants.ts
  useEffect(() => {
    const updateFloorPosition = () => {
      try {
        // Use our utility function to get the floor position consistently
        const viewportHeight = window.innerHeight;
        let calculatedFloorY = getCounterFloorPosition(viewportHeight);
        
        // Safety check - floor should never be too low in the viewport
        // If the floor is more than 80% down the screen, something is wrong
        const maxAllowedY = viewportHeight * 0.85; // Safety threshold
        if (calculatedFloorY > maxAllowedY) {
          console.error('Floor position is too low! Adjusting to 75% of viewport height.');
          calculatedFloorY = viewportHeight * 0.75; // Fallback to 75%
        }
        
        console.log('PhysicsCounter - Setting floor Y to:', calculatedFloorY, 'px');
        setFloorY(calculatedFloorY);
        
        // If we got a valid floor position, we can stop loading
        setIsLoading(false);
      } catch (error) {
        console.warn('Counter not ready yet:', error);
        // Keep loading state true until we have a valid floor position
        setIsLoading(true);
      }
    };
    
    // Don't calculate initially - wait for the MutationObserver to detect the counter
    
    // Recalculate on window resize
    window.addEventListener('resize', updateFloorPosition);
    
    // Add a MutationObserver to detect when the counter element appears
    const observer = new MutationObserver(() => {
      // Check for the counter element on any DOM change
      if (document.getElementById('kitchen-counter-texture')) {
        console.log('Counter element detected - updating floor position');
        updateFloorPosition();
      }
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Try immediately in case the counter already exists
    if (document.getElementById('kitchen-counter-texture')) {
      updateFloorPosition();
    }
    
    return () => {
      window.removeEventListener('resize', updateFloorPosition);
      observer.disconnect();
    };
  }, []);

  // Items state with all necessary properties
  const [items, setItems] = useState<Item[]>([]);
  
  // Track if any item is being dragged
  const [isDragging, setIsDragging] = useState(false);
  
  // No longer hiding the title when dragging
  
  // Handle image loading errors
  const handleImageError = (id: string) => {
    // Log the error for debugging
    console.log(`Image loading error for item: ${id}`);
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, hasImageError: true } : item
      )
    );
  };
  
  // Track hover state for showing name
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // Animation state for slide transition
  const [animationState, setAnimationState] = useState<'none' | 'jiggle' | 'swipe'>('none');
  
  // Direction of animation (1 = next/right-to-left, -1 = prev/left-to-right)
  const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
  
  // Function to start the exit animation sequence
  const startExitAnimation = (direction: 1 | -1 = 1) => {
    // Reset animation state
    setAnimationState('none');
    // Set the animation direction
    setAnimationDirection(direction);
    
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // First jiggle in the appropriate direction
        setAnimationState('jiggle');
        
        // Faster timing for animations
        // Then after a shorter delay, swipe
        setTimeout(() => {
          setAnimationState('swipe');
          
          // After animation completes, call the onSlideChange callback
          setTimeout(() => {
            if (onSlideChange) {
              onSlideChange(direction);
            }
          }, 600); // Reduced from 800ms
        }, 300); // Reduced from 500ms
      });
    });
  };
  
  // Make the animation function callable from parent
  React.useImperativeHandle(
    ref,
    () => ({
      exitAnimation: startExitAnimation,
      exitAnimationNext: () => startExitAnimation(1),
      exitAnimationPrev: () => startExitAnimation(-1)
    }),
    [startExitAnimation]
  );
  
  // Initialize items on mount
  useEffect(() => {
    // Don't initialize if no container width or if floor position isn't ready
    if (!containerRef.current || containerSize.width === 0 || floorY <= 0) return;
    
    console.log('Initializing physics items with floor position:', floorY);
    
    const allItems: Item[] = [];
    
    // Add ingredients
    ingredients.forEach((ingredient, i) => {
      const x = 50 + ((i % 5) * containerSize.width) / 6;
      // Start items higher above the floor for a more dramatic fall
      const y = -100 - (30 * Math.floor(i / 5));
      
      // Try to get the image URL for the ingredient
      const ingredientName = ingredient.name.toLowerCase().trim();
      // Direct URL to static folder images (not through API) for ingredient images
      const imageUrl = ingredient.name.toLowerCase() === 'salt' 
        ? 'http://localhost:8000/static/images/ingredients/salt.png'
        : null;
      
      allItems.push({
        id: `ingredient-${i}`,
        name: ingredient.name,
        type: 'ingredient',
        x,
        y,
        size: 80,
        color: getColorFromString(ingredient.name, 'ingredient'),
        dragging: false,
        falling: true,
        imageUrl: imageUrl,
        hasImageError: false
      });
    });
    
    // Add equipment
    equipment.forEach((equip, i) => {
      const x = containerSize.width - 50 - ((i % 5) * containerSize.width) / 6;
      // Start items higher above the floor for a more dramatic fall
      const y = -100 - (30 * Math.floor(i / 5));
      
      // Try to get the image URL for the equipment - none available for now
      const equipmentName = equip.name.toLowerCase().trim();
      const imageUrl = null; // No equipment images for now
      
      allItems.push({
        id: `equipment-${i}`,
        name: equip.name,
        type: 'equipment',
        x,
        y,
        size: 90,
        color: getColorFromString(equip.name, 'equipment'),
        dragging: false,
        falling: true,
        imageUrl: imageUrl,
        hasImageError: false
      });
    });
    
    setItems(allItems);
  }, [ingredients, equipment, containerSize.width, floorY]);
  
  // Get container dimensions on mount
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // Animation frame for falling motion - Applied to ALL items at once
  useEffect(() => {
    // If no items are falling, don't set up animation
    if (!items.some(item => item.falling)) return;
    
    // Track fall speeds separately for each item - using global constants
    const fallSpeeds = items.reduce((acc, item) => {
      acc[item.id] = acc[item.id] || (
        PHYSICS_CONSTANTS.MIN_FALL_SPEED + 
        Math.random() * (PHYSICS_CONSTANTS.MAX_FALL_SPEED - PHYSICS_CONSTANTS.MIN_FALL_SPEED)
      );
      return acc;
    }, {} as Record<string, number>);
    
    let animationId: number;
    
    const animate = () => {
      setItems(prevItems => {
        // If no items are falling, stop animation
        if (!prevItems.some(item => item.falling)) return prevItems;
        
        // Update each falling item
        const updatedItems = prevItems.map(item => {
          if (!item.falling) return item;
          
          // Update fall speed using global constant for acceleration
          fallSpeeds[item.id] *= PHYSICS_CONSTANTS.FALL_ACCELERATION;
          
          // Calculate new Y position
          const newY = item.y + fallSpeeds[item.id];
          
          // Check if item has reached the floor
          // Note: we want the BOTTOM of the circle to hit the counter top edge,
          // but since y is the CENTER of the circle, we need to add the radius to the check
          const itemRadius = item.size / 2;
          
          // Check if bottom edge of circle has hit the counter top
          if (newY + itemRadius >= floorY) {
            // Make the item rest perfectly on the counter top
            // Position the item so its BOTTOM edge exactly touches the counter top
            return {
              ...item,
              y: floorY - itemRadius, // Place the center so the bottom touches the floor
              falling: false
            };
          }
          
          return {
            ...item,
            y: newY
          };
        });
        
        return updatedItems;
      });
      
      // Continue animation if any items are still falling
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [items, floorY]);
  
  // Handle mouse down on item
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find the item - we now allow grabbing even while falling
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Starting positions
    const startX = item.x;
    const startY = item.y;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    
    // Mark item as dragging
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === id ? { ...i, dragging: true } : i
      )
    );
    
    // Set global dragging state
    setIsDragging(true);
    
    // Handle mouse move
    const handleMouseMove = (e: MouseEvent) => {
      setItems(prevItems =>
        prevItems.map(i => {
          if (i.id !== id) return i;
          
          // Calculate new position
          const newX = startX + (e.clientX - startMouseX);
          
          // Calculate new Y but enforce floor constraint - never allow below counter
          let newY = startY + (e.clientY - startMouseY);
          
          // We want to prevent dragging the object below the counter
          // Calculate the minimum Y to keep the bottom edge at the counter top
          const itemRadius = i.size / 2;
          
          // Prevent dragging below the counter - the bottom edge of circle should not go below floorY
          newY = Math.min(newY, floorY - itemRadius);
          
          return {
            ...i,
            x: newX,
            y: newY,
            falling: false
          };
        })
      );
    };
    
    // Handle mouse up
    const handleMouseUp = () => {
      setItems(prevItems =>
        prevItems.map(i => {
          if (i.id !== id) return i;
          
          // Check if item should fall - an item should fall if its bottom edge is above the floor
          const itemRadius = i.size / 2;
          // If the bottom edge (y + radius) is above the floor, it should fall
          const shouldFall = (i.y + itemRadius) < floorY;
          
          return {
            ...i,
            dragging: false,
            falling: shouldFall
          };
        })
      );
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Reset global dragging state
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle touch start on item
  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find the item - we now allow grabbing even while falling
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Get first touch
    const touch = e.touches[0];
    
    // Starting positions
    const startX = item.x;
    const startY = item.y;
    const startTouchX = touch.clientX;
    const startTouchY = touch.clientY;
    
    // Mark item as dragging
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === id ? { ...i, dragging: true } : i
      )
    );
    
    // Set global dragging state
    setIsDragging(true);
    
    // Handle touch move
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      
      setItems(prevItems =>
        prevItems.map(i => {
          if (i.id !== id) return i;
          
          // Calculate new position
          const newX = startX + (touch.clientX - startTouchX);
          
          // Calculate new Y but enforce floor constraint - never allow below counter
          let newY = startY + (touch.clientY - startTouchY);
          
          // We want to prevent dragging the object below the counter
          // Calculate the minimum Y to keep the bottom edge at the counter top
          const itemRadius = i.size / 2;
          
          // Prevent dragging below the counter - the bottom edge of circle should not go below floorY
          newY = Math.min(newY, floorY - itemRadius);
          
          return {
            ...i,
            x: newX,
            y: newY,
            falling: false
          };
        })
      );
    };
    
    // Handle touch end
    const handleTouchEnd = () => {
      setItems(prevItems =>
        prevItems.map(i => {
          if (i.id !== id) return i;
          
          // Check if item should fall - an item should fall if its bottom edge is above the floor
          const itemRadius = i.size / 2;
          // If the bottom edge (y + radius) is above the floor, it should fall
          const shouldFall = (i.y + itemRadius) < floorY;
          
          return {
            ...i,
            dragging: false,
            falling: shouldFall
          };
        })
      );
      
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Reset global dragging state
      setIsDragging(false);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'visible',
        backgroundColor: 'transparent',
        zIndex: 9994,
        pointerEvents: 'auto'
      }}
    >
      {/* No floor marker visualization */}
      
      {/* Render all items */}
      {items.map(item => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: item.size,
            height: item.size,
            borderRadius: '50%',
            backgroundColor: item.hasImageError ? item.color : 'transparent',
            border: '3px solid #fff',
            boxShadow: item.dragging ? '0 0 20px rgba(255,255,255,0.5)' : '2px 2px 10px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transform: 'translate(-50%, -50%)',
            animationName: animationState === 'jiggle' 
                          ? (animationDirection === 1 ? 'jiggleRightAnim' : 'jiggleLeftAnim')
                          : animationState === 'swipe' 
                          ? (animationDirection === 1 ? 'swipeLeftAnim' : 'swipeRightAnim')
                          : 'none',
            animationDuration: animationState === 'jiggle' ? '0.3s' : 
                              animationState === 'swipe' ? '0.5s' : 
                              '0s',
            animationTimingFunction: animationState === 'jiggle' ? 'cubic-bezier(0.25, 1, 0.5, 1.3)' : 
                                    animationState === 'swipe' ? 'cubic-bezier(0.33, 0.1, 0.67, 0.9)' : 
                                    'ease-out',
            animationFillMode: 'forwards',
            zIndex: item.dragging ? 30000 : 25000, // Much higher z-index to appear above other elements
            userSelect: 'none',
            touchAction: 'none',
            pointerEvents: 'auto',
            cursor: 'grab', // Always show grab cursor to indicate draggable
            transition: item.dragging ? 'none' : 'box-shadow 0.2s ease-in-out'
          }}
          onMouseDown={(e) => handleMouseDown(item.id, e)}
          onTouchStart={(e) => handleTouchStart(item.id, e)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {/* Display the image if available and hasn't errored */}
          {item.imageUrl && !item.hasImageError && (
            <img 
              src={item.imageUrl}
              alt={item.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%'
              }}
              onError={() => handleImageError(item.id)}
            />
          )}
          
          {/* Make the entire circle clickable */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              top: 0,
              left: 0,
              cursor: 'grab', // Always grabbable
            }}
            onMouseDown={(e) => handleMouseDown(item.id, e)}
            onTouchStart={(e) => handleTouchStart(item.id, e)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          />
          
          {/* Item name - only shown on hover */}
          {(hoveredItem === item.id) && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 5px)',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                transform: 'translateX(-50%)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                zIndex: 30001, // Above everything else
                transition: 'all 0.15s ease-in',
                pointerEvents: 'none' // So it doesn't interfere with mouse events
              }}
            >
              {item.name}
            </div>
          )}
        </div>
      ))}
      
      {/* Loading indicator with debug information */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px' }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                border: '4px solid rgba(255, 255, 255, 0.2)',
                borderTopColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '1rem'
              }}
            />
            <p style={{ color: 'white', fontWeight: 500, fontSize: '18px', marginBottom: '8px' }}>
              Waiting for counter element...
            </p>
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              padding: '10px', 
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px',
              fontFamily: 'monospace',
              maxWidth: '100%',
              overflow: 'auto',
              textAlign: 'left'
            }}>
              <p>Debug info:</p>
              <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                <li>Floor Y: {floorY}</li>
                <li>Window height: {window.innerHeight}</li>
                <li>Expected position: {window.innerHeight * 0.75}px (75% of viewport)</li>
                <li>Counter element: {document.getElementById('kitchen-counter-texture') ? 'Found' : 'Not found'}</li>
                <li>Container width: {containerSize.width}px</li>
              </ul>
              <p style={{ marginTop: '10px', color: 'yellow' }}>
                If loading persists, please refresh the page.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Next slide animations (right to left) */
        @keyframes jiggleRightAnim {
          0% { transform: translate(-50%, -50%); }
          65% { transform: translate(-50%, -50%) translateX(30px) rotate(4deg); }
          85% { transform: translate(-50%, -50%) translateX(25px) rotate(2deg); }
          100% { transform: translate(-50%, -50%) translateX(28px) rotate(3deg); }
        }
        
        @keyframes swipeLeftAnim {
          0% { transform: translate(-50%, -50%) translateX(28px) rotate(3deg); }
          100% { transform: translate(-50%, -50%) translateX(-1200px) rotate(-10deg); }
        }
        
        /* Previous slide animations (left to right) */
        @keyframes jiggleLeftAnim {
          0% { transform: translate(-50%, -50%); }
          65% { transform: translate(-50%, -50%) translateX(-30px) rotate(-4deg); }
          85% { transform: translate(-50%, -50%) translateX(-25px) rotate(-2deg); }
          100% { transform: translate(-50%, -50%) translateX(-28px) rotate(-3deg); }
        }
        
        @keyframes swipeRightAnim {
          0% { transform: translate(-50%, -50%) translateX(-28px) rotate(-3deg); }
          100% { transform: translate(-50%, -50%) translateX(1200px) rotate(10deg); }
        }
        
        .physics-item {
          position: absolute;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: box-shadow 0.2s ease-out;
          transform-origin: center center;
        }
        
        .physics-item.dragging {
          box-shadow: 0 0 20px rgba(255,255,255,0.5) !important;
          z-index: 30000 !important;
          transition: none !important;
        }
      `}</style>
    </div>
  );
})

export default PhysicsCounter;