# DevAI - ML5.js Learning Projects

Welcome! This repository contains interactive demos for learning machine learning in the browser using ML5.js and TensorFlow.js.

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

## 📚 Available Demos

### 1. Body Pose Detection
**URL:** `http://localhost:3000/hand-pose`

Real-time body pose detection using your webcam. The demo:
- Detects body keypoints in real-time
- Draws skeletal connections between joints
- Uses ML5.js bodyPose model

**Usage:**
1. Grant camera permissions when prompted
2. Stand in front of your camera
3. See your pose detected and drawn in real-time!

### 2. Neural Network Training
**URL:** `http://localhost:3000/training`

Train a custom neural network to classify product quality based on sensor data.

**Features:**
- Add training samples manually or use example data
- Train a classification model (OK / Defective / Repairable)
- Make predictions on new data
- Save the trained model locally

**Usage:**
1. Add training samples (temperature, pressure, vibration → quality)
2. Click "Aggiungi Dati Esempio" for sample data
3. Click "Inizia Training" to train the model
4. Test predictions with the prediction panel
5. Save your trained model for later use

# 3 Body Segmentation
**URL:** `http://localhost:3000/body-segmentation`

Real-time body segmentation using your webcam.

**Features:**
- Detects body keypoints in real-time
- Draws skeletal connections between joints
- Uses ML5.js bodyPose model

**Usage:**
1. Grant camera permissions when prompted
2. Stand in front of your camera
3. See your pose detected and drawn segment in real time.


## 🛠 Tech Stack

- **Runtime:** Bun
- **ML Libraries:** ML5.js, TensorFlow.js
- **Graphics:** p5.js (for pose visualization)
- **Server:** Bun.serve with native routing

## 📁 Project Structure

```
src/
├── hand-pose.html      # Body pose detection demo
├── training.html       # Neural network training demo
└── poc/
    ├── css/            # Stylesheets
    │   ├── handPose.css
    │   └── training.css
    └── js/             # JavaScript modules
        ├── handPose.js
        ├── training.js
        └── utils.js
```

## 🔧 Configuration

You can add more HTML demos by editing `server.ts`:

```typescript
const config = {
  routes: {
    "/": "./src/hand-pose.html",
    "/training": "./src/training.html",
    "/your-demo": "./src/your-demo.html",  // Add new routes here
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

Feel free to add your own ML experiments and demos! Just create a new HTML file in `src/` and add it to the routes in `server.ts`.

## 📝 Notes

- Camera access is required for the body pose demo
- Training works best with at least 15 samples per category
- Models are saved in browser localStorage

---

**Created with [Bun](https://bun.sh)** - A fast all-in-one JavaScript runtime

Happy learning! 🎓✨
