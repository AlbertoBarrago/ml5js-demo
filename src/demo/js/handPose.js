let handPose;
let video;
let hands = [];
let bubbles = [];
let previousHands = [];
let showLoveText = false;
let loveTextAlpha = 0;
let loveTextSize = 60;
let loveTet = "I love you Bibi";

class Bubble {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = random(10, 40);
        this.speedY = random(-2, -5);
        this.speedX = random(-1, 1);
        this.alpha = 255;
        this.color = color(random(100, 255), random(100, 255), random(100, 255));
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.alpha -= 3;
        this.size += 0.2;
    }

    display() {
        push();
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.alpha);
        circle(this.x, this.y, this.size);

        // Add a highlight for bubble effect
        fill(255, 255, 255, this.alpha * 0.5);
        circle(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.3);
        pop();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

function preload() {
    handPose = ml5.handPose();
}

function setup() {
    const ctx = createCanvas(1200, 850);
    ctx.center('horizontal');

    video = createCapture(VIDEO);
    video.size(1200, 850);
    video.hide();

    handPose.detectStart(video, gotHands);
}

function gotHands(results) {
    hands = results;
}

function detectMovement() {
    if (previousHands.length !== hands.length) {
        previousHands = JSON.parse(JSON.stringify(hands));
        return false;
    }

    for (let i = 0; i < hands.length; i++) {
        if (!previousHands[i]) continue;

        for (let j = 0; j < hands[i].keypoints.length; j++) {
            let current = hands[i].keypoints[j];
            let previous = previousHands[i].keypoints[j];

            let distance = dist(current.x, current.y, previous.x, previous.y);

            // If movement detected, generate bubbles
            if (distance > 5) {
                // Generate 1-3 bubbles per moving finger
                let numBubbles = floor(random(1, 4));
                for (let k = 0; k < numBubbles; k++) {
                    bubbles.push(new Bubble(
                        current.x + random(-20, 20),
                        current.y + random(-20, 20)
                    ));
                }
            }
        }
    }

    previousHands = JSON.parse(JSON.stringify(hands));
}

function detectCircleGesture() {
    for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];

        // Get thumb tip (keypoint 4) and index finger tip (keypoint 8)
        let thumbTip = hand.keypoints[4];
        let indexTip = hand.keypoints[8];

        // Calculate distance between thumb and index finger
        let distance = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);

        // If they're close together (making a circle), show the text
        if (distance < 40) {
            showLoveText = true;
            return;
        }
    }

    showLoveText = false;
}

function draw() {
    image(video, 0, 0, width, height);

    // Detect movement and generate bubbles
    if (hands.length > 0) {
        detectMovement();
        detectCircleGesture();
    }

    for (let i = bubbles.length - 1; i >= 0; i--) {
        bubbles[i].update();
        bubbles[i].display();

        if (bubbles[i].isDead()) {
            bubbles.splice(i, 1);
        }
    }

    if (showLoveText) {
        loveTextAlpha = lerp(loveTextAlpha, 255, 0.1);
        loveTextSize = 60 + sin(frameCount * 0.1) * 10;
    } else {
        loveTextAlpha = lerp(loveTextAlpha, 0, 0.1);
    }

    if (loveTextAlpha > 1) {
        push();
        textAlign(CENTER, CENTER);
        textSize(loveTextSize);

        // Draw text shadow for depth
        fill(0, 0, 0, loveTextAlpha * 0.5);
        text(loveTet, width / 2 + 3, height / 2 + 3);

        // Draw main text with gradient-like effect
        fill(255, 20, 147, loveTextAlpha); // Deep pink color
        text(loveTet, width / 2, height / 2);

        // Add heart emojis around the text
        textSize(40);
        fill(255, 0, 0, loveTextAlpha);
        text("❤️", width / 2 - 200, height / 2);
        text("❤️", width / 2 + 200, height / 2);

        pop();
    }

    // Draw all the tracked hand points
    for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        for (let j = 0; j < hand.keypoints.length; j++) {
            let keypoint = hand.keypoints[j];
            fill(0, 255, 0);
            noStroke();
            circle(keypoint.x, keypoint.y, 10);
        }
    }
}
