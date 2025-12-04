// Placeholder for utility functions
export const TILE_SIZE = 32;

export function getGridCoords(x, y) {
    return {
        x: Math.floor(x / TILE_SIZE),
        y: Math.floor(y / TILE_SIZE)
    };
}
