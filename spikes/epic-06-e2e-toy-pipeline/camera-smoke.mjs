/**
 * Epic 8 — minimal getUserMedia preview for deploy smoke (same origin as E2E page).
 */

const statusEl = document.getElementById("status");
const video = document.getElementById("video");

let stream = null;

function setStatus(msg, kind = "") {
  statusEl.textContent = msg;
  statusEl.className = kind;
}

function stopTracks() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  video.srcObject = null;
}

async function startCamera() {
  stopTracks();
  if (!window.isSecureContext) {
    setStatus(
      "This page must be served over HTTPS (or localhost) for the camera to work.",
      "error",
    );
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera API is not available in this browser.", "error");
    return;
  }
  setStatus("Requesting camera…", "");
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    const w = video.videoWidth;
    const h = video.videoHeight;
    setStatus(`Live preview OK (${w}×${h}).`, "ok");
  } catch (err) {
    const name = err?.name ?? "Error";
    const message = err?.message ?? String(err);
    setStatus(`Camera failed: ${name} — ${message}`, "error");
    stopTracks();
  }
}

document.getElementById("btn-start").addEventListener("click", () => {
  void startCamera();
});
document.getElementById("btn-stop").addEventListener("click", () => {
  stopTracks();
  setStatus("Stopped.", "");
});
