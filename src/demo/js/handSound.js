let handPose;
let video;
let hands = [];
let audioReady = false;
let audioCtx;
let masterGain;
let startButton;
let midiButton;
let scaleSelect;
let statusText = "Loading hand model...";
let currentScale = "minor";
let noteEvents = [];
let sessionStartedAt = null;
let leftHandState = null;
let rightHandState = null;
let trails = [];
let sparkles = [];
let fingerMemory = {};
let activeFingerCount = 0;
let activeKeyIndexes = [];
let eqBands = Array.from({length: 32}, () => 0);

const CANVAS_W = 1280;
const CANVAS_H = 760;
const KEYBED_TOP = 0.42;
const KEYBED_BOTTOM = 0.96;
const KEYBOARD_OCTAVES = 2;
const PRESS_THRESHOLD = 0.42;
const RELEASE_THRESHOLD = 0.24;
const TAP_DOWNWARD_THRESHOLD = 0.18;
const TAP_COOLDOWN = 0.18;
const FINGERTIPS = [
    {name: "thumb", index: 4},
    {name: "index", index: 8},
    {name: "middle", index: 12},
    {name: "ring", index: 16},
    {name: "pinky", index: 20}
];

const scales = {
    minor: {
        name: "Minor",
        bpm: 96,
        root: 48,
        scale: [0, 3, 5, 7, 10, 12, 15, 17],
        color: [255, 211, 105]
    },
    major: {
        name: "Major",
        bpm: 96,
        root: 48,
        scale: [0, 2, 3, 5, 7, 9, 10, 12],
        color: [127, 221, 255]
    },
    pentatonic: {
        name: "Pentatonic",
        bpm: 96,
        root: 50,
        scale: [0, 2, 5, 7, 9, 12, 14, 17],
        color: [46, 204, 113]
    },
    chromatic: {
        name: "Chromatic",
        bpm: 96,
        root: 60,
        scale: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        color: [255, 255, 255]
    }
};

function preload() {
    handPose = ml5.handPose();
}

function setup() {
    const canvas = createCanvas(CANVAS_W, CANVAS_H);
    canvas.parent(document.body);

    pixelDensity(1);
    textFont("system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");

    video = createCapture(VIDEO, () => {
        statusText = "Camera ready. Start audio, hover, then tap down to play.";
    });
    video.size(CANVAS_W, CANVAS_H);
    video.hide();

    handPose.detectStart(video, gotHands);
    createControls();
}

function createControls() {
    const panel = createDiv();
    panel.class("hand-sound-panel");
    panel.parent(document.body);

    const profile = createImg("https://github.com/AlbertoBarrago.png", "Profile");
    profile.class("profile-image");
    profile.parent(panel);

    const title = createElement("h1", "Invisible Hand Piano");
    title.parent(panel);

    const subtitle = createP("Hover your fingertips, then tap down to play clean piano-like notes. The keyboard is intentionally invisible so your hands stay the instrument.");
    subtitle.parent(panel);

    const controls = createDiv();
    controls.class("hand-sound-controls");
    controls.parent(panel);

    scaleSelect = createSelect();
    scaleSelect.parent(controls);
    Object.keys(scales).forEach((key) => scaleSelect.option(scales[key].name, key));
    scaleSelect.selected(currentScale);
    scaleSelect.changed(() => {
        currentScale = scaleSelect.value();
        statusText = `${scales[currentScale].name} selected`;
    });

    startButton = createButton("Start audio");
    startButton.parent(controls);
    startButton.mousePressed(startAudio);

    midiButton = createButton("Export MIDI");
    midiButton.parent(controls);
    midiButton.attribute("disabled", "true");
    midiButton.mousePressed(downloadMidi);

    const homeLink = createA("/", "Back to demos");
    homeLink.parent(panel);
}

