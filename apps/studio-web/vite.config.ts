import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({base:"/studio/",build:{outDir:"../../dist/studio",emptyOutDir:false,sourcemap:false,rollupOptions:{input:fileURLToPath(new URL("./index.html",import.meta.url))}},server:{port:5175,strictPort:true}});