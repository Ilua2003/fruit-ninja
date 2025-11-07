// Game state
const gameState = {
    score: 0,
    lives: 5,
    isGameActive: false,
    fruits: [],
    particles: [],
    lastFrameTime: 0,
    spawnInterval: 1500,
    lastSpawnTime: 0,
    bladeTrails: [],
    defaultSpawnInterval: 1500,
    defaultLives: 5,
    desktopSpawnRange: 24,
    mobileSpawnRange: 14,
    frameCount: 0,
    // Mouse controls
    mousePosition: { x: 0, y: 0 },
    isMouseDown: false,
    mouseSpeed: 0,
    lastMouseTime: 0
};

// DOM elements
const gameCanvas = document.getElementById('game-canvas');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');
const finalScoreElement = document.getElementById('final-score');
const loadingScreen = document.getElementById('loading');

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    canvas: gameCanvas, 
    alpha: true, 
    antialias: false 
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0.2);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 10);
scene.add(directionalLight);

// Camera position
camera.position.z = 20;

function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    return isIOS || isAndroid;
}

// Fruit geometries and materials
const fruitGeometries = [
    new THREE.SphereGeometry(1.8, 16, 16),
    new THREE.SphereGeometry(1.6, 16, 16),
    new THREE.SphereGeometry(2.0, 16, 16),
    new THREE.SphereGeometry(1.5, 16, 16),
    new THREE.TorusGeometry(1.2, 0.5, 16, 32),
    new THREE.ConeGeometry(1.2, 2.2, 16)
];

const fruitMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xff0000 }),
    new THREE.MeshLambertMaterial({ color: 0xff7f00 }),
    new THREE.MeshLambertMaterial({ color: 0x00cc00 }),
    new THREE.MeshLambertMaterial({ color: 0xffccaa }),
    new THREE.MeshLambertMaterial({ color: 0x9900ff }),
    new THREE.MeshLambertMaterial({ color: 0xff6699 })
];

// MOUSE CONTROLS
function setupMouseControls() {
    console.log('Setting up mouse controls for VK Play');
    
    gameCanvas.addEventListener('mousemove', handleMouseMove);
    gameCanvas.addEventListener('mousedown', handleMouseDown);
    gameCanvas.addEventListener('mouseup', handleMouseUp);
    gameCanvas.addEventListener('mouseleave', handleMouseLeave);
    gameCanvas.style.cursor = 'crosshair';
}

function handleMouseMove(event) {
    const rect = gameCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    const now = Date.now();
    const deltaTime = (now - gameState.lastMouseTime) / 1000;
    gameState.lastMouseTime = now;
    
    // Calculate mouse speed
    const deltaX = x - gameState.mousePosition.x;
    const deltaY = y - gameState.mousePosition.y;
    gameState.mouseSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / (deltaTime || 0.016);
    
    // Update positions
    gameState.prevFingerTip = { ...gameState.fingerTip };
    gameState.fingerTip = { x, y, z: 0 };
    gameState.mousePosition = { x, y };
    
    // Create blade trail
    if (gameState.isMouseDown && gameState.isGameActive && gameState.mouseSpeed > 30) {
        createBladeTrail(
            x * window.innerWidth,
            y * window.innerHeight,
            gameState.prevFingerTip.x * window.innerWidth,
            gameState.prevFingerTip.y * window.innerHeight
        );
        
        checkMouseCollisions();
    }
}

function handleMouseDown(event) {
    gameState.isMouseDown = true;
    const rect = gameCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    gameState.fingerTip = { x, y, z: 0 };
    gameState.mousePosition = { x, y };
    gameState.mouseSpeed = 100;
    
    createBladeTrail(
        x * window.innerWidth,
        y * window.innerHeight,
        x * window.innerWidth,
        y * window.innerHeight
    );
}

function handleMouseUp() {
    gameState.isMouseDown = false;
}

function handleMouseLeave() {
    gameState.isMouseDown = false;
}