function startAudio() {
    if (audioReady) {
        stopAudio();
        return;
    }

    if (!audioCtx) {
        buildSynth();
    }

    audioCtx.resume();
    masterGain.gain.setTargetAtTime(0.82, audioCtx.currentTime, 0.02);
    audioReady = true;
    startButton.html("Stop audio");
    midiButton.removeAttribute("disabled");
    statusText = "Hover, then tap down with any fingertip.";
}

function stopAudio() {
    if (!audioCtx) return;

    masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.02);
    audioCtx.suspend();
    audioReady = false;
    activeFingerCount = 0;
    activeKeyIndexes = [];
    fingerMemory = {};
    startButton.html("Start audio");
    statusText = "Audio stopped.";
}

function buildSynth() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sessionStartedAt = audioCtx.currentTime;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.0001;

    masterGain.connect(audioCtx.destination);
}

function gotHands(results) {
    hands = results;
}

function draw() {
    drawStage();

    const trackedHands = getTrackedHands();
    leftHandState = trackedHands.left ? updateGesture(trackedHands.left, "left") : null;
    rightHandState = trackedHands.right ? updateGesture(trackedHands.right, "right") : null;

    if (leftHandState || rightHandState) {
        updateFingerKeyboard([leftHandState, rightHandState].filter(Boolean));
        if (trackedHands.left) drawHand(trackedHands.left, "left", leftHandState);
        if (trackedHands.right) drawHand(trackedHands.right, "right", rightHandState);
        statusText = audioReady ? getPerformanceStatus() : "Start audio to perform.";
    } else {
        fadeLead();
        activeFingerCount = 0;
        activeKeyIndexes = [];
        statusText = audioReady ? "Show one or two hands to the camera." : "Start audio, then show your hands.";
    }

    updateParticles();
    updateEqualizer();
    drawHud();
}

function getTrackedHands() {
    const sorted = hands
        .filter((hand) => hand.keypoints && hand.keypoints[8])
        .slice(0, 2)
        .sort((a, b) => mirroredX(a.keypoints[8].x) - mirroredX(b.keypoints[8].x));

    return {
        left: sorted[0] || null,
        right: sorted[1] || null
    };
}

function updateGesture(hand, side) {
    const keypoints = hand.keypoints;
    const thumbTip = keypoints[4];
    const indexTip = keypoints[8];
    const middleTip = keypoints[12];
    const wrist = keypoints[0];

    if (!thumbTip || !indexTip || !middleTip || !wrist) return null;

    const x = constrain(mirroredX(indexTip.x) / width, 0, 1);
    const y = constrain(indexTip.y / height, 0, 1);
    const openness = constrain(dist(thumbTip.x, thumbTip.y, middleTip.x, middleTip.y) / 220, 0, 1);
    const lift = constrain(1 - y, 0, 1);

    const previous = side === "left" ? leftHandState : rightHandState;
    const speed = previous ? constrain(dist(mirroredX(indexTip.x), indexTip.y, previous.screenX, previous.screenY) / 46, 0, 1) : 0;
    const fingers = FINGERTIPS.map((finger) => {
        const point = keypoints[finger.index];
        const previousFinger = previous && previous.fingers ? previous.fingers.find((item) => item.name === finger.name) : null;
        const screenX = mirroredX(point.x);
        const normalizedX = constrain(screenX / width, 0, 1);
        const normalizedY = constrain(point.y / height, 0, 1);
        const keyPressure = constrain(map(normalizedY, KEYBED_TOP, KEYBED_BOTTOM, 0, 1), 0, 1);
        const fingerSpeed = previousFinger ? constrain(dist(screenX, point.y, previousFinger.screenX, previousFinger.screenY) / 38, 0, 1) : 0;
        const downward = previousFinger ? constrain((point.y - previousFinger.screenY) / 42, 0, 1) : 0;
        const ready = keyPressure < RELEASE_THRESHOLD;
        const active = keyPressure > PRESS_THRESHOLD;
        const keyIndex = getFingerStep(normalizedX);
        const note = getFingerMidi(normalizedX);

        return {
            name: finger.name,
            index: finger.index,
            active,
            ready,
            keyIndex,
            note,
            pressure: previousFinger ? lerp(previousFinger.pressure, keyPressure, 0.35) : keyPressure,
            speed: previousFinger ? lerp(previousFinger.speed, fingerSpeed, 0.2) : fingerSpeed,
            downward,
            x: normalizedX,
            y: normalizedY,
            screenX,
            screenY: point.y
        };
    });
    const active = fingers.some((finger) => finger.active);

    const state = {
        side,
        active,
        x: previous ? lerp(previous.x, x, 0.18) : x,
        y: previous ? lerp(previous.y, y, 0.18) : y,
        lift: previous ? lerp(previous.lift, lift, 0.18) : lift,
        openness: previous ? lerp(previous.openness, openness, 0.18) : openness,
        speed: previous ? lerp(previous.speed, speed, 0.18) : speed,
        screenX: mirroredX(indexTip.x),
        screenY: indexTip.y,
        fingers
    };

    trails.push({
        x: state.screenX,
        y: state.screenY,
        life: 255,
        size: 10 + state.speed * 28,
        active,
        side
    });
    if (trails.length > 56) trails.shift();

    if (active && (!previous || !previous.active)) {
        burst(indexTip.x, indexTip.y, 12, side);
    }

    return state;
}

