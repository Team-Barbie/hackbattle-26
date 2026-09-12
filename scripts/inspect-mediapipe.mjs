import { readFileSync } from "node:fs";

const s = readFileSync("node_modules/@mediapipe/tasks-vision/vision_bundle.mjs", "utf8");

function dump(label, index, span = 700) {
  console.log(`\n==== ${label} @ ${index} ====`);
  console.log(s.slice(Math.max(0, index), index + span));
}

dump("async function Co", s.indexOf("async function Co"));
dump("function Co", s.indexOf("function Co("));

for (const needle of [
  "createElement",
  "import(",
  "ModuleFactory",
  "script.src",
  "type=\"module\"",
]) {
  let index = 0;
  let count = 0;
  while ((index = s.indexOf(needle, index)) !== -1 && count < 2) {
    dump(needle, Math.max(0, index - 160), 500);
    index += needle.length;
    count += 1;
  }
}
