import { TILE_SIZE, getGridCoords } from './utils.js';
import { ConveyorBelt, Drill, Furnace, Item, Inserter, AssemblingMachine } from './classes.js';
import { World } from './world.js';
import { RECIPES } from './data.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const gameState = {
    world: new World(100, 100),
    entityMap: new Map(),
    items: [],
    camera: { x: 0, y: 0 },
    selectedTool: null,
    rotation: 0, // 0: Right, 1: Down, 2: Left, 3: Up
    lastTime: 0,
    selectedEntity: null // For inspecting/setting recipes
};

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Input Handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'r' || e.key === 'R') {
        gameState.rotation = (gameState.rotation + 1) % 4;
        updateInfoPanel();
    }
    if (e.key === 'e' || e.key === 'E') {
         // Close menu
         closeMenu();
    }
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

// UI Handling
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));

        const type = btn.getAttribute('data-type');
        if (gameState.selectedTool === type) {
            gameState.selectedTool = null;
        } else {
            gameState.selectedTool = type;
            btn.classList.add('active');
            closeMenu();
        }
        updateInfoPanel();
    });
});

const recipeSelector = document.getElementById('recipe-selector');
const recipeDropdown = document.getElementById('recipe-dropdown');

// Populate recipes
Object.keys(RECIPES).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.innerText = RECIPES[key].name;
    recipeDropdown.appendChild(opt);
});

recipeDropdown.addEventListener('change', (e) => {
    if (gameState.selectedEntity && gameState.selectedEntity.type === 'assembler') {
        gameState.selectedEntity.setRecipe(e.target.value);
    }
});

function closeMenu() {
    gameState.selectedEntity = null;
    recipeSelector.style.display = 'none';
}

function openMenu(entity) {
    gameState.selectedEntity = entity;
    recipeSelector.style.display = 'block';
    if (entity.recipeKey) {
        recipeDropdown.value = entity.recipeKey;
    } else {
        recipeDropdown.value = "";
    }
}


// Camera movement speed
const CAMERA_SPEED = 300; // pixels per second

function updateCamera(dt) {
    const speed = CAMERA_SPEED * dt;
    if (keys['ArrowUp'] || keys['w']) gameState.camera.y -= speed; // Invert for natural drag? No, standard WASD.
    // Wait, in previous step I messed up directions.
    // Let's stick to: Camera Y increases = Moving Down in world.
    // So pressing W (Up) should DECREASE camera Y (move up).

    if (keys['ArrowUp'] || keys['w']) gameState.camera.y -= speed;
    if (keys['ArrowDown'] || keys['s']) gameState.camera.y += speed;
    if (keys['ArrowLeft'] || keys['a']) gameState.camera.x -= speed;
    if (keys['ArrowRight'] || keys['d']) gameState.camera.x += speed;
}

