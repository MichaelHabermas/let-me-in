/**
 * Epic 2 spike — webcam → video → canvas (throwaway).
 * Tasks E2-T1…E2-T5; findings in FINDINGS.md (E2-T6).
 */

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let stream = null;
let rafId = 0;
let fpsFrames = 0;
let fpsWindowStart = 0;

function log(line) {
  const t = new Date().toISOString();
  logEl.textContent += `[${t}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
  console.log(`[E2] ${line}`);
}

function setStatus(msg, kind = "") {
  statusEl.textContent = msg;
  statusEl.className = kind;
}

function stopTracksOnly() {
  cancelAnimationFrame(rafId);
  rafId = 0;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  video.srcObject = null;
}

function checkEnvironment() {
  const secure = window.isSecureContext;
  const md = navigator.mediaDevices;
  log(`[E2-T1] isSecureContext=${secure} mediaDevices=${Boolean(md?.getUserMedia)}`);
  log(`[env] userAgent=${navigator.userAgent}`);
  if (navigator.userAgentData?.platform) {
    log(`[env] userAgentData.platform=${navigator.userAgentData.platform}`);
  }
  if (!secure) {
    setStatus(
      "Not a secure context — camera may be blocked. Use http://localhost or HTTPS.",
      "error",
    );
    return false;
  }
  if (!md?.getUserMedia) {
    setStatus("mediaDevices.getUserMedia is not available.", "error");
    return false;
  }
  setStatus("Environment OK — press Start to request camera.", "ok");
  return true;
}

async function startCamera() {
  stopTracksOnly();
  const tStart = performance.now();
  setStatus("Requesting camera…");

  let tGrant;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        ideal: { width: 1280, height: 720 },
        facingMode: "user",
      },
    });
    tGrant = performance.now();
    log(
      `[E2-T2] getUserMedia OK; ms click→promise_resolve=${(tGrant - tStart).toFixed(1)}`,
    );
  } catch (err) {
    const name = err?.name ?? "Error";
    const message = err?.message ?? String(err);
    log(`[E2-T5] getUserMedia rejected: ${name} — ${message}`);
    setStatus(
      `Camera unavailable: ${name}. ${message} You can try again or check site permissions.`,
      "error",
    );
    return;
  }

  let firstFrameDone = false;
  const ac = new AbortController();

  function onFirstFrame(signalName) {
    if (firstFrameDone) return;
    firstFrameDone = true;
    ac.abort();

    const tFirst = performance.now();
    const startToFirst = tFirst - tStart;
    const grantToFirst = tFirst - tGrant;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    log(
      `[E2-T2] actual videoWidth×videoHeight=${vw}×${vh} (ideal 1280×720; D18 floor 640×480)`,
    );
    log(
      `[E2-T3] firstFrameSignal=${signalName} start→first_ms=${startToFirst.toFixed(1)} grant→first_ms=${grantToFirst.toFixed(1)} (E2-T3 gate: start→first ≤2000)`,
    );
    const passE2T3 = startToFirst <= 2000;
    const passSpecGrant = grantToFirst <= 2000;
    log(
      `[E2-T3] E2-T3 start→first: ${passE2T3 ? "PASS" : "FAIL"} | SPECS#1/F2.2 grant→first: ${passSpecGrant ? "PASS" : "FAIL"}`,
    );

    if (!passE2T3) {
      const n = (window.__e2SlowStartToFirst =
        (window.__e2SlowStartToFirst || 0) + 1);
      log(
        `[E2-T3/GATE] slow start→first run #${n} (>2000ms). If this repeats, STOP and document (device list, lower constraints, browser).`,
      );
      if (n >= 3) {
        setStatus(
          "Supervisor gate: Start→first frame exceeded 2s repeatedly. See log and FINDINGS.md; wait for human direction.",
          "error",
        );
        log(
          "[E2-T3/GATE] STOP — repeated E2-T3 failure. Do not silently abandon SPECS; record remediation attempts.",
        );
      }
    }
    setStatus(`Live ${vw}×${vh} — rAF → canvas (ML off).`, "ok");
  }

  video.addEventListener(
    "loadeddata",
    () => onFirstFrame("loadeddata"),
    { once: true, signal: ac.signal },
  );

  video.srcObject = stream;
  try {
    await video.play();
  } catch (e) {
    log(`[E2] video.play() failed: ${e?.name ?? ""} ${e?.message ?? e}`);
    setStatus(`Playback error: ${e?.message ?? e}`, "error");
    stopTracksOnly();
    return;
  }

  if (typeof video.requestVideoFrameCallback === "function") {
    const onRvfc = () => {
      if (!firstFrameDone) {
        onFirstFrame("requestVideoFrameCallback");
      }
      if (!firstFrameDone) {
        video.requestVideoFrameCallback(onRvfc);
      }
    };
    video.requestVideoFrameCallback(onRvfc);
  }

  fpsFrames = 0;
  fpsWindowStart = performance.now();

  function tick(now) {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      fpsFrames += 1;
    }
    const elapsed = now - fpsWindowStart;
    if (elapsed >= 1000) {
      const fps = (fpsFrames / elapsed) * 1000;
      log(
        `[E2-T4] FPS method=count rAF draws in rolling 1s window (ML off) fps=${fps.toFixed(1)}`,
      );
      fpsFrames = 0;
      fpsWindowStart = now;
    }
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
}

function stopCamera() {
  stopTracksOnly();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setStatus("Stopped.", "");
  log("[E2] Stop pressed — tracks ended.");
}

document.getElementById("btn-start").addEventListener("click", () => {
  void startCamera();
});
document.getElementById("btn-stop").addEventListener("click", stopCamera);
document.getElementById("btn-clear").addEventListener("click", () => {
  logEl.textContent = "";
});

/** E2-T5: synthetic rejection — user-visible status + log, no floating promise. */
document.getElementById("btn-deny-test").addEventListener("click", () => {
  void (async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: "nonexistent-device-epic2-spike" } },
      });
      log("[E2-T5] unexpected: invalid deviceId succeeded");
    } catch (err) {
      const name = err?.name ?? "Error";
      const message = err?.message ?? String(err);
      log(`[E2-T5] synthetic rejection caught: ${name} — ${message}`);
      setStatus(
        `Camera blocked (expected for this test): ${name}. See log.`,
        "error",
      );
    }
  })();
});

checkEnvironment();
