// Placeholder for main game logic
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const gameState = {
    entityMap: new Map(),
    items: [],
    camera: { x: 0, y: 0 },
    selectedTool: null,
    rotation: 0, // 0: Right, 1: Down, 2: Left, 3: Up
    lastTime: 0
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
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

// UI Handling
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active class from all
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));

        const type = btn.getAttribute('data-type');
        if (gameState.selectedTool === type) {
            gameState.selectedTool = null; // Deselect
        } else {
            gameState.selectedTool = type;
            btn.classList.add('active');
        }
        updateInfoPanel();
    });
});

// Camera movement speed
const CAMERA_SPEED = 300; // pixels per second

function updateCamera(dt) {
    const speed = CAMERA_SPEED * dt;
    if (keys['ArrowUp'] || keys['w']) gameState.camera.y += speed;
    if (keys['ArrowDown'] || keys['s']) gameState.camera.y -= speed;
    if (keys['ArrowLeft'] || keys['a']) gameState.camera.x += speed;
    if (keys['ArrowRight'] || keys['d']) gameState.camera.x -= speed;
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
    // Round camera to avoid sub-pixel blurring
    const camX = Math.floor(gameState.camera.x);
    const camY = Math.floor(gameState.camera.y);
    ctx.translate(-camX, -camY); // Camera moves scene in opposite direction

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

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

function updateEntities(dt) {
    gameState.entityMap.forEach(entity => {
        if (entity.update) entity.update(gameState, dt);
    });
}

function updateItems(dt) {
    const ITEM_SPEED = 64; // pixels per second
    const itemsToRemove = new Set();

    gameState.items.forEach(item => {
        // Find which tile the item is currently "on"
        const currentGridX = Math.floor(item.x / TILE_SIZE);
        const currentGridY = Math.floor(item.y / TILE_SIZE);
        const key = `${currentGridX},${currentGridY}`;
        const entity = gameState.entityMap.get(key);

        if (entity && entity.type === 'belt') {
            // Move item according to belt direction
            // Center of the current tile
            const centerX = currentGridX * TILE_SIZE + TILE_SIZE / 2;
            const centerY = currentGridY * TILE_SIZE + TILE_SIZE / 2;

            // Logic: Move towards center of current tile first, then out in direction of belt

            let dx = 0;
            let dy = 0;

            // Vector to center
            const distToCenterX = centerX - item.x;
            const distToCenterY = centerY - item.y;

            // If we are significantly off-center on the non-movement axis, correct it
            // Belt Direction: 0: Right, 1: Down, 2: Left, 3: Up

            if (entity.rotation === 0) { // Moving Right
                if (Math.abs(distToCenterY) > 1) dy = Math.sign(distToCenterY); // Snap Y
                else { item.y = centerY; dx = 1; } // Move X
            } else if (entity.rotation === 1) { // Moving Down
                if (Math.abs(distToCenterX) > 1) dx = Math.sign(distToCenterX); // Snap X
                else { item.x = centerX; dy = 1; } // Move Y
            } else if (entity.rotation === 2) { // Moving Left
                if (Math.abs(distToCenterY) > 1) dy = Math.sign(distToCenterY); // Snap Y
                else { item.y = centerY; dx = -1; } // Move X
            } else if (entity.rotation === 3) { // Moving Up
                if (Math.abs(distToCenterX) > 1) dx = Math.sign(distToCenterX); // Snap X
                else { item.x = centerX; dy = -1; } // Move Y
            }

            // Check next tile validity?
            // For MVP, just move. Items stack on top of each other if blocked.

            item.x += dx * ITEM_SPEED * dt;
            item.y += dy * ITEM_SPEED * dt;
        }

        // Check if item entered a furnace
        // Furnace is 1x1 in this MVP
        const ent = gameState.entityMap.get(`${currentGridX},${currentGridY}`);

        if (ent && ent.type === 'furnace' && item.type === 'ore') {
             // Center check
             const centerX = currentGridX * TILE_SIZE + TILE_SIZE / 2;
             const centerY = currentGridY * TILE_SIZE + TILE_SIZE / 2;
             const dist = Math.sqrt((item.x - centerX)**2 + (item.y - centerY)**2);

             if (dist < 5) { // Close enough to center
                 itemsToRemove.add(item);
                 ent.startSmelting(gameState);
             }
        }
    });

    gameState.items = gameState.items.filter(i => !itemsToRemove.has(i));
}

function drawGrid() {
    // Camera is already applied via transform
    // We calculate the visible range in world coordinates

    const startX = Math.floor(gameState.camera.x / TILE_SIZE) * TILE_SIZE;
    const endX = startX + canvas.width + TILE_SIZE;
    const startY = Math.floor(gameState.camera.y / TILE_SIZE) * TILE_SIZE;
    const endY = startY + canvas.height + TILE_SIZE;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical lines
    for (let x = startX; x <= endX; x += TILE_SIZE) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    // Horizontal lines
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
    // Calculate world coordinates
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
        }

        if (entity) {
            gameState.entityMap.set(key, entity);
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

    // Draw rotation indicator
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

// Start game
requestAnimationFrame(gameLoop);