function gameLoop(timestamp) {
    if (!gameState.lastTime) gameState.lastTime = timestamp;
    const dt = (timestamp - gameState.lastTime) / 1000;
    gameState.lastTime = timestamp;

    updateCamera(dt);

    // Logic Updates
    updateEntities(dt);
    updateItems(dt);

    // Drawing
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    ctx.save();
    const camX = Math.floor(gameState.camera.x);
    const camY = Math.floor(gameState.camera.y);
    ctx.translate(-camX, -camY);

    // Draw World (Ores)
    gameState.world.draw(ctx, gameState.camera);

    drawGrid();

    // Draw entities
    gameState.entityMap.forEach(entity => {
        entity.draw(ctx);
    });

    // Draw items
    gameState.items.forEach(item => {
        item.draw(ctx);
    });

    // Draw placement preview
    drawPreview();

    // Draw selection highlight
    if (gameState.selectedEntity) {
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(gameState.selectedEntity.x * TILE_SIZE, gameState.selectedEntity.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

function updateEntities(dt) {
    gameState.entityMap.forEach(entity => {
        if (entity.update) entity.update(gameState, dt);
    });
}

function updateItems(dt) {
    const ITEM_SPEED = 64;
    const itemsToRemove = new Set();

    gameState.items.forEach(item => {
        if (item.beingPickedUp) return; // Inserter handles it

        const currentGridX = Math.floor(item.x / TILE_SIZE);
        const currentGridY = Math.floor(item.y / TILE_SIZE);
        const key = `${currentGridX},${currentGridY}`;
        const entity = gameState.entityMap.get(key);

        if (entity && entity.type === 'belt') {
            const centerX = currentGridX * TILE_SIZE + TILE_SIZE / 2;
            const centerY = currentGridY * TILE_SIZE + TILE_SIZE / 2;

            let dx = 0;
            let dy = 0;

            const distToCenterX = centerX - item.x;
            const distToCenterY = centerY - item.y;

            if (entity.rotation === 0) { // Right
                if (Math.abs(distToCenterY) > 1) dy = Math.sign(distToCenterY);
                else { item.y = centerY; dx = 1; }
            } else if (entity.rotation === 1) { // Down
                if (Math.abs(distToCenterX) > 1) dx = Math.sign(distToCenterX);
                else { item.x = centerX; dy = 1; }
            } else if (entity.rotation === 2) { // Left
                if (Math.abs(distToCenterY) > 1) dy = Math.sign(distToCenterY);
                else { item.y = centerY; dx = -1; }
            } else if (entity.rotation === 3) { // Up
                if (Math.abs(distToCenterX) > 1) dx = Math.sign(distToCenterX);
                else { item.x = centerX; dy = -1; }
            }

            // Check collisions with next tile?
            // Advanced: Look ahead. If next tile is belt and blocked, stop.
            // MVP: Items just stack.

            item.x += dx * ITEM_SPEED * dt;
            item.y += dy * ITEM_SPEED * dt;
        }

        // Items on ground don't move unless on belt
    });

    gameState.items = gameState.items.filter(i => !itemsToRemove.has(i));
}

function drawGrid() {
    const startX = Math.floor(gameState.camera.x / TILE_SIZE) * TILE_SIZE;
    const endX = startX + canvas.width + TILE_SIZE;
    const startY = Math.floor(gameState.camera.y / TILE_SIZE) * TILE_SIZE;
    const endY = startY + canvas.height + TILE_SIZE;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += TILE_SIZE) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += TILE_SIZE) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.stroke();
}

// Mouse tracking
let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

canvas.addEventListener('mousedown', (e) => {
    handleInput(e);
});

function handleInput(e) {
    const worldX = mouseX + gameState.camera.x;
    const worldY = mouseY + gameState.camera.y;
    const gridPos = getGridCoords(worldX, worldY);
    const key = `${gridPos.x},${gridPos.y}`;

    if (gameState.selectedTool === 'delete') {
        gameState.entityMap.delete(key);
    } else if (gameState.selectedTool) {
        let entity;
        if (gameState.selectedTool === 'belt') {
            entity = new ConveyorBelt(gridPos.x, gridPos.y, gameState.rotation);
        } else if (gameState.selectedTool === 'drill') {
            entity = new Drill(gridPos.x, gridPos.y, gameState.rotation);
        } else if (gameState.selectedTool === 'furnace') {
            entity = new Furnace(gridPos.x, gridPos.y, gameState.rotation);
        } else if (gameState.selectedTool === 'inserter') {
            entity = new Inserter(gridPos.x, gridPos.y, gameState.rotation);
        } else if (gameState.selectedTool === 'assembler') {
            entity = new AssemblingMachine(gridPos.x, gridPos.y, gameState.rotation);
        }

        if (entity) {
            gameState.entityMap.set(key, entity);
        }
    } else {
        // Inspect / Select
        const ent = gameState.entityMap.get(key);
        if (ent) {
            if (ent.type === 'assembler') {
                openMenu(ent);
            }
        } else {
            closeMenu();
        }
    }
}

function drawPreview() {
    if (!gameState.selectedTool) return;

    const worldX = mouseX + gameState.camera.x;
    const worldY = mouseY + gameState.camera.y;
    const gridPos = getGridCoords(worldX, worldY);

    const px = gridPos.x * TILE_SIZE;
    const py = gridPos.y * TILE_SIZE;

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cx = px + TILE_SIZE/2;
    const cy = py + TILE_SIZE/2;
    ctx.moveTo(cx, cy);
    if (gameState.rotation === 0) ctx.lineTo(cx + 15, cy);
    if (gameState.rotation === 1) ctx.lineTo(cx, cy + 15);
    if (gameState.rotation === 2) ctx.lineTo(cx - 15, cy);
    if (gameState.rotation === 3) ctx.lineTo(cx, cy - 15);
    ctx.stroke();
}

function updateInfoPanel() {
    const rotText = ['Right', 'Down', 'Left', 'Up'][gameState.rotation];
    const toolText = gameState.selectedTool ? gameState.selectedTool : "None";
    document.getElementById('selected-tool').innerText = `${toolText}`;
}

requestAnimationFrame(gameLoop);
