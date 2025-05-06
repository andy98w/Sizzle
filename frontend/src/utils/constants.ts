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
  // Fall speed range (random value between MIN and MAX) - increased for faster falling
  MIN_FALL_SPEED: 2.5,
  MAX_FALL_SPEED: 5.5,
  
  // Acceleration multiplier per animation frame - increased for faster acceleration
  FALL_ACCELERATION: 1.05,
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