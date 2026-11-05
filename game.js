/**
 * 坦克大战
 * 一个基于 HTML5 Canvas 的复古风格坦克射击游戏
 */

// ==================== 游戏配置 ====================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 40;
const COLS = CANVAS_WIDTH / TILE_SIZE;
const ROWS = CANVAS_HEIGHT / TILE_SIZE;

const DIRECTIONS = {
    UP: { x: 0, y: -1, name: 'up' },
    DOWN: { x: 0, y: 1, name: 'down' },
    LEFT: { x: -1, y: 0, name: 'left' },
    RIGHT: { x: 1, y: 0, name: 'right' }
};

// 地形类型
const EMPTY = 0;
const BRICK = 1;
const STEEL = 2;
const GRASS = 3;
const WATER = 4;

// 游戏状态
let canvas, ctx;
let gameLoopId;
let lastTime = 0;
let gameState = 'menu'; // menu, playing, paused, gameover, victory
let score = 0;
let level = 1;
let lives = 3;
let enemiesToSpawn = 0;
let spawnTimer = 0;

// 游戏对象
let player;
let enemies = [];
let bullets = [];
let particles = [];
let map = [];
let powerUps = [];

// 输入状态
const keys = {};

// ==================== 关卡地图 ====================
const LEVELS = [
    [
        "####################",
        "#...................#",
        "#.##.##.##.##.##.##.#",
        "#.#...#.#...#.#...#.#",
        "#...#.....#.....#...#",
        "#.#####.#####.#####.#",
        "#...................#",
        "#...S...S...S...S...#",
        "#...................#",
        "#.###.###.###.###.###",
        "#...#...#...#...#...#",
        "###.###.###.###.###.#",
        "#...................#",
        "#..S......P......S..#",
        "####################"
    ],
    [
        "####################",
        "#..................#",
        "#.###.###.###.###..#",
        "#.#...#.#...#.#...#.#",
        "#.....S.....S.....#",
        "#.###.###.###.###..#",
        "#.#...#.#...#.#...#.#",
        "#.....S.....S.....#",
        "#.###.###.###.###..#",
        "#.#...#.#...#.#...#.#",
        "#.....S.....S.....#",
        "#.###.###.###.###..#",
        "#..................#",
        "#.........P........#",
        "####################"
    ],
    [
        "####################",
        "#..................#",
        "#.S.S.S.S.S.S.S.S.S.#",
        "#..................#",
        "#.###.###.###.###..#",
        "#...#...#...#...#...#",
        "#.###.###.###.###..#",
        "#..................#",
        "#.S.S.S.S.S.S.S.S.S.#",
        "#..................#",
        "#.###.###.###.###..#",
        "#...#...#...#...#...#",
        "#.###.###.###.###..#",
        "#.........P........#",
        "####################"
    ]
];

// ==================== 工具函数 ====================
function rectIntersect(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getTileAt(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return STEEL;
    return map[row][col];
}

function setTileAt(x, y, type) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        map[row][col] = type;
    }
}

function isSolidTile(type) {
    return type === BRICK || type === STEEL || type === WATER;
}

