import { cp, mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const MIN_MODEL_BYTES = 5_000_000;
const modelDest = path.join(process.cwd(), "public", "models", "pose_landmarker_lite.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const wasmSrc = path.join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = path.join(process.cwd(), "public", "mediapipe", "wasm");

async function hasCompleteModel() {
  try {
    const info = await stat(modelDest);
    return info.size >= MIN_MODEL_BYTES;
  } catch {
    return false;
  }
}

await mkdir(path.dirname(modelDest), { recursive: true });
await mkdir(wasmDest, { recursive: true });
await cp(wasmSrc, wasmDest, { recursive: true });

if (await hasCompleteModel()) {
  console.log("Pose model already present");
  process.exit(0);
}

const response = await fetch(modelUrl);

if (!response.ok || !response.body) {
  throw new Error(`Failed to download pose model: ${response.status}`);
}

await pipeline(Readable.fromWeb(response.body), createWriteStream(modelDest));
console.log("Downloaded pose model");
