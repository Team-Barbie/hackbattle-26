/// <reference types="vitest/config" />
import { createReadStream, copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const wasmDir = path.resolve("node_modules/@mediapipe/tasks-vision/wasm");

function mediapipeWasm(): Plugin {
  return {
    name: "mediapipe-wasm",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split("?")[0] ?? "";

        if (!requestPath.startsWith("/mediapipe/wasm/")) {
          next();
          return;
        }

        const fileName = path.basename(requestPath);
        const filePath = path.join(wasmDir, fileName);

        if (!fileName || !existsSync(filePath)) {
          next();
          return;
        }

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        response.setHeader(
          "Content-Type",
          fileName.endsWith(".wasm") ? "application/wasm" : "text/javascript",
        );
        createReadStream(filePath).pipe(response);
      });
    },
    writeBundle(options) {
      const destination = path.join(options.dir ?? "dist", "mediapipe", "wasm");
      mkdirSync(destination, { recursive: true });

      for (const fileName of readdirSync(wasmDir)) {
        copyFileSync(path.join(wasmDir, fileName), path.join(destination, fileName));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), mediapipeWasm()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  optimizeDeps: {
    exclude: ["@mediapipe/tasks-vision"],
  },
  server: {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  },
});