function updateFingerKeyboard(states) {
    if (!audioReady || states.length === 0) return;

    const now = audioCtx.currentTime;
    const playableFingers = states.flatMap((state) => state.fingers.map((finger) => ({...finger, side: state.side})));
    activeFingerCount = playableFingers.filter((finger) => finger.active).length;
    activeKeyIndexes = playableFingers.filter((finger) => finger.active).map((finger) => finger.keyIndex);

    playableFingers.forEach((finger) => {
        const key = `${finger.side}-${finger.name}`;
        const memory = fingerMemory[key] || {armed: true, note: null, lastTime: 0};
        const armed = memory.armed || finger.ready;
        const shouldTrigger = armed &&
            finger.active &&
            finger.downward > TAP_DOWNWARD_THRESHOLD &&
            now - memory.lastTime > TAP_COOLDOWN;

        if (shouldTrigger) {
            const velocity = round(constrain(54 + finger.pressure * 46 + finger.speed * 28, 42, 127));
            playFingerNote(now, finger.note, velocity, finger.side, finger.pressure);
            noteEvents.push({
                type: "lead",
                midi: finger.note,
                start: now - sessionStartedAt,
                duration: 0.2 + finger.pressure * 0.34,
                velocity
            });
            fingerMemory[key] = {armed: false, note: finger.note, lastTime: now};
        } else {
            fingerMemory[key] = {
                ...memory,
                armed: finger.ready ? true : armed && !finger.active,
                note: finger.note
            };
        }
    });
}

function getFingerMidi(normalizedX) {
    const step = getFingerStep(normalizedX);
    const scale = scales[currentScale];
    const octave = floor(step / scale.scale.length);
    const degree = scale.scale[step % scale.scale.length];
    return scale.root + 12 + degree + octave * 12;
}

function getFingerStep(normalizedX) {
    const scale = scales[currentScale];
    const keyboardSteps = scale.scale.length * KEYBOARD_OCTAVES;
    return constrain(floor(normalizedX * keyboardSteps), 0, keyboardSteps - 1);
}

function playFingerNote(time, midi, velocity, side, pressure) {
    const fundamental = audioCtx.createOscillator();
    const octave = audioCtx.createOscillator();
    const fifth = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    const pan = audioCtx.createStereoPanner();
    const level = velocity / 127;
    const frequency = midiToFreq(midi);
    const release = 0.45 + pressure * 0.55;

    fundamental.type = "triangle";
    octave.type = "sine";
    fifth.type = "sine";
    fundamental.frequency.value = frequency;
    octave.frequency.value = frequency * 2;
    fifth.frequency.value = frequency * 1.5;
    filter.type = "lowpass";
    filter.frequency.value = 1400 + pressure * 2600;
    filter.Q.value = 1.8;
    pan.pan.value = side === "left" ? -0.34 : 0.34;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.22 * level, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.07 * level, time + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + release);

    fundamental.connect(filter);
    octave.connect(filter);
    fifth.connect(filter);
    filter.connect(gain).connect(pan).connect(masterGain);
    fundamental.start(time);
    octave.start(time);
    fifth.start(time);
    fundamental.stop(time + release + 0.04);
    octave.stop(time + release + 0.04);
    fifth.stop(time + release + 0.04);
    exciteEqualizer(midi, level);
}