// ==================== 类定义 ====================
class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = 34;
        this.height = 34;
        this.color = color;
        this.isPlayer = isPlayer;
        this.direction = DIRECTIONS.UP;
        this.speed = isPlayer ? 160 : 90;
        this.cooldown = 0;
        this.maxCooldown = isPlayer ? 0.35 : 1.2;
        this.hp = isPlayer ? 1 : 1;
        this.invincible = 0;
        this.moveTimer = 0;
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    move(dt, desiredDirection = null) {
        if (desiredDirection) {
            this.direction = desiredDirection;
        }

        const dx = this.direction.x * this.speed * dt;
        const dy = this.direction.y * this.speed * dt;

        const newX = clamp(this.x + dx, this.width / 2 + 2, CANVAS_WIDTH - this.width / 2 - 2);
        const newY = clamp(this.y + dy, this.height / 2 + 2, CANVAS_HEIGHT - this.height / 2 - 2);

        const oldX = this.x;
        const oldY = this.y;

        this.x = newX;
        if (this.checkWallCollision() || this.checkTankCollision()) {
            this.x = oldX;
        }

        this.y = newY;
        if (this.checkWallCollision() || this.checkTankCollision()) {
            this.y = oldY;
        }
    }

    checkWallCollision() {
        const bounds = this.getBounds();
        const points = [
            { x: bounds.x + 2, y: bounds.y + 2 },
            { x: bounds.x + bounds.width - 2, y: bounds.y + 2 },
            { x: bounds.x + 2, y: bounds.y + bounds.height - 2 },
            { x: bounds.x + bounds.width - 2, y: bounds.y + bounds.height - 2 }
        ];

        for (const p of points) {
            if (isSolidTile(getTileAt(p.x, p.y))) {
                return true;
            }
        }
        return false;
    }

    checkTankCollision() {
        for (const tank of [player, ...enemies]) {
            if (!tank || tank === this) continue;
            if (rectIntersect(this.getBounds(), tank.getBounds())) {
                return true;
            }
        }
        return false;
    }

    shoot() {
        if (this.cooldown > 0) return;
        this.cooldown = this.maxCooldown;

        const offset = 22;
        bullets.push(new Bullet(
            this.x + this.direction.x * offset,
            this.y + this.direction.y * offset,
            this.direction,
            this.isPlayer
        ));
    }

    update(dt) {
        if (this.cooldown > 0) this.cooldown -= dt;
        if (this.invincible > 0) this.invincible -= dt;

        if (!this.isPlayer) {
            this.aiUpdate(dt);
        }
    }

    aiUpdate(dt) {
        this.moveTimer -= dt;

        if (this.moveTimer <= 0) {
            this.moveTimer = randomInt(1, 3);
            const dirs = [DIRECTIONS.UP, DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
            this.direction = dirs[randomInt(0, 3)];
        }

        this.move(dt);

        // 随机射击，玩家在近处时更可能射击
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        const shootChance = dist < 250 ? 0.03 : 0.008;
        if (Math.random() < shootChance) {
            this.shoot();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 无敌闪烁效果
        if (this.invincible > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 坦克主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // 坦克履带
        ctx.fillStyle = '#222';
        ctx.fillRect(-this.width / 2 + 2, -this.height / 2, 6, this.height);
        ctx.fillRect(this.width / 2 - 8, -this.height / 2, 6, this.height);
        ctx.fillRect(-this.width / 2, -this.height / 2 + 2, this.width, 6);
        ctx.fillRect(-this.width / 2, this.height / 2 - 8, this.width, 6);

        // 炮塔
        ctx.fillStyle = this.isPlayer ? '#4ade80' : '#f87171';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // 炮管
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.direction.x * 18, this.direction.y * 18);
        ctx.stroke();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, direction, isPlayer) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = 350;
        this.isPlayer = isPlayer;
        this.radius = 3;
        this.active = true;
    }

    update(dt) {
        this.x += this.direction.x * this.speed * dt;
        this.y += this.direction.y * this.speed * dt;

        // 边界检测
        if (this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT) {
            this.active = false;
            return;
        }

        // 墙壁碰撞
        const tile = getTileAt(this.x, this.y);
        if (tile === BRICK) {
            setTileAt(this.x, this.y, EMPTY);
            createParticles(this.x, this.y, '#d2691e', 8);
            this.active = false;
            return;
        } else if (tile === STEEL) {
            createParticles(this.x, this.y, '#888', 4);
            this.active = false;
            return;
        }

        // 坦克碰撞
        const targets = this.isPlayer ? enemies : [player];
        for (const target of targets) {
            if (!target) continue;
            if (target.invincible > 0) continue;
            if (rectIntersect(
                { x: this.x - this.radius, y: this.y - this.radius, width: this.radius * 2, height: this.radius * 2 },
                target.getBounds()
            )) {
                this.active = false;
                target.hp--;
                createParticles(target.x, target.y, target.color, 15);

                if (target.hp <= 0) {
                    if (target.isPlayer) {
                        lives--;
                        updateUI();
                        if (lives <= 0) {
                            endGame(false);
                        } else {
                            respawnPlayer();
                        }
                    } else {
                        score += 100;
                        enemies = enemies.filter(e => e !== target);
                        updateUI();
                        checkLevelComplete();
                    }
                }
                return;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.isPlayer ? '#ffeb3b' : '#ff5252';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 150;
        this.vy = (Math.random() - 0.5) * 150;
        this.life = 0.5;
        this.size = Math.random() * 4 + 2;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / 0.5);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// ==================== 游戏核心逻辑 ====================
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // 绑定输入
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        keys[e.code] = true;
        if (e.code === 'Space') e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        keys[e.code] = false;
    });

    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', () => {
        resetGame();
        startGame();
    });

    loadLevel(1);
    requestAnimationFrame(gameLoop);
}

function loadLevel(lvl) {
    level = Math.min(lvl, LEVELS.length);
    const levelData = LEVELS[level - 1];
    map = [];

    player = null;
    enemies = [];
    bullets = [];
    particles = [];

    for (let row = 0; row < ROWS; row++) {
        const mapRow = [];
        for (let col = 0; col < COLS; col++) {
            const char = levelData[row][col];
            let tile = EMPTY;

            switch (char) {
                case '#': tile = STEEL; break;
                case 'S': tile = BRICK; break;
                case 'G': tile = GRASS; break;
                case 'W': tile = WATER; break;
                case 'P':
                    tile = EMPTY;
                    player = new Tank(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, '#22c55e', true);
                    player.invincible = 2;
                    break;
                case 'E':
                    tile = EMPTY;
                    enemies.push(new Tank(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, '#ef4444'));
                    break;
            }
            mapRow.push(tile);
        }
        map.push(mapRow);
    }

    enemiesToSpawn = 6 + level * 2;
    spawnTimer = 0;
    updateUI();
}

