let handPose;
let video;
let hands = [];
let audioReady = false;
let audioCtx;
let masterGain;
let startButton;
let midiButton;
let statusText = "Loading hand model...";
let noteEvents = [];
let sessionStartedAt = null;
let leftHandState = null;
let rightHandState = null;
let fingerMemory = {};
let ripples = [];
let sparks = [];
let trails = [];
let activeHits = [];
let eqBands = Array.from({length: 28}, () => 0);

const CANVAS_W = 1280;
const CANVAS_H = 760;
const HIT_ZONE_TOP = 0.28;
const HIT_ZONE_BOTTOM = 0.92;
const PRESS_THRESHOLD = 0.48;
const RELEASE_THRESHOLD = 0.24;
const TAP_DOWNWARD_THRESHOLD = 0.16;
const TAP_COOLDOWN = 0.12;
const FINGERTIPS = [
    {name: "thumb", index: 4},
    {name: "index", index: 8},
    {name: "middle", index: 12},
    {name: "ring", index: 16},
    {name: "pinky", index: 20}
];

const bongos = {
    left: {
        label: "LOW",
        midi: 61,
        baseFrequency: 188,
        color: [247, 132, 84],
        centerX: 0.38,
        centerY: 0.61,
        radius: 150
    },
    right: {
        label: "HIGH",
        midi: 60,
        baseFrequency: 268,
        color: [244, 198, 92],
        centerX: 0.62,
        centerY: 0.57,
        radius: 132
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
        statusText = "Camera ready. Start audio and tap down with your hands.";
    });
    video.size(CANVAS_W, CANVAS_H);
    video.hide();

    handPose.detectStart(video, gotHands);
    createControls();
}

function createControls() {
    const panel = createDiv();
    panel.class("bongo-panel");
    panel.parent(document.body);

    const titleWrap = createDiv();
    titleWrap.class("bongo-title");
    titleWrap.parent(panel);

    createElement("span", "Invisible").parent(titleWrap);
    createElement("h1", "Bongos").parent(titleWrap);

    const subtitle = createP("Two hands, two drums. Tap down naturally: left hand plays the low bongo, right hand plays the high bongo.");
    subtitle.parent(panel);

    const controls = createDiv();
    controls.class("bongo-controls");
    controls.parent(panel);

    startButton = createButton("Start audio");
    startButton.parent(controls);
    startButton.mousePressed(startAudio);

    midiButton = createButton("Export MIDI");
    midiButton.parent(controls);
    midiButton.attribute("disabled", "true");
    midiButton.mousePressed(downloadMidi);

    createA("/", "Back to demos").parent(controls);
}

function startAudio() {
    if (audioReady) {
        stopAudio();
        return;
    }

    if (!audioCtx) buildSynth();

    audioCtx.resume();
    masterGain.gain.setTargetAtTime(0.86, audioCtx.currentTime, 0.02);
    audioReady = true;
    startButton.html("Stop audio");
    midiButton.removeAttribute("disabled");
    statusText = "Play the air like two bongos.";
}

function stopAudio() {
    if (!audioCtx) return;

    masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.02);
    audioCtx.suspend();
    audioReady = false;
    fingerMemory = {};
    activeHits = [];
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
    leftHandState = trackedHands.left ? updateHandState(trackedHands.left, "left") : null;
    rightHandState = trackedHands.right ? updateHandState(trackedHands.right, "right") : null;

    if (leftHandState || rightHandState) {
        updateBongoHits([leftHandState, rightHandState].filter(Boolean));
        if (trackedHands.left) drawHand(trackedHands.left, "left", leftHandState);
        if (trackedHands.right) drawHand(trackedHands.right, "right", rightHandState);
        statusText = audioReady ? getPerformanceStatus() : "Start audio to hear the bongos.";
    } else {
        activeHits = [];
        statusText = audioReady ? "Show one or two hands to the camera." : "Start audio, then show your hands.";
    }

    updateEffects();
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

