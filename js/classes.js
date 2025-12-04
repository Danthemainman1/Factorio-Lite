import { TILE_SIZE, getGridCoords } from './utils.js';
import { Inventory } from './inventory.js';
import { RECIPES, ITEMS } from './data.js';

export class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = 0;
        this.inputInventory = new Inventory(10);
        this.outputInventory = new Inventory(10);
    }

    draw(ctx) { }
    update(gameState, dt) { }
}

export class ConveyorBelt extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'belt');
        this.rotation = rotation;
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;

        ctx.fillStyle = '#555';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const cx = px + TILE_SIZE / 2;
        const cy = py + TILE_SIZE / 2;
        const r = TILE_SIZE / 3;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation * Math.PI / 2);

        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.lineTo(r - 5, -5);
        ctx.moveTo(r, 0);
        ctx.lineTo(r - 5, 5);

        ctx.stroke();
        ctx.restore();
    }
}

export class Drill extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'drill');
        this.rotation = rotation;
        this.timer = 0;
        this.miningRate = 1.0;
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#C0C0C0';
        const center = TILE_SIZE / 2;
        ctx.beginPath();
        ctx.arc(px + center, py + center, TILE_SIZE / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFA500';
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
            const tileRes = gameState.world ? gameState.world.getResource(this.x, this.y) : 'iron-ore';

            if (tileRes) {
                const outputCoords = this.getOutputCoords();
                const outputPixelX = outputCoords.x * TILE_SIZE + TILE_SIZE / 2;
                const outputPixelY = outputCoords.y * TILE_SIZE + TILE_SIZE / 2;

                const isBlocked = gameState.items.some(item => {
                    const dx = item.x - outputPixelX;
                    const dy = item.y - outputPixelY;
                    return Math.sqrt(dx*dx + dy*dy) < TILE_SIZE / 2;
                });

                if (!isBlocked) {
                    this.timer = 0;
                    const item = new Item(outputCoords.x, outputCoords.y, tileRes);
                    gameState.items.push(item);
                }
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

export class Inserter extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'inserter');
        this.rotation = rotation;
        this.armRotation = 0;
        this.state = 'idle';
        this.heldItem = null;
        this.speed = 3.0;
        this.targetAngle = 0;
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;
        const center = TILE_SIZE / 2;

        ctx.fillStyle = '#8B8000';
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);

        ctx.save();
        ctx.translate(px + center, py + center);
        ctx.rotate(this.rotation * Math.PI / 2);
        ctx.rotate(this.armRotation);

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-2, -5, 20, 10);

        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(20, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        if (this.heldItem) {
             const style = ITEMS[this.heldItem.type];
             ctx.fillStyle = style ? style.color : '#FFF';
             ctx.beginPath();
             ctx.arc(20, 0, 3, 0, Math.PI * 2);
             ctx.fill();
        }

        ctx.restore();
    }

    update(gameState, dt) {
        if (this.state === 'idle') {
            if (this.heldItem) {
                this.state = 'swinging_to_drop';
                this.targetAngle = 0;
            } else {
                this.state = 'swinging_to_pickup';
                this.targetAngle = Math.PI;
            }
        } else if (this.state === 'swinging_to_pickup') {
            if (this.rotateArmTo(this.targetAngle, dt)) {
                this.state = 'picking';
            }
        } else if (this.state === 'picking') {
            const pickupCoords = this.getCoordsRel(2);
            const entityKey = `${pickupCoords.x},${pickupCoords.y}`;
            const targetEntity = gameState.entityMap.get(entityKey);

            let picked = false;

            if (targetEntity) {
                const types = Object.keys(targetEntity.outputInventory.slots);
                if (types.length > 0) {
                    const type = types[0];
                    if (targetEntity.outputInventory.remove(type, 1)) {
                         this.heldItem = { type: type };
                         picked = true;
                    }
                }
            }

            if (!picked) {
                const cx = pickupCoords.x * TILE_SIZE + TILE_SIZE/2;
                const cy = pickupCoords.y * TILE_SIZE + TILE_SIZE/2;

                const itemIndex = gameState.items.findIndex(i => {
                    const d = Math.sqrt((i.x - cx)**2 + (i.y - cy)**2);
                    return d < 10 && !i.beingPickedUp;
                });

                if (itemIndex !== -1) {
                    const item = gameState.items[itemIndex];
                    this.heldItem = { type: item.type };
                    gameState.items.splice(itemIndex, 1);
                    picked = true;
                }
            }

            if (picked) {
                this.state = 'swinging_to_drop';
                this.targetAngle = 0;
            }

        } else if (this.state === 'swinging_to_drop') {
             if (this.rotateArmTo(this.targetAngle, dt)) {
                this.state = 'dropping';
            }
        } else if (this.state === 'dropping') {
            const dropCoords = this.getCoordsRel(0);
            const entityKey = `${dropCoords.x},${dropCoords.y}`;
            const targetEntity = gameState.entityMap.get(entityKey);

            let dropped = false;

            if (targetEntity) {
                targetEntity.inputInventory.add(this.heldItem.type, 1);
                dropped = true;
            } else {
                 const item = new Item(dropCoords.x, dropCoords.y, this.heldItem.type);
                 gameState.items.push(item);
                 dropped = true;
            }

            if (dropped) {
                this.heldItem = null;
                this.state = 'swinging_to_pickup';
                this.targetAngle = Math.PI;
            }
        }
    }

    rotateArmTo(target, dt) {
        if (Math.abs(this.armRotation - target) < 0.1) {
            this.armRotation = target;
            return true;
        }
        if (this.armRotation < target) this.armRotation += this.speed * dt;
        else this.armRotation -= this.speed * dt;
        return false;
    }

    getCoordsRel(dirOffset) {
        const effectiveRot = (this.rotation + dirOffset) % 4;
        let ox = this.x;
        let oy = this.y;
        switch(effectiveRot) {
            case 0: ox += 1; break;
            case 1: oy += 1; break;
            case 2: ox -= 1; break;
            case 3: oy -= 1; break;
        }
        return { x: ox, y: oy };
    }
}

