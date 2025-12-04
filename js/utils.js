// Placeholder for utility functions
const TILE_SIZE = 32;

function getGridCoords(x, y) {
    return {
        x: Math.floor(x / TILE_SIZE),
        y: Math.floor(y / TILE_SIZE)
    };
}