function updateHandState(hand, side) {
    const keypoints = hand.keypoints;
    const indexTip = keypoints[8];
    const thumbTip = keypoints[4];
    const middleTip = keypoints[12];
    const wrist = keypoints[0];
    if (!indexTip || !thumbTip || !middleTip || !wrist) return null;

    const previous = side === "left" ? leftHandState : rightHandState;
    const screenX = mirroredX(indexTip.x);
    const screenY = indexTip.y;
    const openness = constrain(dist(thumbTip.x, thumbTip.y, middleTip.x, middleTip.y) / 230, 0, 1);
    const speed = previous ? constrain(dist(screenX, screenY, previous.screenX, previous.screenY) / 44, 0, 1) : 0;
    const lift = constrain(1 - screenY / height, 0, 1);

    const fingers = FINGERTIPS.map((finger) => {
        const point = keypoints[finger.index];
        const previousFinger = previous && previous.fingers ? previous.fingers.find((item) => item.name === finger.name) : null;
        const fingerX = mirroredX(point.x);
        const fingerY = point.y;
        const zonePressure = constrain(map(fingerY / height, HIT_ZONE_TOP, HIT_ZONE_BOTTOM, 0, 1), 0, 1);
        const downward = previousFinger ? constrain((fingerY - previousFinger.screenY) / 42, 0, 1) : 0;
        const fingerSpeed = previousFinger ? constrain(dist(fingerX, fingerY, previousFinger.screenX, previousFinger.screenY) / 36, 0, 1) : 0;

        return {
            name: finger.name,
            index: finger.index,
            active: zonePressure > PRESS_THRESHOLD,
            ready: zonePressure < RELEASE_THRESHOLD,
            pressure: previousFinger ? lerp(previousFinger.pressure, zonePressure, 0.34) : zonePressure,
            speed: previousFinger ? lerp(previousFinger.speed, fingerSpeed, 0.24) : fingerSpeed,
            downward,
            screenX: fingerX,
            screenY: fingerY
        };
    });

    const state = {
        side,
        active: fingers.some((finger) => finger.active),
        openness: previous ? lerp(previous.openness, openness, 0.18) : openness,
        speed: previous ? lerp(previous.speed, speed, 0.18) : speed,
        lift: previous ? lerp(previous.lift, lift, 0.18) : lift,
        screenX,
        screenY,
        fingers
    };

    trails.push({
        x: state.screenX,
        y: state.screenY,
        side,
        life: 210,
        size: 12 + state.speed * 26
    });
    if (trails.length > 70) trails.shift();

    return state;
}

function updateBongoHits(states) {
    if (!audioReady) return;

    const now = audioCtx.currentTime;
    activeHits = states.filter((state) => state.active).map((state) => state.side);

    states.forEach((state) => {
        const drum = bongos[state.side];
        state.fingers.forEach((finger) => {
            const key = `${state.side}-${finger.name}`;
            const memory = fingerMemory[key] || {armed: true, lastTime: 0};
            const armed = memory.armed || finger.ready;
            const shouldTrigger = armed &&
                finger.active &&
                finger.downward > TAP_DOWNWARD_THRESHOLD &&
                now - memory.lastTime > TAP_COOLDOWN;

            if (shouldTrigger) {
                const velocity = round(constrain(58 + finger.pressure * 42 + finger.speed * 34, 36, 127));
                playBongo(now, drum, velocity, state.side, finger.pressure);
                noteEvents.push({
                    type: "bongo",
                    midi: drum.midi,
                    start: now - sessionStartedAt,
                    duration: 0.16 + finger.pressure * 0.12,
                    velocity
                });
                triggerVisualHit(drum, state.side, finger.screenX, finger.screenY, velocity / 127);
                fingerMemory[key] = {armed: false, lastTime: now};
            } else {
                fingerMemory[key] = {
                    ...memory,
                    armed: finger.ready ? true : armed && !finger.active
                };
            }
        });
    });
}

