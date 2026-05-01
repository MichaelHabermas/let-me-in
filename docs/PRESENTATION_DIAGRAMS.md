# Gatekeeper (Let Me In) — Presentation Diagrams

Use this document with a panel to explain **what the system is**, **how people use it**, and **how the software runs end-to-end**. All diagrams are [Mermaid](https://mermaid.js.org/); they render in GitHub, many IDEs, and the companion HTML file.

## Quick “elevator” script for the panel

- **Gatekeeper** is a **browser-only** access demo: no server runs your video or face models.
- The **gate** page uses the webcam; **face detection** runs in a **Web Worker**, **recognition** uses **local embeddings** compared to an **on-device roster**.
- Access outcomes are explicit **GRANTED**, **UNCERTAIN**, or **DENIED** (not a forced binary when the match is weak).
- **Admins** enroll people and tune thresholds on the **admin** page. **IndexedDB** on that device holds the **roster** (users, face embeddings, optional reference images), **settings** (thresholds, cooldowns), and **access logs** — not logs alone.
- **Tradeoffs**
  - **Upsides:** strong **privacy** (data stays on the device) and simple **static hosting** (no app server for video or inference).
  - **Limits:** no built-in **multi-device audit** or central log warehouse; no **enterprise identity** (SSO, directory sync) — those need extra architecture beyond this demo.

---

## 1. System architecture

High-level view of **components**, **where code runs**, and **what stays on the device**.

```mermaid
flowchart TB
  subgraph Host["Browser (client only)"]
    subgraph Entries["HTML entries (Vite multi-page)"]
      G["/ — Gate"]
      A["/admin — Admin"]
      L["/log — Access log"]
    end

    subgraph Bootstrap["Startup"]
      HTTPS["HTTPS / secure-context gate"]
      DB["IndexedDB init + default settings"]
      MNT["Mount page UI"]
    end

    subgraph App["Application layer"]
      GS["Gate session + camera preview"]
      DP["Detection pipeline (per frame)"]
      ADE["Access decision engine"]
      ENR["Enrollment + roster (admin)"]
      LOGV["Log / review UI"]
    end

    subgraph Domain["Domain logic (pure policy)"]
      MATCH["Embedding match vs roster"]
      POLICY["decideFromMatch → GRANTED | UNCERTAIN | DENIED"]
    end

    subgraph Infra["Infrastructure"]
      DEX["Dexie / IndexedDB<br/>users, accessLog, settings"]
      ORT["ONNX Runtime Web (WASM)"]
      WK["Web Worker: YOLO face detector"]
      MOD["Static models (/models/*.onnx)"]
    end

    CAM["Webcam (getUserMedia)"]
  end

  NET["Static host e.g. Netlify"]

  NET --> G
  NET --> A
  NET --> L
  G --> HTTPS
  A --> HTTPS
  L --> HTTPS
  HTTPS --> DB
  DB --> MNT
  MNT -.->|"gate bundle"| GS
  MNT -.->|"admin bundle"| ENR
  MNT -.->|"log bundle"| LOGV
  GS --> CAM
  GS --> DP
  DP --> WK
  DP --> ORT
  WK --> MOD
  ORT --> MOD
  DP --> ADE
  ADE --> MATCH
  MATCH --> DEX
  ADE --> POLICY
  ENR --> DEX
  ENR --> CAM
  LOGV --> DEX
  ADE --> DEX
```

### How to explain the architecture diagram

1. **Single product, three surfaces**  
   The same repo ships three pages: the **gate** (live door check), **admin** (enroll people and tune thresholds), and **log** (local history and review). There is **no application server** in the loop for video or inference.

2. **Privacy posture**  
   Camera frames and face **embeddings** are processed in the browser. **IndexedDB** (`gatekeeper` database) holds enrolled users, embeddings, optional reference imagery, access attempts, and settings. Nothing in this diagram implies uploading a video stream to your backend.

3. **ML split**  
   **YOLO** face detection runs in a **Web Worker** so the main thread stays responsive (smoother preview). **Embedding** (face → vector) uses **ONNX Runtime Web** on the main thread (as wired today). Models load from **static assets** alongside the app.

4. **Policy is explicit code**  
   After “best match” vs enrolled vectors, **`decideFromMatch`** applies thresholds: strong match + margin → **GRANTED**; weak or ambiguous → **UNCERTAIN**; below weak band → **DENIED**. That logic lives in the domain layer so it is testable and documented.

5. **Bootstrap chain**  
   Every page runs **`bootstrapApp`**: enforce **secure context** for camera APIs, open **IndexedDB** with seeded defaults, then **mount** the page. Failures (e.g. DB blocked) surface without silently half-loading the app.

---

## 2. User flows

Who does what, in plain language—good for stakeholders and security reviewers.

```mermaid
flowchart TB
  subgraph Personas["Actors"]
    V["Visitor / employee at the door"]
    ADM["Administrator"]
  end

  subgraph GateFlow["Gate page (/ )"]
    G1["Open site → allow camera"]
    G2["Wait for models + first detection"]
    G3["Stand in frame; see live preview + status"]
    G4{"Decision"}
    G4 -->|GRANTED| G5["Green / allowed messaging"]
    G4 -->|UNCERTAIN| G6["Caution — no automatic grant"]
    G4 -->|DENIED| G7["Not recognized / denied"]
  end

  subgraph AdminFlow["Admin page (/admin)"]
    A1["Sign in (build-time credentials in prod)"]
    A2["Capture or import enrollment"]
    A3["Save user + embedding to IndexedDB"]
    A4["Adjust thresholds / cooldowns / import-export roster"]
  end

  subgraph LogFlow["Log page (/log)"]
    L1["Open log view"]
    L2["Browse local access attempts"]
    L3["Optional review workflows on entries"]
  end

  V --> G1 --> G2 --> G3 --> G4
  ADM --> A1 --> A2 --> A3 --> A4
  ADM --> L1
  V --> L1
  L1 --> L2 --> L3
```

### How to explain the user flow diagram

1. **Visitor at the gate**  
   They only need a **browser and permission to use the camera**. The app continuously analyzes the scene, shows **live feedback**, and converges on **GRANTED**, **UNCERTAIN**, or **DENIED**. **UNCERTAIN** is intentional: the system avoids guessing when confidence or separation from a runner-up is weak.

2. **Administrator**  
   Admins **enroll** approved identities (capture from camera or import flows depending on product state), **persist** them locally, and can **tune** sensitivity (thresholds, cooldown) to match the environment (strict office vs. looser demo).

3. **Log consumer**  
   Anyone with access to the **same browser profile** can open the **log** page and see **history stored on that device**. This is appropriate for a **demo or kiosk-style** deployment; central audit logging would require a deliberate backend design (out of scope for the browser-only MVP).

4. **Trust boundary**  
   Admin authentication is **front-door** to the admin UI (credentials supplied at **build time** in production). The panel should hear that this is **not** enterprise IAM—it is suitable for controlled demos and must be paired with device/OS controls for real deployments.

---

## 3. Application flow (runtime / per frame)

Technical **sequence** for the gate path: what happens from one camera frame to a decision.

```mermaid
sequenceDiagram
  participant Cam as Camera / canvas frame
  participant Pipe as Detection pipeline
  participant Wk as YOLO Web Worker
  participant Emb as Face embedder (ORT)
  participant Eng as Access decision engine
  participant Dom as Domain match + policy
  participant IDB as IndexedDB
  participant UI as Gate UI + optional log

  Cam->>Pipe: Video frame (ImageData)
  Pipe->>Wk: Detect faces (bbox)
  Wk-->>Pipe: Detections

  alt No face / multiple faces
    Pipe->>UI: Status + overlay only
  else Single face
    Pipe->>Emb: Crop + embed
    Emb-->>Pipe: Float32 embedding
    Pipe->>Eng: Evaluate access
    Eng->>IDB: Load users + embeddings
    IDB-->>Eng: Roster
    Eng->>Dom: Best match + margin
    Dom-->>Eng: GRANTED / UNCERTAIN / DENIED
    Eng-->>Pipe: Verdict + snapshot blob
    Pipe->>UI: Banner / meter / colors
    opt GRANTED or DENIED
      Pipe->>IDB: appendAccessLog
      IDB-->>UI: Persisted row
    end
  end
```

### How to explain the application flow diagram

1. **Frame in**  
   The pipeline receives **raster data** from the preview path (conceptually one frame worth of pixels for detection/embedding).

2. **Detect first**  
   **YOLO** answers “where are faces?” The worker keeps heavy tensor work **off the UI thread**. Bounding boxes drive the on-screen overlay and the crop for embedding.

3. **Cardinality gates**  
   **Zero faces** → idle / “no face” messaging. **Multiple faces** → policy typically avoids a definitive grant (reduces wrong-person unlock). Only the **single-face** path runs embedding + access evaluation.

4. **Embed and compare**  
   The embedder turns the aligned face into a **vector**. The engine compares it to **stored embeddings** (e.g. cosine similarity), producing a **best score** and **runner-up** for margin checks.

5. **Decision + logging**  
   Domain **`decideFromMatch`** returns the tri-state decision. **GRANTED** and **DENIED** can append a row to **`accessLog`** with similarity and a captured frame blob; **UNCERTAIN** avoids treating ambiguous reads as a security event worth logging the same way (configurable product behavior—align narrative with current code paths when presenting).

6. **UI feedback loop**  
   The same loop runs at the camera cadence (subject to cooldown/debounce), so the experience feels like a **live door** rather than a one-shot photo check.

---

## Files

| File | Purpose |
|------|---------|
| [PRESENTATION_DIAGRAMS.md](./PRESENTATION_DIAGRAMS.md) | This markdown (version control, GitHub rendering) |
| [presentation-diagrams.html](./presentation-diagrams.html) | Same diagrams in a slide-friendly HTML page with Mermaid.js |

To view the HTML locally after `pnpm run dev`, open  
`http://localhost:5173/docs/presentation-diagrams.html`  
if your dev server serves the `docs/` folder; otherwise open the file directly in Chromium or use any static server on the repo root.
