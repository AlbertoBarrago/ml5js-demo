let bodySegmentation;
let segmentation;
let video;

let options = {
	maskType: "parts",
};

function preload() {
	bodySegmentation = ml5.bodySegmentation("BodyPix", options);
}

function setup() {
	var cnv = createCanvas(640, 480);
	cnv.center('horizontal');
	video = createCapture(VIDEO);
	video.size(640, 480);
	video.hide();
	// Start body segmentation
	bodySegmentation.detectStart(video, gotResults);
}

function gotResults(result) {
	segmentation = result;
}

function draw() {
	background(255);
	image(video, 0, 0);
	if (segmentation) {
		image(segmentation.mask, 0, 0, width, height);
	}
}