function playBongo(time, drum, velocity, side, pressure) {
    const level = velocity / 127;
    const pan = audioCtx.createStereoPanner();
    const tone = audioCtx.createOscillator();
    const overtone = audioCtx.createOscillator();
    const toneGain = audioCtx.createGain();
    const noise = createNoiseSource(0.07);
    const noiseGain = audioCtx.createGain();
    const noiseFilter = audioCtx.createBiquadFilter();
    const filter = audioCtx.createBiquadFilter();
    const release = 0.18 + pressure * 0.14;

    pan.pan.value = side === "left" ? -0.26 : 0.26;
    filter.type = "bandpass";
    filter.frequency.value = drum.baseFrequency * 2.3;
    filter.Q.value = 1.4;

    tone.type = "sine";
    tone.frequency.setValueAtTime(drum.baseFrequency * (1.22 + pressure * 0.16), time);
    tone.frequency.exponentialRampToValueAtTime(drum.baseFrequency * 0.88, time + release);

    overtone.type = "triangle";
    overtone.frequency.setValueAtTime(drum.baseFrequency * 2.08, time);
    overtone.frequency.exponentialRampToValueAtTime(drum.baseFrequency * 1.72, time + release * 0.78);

    toneGain.gain.setValueAtTime(0.0001, time);
    toneGain.gain.exponentialRampToValueAtTime(0.62 * level, time + 0.006);
    toneGain.gain.exponentialRampToValueAtTime(0.12 * level, time + 0.045);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, time + release);

    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 820 + pressure * 900;
    noiseFilter.Q.value = 0.9;
    noiseGain.gain.setValueAtTime(0.0001, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.16 * level, time + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    tone.connect(filter);
    overtone.connect(filter);
    filter.connect(toneGain).connect(pan).connect(masterGain);
    noise.connect(noiseFilter).connect(noiseGain).connect(pan);

    tone.start(time);
    overtone.start(time);
    noise.start(time);
    tone.stop(time + release + 0.03);
    overtone.stop(time + release + 0.03);
    exciteEqualizer(side, level);
}

function createNoiseSource(duration) {
    const sampleCount = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < sampleCount; i++) {
        data[i] = random(-1, 1);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    return source;
}

function triggerVisualHit(drum, side, x, y, level) {
    const center = getBongoCenter(drum);
    ripples.push({
        x: center.x,
        y: center.y,
        radius: drum.radius * 0.45,
        maxRadius: drum.radius * (1.35 + level * 0.35),
        side,
        life: 255
    });

    for (let i = 0; i < 18; i++) {
        sparks.push({
            x,
            y,
            vx: random(-4.5, 4.5),
            vy: random(-5.5, 2.8),
            size: random(4, 13),
            side,
            life: 230
        });
    }
}

function drawStage() {
    background(17, 13, 12);

    push();
    translate(width, 0);
    scale(-1, 1);
    tint(255, 44);
    image(video, 0, 0, width, height);
    pop();

    drawAmbientGrid();
    drawBongo(bongos.left, "left");
    drawBongo(bongos.right, "right");
    drawEqualizer();
}

function drawAmbientGrid() {
    noStroke();
    fill(247, 132, 84, audioReady ? 18 + getEnergy() * 34 : 12);
    rect(0, 0, width, height);

    stroke(255, 255, 255, 15);
    strokeWeight(1);
    for (let y = 120; y < height; y += 86) {
        line(90, y, width - 90, y + sin(frameCount * 0.018 + y) * 8);
    }

    noStroke();
    fill(0, 0, 0, 70);
    rect(0, height * HIT_ZONE_TOP, width, height * (HIT_ZONE_BOTTOM - HIT_ZONE_TOP));
}

