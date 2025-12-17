let sentiment;
let inputBox;
let submitBtn;
let sentimentResult;

function preload() {
    // Initialize the sentiment analysis model
    sentiment = ml5.sentiment("MovieReviews");
}

function setup() {
    noCanvas();

    const wrapper = createDiv();
    wrapper.class('input-wrapper');

    inputBox = createInput("Today is the horrible day and is full of horror!");
    inputBox.attribute("size", "75");
    inputBox.parent(wrapper);

    submitBtn = createButton("submit");
    submitBtn.parent(wrapper);

    sentimentResult = createP("Sentiment confidence:");

    submitBtn.mousePressed(getSentiment);
}

function getSentiment() {
    let text = inputBox.value();
    // Start making the prediction
    sentiment.predict(text, gotResult);
}

function gotResult(prediction) {
    sentimentResult.html("Sentiment confidence: " + prediction.confidence);
}

// Start predicting when the 'Enter' key is pressed
function keyPressed() {
    if (keyCode === ENTER) {
        getSentiment();
    }
}