function fadeLead() {
    activeFingerCount = 0;
    activeKeyIndexes = [];
}

function getEnergy() {
    const left = leftHandState ? leftHandState.lift * 0.45 + leftHandState.openness * 0.35 + leftHandState.speed * 0.2 : 0;
    const right = rightHandState ? rightHandState.lift * 0.35 + rightHandState.openness * 0.35 + rightHandState.speed * 0.3 : 0;
    return constrain(max(left, right), 0, 1);
}

function getPerformanceStatus() {
    const handsLabel = leftHandState && rightHandState ? "Two hands" : "One hand";
    const scaleLabel = scales[currentScale].name;
    return `${handsLabel} | ${scaleLabel} | ${activeFingerCount} keys`;
}

function downloadMidi() {
    if (!audioReady) return;

    const events = noteEvents.length > 0 ? noteEvents : [{
        type: "lead",
        midi: scales[currentScale].root + 12,
        start: 0,
        duration: 0.5,
        velocity: 90
    }];
    const midiBytes = buildMidiFile(events, scales[currentScale].bpm);
    const blob = new Blob([new Uint8Array(midiBytes)], {type: "audio/midi"});
    downloadBlob(blob, `hand-piano-${currentScale}.mid`);
    statusText = "MIDI exported.";
}

function buildMidiFile(events, bpm) {
    const ticksPerQuarter = 480;
    const tempo = Math.round(60000000 / bpm);
    const trackEvents = [
        {tick: 0, bytes: [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255]},
        {tick: 0, bytes: [0xc0, 0]}
    ];

    events.forEach((event) => {
        const startTick = Math.max(0, Math.round(event.start * bpm / 60 * ticksPerQuarter));
        const durationTicks = Math.max(40, Math.round(event.duration * bpm / 60 * ticksPerQuarter));
        const channel = 0;
        const velocity = round(constrain(event.velocity || 88, 1, 127));
        trackEvents.push({tick: startTick, bytes: [0x90 + channel, event.midi, velocity]});
        trackEvents.push({tick: startTick + durationTicks, bytes: [0x80 + channel, event.midi, 0]});
    });

    trackEvents.sort((a, b) => a.tick - b.tick);

    const trackData = [];
    let lastTick = 0;
    trackEvents.forEach((event) => {
        trackData.push(...writeVarLen(event.tick - lastTick), ...event.bytes);
        lastTick = event.tick;
    });
    trackData.push(0x00, 0xff, 0x2f, 0x00);

    return [
        ...ascii("MThd"), ...uint32(6), ...uint16(0), ...uint16(1), ...uint16(ticksPerQuarter),
        ...ascii("MTrk"), ...uint32(trackData.length), ...trackData
    ];
}

function writeVarLen(value) {
    let buffer = value & 0x7f;
    const bytes = [];
    while ((value >>= 7)) {
        buffer <<= 8;
        buffer |= ((value & 0x7f) | 0x80);
    }
    while (true) {
        bytes.push(buffer & 0xff);
        if (buffer & 0x80) buffer >>= 8;
        else break;
    }
    return bytes;
}

function ascii(value) {
    return value.split("").map((char) => char.charCodeAt(0));
}

function uint16(value) {
    return [(value >> 8) & 255, value & 255];
}

