const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    backgroundColor: '#050510', // Dark Cyberpunk Background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let obstacles;
let score = 0;
let scoreText;
let highScore = 0;
let highScoreText;
let instructionsText;
let gameOver = false;
let gameStarted = false;
let spawnTimer = 0;
let bg;

function preload() {
    // Load Background
    this.load.image('bg', 'assets/bg/1-30.png');

    // Load Biker Sprites
    this.load.spritesheet('biker_run', 'assets/sprites/biker/Biker_run.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('biker_jump', 'assets/sprites/biker/Biker_jump.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('biker_doublejump', 'assets/sprites/biker/Biker_doublejump.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('biker_idle', 'assets/sprites/biker/Biker_idle.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('biker_attack', 'assets/sprites/biker/Biker_run_attack.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('biker_punch', 'assets/sprites/biker/Biker_punch.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('biker_kick', 'assets/sprites/biker/Biker_attack3.png', { frameWidth: 48, frameHeight: 48 });
    
    // Load Cyborg (Enemy)
    this.load.spritesheet('cyborg_run', 'assets/sprites/cyborg/Cyborg_run.png', { frameWidth: 48, frameHeight: 48 });

    // Load Punk (Flying Enemy)
    this.load.spritesheet('punk_doublejump', 'assets/sprites/punk/Punk_doublejump.png', { frameWidth: 48, frameHeight: 48 });

    // Load Sounds (Switched to cleaner beeps/clicks)
    this.load.audio('jump', 'assets/sounds/zapsplat_science_fiction_cyberpunk_electronics_beep_002_61683.mp3');
    this.load.audio('attack', 'assets/sounds/zapsplat_science_fiction_cyberpunk_computer_equipment_or_machine_clicks_61358.mp3');
    this.load.audio('kill', 'assets/sounds/zapsplat_science_fiction_cyberpunk_electronics_beep_003_61684.mp3');
    this.load.audio('gameover', 'assets/sounds/zapsplat_science_fiction_cyberpunk_electronics_beep_001_61682.mp3');
}

function create() {
    // Create Background (TileSprite for scrolling)
    // 400, 200 is center of screen. 800, 400 is size.
    bg = this.add.tileSprite(400, 200, 800, 400, 'bg');
    bg.setScrollFactor(0); // Fix to camera if we had one, but here it's static scene

    // Create the ground (Black with Neon Pink outline)
    const ground = this.add.rectangle(400, 380, 800, 40, 0x000000); 
    ground.setStrokeStyle(4, 0xff00ff); // Neon Pink stroke
    this.physics.add.existing(ground, true); // true = static body

    // Create Animations
    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('biker_idle', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
    });

    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('biker_run', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: this.anims.generateFrameNumbers('biker_jump', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'doublejump',
        frames: this.anims.generateFrameNumbers('biker_doublejump', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: 0
    });

    this.anims.create({
        key: 'attack',
        frames: this.anims.generateFrameNumbers('biker_attack', { start: 0, end: 5 }),
        frameRate: 15,
        repeat: 0
    });

    this.anims.create({
        key: 'punch',
        frames: this.anims.generateFrameNumbers('biker_punch', { start: 0, end: 5 }),
        frameRate: 15,
        repeat: 0
    });

    this.anims.create({
        key: 'kick',
        frames: this.anims.generateFrameNumbers('biker_kick', { start: 0, end: 5 }),
        frameRate: 15,
        repeat: 0
    });

    this.anims.create({
        key: 'enemy_run',
        frames: this.anims.generateFrameNumbers('cyborg_run', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'enemy_fly',
        frames: this.anims.generateFrameNumbers('punk_doublejump', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    // Create the player (Biker Sprite)
    player = this.physics.add.sprite(100, 300, 'biker_idle');
    player.setCollideWorldBounds(true);
    player.setScale(1.5); // Make him a bit bigger
    player.body.setSize(20, 40); // Adjust hitbox
    player.body.setOffset(14, 8); // Center hitbox

    // Create a group for obstacles
    obstacles = this.physics.add.group();

    // Colliders
    this.physics.add.collider(player, ground);
    this.physics.add.collider(obstacles, ground);
    this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // Score (Neon Green, Monospace font)
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#00ff00', fontFamily: 'Courier New' });

    // High Score
    highScore = localStorage.getItem('cyberpunk_runner_highscore') || 0;
    highScoreText = this.add.text(16, 50, 'High Score: ' + highScore, { fontSize: '24px', fill: '#00ffff', fontFamily: 'Courier New' });

    // Instructions
    instructionsText = this.add.text(250, 150, 'Press SPACE to Start', { fontSize: '24px', fill: '#00ff00', fontFamily: 'Courier New', align: 'center' });

    this.nextSpawn = 0;
    this.jumps = 0;
    this.isAttacking = false;
    gameStarted = false;
    
    // Start idle animation
    player.play('idle');

    // Return to run after attack
    player.on('animationcomplete', function (anim) {
        if (anim.key === 'attack' || anim.key === 'punch' || anim.key === 'kick') {
            this.isAttacking = false;
            if (player.body.touching.down) {
                player.play('run', true);
            } else {
                player.play('jump', true);
            }
        }
    }, this);

    // Create Particle Textures (Cyan and Pink for Cyberpunk feel)
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0x00ffff, 1); // Cyan
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('particle_cyan', 4, 4);
    
    graphics.clear();
    graphics.fillStyle(0xff00ff, 1); // Magenta
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('particle_pink', 4, 4);
}

function update(time, delta) {
    if (gameOver) {
        // Restart game on space press
        if (cursors.space.isDown) {
            gameOver = false;
            score = 0;
            this.scene.restart();
        }
        return;
    }

    if (!gameStarted) {
        if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
            gameStarted = true;
            player.play('run');
            this.nextSpawn = time + 2000; // Delay first enemy
            instructionsText.setText('Press SPACE to Jump\nPress Z to Attack');
        }
        return;
    }

    // Scroll Background (Speed increases with score)
    bg.tilePositionX += 2 + (score * 0.005);

    // Reset jumps when touching ground
    if (player.body.touching.down) {
        this.jumps = 0;
    }

    // Player Jump
    if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
        if (instructionsText) {
            instructionsText.destroy();
            instructionsText = null;
        }

        if (player.body.touching.down || this.jumps < 2) {
            player.setVelocityY(-500);
            this.sound.play('jump');
            
            if (this.jumps === 0) {
                player.play('jump');
            } else {
                player.play('doublejump');
            }
            
            this.jumps++;
            this.isAttacking = false; // Cancel attack on jump
        }
    }

    // Player Attack
    if (Phaser.Input.Keyboard.JustDown(this.keyZ) && !this.isAttacking) {
        if (instructionsText) {
            instructionsText.destroy();
            instructionsText = null;
        }

        this.isAttacking = true;
        this.sound.play('attack');
        
        // Random Attack
        const attacks = ['attack', 'punch', 'kick'];
        const randomAttack = attacks[Phaser.Math.Between(0, 2)];
        player.play(randomAttack);
    }

    // Landed logic
    if (player.body.touching.down && player.anims.currentAnim.key !== 'run' && !this.isAttacking) {
        player.play('run', true);
    }

    // Spawn Obstacles
    if (time > this.nextSpawn) {
        spawnObstacle(this);
        
        // Decrease spawn time as score increases to make it harder
        // Base range: 1500-3000ms
        // Minimum limit: 600-1500ms
        const difficulty = Math.min(score * 2, 1000); 
        const minDelay = Math.max(600, 1500 - difficulty);
        const maxDelay = Math.max(1500, 3000 - difficulty);
        
        this.nextSpawn = time + Phaser.Math.Between(minDelay, maxDelay);
    }

    // Move Obstacles
    obstacles.getChildren().forEach(function (obstacle) {
        if (obstacle.x < -50) {
            obstacle.destroy();
            score += 10;
            scoreText.setText('Score: ' + score);
        }
    });
}

function spawnObstacle(scene) {
    // Randomly choose obstacle type
    const type = Phaser.Math.Between(0, 2); // 0, 1, or 2
    let obstacle;

    if (type < 2) {
        // Ground Obstacle (Cyborg Enemy) - 66% chance
        // Position him on the ground
        obstacle = scene.physics.add.sprite(850, 330, 'cyborg_run');
        obstacle.play('enemy_run');
        obstacle.setScale(1.5);
        obstacle.body.setSize(20, 40);
        obstacle.body.setOffset(14, 8);
        obstacle.flipX = true; // Face left towards player
    } else {
        // Flying Obstacle (Punk Jumping) - 33% chance
        // Position him in the air
        obstacle = scene.physics.add.sprite(850, 270, 'punk_doublejump');
        obstacle.play('enemy_fly');
        obstacle.setScale(1.5);
        obstacle.body.setSize(20, 40);
        obstacle.body.setOffset(14, 8);
        obstacle.flipX = true; // Face left towards player
    }

    obstacles.add(obstacle);
    
    obstacle.body.setVelocityX(-300 - (score * 0.5)); // Speed increases slightly with score
    obstacle.body.setImmovable(true);
    obstacle.body.allowGravity = false; // Obstacles don't need gravity if they slide
}

function hitObstacle(player, obstacle) {
    // If attacking, destroy the enemy!
    if (this.isAttacking) {
        this.sound.play('kill');

        // 1. Screen Shake
        this.cameras.main.shake(100, 0.01);

        // 2. Particle Explosion
        const emitter = this.add.particles(obstacle.x, obstacle.y, 'particle_cyan', {
            lifespan: 500,
            speed: { min: 150, max: 350 },
            scale: { start: 1, end: 0 },
            gravityY: 200,
            emitting: false
        });
        emitter.explode(20);

        // 3. Floating Score Text
        const popup = this.add.text(obstacle.x, obstacle.y - 20, '+50', { 
            fontSize: '24px', 
            fill: '#00ffff', 
            fontFamily: 'Courier New',
            stroke: '#000',
            strokeThickness: 2
        });
        
        this.tweens.add({
            targets: popup,
            y: popup.y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => popup.destroy()
        });

        obstacle.destroy();
        score += 50; // Bonus points for kill
        scoreText.setText('Score: ' + score);
        return;
    }

    this.physics.pause();
    this.sound.play('gameover');
    player.setTint(0xff0000); // Turn red on death
    player.anims.stop(); // Stop running/jumping animation
    gameOver = true;

    // Update High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cyberpunk_runner_highscore', highScore);
        highScoreText.setText('High Score: ' + highScore);
    }

    this.add.text(300, 200, 'Game Over', { fontSize: '48px', fill: '#ff0000', fontFamily: 'Courier New' });
    this.add.text(280, 250, 'Press SPACE to Restart', { fontSize: '24px', fill: '#00ff00', fontFamily: 'Courier New' });
}
