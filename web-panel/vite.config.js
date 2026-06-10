// Vite config for CatchMe web panel.
// TODO: implement
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:5000",
      "/socket.io": "http://localhost:5000",
    },
  },
});
