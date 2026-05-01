# Gatekeeper One-Pager

- **Project name:** Gatekeeper / Let Me In

- **What I built:**
  - A browser-based face recognition door system
  - A person stands in front of a webcam
  - The app decides: **GRANTED**, **UNCERTAIN**, or **DENIED**

- **Why I built it this way:**
  - I wanted the system to work without a backend server
  - I wanted face data to stay on the user's device
  - I wanted a simpler and more private access-control demo
  - I wanted it to run like a normal website

- **Main pages I made:**
  - **Gate page:** checks the person at the camera
  - **Admin page:** lets an admin enroll approved users
  - **Log page:** shows access attempts and decisions

- **How the app works:**
  - The webcam captures a live image
  - One AI model finds the face
  - Another AI model turns the face into numbers
  - The app compares those numbers to saved users
  - The closest match is checked against confidence rules
  - The app shows the final decision

- **Important decision I made:**
  - I did not use only "yes" or "no"
  - I added **UNCERTAIN**
  - This makes the app safer because it does not guess when the match is weak

- **Why privacy is important here:**
  - Face data is sensitive
  - Video does not go to a server
  - Face fingerprints are stored locally in the browser
  - This reduces privacy risk

- **What I used to build it:**
  - TypeScript
  - Vite
  - ONNX Runtime Web
  - IndexedDB / Dexie
  - Netlify for hosting

- **What I stored locally:**
  - Enrolled users
  - Face fingerprints
  - Reference images
  - Access logs
  - Threshold settings

- **Hardest part:**
  - Running AI models in the browser without freezing the page
  - I moved heavy face detection work into a background worker
  - This keeps the camera preview smoother

- **Why I made thresholds configurable:**
  - Different places may need different security levels
  - A strict setting reduces false grants
  - A looser setting reduces false denials
  - Admins can tune the system based on their needs

- **What I tested:**
  - Unit tests
  - Scenario tests
  - Build checks
  - Performance benchmarks
  - Model loading and access decision behavior

- **What I would improve next:**
  - Add liveness detection so photos cannot fool it
  - Add multi-angle enrollment for better accuracy
  - Add a real backend if this needed central logs
  - Add stronger production authentication

- **Simple summary:**
  - I built a private, browser-only face recognition access system
  - I made it client-side to protect face data
  - I added admin enrollment, access decisions, logs, and safety thresholds
  - The goal was a working demo that is simple, private, and easy to explain