function uint32(value) {
    return [(value >> 24) & 255, (value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function drawStage() {
    background(12, 14, 18);
    push();
    translate(width, 0);
    scale(-1, 1);
    tint(255, 72);
    image(video, 0, 0, width, height);
    pop();

    noFill();
    stroke(255, 255, 255, 22);
    strokeWeight(1);
    for (let x = 80; x < width; x += 80) line(x, 0, x, height);
    for (let y = 80; y < height; y += 80) line(0, y, width, y);

    noStroke();
    fill(46, 204, 113, audioReady ? 18 + getEnergy() * 48 : 14);
    rect(0, 0, width, height);

    drawEqualizer();
    drawInvisibleKeyboard();
}

function drawHand(hand, side, state) {
    const mirroredPoints = hand.keypoints.map((point) => ({x: mirroredX(point.x), y: point.y}));
    const fingers = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20]];
    const handColor = side === "left" ? color(127, 221, 255) : color(255, 211, 105);

    strokeWeight(4);
    stroke(red(handColor), green(handColor), blue(handColor), 190);
    fingers.forEach((finger) => {
        beginShape();
        finger.forEach((index) => vertex(mirroredPoints[index].x, mirroredPoints[index].y));
        endShape();
    });

    noStroke();
    mirroredPoints.forEach((point, index) => {
        const fingerState = state && state.fingers ? state.fingers.find((finger) => finger.index === index) : null;
        if (fingerState && fingerState.active) {
            fill(red(handColor), green(handColor), blue(handColor), 84);
            circle(point.x, point.y, 40 + fingerState.pressure * 22);
        } else if (fingerState && fingerState.pressure > RELEASE_THRESHOLD) {
            fill(255, 255, 255, 34);
            circle(point.x, point.y, 28 + fingerState.pressure * 18);
        }
        fill(fingerState ? handColor : color(255, 255, 255));
        circle(point.x, point.y, fingerState ? 15 : 9);
    });
}

function drawInvisibleKeyboard() {
    const top = height * KEYBED_TOP;
    const bottom = height * KEYBED_BOTTOM;
    const scale = scales[currentScale];
    const keyCount = scale.scale.length * KEYBOARD_OCTAVES;
    const keyWidth = width / keyCount;
    const keyColor = scale.color || [255, 211, 105];

    noStroke();
    fill(4, 6, 9, 54);
    rect(0, top, width, bottom - top);

    for (let i = 0; i < keyCount; i++) {
        const x = i * keyWidth;
        const isRoot = i % scale.scale.length === 0;
        const isActive = activeKeyIndexes.includes(i);
        if (isActive) {
            fill(keyColor[0], keyColor[1], keyColor[2], 185);
            rect(x + 3, top + 42, keyWidth - 6, bottom - top - 52, 7);
        } else if (isRoot) {
            stroke(255, 255, 255, 44);
            strokeWeight(1);
            line(x, top + 40, x, bottom - 8);
            noStroke();
        }

        if (isRoot && (isActive || audioReady)) {
            fill(255, 255, 255, isActive ? 210 : 88);
            textSize(11);
            textAlign(CENTER, BASELINE);
            text(getRootLabel(), x + keyWidth / 2, bottom - 16);
            textAlign(LEFT, BASELINE);
        }
    }

    stroke(255, 255, 255, 70);
    strokeWeight(2);
    line(0, top + 38, width, top + 38);

    noStroke();
    fill(255, 255, 255, 116);
    textSize(12);
    text("TAP ZONE", 24, top + 27);
}

function exciteEqualizer(midi, level) {
    const center = floor(map(midi, 36, 96, 0, eqBands.length - 1));
    for (let i = -2; i <= 2; i++) {
        const index = constrain(center + i, 0, eqBands.length - 1);
        const falloff = 1 - abs(i) * 0.2;
        eqBands[index] = max(eqBands[index], constrain(level * falloff, 0, 1));
    }
}

function updateEqualizer() {
    for (let i = 0; i < eqBands.length; i++) {
        eqBands[i] = lerp(eqBands[i], 0, 0.08);
    }
}

function drawEqualizer() {
    const top = 52;
    const left = 408;
    const right = width - 42;
    const barGap = 5;
    const barWidth = (right - left - barGap * (eqBands.length - 1)) / eqBands.length;
    const maxHeight = 140;
    const scaleColor = scales[currentScale].color || [255, 211, 105];

    noStroke();
    fill(8, 10, 14, 132);
    rect(left - 18, top - 26, right - left + 36, maxHeight + 48, 8);

    fill(255, 255, 255, 120);
    textSize(12);
    text("LIVE EQ", left, top - 8);

    for (let i = 0; i < eqBands.length; i++) {
        const value = eqBands[i];
        const h = 12 + value * maxHeight;
        const x = left + i * (barWidth + barGap);
        const y = top + maxHeight - h;
        fill(scaleColor[0], scaleColor[1], scaleColor[2], 58 + value * 190);
        rect(x, y, barWidth, h, 5);
    }
}

function getRootLabel() {
    const labels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return labels[scales[currentScale].root % 12];
}

function updateParticles() {
    for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        trail.life -= 9;
        const trailColor = trail.side === "left" ? color(127, 221, 255) : color(255, 211, 105);
        noStroke();
        fill(red(trailColor), green(trailColor), blue(trailColor), trail.life * (trail.active ? 0.72 : 0.36));
        circle(trail.x, trail.y, trail.size);
        if (trail.life <= 0) trails.splice(i, 1);
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
        const sparkle = sparkles[i];
        sparkle.x += sparkle.vx;
        sparkle.y += sparkle.vy;
        sparkle.life -= 12;
        const sparkleColor = sparkle.side === "left" ? color(127, 221, 255) : color(255, 211, 105);
        noStroke();
        fill(red(sparkleColor), green(sparkleColor), blue(sparkleColor), sparkle.life);
        circle(mirroredX(sparkle.x), sparkle.y, sparkle.size);
        if (sparkle.life <= 0) sparkles.splice(i, 1);
    }
}

