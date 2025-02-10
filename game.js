const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreElement = document.getElementById('score');
        const diffButtons = document.querySelectorAll('.diff-btn');

        // Configuración del canvas
        canvas.width = 800;
        canvas.height = 600;

        // Configuración de dificultad
        const difficulties = {
            easy: { enemySpeed: 1, bulletSpeed: 4, shootingRate: 30 },
            medium: { enemySpeed: 1.5, bulletSpeed: 7, shootingRate: 20 },
            hard: { enemySpeed: 2, bulletSpeed: 9, shootingRate: 10 }
        };
        let currentDifficulty = 'easy';

        // Sprites en ASCII Art (simulando pixel art)
        const sprites = {
            player: [
                "  ▲  ",
                " ███ ",
                "█████"
            ],
            enemy1: [
                "▀█▀",
                "█▄█",
                "▀ ▀"
            ],
            enemy2: [
                "▄█▄",
                "███",
                "▀ ▀"
            ]
        };

        // Sistema de sonido
        const sounds = {
            shoot: new Audio('data:audio/wav;base64,UklGRqgAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YYQAAAAaAAAAGwAAABoAAAAZAAAAGgAAABsAAAAaAAAAGQAAABoAAAAbAAAAGgAAABkAAAAaAAAAGwAAABoAAAAZAAAAGgAAABsAAAAaAAAAGQAAABoAAAAbAAAAGgAAABkAAAAaAAAAGwAAABoAAAAZAAAAGgAAABsAAAAaAAAAGQAAAA=='),
            explosion: new Audio('data:audio/wav;base64,UklGRpgAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXQAAAAzAAAAKAAAABkAAAAOAAAABQAAAAEAAAAFAAAADgAAABkAAAAoAAAAMwAAAD4AAABCAAAAPgAAADMAAAAoAAAAGQAAAA4AAAAFAAAAAQAAAAUAAAAOAAAAGQAAAA=='),
            gameOver: new Audio('data:audio/wav;base64,UklGRogAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YWQAAABCAAAAPgAAADMAAAAoAAAAGQAAAA4AAAAFAAAAAQAAAAUAAAAOAAAAGQAAACgAAAAzAAAAPgAAAEIAAAA+AAAAMwAAACgAAAAZAAAADgAAAAUAAAABAAAAAQAAAA==')
        };

        // Variables del juego
        let score = 0;
        let gameOver = false;
        let isShooting = false;
        let lastTouch = null;
        let shootingCooldown = 0;

        // Jugador
        const player = {
            x: canvas.width / 2,
            y: canvas.height - 50,
            width: 50,
            height: 30,
            speed: 5
        };

        // Proyectiles
        const bullets = [];
        const enemyBullets = [];

        // Enemigos
        const enemies = [];
        const enemyRows = 5;
        const enemyCols = 8;
        const enemyWidth = 40;
        const enemyHeight = 30;
        const enemyPadding = 20;
        let enemyDirection = 1;

        // Dibujar sprite
        function drawSprite(sprite, x, y, width, height, color = '#fff') {
            const cellWidth = width / sprite[0].length;
            const cellHeight = height / sprite.length;
            
            ctx.fillStyle = color;
            sprite.forEach((row, rowIndex) => {
                [...row].forEach((cell, cellIndex) => {
                    if (cell !== ' ') {
                        ctx.fillRect(
                            x + cellIndex * cellWidth,
                            y + rowIndex * cellHeight,
                            cellWidth,
                            cellHeight
                        );
                    }
                });
            });
        }

        // Crear enemigos
        function createEnemies() {
            enemies.length = 0;
            for (let i = 0; i < enemyRows; i++) {
                for (let j = 0; j < enemyCols; j++) {
                    enemies.push({
                        x: j * (enemyWidth + enemyPadding) + 50,
                        y: i * (enemyHeight + enemyPadding) + 50,
                        width: enemyWidth,
                        height: enemyHeight,
                        sprite: i % 2 === 0 ? sprites.enemy1 : sprites.enemy2
                    });
                }
            }
        }

        // Disparar
        function shoot() {
            if (shootingCooldown <= 0) {
                bullets.push({
                    x: player.x + player.width / 2,
                    y: player.y,
                    width: 3,
                    height: 15
                });
                sounds.shoot.cloneNode().play();
                shootingCooldown = difficulties[currentDifficulty].shootingRate;
            }
        }

        // Enemigos disparan
        function enemyShoot() {
            if (enemies.length > 0 && Math.random() < 0.02) {
                const shooter = enemies[Math.floor(Math.random() * enemies.length)];
                enemyBullets.push({
                    x: shooter.x + shooter.width / 2,
                    y: shooter.y + shooter.height,
                    width: 3,
                    height: 15
                });
            }
        }

        // Control de dificultad
        diffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                diffButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentDifficulty = btn.dataset.diff;
            });
        });

        // Control de teclado
        const keys = {};
        document.addEventListener('keydown', e => keys[e.key] = true);
        document.addEventListener('keyup', e => keys[e.key] = false);

        // Variables para control táctil
        let touchSensitivity = 1.5; // Aumentamos la sensibilidad
        let lastTouchX = null;
        let lastTouchTime = 0;
        const TOUCH_THRESHOLD = 300; // ms para distinguir entre tap y movimiento

        // Control táctil mejorado
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchTime = Date.now();
            isShooting = true;

            // Reiniciar juego si está en game over
            if (gameOver) {
                const rect = canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // Verificar si el toque está en el área del mensaje de game over
                if (y > canvas.height/2 - 50 && y < canvas.height/2 + 100) {
                    resetGame();
                }
            }
        });

        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            if (lastTouchX !== null && !gameOver) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - lastTouchX;
                // Aplicamos la sensibilidad aumentada al movimiento
                player.x += deltaX * touchSensitivity;
                
                // Mantener el jugador dentro de los límites
                player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
                
                lastTouchX = touch.clientX;
            }
        });

        canvas.addEventListener('touchend', e => {
            e.preventDefault();
            isShooting = false;
            lastTouchX = null;

            // Detectar tap para reinicio
            if (gameOver && Date.now() - lastTouchTime < TOUCH_THRESHOLD) {
                resetGame();
            }
        });

        // Actualizar
        function update() {
            if (gameOver) return;

            shootingCooldown--;

            // Movimiento del jugador
            if (keys['ArrowLeft']) player.x -= player.speed;
            if (keys['ArrowRight']) player.x += player.speed;
            if (keys[' '] || isShooting) shoot();

            // Límites del jugador
            player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

            // Actualizar balas
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].y -= difficulties[currentDifficulty].bulletSpeed;
                if (bullets[i].y < 0) bullets.splice(i, 1);
            }

            // Actualizar balas enemigas
            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                enemyBullets[i].y += difficulties[currentDifficulty].bulletSpeed;
                if (enemyBullets[i].y > canvas.height) {
                    enemyBullets.splice(i, 1);
                }
            }

            // Enemigos disparan
            enemyShoot();

            // Movimiento de enemigos
            let touchingEdge = false;
            enemies.forEach(enemy => {
                enemy.x += difficulties[currentDifficulty].enemySpeed * enemyDirection;
                if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
                    touchingEdge = true;
                }
            });

            if (touchingEdge) {
                enemyDirection *= -1;
                enemies.forEach(enemy => {
                    enemy.y += 30;
                });
            }

            // Colisiones balas jugador
            for (let i = bullets.length - 1; i >= 0; i--) {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (collision(bullets[i], enemies[j])) {
                        bullets.splice(i, 1);
                        enemies.splice(j, 1);
                        score += 100;
                        scoreElement.textContent = `Score: ${score}`;
                        sounds.explosion.cloneNode().play();
                        break;
                    }
                }
            }

            // Colisiones balas enemigas
            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                if (collision(enemyBullets[i], player)) {
                    gameOver = true;
                    sounds.gameOver.play();
                    break;
                }
            }

            // Verificar game over
            enemies.forEach(enemy => {
                if (enemy.y + enemy.height >= player.y || collision(enemy, player)) {
                    gameOver = true;
                    sounds.gameOver.play();
                }
            });

            // Generar nuevos enemigos
            if (enemies.length === 0) {
                createEnemies();
            }
        }

        // Detectar colisiones
        function collision(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }

        // Dibujar
        function draw() {
            ctx.fillStyle = '#000033';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Dibujar estrellas
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 100; i++) {
                ctx.fillRect(
                    Math.sin(i * 383.12 + Date.now() * 0.001) * canvas.width/2 + canvas.width/2,
                    Math.cos(i * 437.23 + Date.now() * 0.001) * canvas.height/2 + canvas.height/2,
                    1, 1
                );
            }

            // Dibujar jugador
            drawSprite(sprites.player, player.x, player.y, player.width, player.height, '#00ff00');

            // Dibujar balas
            ctx.fillStyle = '#fff';
            bullets.forEach(bullet => {
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            });

            // Dibujar balas enemigas
            ctx.fillStyle = '#ff0000';
            enemyBullets.forEach(bullet => {
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            });

            // Dibujar enemigos
            enemies.forEach(enemy => {
                drawSprite(enemy.sprite, enemy.x, enemy.y, enemy.width, enemy.height, '#ff0000');
            });

            if (gameOver) {
                ctx.fillStyle = '#fff';
                ctx.font = '48px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
                ctx.font = '24px "Press Start 2P"';
                // Cambio el mensaje para que sea más claro en móviles
                ctx.fillText('Toca para reiniciar', canvas.width/2, canvas.height/2 + 50);
            }
        }

        // Ajuste automático del canvas para mejor visualización en móvil
        function resizeCanvas() {
            const maxWidth = window.innerWidth * 0.95;
            const maxHeight = window.innerHeight * 0.9;
            const ratio = canvas.width / canvas.height;

            let newWidth = maxWidth;
            let newHeight = maxWidth / ratio;

            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = maxHeight * ratio;
            }

            canvas.style.width = `${newWidth}px`;
            canvas.style.height = `${newHeight}px`;
        }

        // Llamar a resizeCanvas cuando la ventana cambie de tamaño
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Función de reinicio del juego
        function resetGame() {
            gameOver = false;
            score = 0;
            scoreElement.textContent = 'Score: 0';
            enemies.length = 0;
            bullets.length = 0;
            enemyBullets.length = 0;
            player.x = canvas.width / 2;
            createEnemies();
        }

        // Click para reiniciar
        canvas.addEventListener('click', (e) => {
            if (gameOver) {
                resetGame();
            }
        });

        // Loop principal
        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }
        
        // Función para generar efectos de partículas en explosiones
        function createExplosion(x, y) {
            const particles = [];
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * 2 / 10) * i;
                particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2,
                    life: 20
                });
            }
            return particles;
        }

        // Iniciar juego
        createEnemies();
        gameLoop();