function resetGame() {
    score = 0;
    level = 1;
    lives = 3;
    gameState = 'menu';
    hideMessage();
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('restartBtn').classList.add('hidden');
    loadLevel(1);
}

function startGame() {
    if (gameState === 'playing') return;

    if (lives <= 0) {
        resetGame();
    }

    gameState = 'playing';
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('restartBtn').classList.remove('hidden');
    hideMessage();
}

function respawnPlayer() {
    // 在玩家出生点重新生成
    const levelData = LEVELS[level - 1];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (levelData[row][col] === 'P') {
                player = new Tank(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, '#22c55e', true);
                player.invincible = 2;
                return;
            }
        }
    }
}

function spawnEnemy(dt) {
    if (enemiesToSpawn <= 0 || enemies.length >= 4 + level) return;

    spawnTimer -= dt;
    if (spawnTimer > 0) return;
    spawnTimer = 3;

    // 在顶部随机位置生成敌人
    const spawnPoints = [];
    const levelData = LEVELS[level - 1];
    for (let col = 0; col < COLS; col++) {
        if (levelData[1][col] === '.') {
            spawnPoints.push(col);
        }
    }

    if (spawnPoints.length === 0) return;

    const col = spawnPoints[randomInt(0, spawnPoints.length - 1)];
    const enemy = new Tank(col * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2 + 10, '#ef4444');

    // 确保不会生成在玩家身上
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) > 80) {
        enemies.push(enemy);
        enemiesToSpawn--;
        updateUI();
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function checkLevelComplete() {
    if (enemiesToSpawn <= 0 && enemies.length === 0) {
        if (level >= LEVELS.length) {
            endGame(true);
        } else {
            showMessage(`第 ${level} 关通过！`, `得分: ${score}`);
            setTimeout(() => {
                loadLevel(level + 1);
                hideMessage();
            }, 2000);
        }
    }
}

function endGame(victory) {
    gameState = victory ? 'victory' : 'gameover';
    if (victory) {
        showMessage('🎉 恭喜通关！', `最终得分: ${score}`);
    } else {
        showMessage('💥 游戏结束', `最终得分: ${score} | 按重新开始再来一局`);
    }
}

function showMessage(title, subtitle) {
    const msgEl = document.getElementById('message');
    msgEl.innerHTML = `${title}<small>${subtitle}</small>`;
    msgEl.classList.remove('hidden');
}

function hideMessage() {
    document.getElementById('message').classList.add('hidden');
}

function updateUI() {
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('enemies-left').textContent = enemiesToSpawn + enemies.length;
}

function handleInput(dt) {
    if (!player) return;

    let moved = false;

    if (keys['w'] || keys['W'] || keys['ArrowUp']) {
        player.move(dt, DIRECTIONS.UP);
        moved = true;
    } else if (keys['s'] || keys['S'] || keys['ArrowDown']) {
        player.move(dt, DIRECTIONS.DOWN);
        moved = true;
    } else if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
        player.move(dt, DIRECTIONS.LEFT);
        moved = true;
    } else if (keys['d'] || keys['D'] || keys['ArrowRight']) {
        player.move(dt, DIRECTIONS.RIGHT);
        moved = true;
    }

    if (keys[' '] || keys['Space']) {
        player.shoot();
    }
}

function update(dt) {
    if (gameState !== 'playing') return;

    handleInput(dt);

    if (player) player.update(dt);

    for (const enemy of enemies) {
        enemy.update(dt);
    }

    spawnEnemy(dt);

    for (const bullet of bullets) {
        bullet.update(dt);
    }
    bullets = bullets.filter(b => b.active);

    for (const p of particles) {
        p.update(dt);
    }
    particles = particles.filter(p => p.life > 0);
}

function drawMap() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const tile = map[row][col];
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            switch (tile) {
                case BRICK:
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#A0522D';
                    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.strokeStyle = '#5D3A1A';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                    break;
                case STEEL:
                    ctx.fillStyle = '#555';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#777';
                    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
                    ctx.moveTo(x + TILE_SIZE, y);
                    ctx.lineTo(x, y + TILE_SIZE);
                    ctx.stroke();
                    break;
                case GRASS:
                    ctx.fillStyle = 'rgba(34, 139, 34, 0.6)';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    break;
                case WATER:
                    ctx.fillStyle = '#1E90FF';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    break;
                default:
                    // 绘制网格线（可选）
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function draw() {
    // 清空画布
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawMap();

    for (const bullet of bullets) {
        bullet.draw(ctx);
    }

    if (player) player.draw(ctx);

    for (const enemy of enemies) {
        enemy.draw(ctx);
    }

    for (const p of particles) {
        p.draw(ctx);
    }
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// 启动游戏
window.addEventListener('load', initGame);