function drawBongo(drum, side) {
    const center = getBongoCenter(drum);
    const isActive = activeHits.includes(side);
    const pulse = isActive ? 1 + sin(frameCount * 0.42) * 0.035 + 0.08 : 1;
    const drumColor = drum.color;

    push();
    translate(center.x, center.y);
    scale(pulse);

    noStroke();
    fill(0, 0, 0, 82);
    ellipse(18, 34, drum.radius * 1.9, drum.radius * 0.58);

    fill(74, 43, 28);
    ellipse(0, 0, drum.radius * 2.02, drum.radius * 1.52);
    fill(118, 67, 38);
    ellipse(0, -16, drum.radius * 1.86, drum.radius * 1.34);
    fill(236, 190, 132);
    ellipse(0, -28, drum.radius * 1.7, drum.radius * 1.12);

    stroke(drumColor[0], drumColor[1], drumColor[2], isActive ? 230 : 132);
    strokeWeight(isActive ? 8 : 4);
    noFill();
    ellipse(0, -28, drum.radius * 1.72, drum.radius * 1.13);

    noStroke();
    fill(255, 245, 224, isActive ? 82 : 34);
    ellipse(-drum.radius * 0.22, -drum.radius * 0.35, drum.radius * 0.52, drum.radius * 0.18);

    fill(255, 255, 255, isActive ? 235 : 144);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(28);
    text(drum.label, 0, -26);
    textStyle(NORMAL);
    textSize(12);
    fill(255, 255, 255, 110);
    text(side === "left" ? "LEFT HAND" : "RIGHT HAND", 0, 12);
    pop();
}

function drawHand(hand, side, state) {
    const mirroredPoints = hand.keypoints.map((point) => ({x: mirroredX(point.x), y: point.y}));
    const fingers = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20]];
    const handColor = side === "left" ? color(247, 132, 84) : color(244, 198, 92);

    strokeWeight(4);
    stroke(red(handColor), green(handColor), blue(handColor), 188);
    fingers.forEach((finger) => {
        beginShape();
        finger.forEach((index) => vertex(mirroredPoints[index].x, mirroredPoints[index].y));
        endShape();
    });

    noStroke();
    mirroredPoints.forEach((point, index) => {
        const fingerState = state && state.fingers ? state.fingers.find((finger) => finger.index === index) : null;
        if (fingerState && fingerState.active) {
            fill(red(handColor), green(handColor), blue(handColor), 88);
            circle(point.x, point.y, 38 + fingerState.pressure * 24);
        }
        fill(fingerState ? handColor : color(255, 255, 255));
        circle(point.x, point.y, fingerState ? 14 : 8);
    });
}

function updateEffects() {
    for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        trail.life -= 10;
        const c = bongos[trail.side].color;
        noStroke();
        fill(c[0], c[1], c[2], trail.life * 0.35);
        circle(trail.x, trail.y, trail.size);
        if (trail.life <= 0) trails.splice(i, 1);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        const c = bongos[ripple.side].color;
        ripple.radius = lerp(ripple.radius, ripple.maxRadius, 0.18);
        ripple.life -= 13;
        noFill();
        stroke(c[0], c[1], c[2], ripple.life);
        strokeWeight(3);
        ellipse(ripple.x, ripple.y - 28, ripple.radius * 1.45, ripple.radius * 0.92);
        if (ripple.life <= 0) ripples.splice(i, 1);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        const c = bongos[spark.side].color;
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.12;
        spark.life -= 12;
        noStroke();
        fill(c[0], c[1], c[2], spark.life);
        circle(spark.x, spark.y, spark.size);
        if (spark.life <= 0) sparks.splice(i, 1);
    }
}

function exciteEqualizer(side, level) {
    const center = side === "left" ? 8 : 19;
    for (let i = -4; i <= 4; i++) {
        const index = constrain(center + i, 0, eqBands.length - 1);
        const falloff = 1 - abs(i) * 0.16;
        eqBands[index] = max(eqBands[index], constrain(level * falloff, 0, 1));
    }
}

function updateEqualizer() {
    for (let i = 0; i < eqBands.length; i++) {
        eqBands[i] = lerp(eqBands[i], 0, 0.09);
    }
}

