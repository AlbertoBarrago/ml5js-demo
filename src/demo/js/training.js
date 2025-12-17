let nn;
let trainingData = [];
let isTrained = false;

async function initNN() {
    // required for training on GPU, wait that webgl is ready
    await tf.ready();

    const options = {
        task: 'classification',
        debug: false,
        inputs: ['temperature', 'pressure', 'vibration'],
        outputs: ['quality'],
        learningRate: 0.2,
        hiddenUnits: 16
    };

    nn = ml5.neuralNetwork(options);
    logToDiv('✓ Rete neurale inizializzata');
    logToDiv(`→ Inputs: ${options.inputs.join(', ')}`);
    logToDiv(`→ Output: ${options.outputs[0]}`);
    logToDiv(`→ Hidden units: ${options.hiddenUnits}`);
    logToDiv(`→ Backend: ${tf.getBackend()}`);
}

window.addData = function addData() {
    const temp = parseFloat(document.getElementById('temp').value);
    const pressure = parseFloat(document.getElementById('pressure').value);
    const vibration = parseFloat(document.getElementById('vibration').value);
    const quality = document.getElementById('quality').value;

    const inputs = {
        temperature: temp,
        pressure: pressure,
        vibration: vibration
    };

    const output = {
        quality: quality
    };

    nn.addData(inputs, output);
    trainingData.push({...inputs, quality});

    _updateTable();
    _updateStatus();
    logToDiv(`+ Campione aggiunto: ${quality.toUpperCase()}`);

    document.getElementById('temp').value = (temp + (Math.random() - 0.5) * 10).toFixed(1);
    document.getElementById('pressure').value = (pressure + (Math.random() - 0.5) * 0.5).toFixed(1);
    document.getElementById('vibration').value = Math.round(vibration + (Math.random() - 0.5) * 20);
}

window.addSampleData = function addSampleData() {
    const samples = [
        {temp: 22, pressure: 1.2, vibration: 45, quality: 'ok'},
        {temp: 24, pressure: 1.3, vibration: 48, quality: 'ok'},
        {temp: 23, pressure: 1.1, vibration: 42, quality: 'ok'},
        {temp: 25, pressure: 1.4, vibration: 50, quality: 'ok'},
        {temp: 21, pressure: 1.2, vibration: 44, quality: 'ok'},

        {temp: 85, pressure: 3.5, vibration: 120, quality: 'difettoso'},
        {temp: 90, pressure: 3.8, vibration: 125, quality: 'difettoso'},
        {temp: 88, pressure: 3.6, vibration: 118, quality: 'difettoso'},
        {temp: 92, pressure: 3.9, vibration: 130, quality: 'difettoso'},
        {temp: 87, pressure: 3.7, vibration: 122, quality: 'difettoso'},

        {temp: 55, pressure: 2.2, vibration: 80, quality: 'riparabile'},
        {temp: 58, pressure: 2.4, vibration: 85, quality: 'riparabile'},
        {temp: 52, pressure: 2.1, vibration: 78, quality: 'riparabile'},
        {temp: 60, pressure: 2.5, vibration: 88, quality: 'riparabile'},
        {temp: 54, pressure: 2.3, vibration: 82, quality: 'riparabile'},
    ];

    samples.forEach(sample => {
        const inputs = {
            temperature: sample.temp,
            pressure: sample.pressure,
            vibration: sample.vibration
        };

        const output = {
            quality: sample.quality
        };

        nn.addData(inputs, output);
        trainingData.push({...inputs, quality: sample.quality});
    });

    _updateTable();
    _updateStatus();
    logToDiv(`+ ${samples.length} campioni di esempio aggiunti`);
}

window.trainModel = async function trainModel() {
    if (trainingData.length < 5) {
        logToDiv('⚠ Servono almeno 5 campioni per il training');
        return;
    }

    document.getElementById('trainBtn').disabled = true;
    document.getElementById('modelStatus').textContent = 'TRAINING...';
    document.getElementById('modelStatus').style.color = '#ed8936';

    logToDiv('🔄 Normalizzazione dati...');
    nn.normalizeData();

    logToDiv('🧠 Inizio training...');

    const trainingOptions = {
        epochs: 50,
        batchSize: 12,
        validationSplit: 0.2,
    };

    nn.train(trainingOptions, _finishedTraining);
}

window.predict = async function predict() {
    if (!isTrained) {
        logToDiv('⚠ Devi prima addestrare il modello');
        return;
    }

    const temp = parseFloat(document.getElementById('testTemp').value);
    const pressure = parseFloat(document.getElementById('testPressure').value);
    const vibration = parseFloat(document.getElementById('testVibration').value);

    const input = {
        temperature: temp,
        pressure: pressure,
        vibration: vibration
    };

    logToDiv(`🔍 Predizione per: T=${temp}°C, P=${pressure}bar, V=${vibration}Hz`);

    const results = await nn.classify(input);

    _displayPrediction(results);
}

window.saveModel = function saveModel() {
    nn.save('quality-classifier');
    logToDiv('💾 Modello salvato localmente');
}

window.clearData = async function clearData() {
    if (confirm('Vuoi davvero cancellare tutti i dati?')) {
        trainingData = [];
        await initNN();
        isTrained = false;
        _updateTable();
        _updateStatus();
        document.getElementById('predictionResult').innerHTML = '';
        document.getElementById('trainBtn').disabled = true;
        document.getElementById('predictBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;
        logToDiv('🗑️ Dati cancellati, rete reinizializzata');
    }
}

function _displayPrediction(results) {
    const topResult = results[0];
    logToDiv(`→ Risultato: ${topResult.label.toUpperCase()} (${(topResult.confidence * 100).toFixed(1)}%)`);

    let resultColor;
    switch (topResult.label) {
        case 'ok':
            resultColor = '#38a169';
            break;
        case 'difettoso':
            resultColor = '#e53e3e';
            break;
        case 'riparabile':
            resultColor = '#ed8936';
            break;
    }

    let html = `
                <div class="prediction-result">
                    <div class="result-label">Predizione Qualità</div>
                    <div class="result-value" style="color: ${resultColor}">
                        ${topResult.label.toUpperCase()}
                    </div>
                    <div class="confidence-bars">
            `;

    results.forEach(result => {
        const percentage = (result.confidence * 100).toFixed(1);
        html += `
                    <div class="confidence-bar">
                        <div class="confidence-label">${result.label}</div>
                        <div class="confidence-track">
                            <div class="confidence-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="confidence-value">${percentage}%</div>
                    </div>
                `;
    });

    html += `
                    </div>
                </div>
            `;

    document.getElementById('predictionResult').innerHTML = html;
}

function _finishedTraining() {
    logToDiv('✓ Training completato!');
    isTrained = true;

    document.getElementById('modelStatus').textContent = 'ADDESTRATA';
    document.getElementById('modelStatus').style.color = '#38a169';
    document.getElementById('predictBtn').disabled = false;
    document.getElementById('saveBtn').disabled = false;
    document.getElementById('trainBtn').disabled = false;
}

function _updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    trainingData.forEach((data, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${data.temperature.toFixed(1)}</td>
                    <td>${data.pressure.toFixed(1)}</td>
                    <td>${data.vibration}</td>
                    <td><span class="badge ${data.quality}">${data.quality}</span></td>
                `;
    });
}

function _updateStatus() {
    document.getElementById('sampleCount').textContent = trainingData.length;

    if (trainingData.length >= 5) {
        document.getElementById('trainBtn').disabled = false;
    }
}

window.addEventListener('load', async () => {
    await initNN();
});