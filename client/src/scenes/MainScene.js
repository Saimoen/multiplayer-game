import { Scene } from "phaser";
import { Player } from "../gameobjects/Player";
import { BlueEnemy } from "../gameobjects/BlueEnemy";
import socket from "../socket";
import { Bullet } from "../gameobjects/Bullet";

export class MainScene extends Scene {
    players = {};
    enemy_blue = null;
    cursors = null;

    points = 0;
    game_over_timeout = 20;

    constructor() {
        super("MainScene");
    }

    init() {
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.scene.launch("MenuScene");

        // Reset points
        this.points = 0;
        this.game_over_timeout = 20;
    }

    create() {
        console.log('MainScene created');
        
        socket.on('update-players', (players) => {
            console.log('Received update-players event with players:', players);

            // Create or update players based on received data
            players.forEach((playerData) => {
                if (!this.players[playerData.id]) {
                    this.players[playerData.id] = new Player({ scene: this, socketId: playerData.id });
                    console.log('Created player:', playerData.id);
                } else {
                    // Update existing player positions
                    const player = this.players[playerData.id];
                    player.setPosition(playerData.x, playerData.y);
                }
            });

            // Set up input events after players are created or updated
            this.setupInputEvents();
        });

        this.add.image(0, 0, "background").setOrigin(0, 0);
        this.add.image(0, this.scale.height, "floor").setOrigin(0, 1);

        // Set up initial input events (they will be updated later if needed)
        this.setupInputEvents();

        // Enemy
        this.enemy_blue = new BlueEnemy(this);

        // This event comes from MenuScene
        socket.on("launch-game", () => {
            console.log("Received launch-game event");
            this.scene.stop("MenuScene");
            this.scene.launch("HudScene", {
                remaining_time: this.game_over_timeout,
            });

            // Start all players
            Object.values(this.players).forEach(player => player.start());
            this.enemy_blue.start();

            // Game Over timeout
            this.time.addEvent({
                delay: 1000,
                loop: true,
                callback: () => {
                    if (this.game_over_timeout === 0) {
                        // Remove the event listener to avoid duplicate events.
                        this.game.events.removeListener("start-game");
                        // Stop the scenes launched in parallel.
                        this.scene.stop("HudScene");
                        this.scene.start("GameOverScene", {
                            points: this.points,
                        });
                    } else {
                        this.game_over_timeout--;
                        this.scene.get("HudScene").update_timeout(this.game_over_timeout);
                    }
                },
            });
        });
    }

    setupInputEvents() {
        console.log("Setting up input events");

        // Cursor keys
        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.space.on("down", () => {
            Object.values(this.players).forEach(player => {
                console.log("Firing from player:", player.socketId);
                player.fire();
            });
        });
        this.input.on("pointerdown", (pointer) => {
            Object.values(this.players).forEach(player => {
                console.log("Pointer down event for player:", player.socketId);
                player.fire(pointer.x, pointer.y);
            });
        });

        // Overlap enemy with bullets
        Object.values(this.players).forEach(player => {
            this.physics.add.overlap(player.bullets, this.enemy_blue, (enemy, bullet) => {
                bullet.destroyBullet();
                this.enemy_blue.damage(player.x, player.y);
                this.points += 10;
                this.scene.get("HudScene").update_points(this.points);
            });

            // Overlap player with enemy bullets
            this.physics.add.overlap(this.enemy_blue.bullets, player, (playerObj, bullet) => {
                bullet.destroyBullet();
                this.cameras.main.shake(100, 0.01);
                // Flash the color white for 300ms
                this.cameras.main.flash(300, 255, 10, 10, false);
                this.points -= 10;
                this.scene.get("HudScene").update_points(this.points);
            });
        });
    }

    update() {
        Object.values(this.players).forEach(player => player.update());
        this.enemy_blue.update();

        // Player movement entries
        if (this.cursors && this.cursors.up.isDown) {
            Object.values(this.players).forEach(player => player.move("up"));
        }
        if (this.cursors && this.cursors.down.isDown) {
            Object.values(this.players).forEach(player => player.move("down"));
        }
    }
}
