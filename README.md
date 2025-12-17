# DevAI - ML5.js Learning Projects

Welcome! This repository contains interactive demos for learning machine learning in the browser using ML5.js and
TensorFlow.js.

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

## 🛠 Tech Stack

- **Runtime:** Bun
- **ML Libraries:** ML5.js, TensorFlow.js
- **Graphics:** p5.js (for pose visualization)
- **Server:** Bun.serve with native routing

## 🔧 Configuration

You can add more HTML demos by editing `server.ts`:

```typescript
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

- Camera access is required for the body pose demo
- Sound access is required for the sound classification demo
- Training works best with at least 15 samples per category
- Models are saved in browser localStorage

---

**Created with [Bun](https://bun.sh)** - A fast all-in-one JavaScript runtime