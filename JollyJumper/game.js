const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const gameOverDiv = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const colorButtons = document.querySelectorAll('.colorBtn');
const colorSelectionDiv = document.getElementById('colorSelection');
const endGameBtn = document.getElementById('endGameBtn');

let ball, obstacles, score, isGameOver, keysDown, animationId;
let selectedColor = null;
let frameCount = 0;

function randomColor() {
    const colors = ['#ff6f91', '#f9d423', '#6a89cc', '#38ada9', '#e17055', '#fdcb6e', '#00b894', '#fd79a8'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ----- Breaking Animation -----
function createPieces(obs) {
    let pieceCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < pieceCount; i++) {
        let piece = {
            x: obs.x + Math.random() * obs.width,
            y: obs.y + Math.random() * obs.height,
            size: Math.min(obs.width, obs.height) / 4,
            color: obs.color,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 1) * 6,
            gravity: 0.3,
            life: 40 + Math.random() * 20
        };
        obs.pieces.push(piece);
    }
}

function updatePieces(obs) {
    for (let i = obs.pieces.length - 1; i >= 0; i--) {
        let p = obs.pieces[i];
        p.dy += p.gravity;
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        if (p.life <= 0 || p.y > canvas.height) {
            obs.pieces.splice(i, 1);
        }
    }
}
// -----------------------------

function resetGame() {
    ball = {
        x: canvas.width / 2,
        y: canvas.height - 40,
        radius: 22,
        color: selectedColor || '#ff6f91',
        dx: 0,
        dy: 0,
        gravity: 0.5,
        bounce: 0.8
    };
    obstacles = [];
    score = 0;
    isGameOver = false;
    keysDown = {};
    scoreDiv.textContent = 'Score: 0';
    gameOverDiv.style.display = 'none';
    frameCount = 0;
}

function drawBall() {
    ctx.save();
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
    ctx.restore();
}

function drawObstacles() {
    obstacles.forEach(obs => {
        if (!obs.broken) {
            ctx.save();
            ctx.shadowColor = obs.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = obs.color;
            switch (obs.shapeType) {
                case 0: // rectangle
                    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                    break;
                case 1: // circle
                    ctx.beginPath();
                    ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 2: // triangle
                    ctx.beginPath();
                    ctx.moveTo(obs.x + obs.width / 2, obs.y);
                    ctx.lineTo(obs.x, obs.y + obs.height);
                    ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
            ctx.restore();
        } else {
            // Draw breaking pieces
            obs.pieces.forEach(p => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life / 60);
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    });
}

function updateBall() {
    ball.dy += ball.gravity;
    ball.y += ball.dy;
    ball.x += ball.dx;

    // Bounce off floor
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.dy = -ball.dy * ball.bounce;
    }
    // Bounce off ceiling
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.dy = -ball.dy * ball.bounce;
    }
    // Bounce off walls
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.dx = -ball.dx * ball.bounce;
    }
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.dx = -ball.dx * ball.bounce;
    }
}

function addObstacle() {
    // Intensity increases every 10 points
    let sizeMultiplier = 1 + Math.floor(score / 10) * 0.2;
    let speedMultiplier = 1 + Math.floor(score / 10) * 0.18;
    let baseWidth = 60, baseHeight = 24;
    let width = baseWidth * sizeMultiplier + Math.random() * 60 * sizeMultiplier;
    let height = baseHeight * sizeMultiplier + Math.random() * 16 * sizeMultiplier;
    let x = Math.random() * (canvas.width - width);
    let color = randomColor();
    let shapeType = Math.floor(Math.random() * 3); // 0: rect, 1: circle, 2: triangle
    obstacles.push({ x, y: -height, width, height, color, shapeType, broken: false, pieces: [], speedMultiplier });
}

function updateObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        if (!obs.broken) {
            let baseSpeed = 4;
            let speed = (baseSpeed + score * 0.1) * obs.speedMultiplier;
            obs.y += speed;
            if (obs.y + obs.height >= canvas.height) {
                obs.broken = true;
                createPieces(obs);
            }
        } else {
            updatePieces(obs);
        }
    }
    // Remove off-screen obstacles and increase score
    while (obstacles.length && obstacles[0].broken && obstacles[0].pieces.length === 0) {
        obstacles.shift();
        score++;
        scoreDiv.textContent = 'Score: ' + score;
    }
}

function checkCollision() {
    for (let obs of obstacles) {
        if (obs.broken) continue;
        // Simple collision for all shapes
        let distX = Math.abs(ball.x - (obs.x + obs.width / 2));
        let distY = Math.abs(ball.y - (obs.y + obs.height / 2));
        let collision = false;
        switch (obs.shapeType) {
            case 0: // rectangle
                if (distX < obs.width / 2 + ball.radius && distY < obs.height / 2 + ball.radius) collision = true;
                break;
            case 1: // circle
                let dx = ball.x - (obs.x + obs.width / 2);
                let dy = ball.y - (obs.y + obs.height / 2);
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < ball.radius + obs.width / 2) collision = true;
                break;
            case 2: // triangle (approximate as bounding box)
                if (distX < obs.width / 2 + ball.radius && distY < obs.height / 2 + ball.radius) collision = true;
                break;
        }
        if (collision) {
            isGameOver = true;
            break;
        }
    }
}

function handleInput() {
    if (keysDown['ArrowLeft']) ball.dx = -6;
    else if (keysDown['ArrowRight']) ball.dx = 6;
    else ball.dx = 0;
}

function drawBackgroundBubbles() {
    for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            10 + Math.random() * 16,
            0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fill();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundBubbles();
    drawBall();
    drawObstacles();
    handleInput();
    updateBall();
    updateObstacles();
    checkCollision();

    if (isGameOver) {
        cancelAnimationFrame(animationId);
        finalScore.textContent = 'Your Score: ' + score;
        gameOverDiv.style.display = 'block';
        return;
    }

    // Add new obstacle every 60 frames (~1 second)
    frameCount++;
    if (frameCount % 60 === 0 && obstacles.length < 6) {
        addObstacle();
    }

    animationId = requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', function (e) {
    keysDown[e.key] = true;
});
document.addEventListener('keyup', function (e) {
    keysDown[e.key] = false;
});

startBtn.addEventListener('click', () => {
    if (!selectedColor) {
        alert('Please select a ball color before starting the game.');
        return;
    }
    startBtn.style.display = 'none';
    colorSelectionDiv.style.display = 'none';
    canvas.style.display = 'block';
    scoreDiv.style.display = 'block';
    resetGame();
    animationId = requestAnimationFrame(gameLoop);
});

restartBtn.addEventListener('click', () => {
    resetGame();
    animationId = requestAnimationFrame(gameLoop);
    gameOverDiv.style.display = 'none';
});

colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        colorButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = btn.getAttribute('data-color');
    });
});

endGameBtn.addEventListener('click', () => {
    cancelAnimationFrame(animationId);
    gameOverDiv.style.display = 'none';
    canvas.style.display = 'none';
    scoreDiv.style.display = 'none';
    startBtn.style.display = 'inline-block';
    colorSelectionDiv.style.display = 'flex';
});
