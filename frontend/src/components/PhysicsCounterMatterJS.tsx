import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { PHYSICS_CONSTANTS, getCounterFloorPosition } from '../utils/constants';
import { getIngredientImageUrl, getEquipmentImageUrl } from './AnimationLibrary';
import { API_URL } from '../config';

// Helper function to convert relative URLs to absolute
const toAbsoluteUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
};

// Store random offsets per item to keep animations consistent
const itemOffsets: Record<string, { jiggle: number, jiggleRotate: number, swipe: number, swipeRotate: number }> = {};

// Cache for fetched image URLs to prevent re-fetching
const imageUrlCache: Record<string, string> = {};

// Cache for analyzed image bounds to prevent re-analyzing
const imageBoundsCache: Record<string, {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  scaleX: number;
  scaleY: number;
}> = {};

// Function to get consistent random values for an item
const getItemOffsets = (id: string) => {
  if (!itemOffsets[id]) {
    itemOffsets[id] = {
      jiggle: 20 + (Math.random() * 15),
      jiggleRotate: Math.random() * 10 - 5,
      swipe: -1000 - (Math.random() * 500),
      swipeRotate: Math.random() * 15 - 7.5
    };
  }
  return itemOffsets[id];
};

// Function to generate a consistent color from a string
const getColorFromString = (str: string, type: 'ingredient' | 'equipment' = 'ingredient'): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hueOffset = type === 'ingredient' ? 0 : 180;
  const hue = Math.abs(hash % 360) + hueOffset;
  const saturation = 70 + (hash % 20);
  const lightness = 45 + (hash % 15);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Shape approximation system
type ShapeType = 'circle' | 'rectangle' | 'hexagon' | 'triangle';

interface ShapeDefinition {
  type: ShapeType;
  widthRatio?: number; // For rectangles: width/height ratio (default 1)
}

// Map item names to shape approximations
const getShapeForItem = (name: string, type: 'ingredient' | 'equipment'): ShapeDefinition => {
  const nameLower = name.toLowerCase();

  // Equipment shapes
  if (type === 'equipment') {
    // Long/thin items - rectangles
    if (nameLower.includes('spoon') || nameLower.includes('spatula') ||
        nameLower.includes('knife') || nameLower.includes('fork') ||
        nameLower.includes('whisk') || nameLower.includes('chopstick')) {
      return { type: 'rectangle', widthRatio: 0.3 }; // Thin and long
    }

    // Square/rectangular items
    if (nameLower.includes('pan') || nameLower.includes('pot') ||
        nameLower.includes('bowl') || nameLower.includes('plate') ||
        nameLower.includes('tray') || nameLower.includes('cutting board')) {
      return { type: 'rectangle', widthRatio: 1.2 }; // Slightly wide
    }

    // Default for equipment - hexagon (looks good for most things)
    return { type: 'hexagon' };
  }

  // Ingredient shapes
  // Round items - circles
  if (nameLower.includes('tomato') || nameLower.includes('onion') ||
      nameLower.includes('orange') || nameLower.includes('lemon') ||
      nameLower.includes('lime') || nameLower.includes('apple') ||
      nameLower.includes('ball') || nameLower.includes('egg') ||
      nameLower.includes('pea') || nameLower.includes('berry')) {
    return { type: 'circle' };
  }

  // Rectangular items
  if (nameLower.includes('tofu') || nameLower.includes('butter') ||
      nameLower.includes('cheese') || nameLower.includes('bread')) {
    return { type: 'rectangle', widthRatio: 1.0 };
  }

  // Triangular items
  if (nameLower.includes('wedge') || nameLower.includes('slice')) {
    return { type: 'triangle' };
  }

  // Default for ingredients - hexagon (nice organic look)
  return { type: 'hexagon' };
};

// Create Matter.js body based on shape definition
const createBodyForShape = (
  x: number,
  y: number,
  size: number,
  shape: ShapeDefinition,
  label: string
): Matter.Body => {
  const options = {
    restitution: 0.3, // Bounce
    friction: 0.5, // Surface friction
    density: 0.001, // Very light
    frictionAir: 0.05, // Air resistance - makes items slow down when thrown
    label
  };

  // Reduce body size by 20% to account for transparent padding in images
  const bodyScale = 0.75;

  switch (shape.type) {
    case 'circle':
      return Matter.Bodies.circle(x, y, (size / 2) * bodyScale, options);

    case 'rectangle': {
      const ratio = shape.widthRatio || 1.0;
      const width = size * ratio * bodyScale;
      const height = size * bodyScale;
      return Matter.Bodies.rectangle(x, y, width, height, options);
    }

    case 'hexagon': {
      const radius = (size / 2) * bodyScale;
      return Matter.Bodies.polygon(x, y, 6, radius, options);
    }

    case 'triangle': {
      const radius = (size / 2) * bodyScale;
      return Matter.Bodies.polygon(x, y, 3, radius, options);
    }

    default:
      return Matter.Bodies.circle(x, y, (size / 2) * bodyScale, options);
  }
};

