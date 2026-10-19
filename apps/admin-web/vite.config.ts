import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  base: "/control-plane/",
  build: { outDir: "../../dist/control-plane", emptyOutDir: false, rollupOptions: { input: fileURLToPath(new URL("./index.html", import.meta.url)) } },
  server: { port: 5174 }
});
