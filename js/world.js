import { TILE_SIZE, getGridCoords } from './utils.js';

export class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = new Map(); // Key: "x,y", Value: resource type
        this.generate();
    }

    generate() {
        // Simple procedural generation
        // Patches of ore
        this.generatePatch('iron-ore', 10, 10, 5, 20);
        this.generatePatch('copper-ore', 25, 10, 4, 15);
        this.generatePatch('coal', 10, 25, 4, 20);
        this.generatePatch('stone', 25, 25, 3, 10);
    }

    generatePatch(type, centerX, centerY, radius, density) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                const dist = Math.sqrt((x - centerX)**2 + (y - centerY)**2);
                if (dist < radius) {
                    if (Math.random() * radius > dist * 0.5) { // Noisy edge
                         this.tiles.set(`${x},${y}`, type);
                    }
                }
            }
        }
    }

    getResource(gridX, gridY) {
        return this.tiles.get(`${gridX},${gridY}`);
    }

    draw(ctx, camera) {
        // Draw visible tiles
        // Calculate visible range
        const startX = Math.floor(camera.x / TILE_SIZE);
        const endX = startX + Math.ceil(ctx.canvas.width / TILE_SIZE) + 1;
        const startY = Math.floor(camera.y / TILE_SIZE);
        const endY = startY + Math.ceil(ctx.canvas.height / TILE_SIZE) + 1;

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const res = this.tiles.get(`${x},${y}`);
                if (res) {
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;

                    // Colors
                    if (res === 'iron-ore') ctx.fillStyle = 'rgba(70, 130, 180, 0.5)'; // SteelBlue
                    else if (res === 'copper-ore') ctx.fillStyle = 'rgba(184, 115, 51, 0.5)'; // Copper
                    else if (res === 'coal') ctx.fillStyle = 'rgba(20, 20, 20, 0.5)'; // Black
                    else if (res === 'stone') ctx.fillStyle = 'rgba(136, 140, 141, 0.5)'; // Stone

                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                    // Texture detail (dots)
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(px + TILE_SIZE/4, py + TILE_SIZE/4, TILE_SIZE/2, TILE_SIZE/2);
                }
            }
        }
    }
}