function checkMouseCollisions() {
    if (!gameState.isMouseDown) return;
    
    const mouseX = (gameState.fingerTip.x * 40) - 20;
    const mouseY = (0.5 - gameState.fingerTip.y) * 15;
    
    gameState.fruits.forEach(fruit => {
        if (!fruit.sliced) {
            const dx = fruit.mesh.position.x - mouseX;
            const dy = fruit.mesh.position.y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const MOUSE_SLICE_DISTANCE = 3.0;
            const MIN_MOUSE_SPEED = 30;
            
            if (distance < MOUSE_SLICE_DISTANCE && gameState.mouseSpeed > MIN_MOUSE_SPEED) {
                sliceFruit(fruit);
            }
        }
    });
}

// Blade trail effect
function createBladeTrail(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const trail = document.createElement('div');
    trail.style.cssText = `
        position: fixed;
        height: 4px;
        width: ${length}px;
        left: ${x1}px;
        top: ${y1}px;
        transform: rotate(${angle}rad);
        transform-origin: 0 0;
        background: rgba(0, 195, 255, 0.8);
        box-shadow: 0 0 10px 2px rgba(0, 195, 255, 0.8);
        pointer-events: none;
        z-index: 100;
    `;
    
    document.body.appendChild(trail);
    gameState.bladeTrails.push({
        element: trail,
        timestamp: Date.now()
    });
}

function updateBladeTrails() {
    const now = Date.now();
    gameState.bladeTrails = gameState.bladeTrails.filter(trail => {
        const age = now - trail.timestamp;
        if (age > 350) {
            trail.element.remove();
            return false;
        } else {
            trail.element.style.opacity = 1 - (age / 350);
            return true;
        }
    });
}

// Game functions (spawn, update, slice fruits) - оставляем как было
function spawnFruit() {
    const fruitIndex = Math.floor(Math.random() * fruitGeometries.length);
    const fruit = new THREE.Mesh(fruitGeometries[fruitIndex], fruitMaterials[fruitIndex]);
    
    let xRange = isMobileDevice() ? gameState.mobileSpawnRange : gameState.desktopSpawnRange;
    
    fruit.position.x = (Math.random() * xRange) - (xRange / 2);
    fruit.position.y = -10;
    fruit.position.z = 0;
    
    const velocity = {
        x: (Math.random() - 0.5) * 1.5,
        y: 10 + Math.random() * 10,
        z: 0,
        rotationX: Math.random() * 0.08,
        rotationY: Math.random() * 0.08,
        rotationZ: Math.random() * 0.08
    };
    
    const fruitObject = {
        mesh: fruit,
        velocity: velocity,
        sliced: false,
        type: 'fruit'
    };
    
    gameState.fruits.push(fruitObject);
    scene.add(fruit);
}

function spawnObject() {
    spawnFruit();
}

function updateObjects(deltaTime) {
    gameState.fruits = gameState.fruits.filter(fruit => {
        fruit.velocity.y -= 8.0 * deltaTime;
        fruit.mesh.position.x += fruit.velocity.x * deltaTime;
        fruit.mesh.position.y += fruit.velocity.y * deltaTime;
        fruit.mesh.rotation.x += fruit.velocity.rotationX;
        fruit.mesh.rotation.y += fruit.velocity.rotationY;
        fruit.mesh.rotation.z += fruit.velocity.rotationZ;
        
        if (fruit.mesh.position.y < -10) {
            if (!fruit.sliced) {
                gameState.lives--;
                livesElement.textContent = gameState.lives;
                if (gameState.lives <= 0) endGame();
            }
            scene.remove(fruit.mesh);
            return false;
        }
        return true;
    });
}

function sliceFruit(fruit) {
    fruit.sliced = true;
    createFruitExplosion(fruit);
    gameState.score += 1;
    scoreElement.textContent = gameState.score;
    scene.remove(fruit.mesh);
}

