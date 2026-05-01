# Gatekeeper — Interview Explanation (Simple Version)

---

## What is it?

Gatekeeper is a **face recognition door lock that runs in your web browser.**

You stand in front of your webcam. The app looks at your face. It decides: **let you in, or not.**

That's it.

---

## Why is it interesting?

Most face recognition apps send your video to a server (someone else's computer) to process it.

This one doesn't. **Everything happens on your device.** Your face never leaves your computer.

That means:

- No privacy risk
- No internet connection needed after the first load
- No expensive server to run

---

## The three pages

The app has three pages:

1. **Gate page** — the "door." Stand in front of the camera. It decides: GRANTED, UNCERTAIN, or DENIED.
2. **Admin page** — where you add people. You take their photo and save it. Now the app knows who they are.
3. **Log page** — a history of every access attempt. Who tried to get in, when, and what the decision was.

---

## How does it recognize faces?

It uses two AI models. Think of a model as a trained brain that does one specific job.

**Model 1: "Is there a face in this image?"**
It looks at the camera frame and finds faces. It draws a box around them.

**Model 2: "Whose face is this?"**
It takes the face and turns it into a list of 512 numbers. Those numbers are like a fingerprint — unique to that person's face. Then it compares those numbers to the numbers stored for every enrolled person and finds the closest match.

---

## How does it decide GRANTED vs DENIED?

It uses a confidence score between 0 and 1. Higher = more certain it's a match.

- **Above 0.85** → GRANTED (very confident it's you)
- **Between 0.65 and 0.85** → UNCERTAIN (not sure — flag for human review)
- **Below 0.65** → DENIED (doesn't recognize you)

There's also a second check: even if the score is high, if two people score similarly (e.g. twins or look-alikes), it plays it safe and returns UNCERTAIN instead of guessing.

---

## Where does it store data?

Everything is stored **in your browser** — the same way a website might remember your preferences.

It stores:

- Each enrolled person's name and face fingerprint
- A thumbnail photo of them
- The full history of access decisions

Nothing is stored on a server.

---

## How is it built?

- Written in **TypeScript** — a programming language that catches errors before the code runs
- **No backend** — there's no server. It's just files your browser downloads and runs.
- Hosted on **Netlify** — a service that serves those files to anyone with the link
- The two AI models are downloaded once and then cached (saved) in your browser

---

## What's the hardest part?

**Running AI models in a browser is not easy.** Browsers aren't designed for heavy computation. The app has to:

- Download two large AI model files (~25 MB total) before anything works
- Run the face detection fast enough to keep up with live video
- Do all of this without freezing the page

To solve the freezing problem, the face detection model runs in a **background thread** — a separate process that doesn't block the video from updating.

---

## What would you do differently?

- Make it harder to fool with a photo held up to the camera (called "liveness detection")
- Make it faster for large numbers of enrolled users
- Add a way to sync the access log to a real database for compliance/audit purposes

---

## One sentence for any audience

> "It's a face recognition access control system that runs entirely in your browser — no server, no cloud. You enroll people through an admin page, and then anyone who walks up to the camera either gets let in or denied based on whether their face matches."

---

## Terms explained

Each term below answers three questions:

- **What is it?**
- **Why does it exist?**
- **Is it needed in production?**

---

**Enrolled user**

- *What:* A person the app has been taught to recognize. You add them through the admin page by taking their photo.
- *Why:* The app has no way to know who anyone is unless you tell it. Enrollment is how you build the list of approved people.
- *Production:* Yes — without enrolled users, the app can't recognize anyone and will deny everyone.

---

**Enrollment**

- *What:* The step-by-step process of adding someone. You open the admin page, point the camera at them, take a photo, save it.
- *Why:* It has to be a controlled process — you don't want random people adding themselves to the approved list.
- *Production:* Yes — this is how the system gets populated. In a real deployment you'd do this once per person before going live.

---

**Face embedding / face fingerprint**

- *What:* When the app looks at a face, it converts it into a list of 512 numbers. That list is the fingerprint.
- *Why:* You can't store a video of every person and replay it every time someone walks up. Numbers are tiny, fast to compare, and don't reveal what someone looks like if the data were ever stolen.
- *Production:* Yes — this is the core of how face recognition works. The numbers are what get saved and compared.

---

**Match threshold**

- *What:* A cutoff number. If the confidence score is above it, the person gets in. Below it, they don't.
- *Why:* The app can't be 100% certain — it gives a score. The threshold is where you draw the line between "close enough" and "not close enough."
- *Production:* Yes — and it needs to be tuned carefully. Too high = real users get denied. Too low = strangers get in.

---

**Confidence score**

- *What:* A number between 0 and 1. It says how closely the face in front of the camera matches a stored face. 1.0 = identical. 0.0 = completely different.
- *Why:* Face recognition is never binary yes/no. Lighting, angles, and aging all affect it. A score lets you make a judgment call rather than a coin flip.
- *Production:* Yes — every decision the app makes is based on this score.

---

**GRANTED / UNCERTAIN / DENIED**

- *What:* The three possible outcomes when someone stands at the gate.
  - GRANTED = recognized, confident, let them in
  - UNCERTAIN = maybe recognized, but not confident enough — needs a human to check
  - DENIED = not recognized, don't let them in
- *Why:* A two-option system (yes/no) forces the app to guess on borderline cases. UNCERTAIN exists so those cases get flagged instead of guessed wrong.
- *Production:* Yes — especially UNCERTAIN. In a real door system you'd want a human alerted when the app isn't sure.

---

**AI model**

- *What:* A file containing a pre-trained "brain" for one specific task. This app uses two: one finds faces in images, one identifies whose face it is.
- *Why:* Training a face recognition model from scratch takes months and massive computing power. These models were built by researchers and made publicly available — the app just uses them.
- *Production:* Yes — the models are what make the whole thing work.

---

**ONNX model**

- *What:* ONNX is a file format for AI models — like how a PDF is a format for documents.
- *Why:* AI models get trained in many different tools. ONNX is a universal format so they can run anywhere — including the browser.
- *Production:* Yes — both models in this app are ONNX files. Without this format, they couldn't run in a browser at all.

---

**Client-side / runs in the browser**

- *What:* The code runs on your computer, not on a server somewhere else.
- *Why:* Privacy. If video had to travel to a server for processing, it could be intercepted, stored, or misused. Keeping it local eliminates that risk entirely.
- *Production:* Yes — this is the whole point of the app. It's the main thing that makes it different from other face recognition systems.

---

**Backend / server**

- *What:* A computer somewhere else that an app sends data to and gets responses from. Most apps have one.
- *Why this app doesn't have one:* By design. A server would mean someone else holds your data. The app avoids that entirely.
- *Production:* This app intentionally has no backend. That's a feature, not a missing piece — though a real enterprise deployment might add one for audit logging.

---

**Browser storage (IndexedDB)**

- *What:* A built-in mini-database inside every browser. Like a small filing cabinet that lives on your computer.
- *Why:* The app needs to save enrolled users and the access log somewhere. Since there's no server, browser storage is the only option.
- *Production:* Yes — but it has a real limitation: the data only lives in that one browser, on that one device. If you clear your browser data, you lose everything. A production system would need a backup strategy.

---

**Background thread**

- *What:* A way to run two things at the same time in the browser. Normally a browser does one thing at a time.
- *Why:* The face detection model is slow and heavy. If it ran on the main thread, it would freeze the video every time it processed a frame. Running it in the background keeps the video smooth.
- *Production:* Yes — without this, the app would feel broken. The video would stutter constantly.

---

**Cooldown**

- *What:* A 3-second pause between decisions. After the app makes a call (GRANTED / DENIED), it waits before making another one.
- *Why:* Without it, the app would fire 30 decisions per second while someone stands there. That would spam the access log and waste processing power.
- *Production:* Yes — essential for keeping the log clean and the app responsive.

---

**Liveness detection**

- *What:* A check to tell if a real person is standing there vs. someone holding up a photo of a person.
- *Why it matters:* Right now, you could potentially fool the app by printing a photo of an enrolled user and holding it up to the camera.
- *Production:* This app does NOT have it — and that's a real gap for a production system. It's the biggest known security limitation.
