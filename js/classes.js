class Entity {
    constructor(x, y, type) {
        this.x = x; // Grid X
        this.y = y; // Grid Y
        this.type = type;
        this.rotation = 0; // 0: Right, 1: Down, 2: Left, 3: Up
    }

    draw(ctx) {
        // To be implemented by subclasses
    }

    update(gameState, dt) {
        // To be implemented by subclasses
    }
}

class ConveyorBelt extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'belt');
        this.rotation = rotation;
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;

        ctx.fillStyle = '#555';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Draw arrow indicating direction
        ctx.strokeStyle = '#FFD700'; // Gold
        ctx.lineWidth = 2;
        ctx.beginPath();

        const cx = px + TILE_SIZE / 2;
        const cy = py + TILE_SIZE / 2;
        const r = TILE_SIZE / 3;

        // Save context to rotate
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation * Math.PI / 2);

        // Draw arrow pointing right (default 0)
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.lineTo(r - 5, -5);
        ctx.moveTo(r, 0);
        ctx.lineTo(r - 5, 5);

        ctx.stroke();
        ctx.restore();
    }
}

class Drill extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'drill');
        this.rotation = rotation;
        this.timer = 0;
        this.miningRate = 1.0; // seconds per item
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;

        ctx.fillStyle = '#8B4513'; // SaddleBrown
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Draw drill bit
        ctx.fillStyle = '#C0C0C0'; // Silver
        const center = TILE_SIZE / 2;
        ctx.beginPath();
        ctx.arc(px + center, py + center, TILE_SIZE / 4, 0, Math.PI * 2);
        ctx.fill();

        // Indicate output direction
        ctx.strokeStyle = '#FFA500'; // Orange
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(px + center, py + center);
        ctx.rotate(this.rotation * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(TILE_SIZE/2, 0);
        ctx.stroke();
        ctx.restore();
    }

    update(gameState, dt) {
        this.timer += dt;
        if (this.timer >= this.miningRate) {

            // Attempt to spawn item
            const outputCoords = this.getOutputCoords();

            // Only spawn if output tile is not occupied by another item (simple collision)
            // Or ideally, if output tile has a belt or furnace
            // For MVP: Check if an item is already at the center of the output tile
            const outputPixelX = outputCoords.x * TILE_SIZE + TILE_SIZE / 2;
            const outputPixelY = outputCoords.y * TILE_SIZE + TILE_SIZE / 2;

            const isBlocked = gameState.items.some(item => {
                const dx = item.x - outputPixelX;
                const dy = item.y - outputPixelY;
                return Math.sqrt(dx*dx + dy*dy) < TILE_SIZE / 2;
            });

            if (!isBlocked) {
                this.timer = 0;
                const item = new Item(outputCoords.x, outputCoords.y, 'ore');
                gameState.items.push(item);
            }
        }
    }

    getOutputCoords() {
        let ox = this.x;
        let oy = this.y;
        switch(this.rotation) {
            case 0: ox += 1; break;
            case 1: oy += 1; break;
            case 2: ox -= 1; break;
            case 3: oy -= 1; break;
        }
        return { x: ox, y: oy };
    }
}

class Furnace extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'furnace');
        this.rotation = rotation;
        this.smelting = false;
        this.smeltTimer = 0;
        this.smeltTime = 2.0; // seconds
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;

        ctx.fillStyle = '#A9A9A9'; // DarkGray
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Fire indication
        if (this.smelting) {
            ctx.fillStyle = '#FF4500'; // OrangeRed
            ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else {
            ctx.fillStyle = '#2F4F4F'; // DarkSlateGray
             ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
        }
    }

    startSmelting(gameState) {
        if (!this.smelting) {
            this.smelting = true;
            this.smeltTimer = 0;
        }
    }

    update(gameState, dt) {
        if (this.smelting) {
            this.smeltTimer += dt;
            if (this.smeltTimer >= this.smeltTime) {
                this.smelting = false;
                // Output plate
                // Spawn 'plate' item at current location (to be picked up by inserter or just appear)
                // MVP: Spawn it on the furnace tile, hopefully a belt is there or next to it?
                // Actually furnaces usually output to a neighbour.
                // Let's use rotation for output.

                // Determine output position
                // Logic: Similar to Drill, output to side.
                // Or: Furnace outputs to "front" (rotation) and inputs from "back"

                // For MVP: Spawn plate at center of furnace.
                // If there is a belt UNDER the furnace, it moves.
                // But usually furnaces are 2x2 or solid.
                // Let's assume for MVP: Output to "Front"

                let ox = this.x;
                let oy = this.y;
                switch(this.rotation) {
                    case 0: ox += 1; break;
                    case 1: oy += 1; break;
                    case 2: ox -= 1; break;
                    case 3: oy -= 1; break;
                }

                const item = new Item(ox, oy, 'plate');
                // Check collision at output
                 const outputPixelX = ox * TILE_SIZE + TILE_SIZE / 2;
                 const outputPixelY = oy * TILE_SIZE + TILE_SIZE / 2;

                 const isBlocked = gameState.items.some(i => {
                    const dx = i.x - outputPixelX;
                    const dy = i.y - outputPixelY;
                    return Math.sqrt(dx*dx + dy*dy) < TILE_SIZE / 2;
                 });

                 if (!isBlocked) {
                     gameState.items.push(item);
                 } else {
                     // Jammed? keep smelting flag true?
                     this.smelting = true; // Retry next frame
                 }
            }
        }
    }
}

class Item {
    constructor(x, y, type) {
        this.x = x * TILE_SIZE + TILE_SIZE / 2; // Pixel X (center of tile)
        this.y = y * TILE_SIZE + TILE_SIZE / 2; // Pixel Y (center of tile)
        this.type = type;
        this.stuck = false;
    }

    draw(ctx) {
        ctx.fillStyle = this.type === 'ore' ? '#4682B4' : '#FFFFFF'; // SteelBlue for Ore, White for Plate
        const r = 6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
