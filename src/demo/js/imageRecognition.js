let classifier;
let img;
let canvas;
let currentResults = null;

async function setup() {
    // Create the canvas and hide it initially
    canvas = createCanvas(400, 400);
    canvas.parent('canvasContainer');
    canvas.hide();

    // Show loading message
    document.getElementById('resultsContent').innerHTML = '<div class="loading">Loading AI model...</div>';
    document.getElementById('results').classList.add('active');

    // Load classifier
    classifier = await ml5.imageClassifier("MobileNet");

    // Hide loading message
    document.getElementById('results').classList.remove('active');

    // Setup file input handler
    document.getElementById('fileInput').addEventListener('change', handleFile);

    // Set up button handlers
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('downloadBtn').addEventListener('click', downloadJSON);

    noLoop();
}

function handleFile(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();

        reader.onload = async (e) => {
            img = loadImage(e.target.result, async () => {
                canvas.show();

                const maxSize = 400;
                let w = img.width;
                let h = img.height;

                if (w > h) {
                    if (w > maxSize) {
                        h = h * (maxSize / w);
                        w = maxSize;
                    }
                } else {
                    if (h > maxSize) {
                        w = w * (maxSize / h);
                        h = maxSize;
                    }
                }

                resizeCanvas(w, h);
                redraw();

                document.getElementById('resultsContent').innerHTML = '<div class="loading">Analyzing image...</div>';
                document.getElementById('results').classList.add('active');

                try {
                    const results = await classifier.classify(img);
                    _displayResults(results);
                } catch (error) {
                    document.getElementById('resultsContent').innerHTML = `<div class="loading" style="color: red;">Error: ${error.message}</div>`;
                }
            });
        };

        reader.readAsDataURL(file);
    }
}

function draw() {
    if (img) {
        image(img, 0, 0, width, height);
    }
}

function _displayResults(results) {
    currentResults = results;
    const resultsDiv = document.getElementById('resultsContent');
    let html = '';

    results.slice(0, 3).forEach((result, index) => {
        const confidence = (result.confidence * 100).toFixed(2);
        html += `
            <div class="result-item">
                <div class="result-label">${index + 1}. ${result.label}</div>
                <div class="result-confidence">Confidence: ${confidence}%</div>
            </div>
        `;
    });

    resultsDiv.innerHTML = html;
    document.getElementById('results').classList.add('active');
}

function clearAll() {
    // Clear file input
    document.getElementById('fileInput').value = '';

    // Hide canvas
    canvas.hide();
    clear();

    // Hide results
    document.getElementById('results').classList.remove('active');

    // Clear variables
    img = null;
    currentResults = null;
}

function downloadJSON() {
    if (!currentResults) {
        alert('No results to download');
        return;
    }

    const data = {
        timestamp: new Date().toISOString(),
        model: 'MobileNet',
        results: currentResults.map(result => ({
            label: result.label,
            confidence: result.confidence
        }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-recognition-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}