// Function to analyze image and detect visible bounds (removes transparent padding)
const analyzeImageBounds = (img: HTMLImageElement): {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  scaleX: number;
  scaleY: number;
} => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { cropX: 0, cropY: 0, cropWidth: canvas.width, cropHeight: canvas.height, scaleX: 1, scaleY: 1 };
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  // Find bounds of non-transparent pixels
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const alpha = pixels[index + 3];

      if (alpha > 20) { // Consider pixels with alpha > 20 as visible
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no visible pixels found, return full image
  if (minX > maxX || minY > maxY) {
    return { cropX: 0, cropY: 0, cropWidth: canvas.width, cropHeight: canvas.height, scaleX: 1, scaleY: 1 };
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;

  return {
    cropX: minX,
    cropY: minY,
    cropWidth,
    cropHeight,
    scaleX: cropWidth / canvas.width,
    scaleY: cropHeight / canvas.height
  };
};

interface Item {
  id: string;
  name: string;
  type: 'ingredient' | 'equipment';
  size: number;
  color: string;
  imageUrl?: string;
  hasImageError?: boolean;
  body?: Matter.Body; // Matter.js body reference
  shape: ShapeDefinition; // Store shape definition for rendering
  imageBounds?: { // Store analyzed image bounds for cropping
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    scaleX: number;
    scaleY: number;
  };
}

interface PhysicsCounterProps {
  ingredients: { name: string; url?: string; imageUrl?: string }[];
  equipment: { name: string; url?: string; imageUrl?: string }[];
  onSlideChange?: (direction?: 1 | -1) => void;
  isVisible?: boolean;
  useAllItems?: boolean;
}

const PhysicsCounterMatterJS = React.forwardRef<{
  exitAnimation: (direction?: 1 | -1) => void,
  exitAnimationNext: () => void,
  exitAnimationPrev: () => void
}, PhysicsCounterProps>(({ ingredients, equipment, onSlideChange, isVisible = true, useAllItems = false }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const groundBodyRef = useRef<Matter.Body | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const hasInitializedRef = useRef(false);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const totalImages = useRef(0);
  const [floorY, setFloorY] = useState(0);
  const prevFloorYRef = useRef(0);
  const [resetTrigger, setResetTrigger] = useState(0); // Add reset trigger

  // Items state - stores metadata alongside Matter.js bodies
  const [items, setItems] = useState<Item[]>([]);

  // Track hover state for showing name
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Animation state for slide transition
  const [animationState, setAnimationState] = useState<'none' | 'jiggle' | 'swipe' | 'slideIn'>('none');
  const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);

  // Track previous visibility
  const prevVisibleRef = useRef(isVisible);
  const lastExitDirectionRef = useRef<1 | -1 | null>(null);

  // Use the getCounterFloorPosition function from constants.ts
  useEffect(() => {
    const updateFloorPosition = () => {
      try {
        const viewportHeight = window.innerHeight;
        let calculatedFloorY = getCounterFloorPosition(viewportHeight);

        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const containerTop = containerRect.top;
          const containerHeight = containerRect.height;

          const counterElement = document.getElementById('kitchen-counter-texture');
          if (counterElement) {
            const counterRect = counterElement.getBoundingClientRect();
            calculatedFloorY = counterRect.top - containerTop;
          } else {
            calculatedFloorY = containerHeight * 0.75;
          }
        }

        const floorDiff = Math.abs(calculatedFloorY - prevFloorYRef.current);
        if (floorDiff > 1) {
          console.log('Setting floorY to:', calculatedFloorY);
          prevFloorYRef.current = calculatedFloorY;
          setFloorY(calculatedFloorY);
        }
        setIsLoading(false);
      } catch (error) {
        console.warn('Counter not ready yet:', error);
        setIsLoading(true);
      }
    };

    window.addEventListener('resize', updateFloorPosition);

    const observer = new MutationObserver(() => {
      if (document.getElementById('kitchen-counter-texture')) {
        updateFloorPosition();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (document.getElementById('kitchen-counter-texture')) {
      updateFloorPosition();
    }

    return () => {
      window.removeEventListener('resize', updateFloorPosition);
      observer.disconnect();
    };
  }, []);

  // Get container dimensions
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

  // Initialize Matter.js physics engine
  useEffect(() => {
    if (!containerRef.current || containerSize.width === 0) {
      return;
    }

    console.log('Initializing Matter.js engine');

    // Create engine
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.004 } // Much faster gravity
    });
    engineRef.current = engine;

    // Create ground (floor) - much thicker and positioned to prevent items falling through
    const ground = Matter.Bodies.rectangle(
      containerSize.width / 2,
      containerSize.height, // Initial position, will be updated by floorY effect
      containerSize.width * 2, // Extra wide to catch items
      200, // Much thicker floor
      {
        isStatic: true,
        label: 'ground',
        render: { visible: false }
      }
    );
    groundBodyRef.current = ground;

    // Create walls - much thicker and positioned to prevent items escaping
    const leftWall = Matter.Bodies.rectangle(
      -100,
      containerSize.height / 2,
      200, // Thick wall
      containerSize.height * 2, // Extra tall to catch flying items
      {
        isStatic: true,
        label: 'leftWall',
        render: { visible: false }
      }
    );

    const rightWall = Matter.Bodies.rectangle(
      containerSize.width + 100,
      containerSize.height / 2,
      200, // Thick wall
      containerSize.height * 2, // Extra tall to catch flying items
      {
        isStatic: true,
        label: 'rightWall',
        render: { visible: false }
      }
    );

    // Add boundaries to world
    Matter.Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Create mouse constraint for dragging (canvas-less)
    const mouse = Matter.Mouse.create(containerRef.current);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });
    mouseConstraintRef.current = mouseConstraint;
    Matter.Composite.add(engine.world, mouseConstraint);

    // Limit throwing velocity - clamp max speed when releasing items
    Matter.Events.on(mouseConstraint, 'enddrag', (event: any) => {
      const body = event.body;
      if (!body) return;

      const maxVelocity = 8; // Maximum throw speed (lower = slower throws)

      // Clamp velocity
      const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
      if (speed > maxVelocity) {
        const scale = maxVelocity / speed;
        Matter.Body.setVelocity(body, {
          x: body.velocity.x * scale,
          y: body.velocity.y * scale
        });
      }
    });

    // Keep canvas element updated for mouse tracking
    const mouseAny = mouse as any;
    mouse.element.removeEventListener("mousewheel", mouseAny.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouseAny.mousewheel);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    if (isVisible) {
      Matter.Runner.run(runner, engine);
    }

    // Force re-render on each engine update
    Matter.Events.on(engine, 'afterUpdate', () => {
      // Prevent dragging items below the floor
      if (mouseConstraintRef.current && mouseConstraintRef.current.body) {
        const body = mouseConstraintRef.current.body;
        if (body.position.y > floorY - 40) {
          Matter.Body.setPosition(body, {
            x: body.position.x,
            y: floorY - 40
          });
          // Stop downward velocity when hitting floor constraint
          if (body.velocity.y > 0) {
            Matter.Body.setVelocity(body, {
              x: body.velocity.x,
              y: 0
            });
          }
        }
      }

      // Trigger React re-render by updating items
      setItems(prevItems => [...prevItems]);
    });

    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      groundBodyRef.current = null;
    };
  }, [containerSize.width, containerSize.height]);

  useEffect(() => {
    if (!runnerRef.current || !engineRef.current) return;

    if (isVisible) {
      Matter.Runner.run(runnerRef.current, engineRef.current);
    } else {
      Matter.Runner.stop(runnerRef.current);
    }
  }, [isVisible]);

  // Update ground position when floorY changes
  useEffect(() => {
    if (groundBodyRef.current && floorY > 0) {
      console.log('Updating ground position to:', floorY + 100);
      Matter.Body.setPosition(groundBodyRef.current, {
        x: groundBodyRef.current.position.x,
        y: floorY + 100
      });
    }
  }, [floorY]);

  // Initialize items
  useEffect(() => {
    if (hasInitializedRef.current && resetTrigger === 0) return;
    if (!isVisible) return;
    if (!engineRef.current || containerSize.width === 0 || floorY <= 0) return;

    console.log('Initializing items with Matter.js');
    console.log(`PhysicsCounter received ${ingredients.length} ingredients and ${equipment.length} equipment`);
    console.log('Ingredients:', ingredients);
    console.log('Equipment:', equipment);
    console.log('Container size:', containerSize);
    console.log('Floor Y:', floorY);
    hasInitializedRef.current = true;

    const initializeItems = async () => {
      const allItems: Item[] = [];
      let totalImageCount = 0;
      const itemsPerRow = Math.max(3, Math.floor(containerSize.width / 100));

      // Add ingredients
      for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        const col = i % itemsPerRow;
        const row = Math.floor(i / itemsPerRow);
        const spacing = containerSize.width / (itemsPerRow + 1);
        const x = spacing * (col + 1);
        const y = -100 - (40 * row);
        const size = 80;

        // Fetch image URL from database or cache
        let imageUrl = toAbsoluteUrl(ingredient.url || ingredient.imageUrl);
        if (!imageUrl && ingredient.name) {
          // Check cache first
          const cacheKey = `ingredient-${ingredient.name}`;
          if (imageUrlCache[cacheKey]) {
            imageUrl = imageUrlCache[cacheKey];
            console.log(`📦 PhysicsCounter: Using cached URL for ingredient: ${ingredient.name}`);
          } else {
            console.log(`🔍 PhysicsCounter: Fetching URL for ingredient: ${ingredient.name}`);
            const fetchedUrl = await getIngredientImageUrl(ingredient.name);
            imageUrl = fetchedUrl || undefined;
            // Cache the result
            if (fetchedUrl) {
              imageUrlCache[cacheKey] = fetchedUrl;
            }
          }
        }

        if (!imageUrl) {
          imageUrl = 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png';
        }

        if (imageUrl) totalImageCount++;

        // Determine shape based on ingredient name
        const shape = getShapeForItem(ingredient.name, 'ingredient');

        // Create Matter.js body with appropriate shape
        const body = createBodyForShape(x, y, size, shape, `ingredient-${i}`);

        Matter.Composite.add(engineRef.current!.world, body);

        allItems.push({
          id: `ingredient-${i}`,
          name: ingredient.name,
          type: 'ingredient',
          size,
          color: getColorFromString(ingredient.name, 'ingredient'),
          imageUrl,
          hasImageError: false,
          body,
          shape
        });
      }

      // Add equipment
      for (let i = 0; i < equipment.length; i++) {
        const equip = equipment[i];
        const col = i % itemsPerRow;
        const row = Math.floor(i / itemsPerRow);
        const spacing = containerSize.width / (itemsPerRow + 1);
        const x = containerSize.width - (spacing * (col + 1));
        const y = -100 - (40 * row);
        const size = 90;

        // Fetch image URL from database or cache
        let imageUrl = toAbsoluteUrl(equip.url || equip.imageUrl);
        if (!imageUrl && equip.name) {
          // Check cache first
          const cacheKey = `equipment-${equip.name}`;
          if (imageUrlCache[cacheKey]) {
            imageUrl = imageUrlCache[cacheKey];
            console.log(`📦 PhysicsCounter: Using cached URL for equipment: ${equip.name}`);
          } else {
            console.log(`🔍 PhysicsCounter: Fetching URL for equipment: ${equip.name}`);
            const fetchedUrl = await getEquipmentImageUrl(equip.name);
            imageUrl = fetchedUrl || undefined;
            // Cache the result
            if (fetchedUrl) {
              imageUrlCache[cacheKey] = fetchedUrl;
            }
          }
        }

        if (!imageUrl) {
          imageUrl = 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_equipment.png';
        }

        if (imageUrl) totalImageCount++;

        // Determine shape based on equipment name
        const shape = getShapeForItem(equip.name, 'equipment');

        // Create Matter.js body with appropriate shape
        const body = createBodyForShape(x, y, size, shape, `equipment-${i}`);

        Matter.Composite.add(engineRef.current!.world, body);

        allItems.push({
          id: `equipment-${i}`,
          name: equip.name,
          type: 'equipment',
          size,
          color: getColorFromString(equip.name, 'equipment'),
          imageUrl,
          hasImageError: false,
          body,
          shape
        });
      }

      totalImages.current = totalImageCount;
      setItems(allItems);
    };

    initializeItems();
  }, [ingredients, equipment, containerSize.width, floorY, isVisible, resetTrigger]);

  // Handle image loading
  const handleImageError = (id: string) => {
    console.log(`Image loading error for item: ${id}`);
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const placeholderUrl = item.type === 'ingredient'
            ? 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png'
            : 'https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_equipment.png';
          return { ...item, hasImageError: true, imageUrl: placeholderUrl };
        }
        return item;
      })
    );
    setImagesLoaded(prev => prev + 1);
  };

  const handleImageLoad = (id: string, img: HTMLImageElement) => {
    console.log(`Image loaded successfully for item: ${id}`);

    // Check if bounds are already cached
    const cacheKey = img.src;
    let bounds = imageBoundsCache[cacheKey];

    if (!bounds) {
      // Analyze image bounds to detect transparent areas (only if not cached)
      try {
        bounds = analyzeImageBounds(img);
        console.log(`Analyzed bounds for ${id}:`, bounds);
        // Cache the analyzed bounds
        imageBoundsCache[cacheKey] = bounds;
      } catch (error) {
        console.warn(`Failed to analyze image bounds for ${id}:`, error);
        setImagesLoaded(prev => prev + 1);
        return;
      }
    } else {
      console.log(`Using cached bounds for ${id}`);
    }

    // Update item with bounds information AND resize the physics body
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id && item.body && engineRef.current) {
          // Calculate the scale factor based on actual visible content
          const avgScale = Math.min(bounds.scaleX, bounds.scaleY);

          // Only update if there's significant transparent padding (scale < 0.9)
          if (avgScale < 0.9 && !item.imageBounds) {
            console.log(`Resizing physics body for ${id} with scale: ${avgScale}`);

            // Remove old body
            Matter.Composite.remove(engineRef.current.world, item.body);

            // Create new body with adjusted size
            const adjustedSize = item.size * avgScale;
            const newBody = createBodyForShape(
              item.body.position.x,
              item.body.position.y,
              adjustedSize / 0.75, // Compensate for the 0.75 bodyScale already applied
              item.shape,
              item.id
            );

            // Preserve velocity
            Matter.Body.setVelocity(newBody, item.body.velocity);
            Matter.Body.setAngularVelocity(newBody, item.body.angularVelocity);

            // Add new body to world
            Matter.Composite.add(engineRef.current.world, newBody);

            return { ...item, imageBounds: bounds, body: newBody };
          }

          return { ...item, imageBounds: bounds };
        }
        return item;
      })
    );

    setImagesLoaded(prev => prev + 1);
  };

  // Function to start the exit animation
  const startExitAnimation = (direction: 1 | -1 = 1) => {
    lastExitDirectionRef.current = direction;
    console.log('Starting exit animation with direction:', direction);
    setAnimationState('none');
    setAnimationDirection(direction);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimationState('jiggle');

        setTimeout(() => {
          setAnimationState('swipe');

          setTimeout(() => {
            if (onSlideChange) {
              onSlideChange(direction);
            }
          }, 600);
        }, 300);
      });
    });
  };

  // Make animation callable from parent
  React.useImperativeHandle(
    ref,
    () => ({
      exitAnimation: startExitAnimation,
      exitAnimationNext: () => startExitAnimation(1),
      exitAnimationPrev: () => startExitAnimation(-1)
    }),
    [startExitAnimation]
  );

  // Handle entrance animation
  useEffect(() => {
    const wasHidden = !prevVisibleRef.current;
    const isNowVisible = isVisible;

    if (wasHidden && isNowVisible) {
      // Always slide in, default to sliding from right if no previous direction
      const entranceDirection = lastExitDirectionRef.current !== null
        ? (lastExitDirectionRef.current === 1 ? -1 : 1)
        : 1; // Default: slide in from right

      setAnimationState('slideIn');
      setAnimationDirection(entranceDirection);

      setTimeout(() => {
        setAnimationState('none');
      }, 800);
    }

    prevVisibleRef.current = isVisible;
  }, [isVisible]);

  const shouldShowLoading = !isLoading && totalImages.current > 0 && imagesLoaded < totalImages.current;

  // Determine animation class based on state
  const getAnimationStyle = () => {
    if (animationState === 'jiggle') {
      return animationDirection === 1 ? 'jiggleRightAnim' : 'jiggleLeftAnim';
    } else if (animationState === 'swipe') {
      return animationDirection === 1 ? 'swipeLeftAnim' : 'swipeRightAnim';
    } else if (animationState === 'slideIn') {
      return animationDirection === 1 ? 'slideInFromRightAnim' : 'slideInFromLeftAnim';
    }
    return '';
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
        pointerEvents: 'auto', // Enable dragging - container is fixed position so it needs pointer events
        animationName: getAnimationStyle(),
        animationDuration: animationState === 'jiggle' ? '0.3s' :
                          animationState === 'swipe' ? '0.5s' :
                          animationState === 'slideIn' ? '0.8s' : '0s',
        animationTimingFunction: animationState === 'jiggle' ? 'cubic-bezier(0.25, 1, 0.5, 1.3)' :
                                animationState === 'swipe' ? 'cubic-bezier(0.33, 0.1, 0.67, 0.9)' :
                                animationState === 'slideIn' ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'ease-out',
        animationFillMode: 'forwards'
      }}
    >
      {/* Reset button - same style as close button */}
      <button
        onClick={() => {
          // Reset all item positions by removing and re-adding them
          if (engineRef.current && items.length > 0) {
            console.log('Resetting items...');

            // Remove all bodies except walls and ground
            const bodiesToRemove = items.map(item => item.body).filter(Boolean) as Matter.Body[];
            Matter.Composite.remove(engineRef.current.world, bodiesToRemove);

            // Clear items and reset image loading counter
            setItems([]);
            setImagesLoaded(0);

            // Reset the initialization flag and trigger re-initialization
            hasInitializedRef.current = false;
            setResetTrigger(prev => prev + 1);
          }
        }}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
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
          fontSize: '20px',
          color: '#333',
          pointerEvents: 'auto'
        }}
        aria-label="Reset items"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.8273 3 17.35 4.30367 19 6.34267" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M19 3V6.5H15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Loading overlay - white with green text */}
      {imagesLoaded < totalImages.current && totalImages.current > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            zIndex: 60000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto'
          }}
        >
          <div style={{
            fontSize: '1.5rem',
            color: '#22c55e',
            fontWeight: 'bold'
          }}>
            Loading ingredients...
          </div>
        </div>
      )}

      {/* Items rendered as divs that sync with Matter.js bodies */}
      {items.map(item => {
        if (!item.body) return null;

        const { x, y } = item.body.position;
        const angle = item.body.angle;

        // Calculate display dimensions based on shape
        let displayWidth = item.size;
        let displayHeight = item.size;

        if (item.shape.type === 'rectangle') {
          const ratio = item.shape.widthRatio || 1.0;
          displayWidth = item.size * ratio;
          displayHeight = item.size;
        }

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: displayWidth,
              height: displayHeight,
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
              transform: `translate(-50%, -50%) rotate(${angle}rad)`,
              zIndex: 25000,
              userSelect: 'none',
              touchAction: 'none',
              pointerEvents: 'none', // Items don't need pointer events - Matter.js handles via container
              transition: 'none'
            }}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                crossOrigin="anonymous"
                style={{
                  width: item.imageBounds ? `${100 / item.imageBounds.scaleX}%` : '100%',
                  height: item.imageBounds ? `${100 / item.imageBounds.scaleY}%` : '100%',
                  objectFit: 'contain',
                  objectPosition: item.imageBounds
                    ? `${-item.imageBounds.cropX / item.imageBounds.cropWidth * 100}% ${-item.imageBounds.cropY / item.imageBounds.cropHeight * 100}%`
                    : 'center'
                }}
                onLoad={(e) => handleImageLoad(item.id, e.currentTarget)}
                onError={() => handleImageError(item.id)}
              />
            )}

            {hoveredItem === item.id && (
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
                  zIndex: 30001,
                  pointerEvents: 'none'
                }}
              >
                {item.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Loading indicators */}
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
          <div style={{ textAlign: 'center' }}>
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
        </div>
      )}

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
          0% { transform: translateX(0); }
          65% { transform: translateX(30px); }
          85% { transform: translateX(25px); }
          100% { transform: translateX(28px); }
        }

        @keyframes swipeLeftAnim {
          0% { transform: translateX(28px); }
          100% { transform: translateX(-1200px); opacity: 0; }
        }

        /* Previous slide animations (left to right) */
        @keyframes jiggleLeftAnim {
          0% { transform: translateX(0); }
          65% { transform: translateX(-30px); }
          85% { transform: translateX(-25px); }
          100% { transform: translateX(-28px); }
        }

        @keyframes swipeRightAnim {
          0% { transform: translateX(-28px); }
          100% { transform: translateX(1200px); opacity: 0; }
        }

        /* Slide in animations (entrance when returning to slide) */
        @keyframes slideInFromRightAnim {
          0% {
            transform: translateX(1200px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInFromLeftAnim {
          0% {
            transform: translateX(-1200px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
});

export default PhysicsCounterMatterJS;
