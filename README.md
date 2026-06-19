# ML5.js Learning Projects
![ML5.js](https://img.shields.io/badge/ML5.js-AI-blueviolet?style=for-the-badge&logo=tensorflow)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun)
![TensorFlow](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow)

Welcome! This repository contains interactive demos for learning machine learning, computer vision, audio interaction,
and browser-based AI experiments using ML5.js, TensorFlow.js, p5.js, and the Web Audio API.

> This repository is designed for educational purposes and is not intended for commercial use. Please review the [LICENSE](LICENSE) for details.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed on your machine

### Installation

```bash
# Install dependencies
bun install

# Start the development server
bun run start
```

The server will start at `http://localhost:3000`

If port `3000` is already in use, run the server on another port:

```bash
PORT=4173 bun run start
```

## 🛠 Tech Stack

- **Runtime:** Bun
- **ML Libraries:** ML5.js, TensorFlow.js
- **Graphics:** p5.js
- **Audio:** Web Audio API
- **Server:** Bun.serve with native routing

## 🎹 Available Demos

- **Body Pose:** Real-time body tracking and skeleton visualization.
- **Hand Pose:** Real-time hand tracking with visual effects.
- **Invisible Piano:** Play piano-like notes with fingertip tracking, scale selection, and MIDI export.
- **Invisible Bongos:** Play two air bongos with fingertip taps and MIDI export.
- **Body Segmentation:** Segment and isolate human bodies from a webcam feed.
- **Image Recognition:** Classify images using MobileNet.
- **Sound Classifier:** Recognize spoken commands with a pre-trained sound model.
- **Training:** Train custom machine learning models in the browser.
- **Sentiment:** Classify text sentiment with a pre-trained model.

## 🔧 Configuration

You can add more HTML demos by editing `server.js`:

```javascript
const config = {
    routes: {
        "/": "./src/index.html",
        "/your-demo": "./src/your-demo.html", // Add new routes here
    },
    port: 3000,
};
```

## 📖 Learning Resources

- [ML5.js Documentation](https://docs.ml5js.org/)
- [TensorFlow.js Guide](https://www.tensorflow.org/js/guide)
- [p5.js Reference](https://p5js.org/reference/)

## 🎯 Study Purpose

These demos are designed for educational purposes to:

- Understand how ML models work in the browser
- Learn real-time computer vision with webcams
- Practice training custom neural networks
- Explore interactive ML applications

## 🤝 Contributing

Feel free to add your own ML experiments and demos! Just create a new HTML file in `src/` and add it to the routes in
`server.ts`.

## 📝 Notes

- Camera access is required for the body pose, hand pose, invisible piano, invisible bongos, and body segmentation demos
- Sound access is required for the sound classification demo
- The invisible piano exports MIDI files from the notes played during the session
- The invisible bongos demo exports drum MIDI on the General MIDI percussion channel
- Training works best with at least 15 samples per category
- Models are saved in browser localStorage

---

**Created with [Bun](https://bun.sh)** - A fast all-in-one JavaScript runtime
