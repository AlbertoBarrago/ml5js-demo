let bodyPose;
let video;
let poses = [];
let connections;

function preload() {
    bodyPose = ml5.bodyPose();
}

function setup() {
    log("Setup starting...");
    createCanvas(640, 480);

    log("Requesting camera access...");
    video = createCapture(VIDEO, () => {
        log("Camera access granted!");
    });
    video.size(640, 480);
    video.hide();

    bodyPose.detectStart(video, gotPoses);

    connections = bodyPose.getSkeleton();
    log("Setup complete");
}

function gotPoses(results) {
    poses = results;
}

function draw() {
    image(video, 0, 0, width, height);
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        for (let j = 0; j < connections.length; j++) {
            let pointAIndex = connections[j][0];
            let pointBIndex = connections[j][1];
            let pointA = pose.keypoints[pointAIndex];
            let pointB = pose.keypoints[pointBIndex];
            if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
                stroke(255, 0, 0);
                strokeWeight(2);
                line(pointA.x, pointA.y, pointB.x, pointB.y);
            }
        }
    }
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            if (keypoint.confidence > 0.1) {
                fill(0, 255, 0);
                noStroke();
                circle(keypoint.x, keypoint.y, 10);
            }
        }
    }
}

// p5.js will automatically call preload(), setup(), and draw()