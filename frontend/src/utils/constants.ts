// Global application constants

// Kitchen layout configuration
export const KITCHEN_CONSTANTS = {
  // The counter height is 25vh from the bottom
  COUNTER_HEIGHT_PERCENTAGE: 25,
  
  // The percentage of the viewport height where the counter begins
  // 75% from top (100% - 25% counter height)
  COUNTER_TOP_PERCENTAGE: 75,
  
  // The percentage of viewport height where objects should land
  // Updated to match the counter top exactly
  FLOOR_PERCENTAGE: 75,
  
  // Objects should be offset from the floor by a few pixels so they appear to rest ON the counter
  // This is how many pixels to move up from the boundary
  OBJECT_OFFSET_FROM_FLOOR: 0,
  
  // Border sizes and visual dimensions
  WOOD_GRAIN_SIZE: '50px',
  
  // Counter color configuration 
  COUNTER_COLOR: '#d4a76a',
  WOOD_GRAIN_COLOR: 'rgba(0, 0, 0, 0.05)',
};

// Physics configuration
export const PHYSICS_CONSTANTS = {
  // Fall speed range (random value between MIN and MAX) - further increased for faster falling
  MIN_FALL_SPEED: 4.0,
  MAX_FALL_SPEED: 7.5,

  // Acceleration multiplier per animation frame - further increased for faster acceleration
  FALL_ACCELERATION: 1.08,

  // Collision physics
  COLLISION_DAMPING: 0.55,        // Energy lost in collisions (lower = more energy lost)
  FRICTION: 0.7,                  // Surface friction for objects in air
  FLOOR_FRICTION: 0.4,            // Even stronger friction for objects touching the floor (lower = more friction)
  INITIAL_IMPACT_FRICTION: 0.3,   // Extra strong friction applied on first floor impact to stop sliding
  MIN_COLLISION_SPEED: 0.05,      // Minimum speed to consider for collision
  MAX_COLLISION_SPEED: 12,        // Maximum speed cap after collision (reduced further)
  COLLISION_COOLDOWN: 50,         // Milliseconds before an object can collide again
  GRAVITY: 0.3,                   // Constant downward force

  // Moderated boundary enforcement parameters
  POSITION_CORRECTION: 0.95,      // Position correction strength (slightly under 1.0 to avoid overcompensation)
  COLLISION_ITERATIONS: 8,        // Number of collision resolution iterations per frame
  DRAGGING_ITERATIONS: 10,        // Number of iterations when dragging
  RESTITUTION: 0.12,              // Elasticity of collisions (reduced for less bouncy behavior)
  FLOOR_RESTITUTION: 0.08,        // Special lower elasticity for floor collisions
  PUSH_FACTOR: 0.6,               // Push factor for objects during drag
  EDGE_PUSH_FACTOR: 0.8,          // Push factor for edge collisions
  WALL_BOUNDARY_MARGIN: 5,        // Margin in pixels to detect if object is near a wall
  WALL_LOCK_STRENGTH: 0.9,        // Strength of wall stickiness when objects are against walls
  COMPOUND_COLLISION: true,       // Enable compound collision handling for wall interactions
  WALL_BUFFER: 3,                 // Extra buffer space near walls in pixels
  MOMENTUM_REFLECTION: 0.4,       // Amount of momentum reflected back when pushing object into wall
  WALL_OBJECT_SPACING: 2,         // Minimum space between objects at walls
  BOUNCE_VELOCITY_THRESHOLD: 2.5, // Minimum velocity needed for an object to bounce
  SLIDE_REDUCTION: 0.85,          // Additional multiplier to reduce sliding after landing
  
  // Boundary enforcement settings
  STRICT_BOUNDARY_ENFORCEMENT: true,  // Keep strict boundaries enabled
  MIN_OBJECT_SEPARATION: 4,           // Minimum separation between objects in pixels
  OVERLAP_CORRECTION_STRENGTH: 0.8,   // How strongly to correct overlapping objects
  PREDICTIVE_COLLISION_STEPS: 2,      // Number of steps to look ahead for collisions
  BOOST_SEPARATION_VELOCITY: 0.5      // Factor to boost separation velocity
};

// Export a function to calculate the exact top edge position of the counter
// This is the surface where objects should land
export function getCounterFloorPosition(viewportHeight: number): number {
  // Get the counter element position directly from the DOM
  const counterElement = document.getElementById('kitchen-counter-texture');
  
  if (!counterElement) {
    // If counter isn't in DOM yet, calculate the expected position
    // (this matches where the counter should be - at 75% of viewport height)
    return viewportHeight * 0.75;
  }
  
  // Get the exact top position of the counter element
  const counterRect = counterElement.getBoundingClientRect();
  const counterTop = counterRect.top;
  
  // Basic validation to prevent obviously wrong values
  if (counterTop <= 0 || counterTop >= viewportHeight) {
    return viewportHeight * 0.75; // Fall back to 75% of viewport height
  }
  
  return counterTop; // Return the exact top edge of the counter
}

// Function to get CSS variables for kitchen background
export function getKitchenCSSVariables(): Record<string, string> {
  return {
    '--counter-color': KITCHEN_CONSTANTS.COUNTER_COLOR,
    '--counter-height': `${KITCHEN_CONSTANTS.COUNTER_HEIGHT_PERCENTAGE}vh`,
    '--counter-top': `${KITCHEN_CONSTANTS.COUNTER_TOP_PERCENTAGE}vh`,
    '--floor-position': `${KITCHEN_CONSTANTS.FLOOR_PERCENTAGE}vh`,
    '--wood-grain-size': KITCHEN_CONSTANTS.WOOD_GRAIN_SIZE,
    '--wood-grain-color': KITCHEN_CONSTANTS.WOOD_GRAIN_COLOR,
  };
}