export class Furnace extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'furnace');
        this.rotation = rotation;
        this.smelting = false;
        this.smeltTimer = 0;
        this.currentRecipe = null;
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;

        ctx.fillStyle = '#A9A9A9';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (this.smelting) {
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else {
            ctx.fillStyle = '#2F4F4F';
             ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
        }
    }

    update(gameState, dt) {
        if (!this.smelting) {
            if (this.inputInventory.has('iron-ore')) {
                this.currentRecipe = RECIPES['iron-plate'];
                this.inputInventory.remove('iron-ore', 1);
                this.smelting = true;
                this.smeltTimer = 0;
            } else if (this.inputInventory.has('copper-ore')) {
                this.currentRecipe = RECIPES['copper-plate'];
                this.inputInventory.remove('copper-ore', 1);
                this.smelting = true;
                this.smeltTimer = 0;
            }
        }

        if (this.smelting && this.currentRecipe) {
            this.smeltTimer += dt;
            if (this.smeltTimer >= this.currentRecipe.time) {
                const outputItem = Object.keys(RECIPES).find(key => RECIPES[key] === this.currentRecipe);
                if (outputItem) {
                     this.outputInventory.add(outputItem, 1);
                }
                this.smelting = false;
                this.currentRecipe = null;
            }
        }
    }
}

export class AssemblingMachine extends Entity {
    constructor(x, y, rotation) {
        super(x, y, 'assembler');
        this.rotation = rotation;
        this.crafting = false;
        this.craftTimer = 0;
        this.recipeKey = null; // Set by player
    }

    draw(ctx) {
        const px = this.x * TILE_SIZE;
        const py = this.y * TILE_SIZE;

        ctx.fillStyle = '#708090'; // SlateGray
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#B0C4DE'; // LightSteelBlue
        ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);

        if (this.recipeKey) {
             // Draw icon of output
             // Simplified: draw a small colored box
             const style = ITEMS[this.recipeKey];
             if (style) {
                 ctx.fillStyle = style.color;
                 ctx.fillRect(px + 10, py + 10, TILE_SIZE - 20, TILE_SIZE - 20);
             }
        }

        if (this.crafting) {
            // Processing indicator
            ctx.strokeStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    update(gameState, dt) {
        if (!this.recipeKey) return;

        const recipe = RECIPES[this.recipeKey];
        if (!recipe) return;

        if (!this.crafting) {
            // Check ingredients
            let canCraft = true;
            for (const [ingName, count] of Object.entries(recipe.ingredients)) {
                if (!this.inputInventory.has(ingName, count)) {
                    canCraft = false;
                    break;
                }
            }

            if (canCraft) {
                // Consume
                for (const [ingName, count] of Object.entries(recipe.ingredients)) {
                    this.inputInventory.remove(ingName, count);
                }
                this.crafting = true;
                this.craftTimer = 0;
            }
        }

        if (this.crafting) {
            this.craftTimer += dt;
            if (this.craftTimer >= recipe.time) {
                this.crafting = false;
                // Add output
                // Default 1 unless specified
                const count = (recipe.results && recipe.results[this.recipeKey]) || 1;
                this.outputInventory.add(this.recipeKey, count);
            }
        }
    }

    setRecipe(key) {
        this.recipeKey = key;
        // Should probably clear input buffers if switching? Factorio does implies this.
        // For MVP, keep it.
    }
}

export class Item {
    constructor(x, y, type) {
        this.x = x * TILE_SIZE + TILE_SIZE / 2;
        this.y = y * TILE_SIZE + TILE_SIZE / 2;
        this.type = type;
        this.stuck = false;
        this.beingPickedUp = false;
    }

    draw(ctx) {
        if (this.beingPickedUp) return;

        const style = ITEMS[this.type];
        ctx.fillStyle = style ? style.color : '#FFFFFF';

        const r = 6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