function burst(x, y, count, side) {
    for (let i = 0; i < count; i++) {
        sparkles.push({x, y, vx: random(-5, 5), vy: random(-5, 5), size: random(5, 14), life: 255, side});
    }
}

function drawHud() {
    noStroke();
    fill(8, 10, 14, 214);
    rect(22, 22, 342, 184, 8);

    fill(255);
    textSize(22);
    textStyle(BOLD);
    text("Invisible Piano", 42, 58);

    textStyle(NORMAL);
    textSize(14);
    fill(194, 202, 214);
    text(statusText, 42, 86);

    drawMeter(42, 112, 282, "Energy", getEnergy(), `${round(getEnergy() * 100)}%`, color(46, 204, 113));
    drawMeter(42, 144, 282, "Left", leftHandState ? leftHandState.openness : 0, leftHandState ? "shape" : "none", color(127, 221, 255));
    drawMeter(42, 176, 282, "Keys", min(activeFingerCount / 10, 1), `${activeFingerCount}/10`, color(255, 211, 105));

    fill(activeFingerCount > 0 ? color(46, 204, 113) : color(118, 126, 140));
    circle(width - 56, 50, 18);
    fill(255);
    textAlign(RIGHT, CENTER);
    textSize(14);
    text(activeFingerCount > 0 ? "LIVE" : "IDLE", width - 78, 50);
    textAlign(LEFT, BASELINE);
}

function drawMeter(x, y, w, label, value, valueText, meterColor) {
    const clampedValue = constrain(value, 0, 1);
    fill(194, 202, 214);
    textSize(12);
    text(label, x, y - 5);

    fill(42, 47, 58);
    rect(x + 58, y - 15, w - 118, 9, 5);
    fill(meterColor);
    rect(x + 58, y - 15, (w - 118) * clampedValue, 9, 5);

    fill(255);
    textAlign(RIGHT, BASELINE);
    text(valueText, x + w, y - 5);
    textAlign(LEFT, BASELINE);
}

function mirroredX(x) {
    return width - x;
}

function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}
