import { access, copyFile, mkdir, readdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const root = process.cwd();
const wasmSrc = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = path.join(root, "public", "mediapipe", "wasm");
const modelDest = path.join(root, "public", "models", "pose_landmarker_lite.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

await mkdir(wasmDest, { recursive: true });
await mkdir(path.dirname(modelDest), { recursive: true });

for (const file of await readdir(wasmSrc)) {
  await copyFile(path.join(wasmSrc, file), path.join(wasmDest, file));
}

if (!(await exists(modelDest))) {
  const response = await fetch(modelUrl);

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download pose model: ${response.status}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(modelDest));
}

console.log("MediaPipe assets ready");