function createFruitExplosion(fruit) {
    const fruitColor = fruit.mesh.material.color.getHex();
    const numParticles = 12;
    
    for (let i = 0; i < numParticles; i++) {
        const size = 0.3 + Math.random() * 0.4;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshLambertMaterial({ color: fruitColor });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(fruit.mesh.position);
        
        const speed = 8 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        const height = -3 + Math.random() * 6;
        
        const particleObj = {
            mesh: particle,
            velocity: {
                x: Math.cos(angle) * speed,
                y: height,
                z: Math.sin(angle) * speed,
                rotationX: Math.random() * 0.2,
                rotationY: Math.random() * 0.2,
                rotationZ: Math.random() * 0.2
            },
            createTime: Date.now(),
            lifetime: 800 + Math.random() * 400
        };
        
        scene.add(particle);
        if (!gameState.particles) gameState.particles = [];
        gameState.particles.push(particleObj);
    }
}

function updateParticles(deltaTime) {
    const now = Date.now();
    if (!gameState.particles) return;
    
    gameState.particles = gameState.particles.filter(particle => {
        particle.velocity.y -= 9.8 * deltaTime;
        particle.mesh.position.x += particle.velocity.x * deltaTime;
        particle.mesh.position.y += particle.velocity.y * deltaTime;
        particle.mesh.rotation.x += particle.velocity.rotationX;
        particle.mesh.rotation.y += particle.velocity.rotationY;
        particle.mesh.rotation.z += particle.velocity.rotationZ;
        
        const age = now - particle.createTime;
        if (age > particle.lifetime) {
            scene.remove(particle.mesh);
            return false;
        }
        
        particle.mesh.material.transparent = true;
        particle.mesh.material.opacity = 1 - (age / particle.lifetime);
        return true;
    });
}

// Game loop
function gameLoop(timestamp) {
    if (!gameState.lastFrameTime) gameState.lastFrameTime = timestamp;
    
    const deltaTime = (timestamp - gameState.lastFrameTime) / 1000;
    gameState.lastFrameTime = timestamp;
    
    if (gameState.isGameActive) {
        if (timestamp - gameState.lastSpawnTime > gameState.spawnInterval) {
            spawnObject();
            gameState.lastSpawnTime = timestamp;
            gameState.spawnInterval = Math.max(200, gameState.spawnInterval - 50);
        }
        
        updateObjects(deltaTime);
        updateParticles(deltaTime);
        checkMouseCollisions();
        updateBladeTrails();
        
        renderer.render(scene, camera);
        gameState.frameCount++;
        requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    gameState.score = 0;
    gameState.lives = gameState.defaultLives;
    gameState.lastSpawnTime = 0;
    gameState.spawnInterval = gameState.defaultSpawnInterval;
    gameState.lastFrameTime = 0;
    gameState.frameCount = 0;
    
    gameState.fruits.forEach(fruit => scene.remove(fruit.mesh));
    if (gameState.particles) {
        gameState.particles.forEach(particle => scene.remove(particle.mesh));
    }
    gameState.fruits = [];
    gameState.particles = [];
    
    gameState.bladeTrails.forEach(trail => trail.element.remove());
    gameState.bladeTrails = [];
    
    scoreElement.textContent = gameState.score;
    livesElement.textContent = gameState.lives;
    
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    gameState.isGameActive = true;
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState.isGameActive = false;
    finalScoreElement.textContent = gameState.score;
    gameOverScreen.style.display = 'flex';
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Simple initialization for VK Play
async function init() {
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    window.addEventListener('resize', onWindowResize);
    
    gameState.defaultSpawnInterval = 1500;
    gameState.defaultLives = 5;
    
    if (isMobileDevice() && window.innerWidth < 500) {
        gameState.mobileSpawnRange = 11;
    }
    
    // Setup mouse controls only
    setupMouseControls();
    
    // Hide loading screen
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 1000);
}

// Start the game
init();
