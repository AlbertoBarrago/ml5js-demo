let classifier;
let predictedWord = "";

let words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "up",
    "down",
    "left",
    "right",
    "go",
    "stop",
    "yes",
    "no",
];

function setup() {
    const cnv = createCanvas(650, 450);
    cnv.center('horizontal');

    let options = { probabilityThreshold: 0.95 };
    classifier = ml5.soundClassifier("SpeechCommands18w", options, modelReady);
}

function modelReady() {
    console.log("Model Loaded!");
    // Start classification with microphone after model loads
    classifier.classifyStart(gotResult);
}
function gotResult(results) {
    console.log("Top result:", results[0].label, results[0].confidence);
    if (results && results[0] && results[0].label !== "_background_noise_") {
        predictedWord = results[0].label;
    }
}

function displayWords() {
    textAlign(CENTER, CENTER);
    textSize(32);
    fill(96);
    text("Say one of these words!", width / 2, 40);
    let x = 125;
    let y = 150;
    for (let i = 0; i < words.length; i++) {
        fill(158);
        text(words[i], x, y);
        y += 50;
        if ((i + 1) % 6 === 0) {
            x += 200;
            y = 150;
        }
    }
}

function draw() {
    background(250);
    displayWords();
    if (predictedWord !== "" && predictedWord !== "_background_noise_") {
        fill(211, 107, 255);
        textAlign(CENTER, CENTER);
        textSize(64);
        text(predictedWord, width / 2, 90);
    }
}