function drawEqualizer() {
    const left = 460;
    const top = 58;
    const widthAvailable = width - left - 52;
    const gap = 5;
    const barWidth = (widthAvailable - gap * (eqBands.length - 1)) / eqBands.length;
    const maxHeight = 96;

    noStroke();
    fill(12, 9, 9, 126);
    rect(left - 18, top - 22, widthAvailable + 36, maxHeight + 42, 8);

    fill(255, 230, 196, 130);
    textSize(12);
    text("ROOM ENERGY", left, top - 6);

    for (let i = 0; i < eqBands.length; i++) {
        const value = eqBands[i];
        const c = i < eqBands.length / 2 ? bongos.left.color : bongos.right.color;
        const h = 9 + value * maxHeight;
        const x = left + i * (barWidth + gap);
        const y = top + maxHeight - h;
        fill(c[0], c[1], c[2], 62 + value * 190);
        rect(x, y, barWidth, h, 5);
    }
}

function drawHud() {
    noStroke();
    fill(12, 9, 9, 214);
    rect(22, 22, 372, 178, 8);

    fill(255);
    textSize(24);
    textStyle(BOLD);
    text("Invisible Bongos", 42, 58);

    textStyle(NORMAL);
    textSize(14);
    fill(232, 212, 194);
    text(statusText, 42, 86);

    drawMeter(42, 114, 310, "Energy", getEnergy(), `${round(getEnergy() * 100)}%`, color(247, 132, 84));
    drawMeter(42, 146, 310, "Low", leftHandState ? leftHandState.speed : 0, leftHandState ? "ready" : "none", color(247, 132, 84));
    drawMeter(42, 178, 310, "High", rightHandState ? rightHandState.speed : 0, rightHandState ? "ready" : "none", color(244, 198, 92));

    const live = activeHits.length > 0;
    fill(live ? color(247, 132, 84) : color(118, 106, 96));
    circle(width - 56, 50, 18);
    fill(255);
    textAlign(RIGHT, CENTER);
    textSize(14);
    text(live ? "HIT" : "IDLE", width - 78, 50);
    textAlign(LEFT, BASELINE);
}

function drawMeter(x, y, w, label, value, valueText, meterColor) {
    const clampedValue = constrain(value, 0, 1);
    fill(232, 212, 194);
    textSize(12);
    text(label, x, y - 5);

    fill(49, 35, 29);
    rect(x + 58, y - 15, w - 124, 9, 5);
    fill(meterColor);
    rect(x + 58, y - 15, (w - 124) * clampedValue, 9, 5);

    fill(255);
    textAlign(RIGHT, BASELINE);
    text(valueText, x + w, y - 5);
    textAlign(LEFT, BASELINE);
}

function getPerformanceStatus() {
    const handsLabel = leftHandState && rightHandState ? "Two hands" : "One hand";
    return `${handsLabel} | ${noteEvents.length} hits recorded`;
}

function getEnergy() {
    const left = leftHandState ? leftHandState.speed * 0.55 + leftHandState.openness * 0.25 + leftHandState.lift * 0.2 : 0;
    const right = rightHandState ? rightHandState.speed * 0.55 + rightHandState.openness * 0.25 + rightHandState.lift * 0.2 : 0;
    return constrain(max(left, right), 0, 1);
}

function downloadMidi() {
    if (!audioReady) return;

    const events = noteEvents.length > 0 ? noteEvents : [{
        type: "bongo",
        midi: bongos.left.midi,
        start: 0,
        duration: 0.16,
        velocity: 90
    }];
    const midiBytes = buildMidiFile(events, 104);
    const blob = new Blob([new Uint8Array(midiBytes)], {type: "audio/midi"});
    downloadBlob(blob, "invisible-bongos.mid");
    statusText = "Bongo MIDI exported.";
}

function buildMidiFile(events, bpm) {
    const ticksPerQuarter = 480;
    const tempo = Math.round(60000000 / bpm);
    const trackEvents = [
        {tick: 0, bytes: [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255]}
    ];

    events.forEach((event) => {
        const startTick = Math.max(0, Math.round(event.start * bpm / 60 * ticksPerQuarter));
        const durationTicks = Math.max(28, Math.round(event.duration * bpm / 60 * ticksPerQuarter));
        const channel = 9;
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

function getBongoCenter(drum) {
    return {
        x: width * drum.centerX,
        y: height * drum.centerY
    };
}

function mirroredX(x) {
    return width - x;
}
