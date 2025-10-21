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
  isAgainstWall?: boolean;
}

interface PhysicsCounterProps {
  ingredients: { name: string; url?: string; imageUrl?: string }[];
  equipment: { name: string; url?: string; imageUrl?: string }[];
  onSlideChange?: (direction?: 1 | -1) => void;
  isVisible?: boolean;
  useAllItems?: boolean; // If true, fetch and display ALL items from database instead of just recipe items
}

const PhysicsCounter = React.forwardRef<{
  exitAnimation: (direction?: 1 | -1) => void,
  exitAnimationNext: () => void,
  exitAnimationPrev: () => void
}, PhysicsCounterProps>(({ ingredients, equipment, onSlideChange, isVisible = true, useAllItems = false }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const hasInitializedRef = useRef(false);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const totalImages = useRef(0);

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
      prevItems.map(item => {
        if (item.id === id) {
          // Set the appropriate placeholder based on type
          const placeholderUrl = item.type === 'ingredient'
            ? 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png'
            : 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_equipment.png';

          return { ...item, hasImageError: true, imageUrl: placeholderUrl };
        }
        return item;
      })
    );

    // Count error as "loaded" so we don't wait forever
    setImagesLoaded(prev => {
      const newCount = prev + 1;
      console.log(`Image error (counted as loaded): ${newCount}/${totalImages.current}`);
      return newCount;
    });
  };

  // Handle image load success
  const handleImageLoad = (id: string) => {
    console.log(`Image loaded successfully for item: ${id}`);

    setImagesLoaded(prev => {
      const newCount = prev + 1;
      console.log(`Image loaded: ${newCount}/${totalImages.current}`);
      return newCount;
    });
  };

  // Check if we should show loading indicator
  const shouldShowLoading = !isLoading && totalImages.current > 0 && imagesLoaded < totalImages.current;
  
  // Track hover state for showing name
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // Animation state for slide transition
  const [animationState, setAnimationState] = useState<'none' | 'jiggle' | 'swipe' | 'slideIn'>('none');

  // Direction of animation (1 = next/right-to-left, -1 = prev/left-to-right)
  const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);

  // Track previous visibility to detect when we're returning to the slide
  const prevVisibleRef = useRef(isVisible);

  // Track the last exit direction so we can enter from the opposite side
  const lastExitDirectionRef = useRef<1 | -1 | null>(null);

  // Debug: Log animation state and visibility changes
  useEffect(() => {
    console.log('🎬 Animation/Visibility state:', { animationState, animationDirection, isVisible, prevVisible: prevVisibleRef.current });

    // ENTRANCE ANIMATION: When RETURNING to the slide (was hidden, now visible)
    const wasHidden = !prevVisibleRef.current;
    const isNowVisible = isVisible;

    if (wasHidden && isNowVisible) {
      // If we have a last exit direction, play entrance animation from opposite side
      if (lastExitDirectionRef.current !== null) {
        console.log('🎬 Playing entrance animation from direction:', lastExitDirectionRef.current);
        // Use the OPPOSITE direction for entrance
        // If we exited with direction 1 (went right, items went left), enter from left (direction -1)
        // If we exited with direction -1 (went left, items went right), enter from right (direction 1)
        const entranceDirection = lastExitDirectionRef.current === 1 ? -1 : 1;
        setAnimationState('slideIn');
        setAnimationDirection(entranceDirection);

        // Reset animation after it completes
        setTimeout(() => {
          setAnimationState('none');
        }, 800); // Match animation duration
      } else {
        // No previous exit, just reset
        console.log('🔄 Resetting animation state (no previous exit)');
        setAnimationState('none');
      }
    }

    // Update the previous visibility
    prevVisibleRef.current = isVisible;
  }, [animationState, animationDirection, isVisible]);
  
  // Function to start the exit animation sequence
  const startExitAnimation = (direction: 1 | -1 = 1) => {
    // Save the exit direction so we can enter from the same side later
    lastExitDirectionRef.current = direction;
    console.log('💾 Saved exit direction:', direction);

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
    console.log('=== Initialization effect triggered ===', {
      hasInitialized: hasInitializedRef.current,
      isVisible,
      containerWidth: containerSize.width,
      floorY,
      itemsCount: items.length
    });

    // Only initialize once
    if (hasInitializedRef.current) {
      console.log('Already initialized, skipping. Current items:', items.length);
      return;
    }

    // Don't initialize items if not visible yet
    if (!isVisible) {
      console.log('PhysicsCounter not visible, skipping initialization');
      return;
    }

    // Don't initialize if no container width or if floor position isn't ready
    if (!containerRef.current || containerSize.width === 0 || floorY <= 0) {
      console.log('Container not ready:', { containerRef: !!containerRef.current, width: containerSize.width, floorY });
      return;
    }

    // Always use items from recipe props (not all from database)
    const ingredientsToUse = ingredients;
    const equipmentToUse = equipment;

    console.log('Initializing physics items with floor position:', floorY);
    console.log('Using items from recipe:', {
      ingredients: ingredientsToUse.length,
      equipment: equipmentToUse.length
    });

    // Mark as initialized
    hasInitializedRef.current = true;

    const allItems: Item[] = [];
    let totalImageCount = 0;

    // Add ingredients
    // Calculate items per row based on container width (allow ~100px per item)
    const itemsPerRow = Math.max(3, Math.floor(containerSize.width / 100));

    ingredientsToUse.forEach((ingredient, i) => {
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const spacing = containerSize.width / (itemsPerRow + 1);
      const x = spacing * (col + 1);
      // Start items higher above the floor for a more dramatic fall
      // Stagger rows more to prevent overlapping
      const y = -100 - (40 * row);

      // Use the URL that comes directly with the ingredient from the recipe
      // Default to placeholder if no image found
      const imageUrl = ingredient.url || ingredient.imageUrl || 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png';

      if (imageUrl) totalImageCount++;

      console.log(`Adding ingredient "${ingredient.name}":`, {
        hasUrl: !!ingredient.url,
        url: imageUrl?.substring(0, 80) + '...'
      });

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
    equipmentToUse.forEach((equip, i) => {
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const spacing = containerSize.width / (itemsPerRow + 1);
      // Equipment drops from right side
      const x = containerSize.width - (spacing * (col + 1));
      // Start items higher above the floor for a more dramatic fall
      // Stagger rows more to prevent overlapping
      const y = -100 - (40 * row);

      // Use the URL that comes directly with the equipment from the recipe
      // Default to placeholder if no image found
      const imageUrl = equip.url || equip.imageUrl || 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_equipment.png';

      if (imageUrl) totalImageCount++;

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

    // Set total images count
    totalImages.current = totalImageCount;
    console.log('Total images to load:', totalImageCount);

    // Check for items against walls during initialization
    const itemsWithWallState = allItems.map(item => ({
      ...item,
      isAgainstWall: isItemAgainstWall(item)
    }));

    setItems(itemsWithWallState);
  }, [ingredients, equipment, containerSize.width, floorY, isVisible]);
  
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
    // Run animation if any items are falling OR if any items are being dragged
    // (so we can detect unstable items when drag ends)
    const shouldAnimate = items.some(item => item.falling) || isDragging;
    if (!shouldAnimate) return;

    // Don't run physics when component is not visible
    if (!isVisible) return;

    // First, mark all items that are against walls
    let updatedItems = items.map(item => ({
      ...item,
      isAgainstWall: isItemAgainstWall(item)
    }));

    // Track fall speeds and horizontal velocities separately for each item
    const fallSpeeds = items.reduce((acc, item) => {
      acc[item.id] = acc[item.id] || (
        PHYSICS_CONSTANTS.MIN_FALL_SPEED +
        Math.random() * (PHYSICS_CONSTANTS.MAX_FALL_SPEED - PHYSICS_CONSTANTS.MIN_FALL_SPEED)
      );
      return acc;
    }, {} as Record<string, number>);

    // Add horizontal velocities for bouncing
    const horizontalVelocities = items.reduce((acc, item) => {
      acc[item.id] = acc[item.id] || 0; // Start with no horizontal velocity
      return acc;
    }, {} as Record<string, number>);

    let animationId: number;

    const animate = () => {
      setItems(prevItems => {
        // If no items are falling, stop animation
        if (!prevItems.some(item => item.falling)) return prevItems;

        // First, mark all items that are against walls
        let updatedItems = prevItems.map(item => ({
          ...item,
          isAgainstWall: isItemAgainstWall(item)
        }));

        // Update each falling item
        updatedItems = updatedItems.map(item => {
          if (!item.falling) return item;

          // Update fall speed using global constant for acceleration
          fallSpeeds[item.id] *= PHYSICS_CONSTANTS.FALL_ACCELERATION;

          // Apply minimum velocity threshold to prevent micro-movements and jitter
          const MIN_VELOCITY = 0.1;
          if (Math.abs(fallSpeeds[item.id]) < MIN_VELOCITY) {
            fallSpeeds[item.id] = 0;
          }
          if (Math.abs(horizontalVelocities[item.id]) < MIN_VELOCITY) {
            horizontalVelocities[item.id] = 0;
          }

          // Calculate new position with both vertical and horizontal components
          let newY = item.y + fallSpeeds[item.id];
          let newX = item.x + horizontalVelocities[item.id];

          const itemRadius = item.size / 2;

          // Check for collisions with other items (landing on top)
          let hasLanded = false;
          for (const otherItem of updatedItems) {
            // Skip self-collision
            if (otherItem.id === item.id) continue;
            // Skip collisions with other falling items (for simplicity)
            if (otherItem.falling) continue;

            // Calculate distance between centers
            const dx = newX - otherItem.x;
            const dy = newY - otherItem.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Calculate minimum distance for collision
            const minDist = itemRadius + otherItem.size / 2;

            // Check for collision
            if (distance < minDist) {
              // Calculate normalized direction vector from other item to this one
              const nx = dx / (distance || 0.0001); // Avoid division by zero
              const ny = dy / (distance || 0.0001);

              // If the item is mostly above the other item (about to land on it)
              if (ny < -0.5) { // Coming from above (relaxed from -0.7)
                // Calculate landing position - place item on top
                newY = otherItem.y + ny * minDist;
                newX = otherItem.x + nx * minDist;

                // Apply gentle horizontal bounce - much weaker than before
                horizontalVelocities[item.id] = nx * Math.min(8, fallSpeeds[item.id] * 0.6);

                // Stop vertical fall speed when landing
                fallSpeeds[item.id] = 0;
                hasLanded = true;
                break; // Stop checking other collisions
              }
            }
          }

          // If item has landed on another item and has low velocity, mark as not falling
          if (hasLanded && Math.abs(horizontalVelocities[item.id]) < 1) {
            return {
              ...item,
              x: newX,
              y: newY,
              falling: false,
              isAgainstWall: isItemAgainstWall({...item, x: newX, y: newY})
            };
          }

          // Check if item has reached the floor
          if (newY + itemRadius >= floorY) {
            // Calculate final position with bottom edge touching the counter
            const finalY = floorY - itemRadius;

            // Additional collision check before placing on floor
            // This ensures no interpenetration of sides with floor items
            let adjustedX = newX;
            for (const otherItem of updatedItems) {
              // Skip self and other falling items
              if (otherItem.id === item.id || otherItem.falling) continue;

              // Only check items on the floor
              const otherBottomEdge = otherItem.y + otherItem.size/2;
              const isOnFloor = Math.abs(otherBottomEdge - floorY) < 2;
              if (!isOnFloor) continue;

              // Check for side collision
              const dx = adjustedX - otherItem.x;
              const dy = finalY - otherItem.y; // Use final Y for check
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Check if objects overlap
              const minDist = itemRadius + otherItem.size / 2;
              if (distance < minDist) {
                // Calculate how to push out horizontally
                const nx = dx / (distance || 0.0001);

                // Push away horizontally with extra space
                adjustedX = otherItem.x + nx * (minDist + 2);

                // Reverse horizontal velocity for a bounce effect
                if (Math.abs(horizontalVelocities[item.id]) > 0.5) {
                  // Bounce with reduced energy
                  horizontalVelocities[item.id] = -horizontalVelocities[item.id] * 0.6;
                } else {
                  // Stop if moving slowly
                  horizontalVelocities[item.id] = 0;
                }
              }
            }

            // Check if the item will be against a wall in its final position
            const againstWall = isItemAgainstWall({...item, y: finalY, x: adjustedX});

            // Damp horizontal velocity when hitting floor - stronger damping
            horizontalVelocities[item.id] *= 0.7;

            // If horizontal velocity is very low or zero, stop the item
            if (Math.abs(horizontalVelocities[item.id]) < 0.3) {
              // Stop the item completely
              horizontalVelocities[item.id] = 0;
              return {
                ...item,
                x: adjustedX,
                y: finalY,
                falling: false,
                isAgainstWall: againstWall
              };
            } else {
              // Keep item moving horizontally with reduced speed
              return {
                ...item,
                x: adjustedX,
                y: finalY,
                isAgainstWall: againstWall
              };
            }
          }

          // Apply and decay horizontal velocity
          horizontalVelocities[item.id] *= 0.98; // Gradual air resistance

          // Check for collisions with floor items AGAIN after applying horizontal movement
          // This extra check prevents phasing of sides when objects are on the floor
          for (const otherItem of updatedItems) {
            // Skip self-collision and other falling items
            if (otherItem.id === item.id || otherItem.falling) continue;

            // Skip items that aren't on the floor (optimization)
            const otherBottomEdge = otherItem.y + otherItem.size/2;
            const isOnFloor = Math.abs(otherBottomEdge - floorY) < 2;
            if (!isOnFloor) continue;

            // Calculate current distance between centers
            const dx = newX - otherItem.x;
            const dy = newY - otherItem.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Calculate minimum allowed distance
            const minDist = itemRadius + otherItem.size / 2;

            // If they're too close (overlapping)
            if (distance < minDist) {
              // Calculate normalized direction vector
              const nx = dx / (distance || 0.0001); // Avoid division by zero
              const ny = dy / (distance || 0.0001);

              // Calculate how much they overlap
              const overlap = minDist - distance;

              // Push the item away to prevent overlap (slightly stronger push)
              newX = otherItem.x + nx * (minDist + 1);

              // If item is coming in horizontally, add a bit of bounce
              if (Math.abs(horizontalVelocities[item.id]) > 1) {
                horizontalVelocities[item.id] = -horizontalVelocities[item.id] * 0.6;
              } else {
                // If barely moving, just stop it
                horizontalVelocities[item.id] = 0;
              }
            }
          }

          // Apply wall boundaries during animation
          const { x: boundedX, y: boundedY } = enforceWallBoundaries({...item, x: newX, y: newY});

          // Bounce off walls by reversing horizontal velocity
          if (boundedX !== newX) {
            horizontalVelocities[item.id] = -horizontalVelocities[item.id] * 0.8; // Bounce with energy loss
          }

          return {
            ...item,
            x: boundedX,
            y: boundedY
          };
        });

        // Check for unstable stacking - items should fall off if not balanced
        updatedItems = updatedItems.map(item => {
          // Skip items already falling
          if (item.falling) return item;

          const itemRadius = item.size / 2;
          const bottomEdge = item.y + itemRadius;

          // Check if item is on the floor - if so, it's stable
          if (Math.abs(bottomEdge - floorY) < 2) return item;

          // IMPORTANT: Also check if item is just floating in mid-air with NO support at all
          // This catches items that were pushed up and left unsupported
          let hasAnySupport = false;
          for (const otherItem of updatedItems) {
            if (otherItem.id === item.id) continue;

            const dx = item.x - otherItem.x;
            const dy = item.y - otherItem.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = itemRadius + otherItem.size / 2;

            // Check if this item is touching another AND is above it
            if (distance < minDist + 5 && dy < 0) {
              hasAnySupport = true;
              break;
            }
          }

          // If no support at all, start falling immediately
          if (!hasAnySupport) {
            fallSpeeds[item.id] = 1.0; // Start falling with some speed
            return {
              ...item,
              falling: true
            };
          }

          // Item is not on the floor - check if it's balanced on multiple items (pyramid style)
          let supportingItems = [];

          for (const otherItem of updatedItems) {
            if (otherItem.id === item.id) continue;

            // Calculate distance between centers
            const dx = item.x - otherItem.x;
            const dy = item.y - otherItem.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = itemRadius + otherItem.size / 2;

            // Check if items are touching and this item is above the other
            if (distance < minDist + 5 && dy < 0) {
              // Very strict balance check - item must be nearly perfectly centered
              const horizontalOffset = Math.abs(dx);
              const maxAllowedOffset = (itemRadius + otherItem.size / 2) * 0.25; // Only 25% off-center allowed

              if (horizontalOffset < maxAllowedOffset) {
                supportingItems.push({
                  item: otherItem,
                  dx: dx,
                  distance: distance
                });
              }
            }
          }

          // For stable stacking, item needs to be either:
          // 1. Centered on one item (very strict), OR
          // 2. Balanced between two items (pyramid style)
          let isBalanced = false;

          if (supportingItems.length === 1) {
            // Single support point - must be very well centered (already checked above)
            const horizontalOffset = Math.abs(supportingItems[0].dx);
            // Even stricter for single support - only 15% off-center
            const maxOffset = (itemRadius + supportingItems[0].item.size / 2) * 0.15;
            isBalanced = horizontalOffset < maxOffset;
          } else if (supportingItems.length >= 2) {
            // Multiple support points (pyramid) - check if they're on opposite sides
            const leftSupports = supportingItems.filter(s => s.dx < 0).length;
            const rightSupports = supportingItems.filter(s => s.dx > 0).length;

            // Balanced if there are supports on both sides
            isBalanced = leftSupports > 0 && rightSupports > 0;
          }

          // If item is not balanced, make it fall
          if (supportingItems.length > 0 && !isBalanced) {
            // Apply horizontal velocity in the direction it's leaning
            const avgDx = supportingItems.reduce((sum, s) => sum + s.dx, 0) / supportingItems.length;
            horizontalVelocities[item.id] = avgDx > 0 ? 4 : -4; // Slide off
            fallSpeeds[item.id] = 0.5; // Start falling slowly

            return {
              ...item,
              falling: true
            };
          }

          return item;
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
  }, [items, floorY, isVisible, isDragging]);
  
  // Helper functions for collision detection
  const isItemAgainstWall = (item: Item): boolean => {
    const radius = item.size / 2;
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;

    // Check if the item is against the left or right wall
    const currentWidth = containerRef.current?.clientWidth || window.innerWidth;
    return (item.x - radius <= PHYSICS_CONSTANTS.WALL_BOUNDARY_MARGIN) ||
           (item.x + radius >= currentWidth - PHYSICS_CONSTANTS.WALL_BOUNDARY_MARGIN);
  };
  
  // Enforce wall boundaries - prevent items from going off screen
  // Allow slight overhang to prevent sticking to walls
  const enforceWallBoundaries = (item: Item): {x: number, y: number} => {
    const radius = item.size / 2;
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;

    // Calculate bounds to keep item within the container, with some margin
    let x = item.x;
    let y = item.y;

    // Left wall boundary - allow slight overflow
    if (x - radius < -5) {
      x = -5 + radius; // Allow overflow by 5px to prevent sticking
    }

    // Right wall boundary - allow slight overflow
    if (x + radius > containerWidth + 5) {
      x = containerWidth + 5 - radius; // Allow overflow by 5px to prevent sticking
    }

    // Floor boundary - never allow objects to go below the floor (strict)
    if (y + radius > floorY) {
      y = floorY - radius;
    }

    return { x, y };
  };
  
  // This function handles smooth sliding of objects around each other
  // and implements pushing behavior
  const handleObjectCollisions = (movedItem: Item, newX: number, newY: number, allItems: Item[]): {x: number, y: number} => {
    // Apply less strict wall boundaries - only enforce if completely outside
    // This fixes the "stuck on wall" issue
    const radius = movedItem.size / 2;
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;

    // Calculate bounds but with more liberal boundaries
    let boundedX = newX;
    let boundedY = newY;

    // Only enforce if completely outside container
    if (boundedX - radius < -10) {
      boundedX = -10 + radius;
    }
    if (boundedX + radius > containerWidth + 10) {
      boundedX = containerWidth + 10 - radius;
    }

    // Floor boundary is strict - never allow objects to go below floor
    if (boundedY + radius > floorY) {
      boundedY = floorY - radius;
    }

    let resultX = boundedX;
    let resultY = boundedY;

    // Track which items we're pushing
    const pushedItems: {item: Item, pushedX: number, pushedY: number}[] = [];

    // Check for collisions with all other items
    for (const item of allItems) {
      // Skip the item being moved
      if (item.id === movedItem.id) continue;

      // Create test item at current result position
      const testItem = {...movedItem, x: resultX, y: resultY};

      // Check for collision
      if (detectCollision(testItem, item)) {
        // Calculate vector from item to test item
        const dx = testItem.x - item.x;
        const dy = testItem.y - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Avoid division by zero
        if (dist < 0.001) continue;

        // Calculate normalized direction
        const nx = dx / dist;
        const ny = dy / dist;

        // Calculate overlap amount
        const minDist = (testItem.size / 2) + (item.size / 2);
        const overlap = minDist - dist;

        // Instead of just resolving our position, calculate push amount for other item
        const pushStrength = PHYSICS_CONSTANTS.PUSH_FACTOR || 0.5;

        // Push the other item in the direction of collision, based on our movement
        // The further we're trying to move, the stronger the push
        const moveMagnitude = Math.sqrt(
          Math.pow(newX - movedItem.x, 2) +
          Math.pow(newY - movedItem.y, 2)
        );

        // Calculate pushed position with a velocity-based approach
        const pushedX = item.x - nx * overlap * pushStrength * Math.min(1.0, moveMagnitude / 20);
        const pushedY = item.y - ny * overlap * pushStrength * Math.min(1.0, moveMagnitude / 20);

        // Add to list of pushed items
        pushedItems.push({
          item,
          pushedX,
          pushedY
        });

        // Adjust our own position to stay in contact but not overlap
        resultX = item.x + nx * minDist;
        resultY = item.y + ny * minDist;
      }
    }

    // Process pushed items with cascading collisions
    if (pushedItems.length > 0) {
      // We need to process pushed items and their subsequent collisions
      // This implements chain reactions of pushing multiple objects
      setItems(prevItems => {
        // Create a copy of all items to modify
        let updatedItems = [...prevItems];

        // Start with the directly pushed items
        let itemsToProcess = [...pushedItems];
        let processedIds = new Set<string>([movedItem.id]); // Track which items we've already processed
        let maxIterations = 10; // Prevent infinite loops
        let iterations = 0;

        // Process pushed items and their cascading effects
        while (itemsToProcess.length > 0 && iterations < maxIterations) {
          iterations++;
          const nextItemsToProcess: typeof pushedItems = [];

          // Process current batch of pushed items
          for (const { item, pushedX, pushedY } of itemsToProcess) {
            // Skip if already processed
            if (processedIds.has(item.id)) continue;
            processedIds.add(item.id);

            // Apply wall/floor boundaries to pushed item
            let newX = pushedX;
            let newY = pushedY;

            const radius = item.size / 2;

            // FIRST: Check for collisions with other items to prevent phasing
            // This must happen BEFORE wall boundary checks
            for (const otherItem of updatedItems) {
              if (otherItem.id === item.id || processedIds.has(otherItem.id)) continue;

              const dx = newX - otherItem.x;
              const dy = newY - otherItem.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = radius + otherItem.size / 2;

              // If overlapping, push apart
              if (dist < minDist) {
                const overlap = minDist - dist;
                const nx = dx / (dist || 0.001);
                const ny = dy / (dist || 0.001);

                // Push away from the collision
                newX = otherItem.x + nx * minDist;
                newY = otherItem.y + ny * minDist;
              }
            }

            // SECOND: Check for wall collision with possibility for bounce/stack
            const isNearLeftWall = newX - radius < 0;
            const isNearRightWall = newX + radius > containerWidth;

            // Check if we're being pushed against a wall
            if (isNearLeftWall || isNearRightWall) {
              // Calculate the push direction (into the wall)
              const pushingIntoWall = isNearLeftWall ?
                newX < item.x : // Moving left into left wall
                newX > item.x;  // Moving right into right wall

              if (pushingIntoWall) {
                // If we're pushing into a wall, we check for vertically adjacent objects
                // to potentially bounce/stack over them
                const isBlocked = updatedItems.some(otherItem => {
                  // Skip same item or already processed items
                  if (otherItem.id === item.id || processedIds.has(otherItem.id)) return false;

                  // Check if other item is also against the same wall
                  const otherRadius = otherItem.size / 2;
                  const otherNearLeftWall = otherItem.x - otherRadius < radius;
                  const otherNearRightWall = otherItem.x + otherRadius > containerWidth - radius;

                  // If other object is against the same wall
                  if ((isNearLeftWall && otherNearLeftWall) ||
                      (isNearRightWall && otherNearRightWall)) {

                    // Check vertical proximity (objects are side by side)
                    const verticalDist = Math.abs(item.y - otherItem.y);
                    const verticalOverlap = (item.size/2 + otherItem.size/2) - verticalDist;

                    // If objects are vertically overlapping or very close
                    return verticalOverlap > -radius && verticalOverlap < radius;
                  }
                  return false;
                });

                // If blocked by another object at the wall, bounce upward
                if (isBlocked) {
                  // Make the object bounce up
                  newY -= radius * 1.1; // Move up by slightly more than radius

                  // Apply wall boundary after bounce
                  if (isNearLeftWall) newX = radius;
                  if (isNearRightWall) newX = containerWidth - radius;
                } else {
                  // Normal wall boundary if not bouncing
                  if (isNearLeftWall) newX = radius;
                  if (isNearRightWall) newX = containerWidth - radius;
                }
              } else {
                // Normal wall boundary if not pushing into wall
                if (isNearLeftWall) newX = radius;
                if (isNearRightWall) newX = containerWidth - radius;
              }
            }

            // Apply gravity - ensure the object rests on the floor if it should
            // Calculate bottom edge of the object
            const bottomEdge = newY + radius;
            if (bottomEdge >= floorY) {
              newY = floorY - radius; // Rest exactly on floor
            } else {
              // Check if object should be resting on floor based on previous position
              const originalBottomEdge = item.y + radius;
              if (originalBottomEdge >= floorY - 1) { // Within 1px of floor
                newY = floorY - radius; // Keep it on the floor
              }
            }

            // Find the item in our updated list
            const itemIndex = updatedItems.findIndex(i => i.id === item.id);
            if (itemIndex === -1) continue;

            // Create the updated item
            const updatedItem = {
              ...updatedItems[itemIndex],
              x: newX,
              y: newY,
              isAgainstWall: (newX - radius <= PHYSICS_CONSTANTS.WALL_BOUNDARY_MARGIN) ||
                            (newX + radius >= containerWidth - PHYSICS_CONSTANTS.WALL_BOUNDARY_MARGIN)
            };

            // Update the item in our list
            updatedItems[itemIndex] = updatedItem;

            // Check if this updated item collides with any other items
            // and push those too (cascading collision)
            for (const otherItem of updatedItems) {
              // Skip if same item or already processed
              if (otherItem.id === item.id || processedIds.has(otherItem.id)) continue;

              // Check for collision
              if (detectCollision(updatedItem, otherItem)) {
                // Calculate push direction
                const dx = updatedItem.x - otherItem.x;
                const dy = updatedItem.y - otherItem.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Skip if too close
                if (dist < 0.001) continue;

                // Calculate normalized direction
                const nx = dx / dist;
                const ny = dy / dist;

                // Calculate overlap and push amount
                const minDist = (updatedItem.size / 2) + (otherItem.size / 2);
                const overlap = minDist - dist;

                // Check if the push is primarily horizontal vs vertical
                const isHorizontalPush = Math.abs(nx) > Math.abs(ny);

                // Check if other objects are in the way (sandwiched between objects)
                const isSandwiched = updatedItems.some(thirdItem => {
                  // Skip items we're already considering or processed
                  if (thirdItem.id === otherItem.id ||
                      thirdItem.id === updatedItem.id ||
                      processedIds.has(thirdItem.id)) {
                    return false;
                  }

                  // Check if this third item is in front of the otherItem in the push direction
                  const thirdItemDx = thirdItem.x - otherItem.x;
                  const pushDirDot = nx * thirdItemDx; // Dot product for direction check

                  // If third item is in the push direction
                  if (pushDirDot > 0) {
                    // Check if it's close enough to be in the way
                    const thirdDist = Math.sqrt(
                      Math.pow(thirdItem.x - otherItem.x, 2) +
                      Math.pow(thirdItem.y - otherItem.y, 2)
                    );
                    return thirdDist < (otherItem.size/2 + thirdItem.size/2) + 10; // Within collision + small buffer
                  }
                  return false;
                });

                // Check if we're near a wall in the push direction
                const otherRadius = otherItem.size / 2;
                const isAtLeftWall = otherItem.x - otherRadius <= 2; // Very close to left wall
                const isAtRightWall = otherItem.x + otherRadius >= containerWidth - 2; // Very close to right wall
                const isAtWall = isAtLeftWall || isAtRightWall;

                // Check if we're pushing towards the wall
                const pushingTowardsLeftWall = nx < -0.7 && otherItem.x - otherRadius < 20;
                const pushingTowardsRightWall = nx > 0.7 && otherItem.x + otherRadius > containerWidth - 20;
                const pushingTowardsWall = pushingTowardsLeftWall || pushingTowardsRightWall;

                // If object is already at a wall and being pushed against it, we completely
                // block the push chain to enforce proper boundary
                let canContinuePush = true;
                let pushX = otherItem.x;
                let pushY = otherItem.y;

                // If object is directly against a wall AND we're pushing towards that wall,
                // allow partial movement with resistance instead of completely blocking
                if (isAtWall) {
                  const pushingAgainstLeftWall = isAtLeftWall && nx < 0;
                  const pushingAgainstRightWall = isAtRightWall && nx > 0;

                  if (pushingAgainstLeftWall || pushingAgainstRightWall) {
                    // Prevent any horizontal compression against walls
                    canContinuePush = false;
                    // Ensure item stays at wall boundary
                    if (pushingAgainstLeftWall) {
                      pushX = otherRadius; // Lock to left wall
                    } else if (pushingAgainstRightWall) {
                      pushX = containerWidth - otherRadius; // Lock to right wall
                    }
                    // Maintain vertical position
                    pushY = otherItem.y;
                  }
                }

                // If we can continue pushing (not completely blocked by a wall)
                if (canContinuePush) {
                  if ((isSandwiched || pushingTowardsWall) && isHorizontalPush) {
                    // Bounce up and slightly in push direction
                    pushX = otherItem.x - nx * overlap * 0.3; // Reduced horizontal push
                    pushY = otherItem.y - Math.abs(overlap * 0.8); // Strong upward component
                  } else {
                    // Normal push with reduced strength for cascading pushes
                    pushX = otherItem.x - nx * overlap * 0.8;
                    pushY = otherItem.y - ny * overlap * 0.8;
                  }
                }

                // Add to next batch
                nextItemsToProcess.push({
                  item: otherItem,
                  pushedX: pushX,
                  pushedY: pushY
                });
              }
            }
          }

          // Set up next iteration with new items to process
          itemsToProcess = nextItemsToProcess;
        }

        // FINAL PASS: Resolve any remaining overlaps to prevent phasing
        // This ensures items never overlap even if cascading pushes caused issues
        let finalCleanup = true;
        let cleanupIterations = 0;
        const maxCleanupIterations = 5;

        while (finalCleanup && cleanupIterations < maxCleanupIterations) {
          finalCleanup = false;
          cleanupIterations++;

          for (let i = 0; i < updatedItems.length; i++) {
            for (let j = i + 1; j < updatedItems.length; j++) {
              const item1 = updatedItems[i];
              const item2 = updatedItems[j];

              const dx = item1.x - item2.x;
              const dy = item1.y - item2.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = (item1.size / 2) + (item2.size / 2);

              // If overlapping
              if (dist < minDist - 0.1) {
                finalCleanup = true;
                const overlap = minDist - dist;
                const nx = dx / (dist || 0.001);
                const ny = dy / (dist || 0.001);

                // Push both items apart equally, but prefer horizontal separation
                // to avoid pushing items through the floor
                let item1NewY = item1.y + ny * overlap * 0.5;
                let item2NewY = item2.y - ny * overlap * 0.5;

                // Enforce floor boundary - never push items below floor
                const item1Radius = item1.size / 2;
                const item2Radius = item2.size / 2;

                if (item1NewY + item1Radius > floorY) {
                  item1NewY = floorY - item1Radius;
                }
                if (item2NewY + item2Radius > floorY) {
                  item2NewY = floorY - item2Radius;
                }

                updatedItems[i] = {
                  ...item1,
                  x: item1.x + nx * overlap * 0.5,
                  y: item1NewY
                };
                updatedItems[j] = {
                  ...item2,
                  x: item2.x - nx * overlap * 0.5,
                  y: item2NewY
                };
              }
            }
          }
        }

        // Final floor enforcement pass - ensure no items are below floor
        updatedItems = updatedItems.map(item => {
          const radius = item.size / 2;
          if (item.y + radius > floorY) {
            return {
              ...item,
              y: floorY - radius
            };
          }
          return item;
        });

        // Check for items with no support and mark them as falling
        // This ensures items fall immediately when pushed upward and left unsupported
        updatedItems = updatedItems.map(item => {
          // Skip the item being dragged
          if (item.id === movedItem.id) return item;

          const itemRadius = item.size / 2;

          // Check if item is on the floor
          const onFloor = Math.abs((item.y + itemRadius) - floorY) < 2;
          if (onFloor) return item; // Items on floor don't need support

          // Check if item has support below it
          let hasSupport = false;
          for (const otherItem of updatedItems) {
            if (otherItem.id === item.id) continue;

            const dx = item.x - otherItem.x;
            const dy = item.y - otherItem.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = itemRadius + otherItem.size / 2;

            // Check if this item is touching another AND is above it
            if (distance < minDist + 5 && dy < 0) {
              hasSupport = true;
              break;
            }
          }

          // If no support, mark as falling
          if (!hasSupport) {
            return {
              ...item,
              falling: true
            };
          }

          return item;
        });

        return updatedItems;
      });
    }

    // Apply final boundaries to our position
    if (resultX - radius < 0) resultX = radius;
    if (resultX + radius > containerWidth) resultX = containerWidth - radius;
    if (resultY + radius > floorY) resultY = floorY - radius;

    return { x: resultX, y: resultY };
  };

  const detectCollision = (item1: Item, item2: Item): boolean => {
    const dx = item1.x - item2.x;
    const dy = item1.y - item2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (item1.size / 2) + (item2.size / 2);
    
    return distance < minDistance;
  };

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
      setItems(prevItems => {
        // First, mark which items are against walls
        const updatedItems = prevItems.map(item => ({
          ...item,
          isAgainstWall: isItemAgainstWall(item)
        }));

        // Find the item being dragged
        const draggedItem = updatedItems.find(i => i.id === id);
        if (!draggedItem) return prevItems;

        // Calculate new position
        let newX = startX + (e.clientX - startMouseX);

        // Calculate new Y but enforce floor constraint - never allow below counter
        let newY = startY + (e.clientY - startMouseY);

        // Check for objects against walls in chain
        // This prevents pushing past walls even with multiple objects in the chain
        const movingRight = newX > draggedItem.x;
        const movingLeft = newX < draggedItem.x;

        // Check if we're trying to push a line of objects that ends at a wall
        const wallBlocked = updatedItems.some(item => {
          // Skip the dragged item
          if (item.id === draggedItem.id) return false;

          // Only check items that are roughly aligned horizontally with dragged item
          const yDiff = Math.abs(item.y - draggedItem.y);
          if (yDiff > item.size) return false;

          // Check if item is directly against a wall
          const radius = item.size / 2;
          const currentContainerWidth = containerRef.current?.clientWidth || window.innerWidth;
          const atLeftWall = item.x - radius <= 1;
          const atRightWall = item.x + radius >= currentContainerWidth - 1;

          // Check if we're pushing towards this wall
          if ((atLeftWall && movingLeft) || (atRightWall && movingRight)) {
            // Check if this item is connected in a chain to our dragged item
            // by looking for items between them
            const xBetween = movingLeft
              ? item.x < draggedItem.x  // Item is to the left of dragged item
              : item.x > draggedItem.x; // Item is to the right of dragged item

            if (xBetween) {
              // Check if there's a continuous chain of items
              const itemsBetween = updatedItems.filter(i => {
                if (i.id === draggedItem.id || i.id === item.id) return false;

                const betweenX = movingLeft
                  ? i.x < draggedItem.x && i.x > item.x
                  : i.x > draggedItem.x && i.x < item.x;

                return betweenX && Math.abs(i.y - draggedItem.y) < item.size;
              });

              // If we have a chain long enough to connect, block movement
              // Number of items needed depends on distance
              const distance = Math.abs(draggedItem.x - item.x);
              const neededItems = Math.floor(distance / (item.size * 1.5));

              return itemsBetween.length >= Math.max(0, neededItems - 1);
            }
          }

          return false;
        });

        // If we've detected a wall-blocked chain
        if (wallBlocked) {
          // Instead of completely blocking movement, allow partial movement in the direction
          // This creates a more natural resistance when pushing against walls
          if (movingLeft) {
            // Allow some movement left but with increasing resistance
            const resistance = 0.85; // Higher means more resistance
            const allowedMove = (draggedItem.x - newX) * (1 - resistance);
            newX = draggedItem.x - allowedMove;
          } else if (movingRight) {
            // Allow some movement right but with increasing resistance
            const resistance = 0.85; // Higher means more resistance
            const allowedMove = (newX - draggedItem.x) * (1 - resistance);
            newX = draggedItem.x + allowedMove;
          }
        }

        // We want to prevent dragging the object below the counter
        // Calculate the minimum Y to keep the bottom edge at the counter top
        const itemRadius = draggedItem.size / 2;

        // Prevent dragging below the counter - the bottom edge of circle should not go below floorY
        newY = Math.min(newY, floorY - itemRadius);

        // Use the improved sliding collision detection
        const { x: finalX, y: finalY } = handleObjectCollisions(draggedItem, newX, newY, updatedItems);
        
        // Update only the dragged item with the new position
        return updatedItems.map(i => {
          if (i.id === id) {
            return {
              ...i,
              x: finalX,
              y: finalY,
              falling: false,
              dragging: true,
              isAgainstWall: isItemAgainstWall({ ...i, x: finalX, y: finalY })
            };
          }
          
          // Keep all other items as they are
          return i;
        });
      });
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

          // If the item is no longer falling, update its wall state
          const newState = {
            ...i,
            dragging: false,
            falling: shouldFall
          };
          
          // If the item just landed, check if it's against a wall
          if (!shouldFall) {
            newState.isAgainstWall = isItemAgainstWall(newState);
          }
          
          return newState;
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
      
      setItems(prevItems => {
        // First, mark which items are against walls
        const updatedItems = prevItems.map(item => ({
          ...item,
          isAgainstWall: isItemAgainstWall(item)
        }));

        // Find the item being dragged
        const draggedItem = updatedItems.find(i => i.id === id);
        if (!draggedItem) return prevItems;

        // Calculate new position
        let newX = startX + (touch.clientX - startTouchX);

        // Calculate new Y but enforce floor constraint - never allow below counter
        let newY = startY + (touch.clientY - startTouchY);

        // Check for objects against walls in chain
        // This prevents pushing past walls even with multiple objects in the chain
        const movingRight = newX > draggedItem.x;
        const movingLeft = newX < draggedItem.x;

        // Check if we're trying to push a line of objects that ends at a wall
        const wallBlocked = updatedItems.some(item => {
          // Skip the dragged item
          if (item.id === draggedItem.id) return false;

          // Only check items that are roughly aligned horizontally with dragged item
          const yDiff = Math.abs(item.y - draggedItem.y);
          if (yDiff > item.size) return false;

          // Check if item is directly against a wall
          const radius = item.size / 2;
          const currentContainerWidth = containerRef.current?.clientWidth || window.innerWidth;
          const atLeftWall = item.x - radius <= 1;
          const atRightWall = item.x + radius >= currentContainerWidth - 1;

          // Check if we're pushing towards this wall
          if ((atLeftWall && movingLeft) || (atRightWall && movingRight)) {
            // Check if this item is connected in a chain to our dragged item
            // by looking for items between them
            const xBetween = movingLeft
              ? item.x < draggedItem.x  // Item is to the left of dragged item
              : item.x > draggedItem.x; // Item is to the right of dragged item

            if (xBetween) {
              // Check if there's a continuous chain of items
              const itemsBetween = updatedItems.filter(i => {
                if (i.id === draggedItem.id || i.id === item.id) return false;

                const betweenX = movingLeft
                  ? i.x < draggedItem.x && i.x > item.x
                  : i.x > draggedItem.x && i.x < item.x;

                return betweenX && Math.abs(i.y - draggedItem.y) < item.size;
              });

              // If we have a chain long enough to connect, block movement
              // Number of items needed depends on distance
              const distance = Math.abs(draggedItem.x - item.x);
              const neededItems = Math.floor(distance / (item.size * 1.5));

              return itemsBetween.length >= Math.max(0, neededItems - 1);
            }
          }

          return false;
        });

        // If we've detected a wall-blocked chain
        if (wallBlocked) {
          // Instead of completely blocking movement, allow partial movement in the direction
          // This creates a more natural resistance when pushing against walls
          if (movingLeft) {
            // Allow some movement left but with increasing resistance
            const resistance = 0.85; // Higher means more resistance
            const allowedMove = (draggedItem.x - newX) * (1 - resistance);
            newX = draggedItem.x - allowedMove;
          } else if (movingRight) {
            // Allow some movement right but with increasing resistance
            const resistance = 0.85; // Higher means more resistance
            const allowedMove = (newX - draggedItem.x) * (1 - resistance);
            newX = draggedItem.x + allowedMove;
          }
        }

        // We want to prevent dragging the object below the counter
        // Calculate the minimum Y to keep the bottom edge at the counter top
        const itemRadius = draggedItem.size / 2;

        // Prevent dragging below the counter - the bottom edge of circle should not go below floorY
        newY = Math.min(newY, floorY - itemRadius);

        // Use the improved sliding collision detection
        const { x: finalX, y: finalY } = handleObjectCollisions(draggedItem, newX, newY, updatedItems);
        
        // Update only the dragged item with the new position
        return updatedItems.map(i => {
          if (i.id === id) {
            return {
              ...i,
              x: finalX,
              y: finalY,
              falling: false,
              dragging: true,
              isAgainstWall: isItemAgainstWall({ ...i, x: finalX, y: finalY })
            };
          }
          
          // Keep all other items as they are
          return i;
        });
      });
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

          // If the item is no longer falling, update its wall state
          const newState = {
            ...i,
            dragging: false,
            falling: shouldFall
          };
          
          // If the item just landed, check if it's against a wall
          if (!shouldFall) {
            newState.isAgainstWall = isItemAgainstWall(newState);
          }
          
          return newState;
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
  
  // Debug: Log item positions when they change
  useEffect(() => {
    if (items.length > 0) {
      console.log('Items positions:', items.slice(0, 3).map(i => ({
        id: i.id,
        x: Math.round(i.x),
        y: Math.round(i.y),
        falling: i.falling,
        hasImage: !!i.imageUrl,
        imageError: i.hasImageError
      })));
    }
  }, [items]);

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
            backgroundColor: 'transparent',
            border: '3px solid #fff',
            boxShadow: item.dragging
              ? '0 0 20px rgba(255,255,255,0.5)'
              : '2px 2px 10px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transform: 'translate(-50%, -50%)',
            animationName: animationState === 'jiggle'
                          ? (animationDirection === 1 ? 'jiggleRightAnim' : 'jiggleLeftAnim')
                          : animationState === 'swipe'
                          ? (animationDirection === 1 ? 'swipeLeftAnim' : 'swipeRightAnim')
                          : animationState === 'slideIn'
                          ? (animationDirection === 1 ? 'slideInFromRightAnim' : 'slideInFromLeftAnim')
                          : 'none',
            animationDuration: animationState === 'jiggle' ? '0.3s' :
                              animationState === 'swipe' ? '0.5s' :
                              animationState === 'slideIn' ? '0.8s' :
                              '0s',
            animationTimingFunction: animationState === 'jiggle' ? 'cubic-bezier(0.25, 1, 0.5, 1.3)' :
                                    animationState === 'swipe' ? 'cubic-bezier(0.33, 0.1, 0.67, 0.9)' :
                                    animationState === 'slideIn' ? 'cubic-bezier(0.16, 1, 0.3, 1)' :
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
          {/* Display the image if available (including placeholder) */}
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%'
              }}
              onLoad={() => handleImageLoad(item.id)}
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
      
      {/* Loading indicator with debug information - shown while waiting for counter */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 40000
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

      {/* Image loading indicator - shown while images are loading */}
      {shouldShowLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 40000
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            <p style={{ color: 'white', fontWeight: 500, fontSize: '18px' }}>
              Loading images...
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginTop: '0.5rem' }}>
              {imagesLoaded} / {totalImages.current}
            </p>
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

        /* Slide in animations (entrance when returning to slide) */
        @keyframes slideInFromRightAnim {
          0% {
            transform: translate(-50%, -50%) translateX(1200px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translateX(0) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes slideInFromLeftAnim {
          0% {
            transform: translate(-50%, -50%) translateX(-1200px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translateX(0) rotate(0deg);
            opacity: 1;
          }
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