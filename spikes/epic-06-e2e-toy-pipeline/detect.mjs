/**
 * Epic 1 detector + YOLOv8-style decode for Kalray yolov9t.onnx output [1, 84, 8400].
 */

const ort = globalThis.ort;

const ORT_CDN_VER = "1.22.0";
const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_CDN_VER}/dist`;
const MODEL_URL = new URL("./models/yolov9t.onnx", import.meta.url).href;

const INPUT_SIZE = 640;
const NUM_PRED = 8400;
const NUM_CLASS = 80;
const COCO_PERSON = 0;

const STRIDES = [8, 16, 32];
const GRIDS = [80, 40, 20];

export function configureOrtEnv() {
  ort.env.logLevel = "warning";
  ort.env.wasm.wasmPaths = {
    mjs: `${ORT_DIST}/ort-wasm-simd-threaded.mjs`,
    wasm: `${ORT_DIST}/ort-wasm-simd-threaded.wasm`,
  };
  ort.env.wasm.numThreads = 1;
}

export async function createDetectorSession() {
  configureOrtEnv();
  try {
    return await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["webgl", "wasm"],
      graphOptimizationLevel: "all",
    });
  } catch {
    return await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  }
}

function sigmoid(x) {
  const t = Math.min(80, Math.max(-80, x));
  return 1 / (1 + Math.exp(-t));
}

/**
 * Letterbox image onto 640×640 canvas; returns layout for inverse mapping.
 * @param {CanvasRenderingContext2D} ctx640
 */
export function letterboxDrawImage(ctx640, im) {
  const vw = im.naturalWidth || im.width;
  const vh = im.naturalHeight || im.height;
  const canvas = ctx640.canvas;
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  ctx640.fillStyle = "rgb(0,0,0)";
  ctx640.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
  const nw = vw * scale;
  const nh = vh * scale;
  const dx = (INPUT_SIZE - nw) / 2;
  const dy = (INPUT_SIZE - nh) / 2;
  ctx640.drawImage(im, 0, 0, vw, vh, dx, dy, nw, nh);
  return { scale, dx, dy, nw, nh, srcW: vw, srcH: vh };
}

/** ImageData RGBA → float32 NCHW [0,1] */
export function preprocessImageDataToNCHW01(img) {
  const { data, width, height } = img;
  const out = new Float32Array(1 * 3 * width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const c0 = y * width + x;
      out[c0] = data[i] / 255;
      out[width * height + c0] = data[i + 1] / 255;
      out[2 * width * height + c0] = data[i + 2] / 255;
    }
  }
  return { tensorData: out, shape: [1, 3, height, width] };
}

/**
 * Decode Ultralytics-style [1,84,8400] predictions to xyxy in 640 input space.
 * @param {import("onnxruntime-web").Tensor} predTensor
 */
/** COCO “person” only; conf raised so sparse anchors (Kalray yolov9t) do not flood NMS. */
export function decodeYoloV8PersonBoxes(predTensor, confThresh = 0.52) {
  const d = predTensor.data;
  const boxes = [];
  let idx = 0;
  for (let si = 0; si < 3; si++) {
    const stride = STRIDES[si];
    const g = GRIDS[si];
    for (let gy = 0; gy < g; gy++) {
      for (let gx = 0; gx < g; gx++, idx++) {
        const j = idx;
        const cx =
          (sigmoid(d[0 * NUM_PRED + j]) * 2 - 0.5 + gx) * stride;
        const cy =
          (sigmoid(d[1 * NUM_PRED + j]) * 2 - 0.5 + gy) * stride;
        const w = (sigmoid(d[2 * NUM_PRED + j]) * 2) ** 2 * stride;
        const h = (sigmoid(d[3 * NUM_PRED + j]) * 2) ** 2 * stride;
        let bestC = 0;
        let bestS = -Infinity;
        for (let c = 0; c < NUM_CLASS; c++) {
          const s = sigmoid(d[(4 + c) * NUM_PRED + j]);
          if (s > bestS) {
            bestS = s;
            bestC = c;
          }
        }
        if (bestC !== COCO_PERSON || bestS < confThresh) continue;
        const x1 = cx - w / 2;
        const y1 = cy - h / 2;
        const x2 = cx + w / 2;
        const y2 = cy + h / 2;
        boxes.push({ x1, y1, x2, y2, score: bestS, cls: bestC });
      }
    }
  }
  return boxes;
}

function iou_xyxy(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const aA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const aB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  const u = aA + aB - inter;
  return u <= 0 ? 0 : inter / u;
}

export function nms_xyxy(boxes, iouThresh = 0.5) {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const keep = [];
  while (sorted.length) {
    const cur = sorted.shift();
    keep.push(cur);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (iou_xyxy(cur, sorted[i]) > iouThresh) sorted.splice(i, 1);
    }
  }
  return keep;
}

/**
 * Map xyxy from letterboxed 640 space to source image pixel coordinates.
 */
export function mapBox640ToSource(xyxy, lb) {
  const { scale, dx, dy } = lb;
  const mapX = (x) => (x - dx) / scale;
  const mapY = (y) => (y - dy) / scale;
  return {
    x1: mapX(xyxy.x1),
    y1: mapY(xyxy.y1),
    x2: mapX(xyxy.x2),
    y2: mapY(xyxy.y2),
  };
}

export function xyxyToXywh(b) {
  return {
    x: b.x1,
    y: b.y1,
    w: b.x2 - b.x1,
    h: b.y2 - b.y1,
  };
}

