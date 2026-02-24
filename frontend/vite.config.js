import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  resolve: {
    // This strictly forces Vite to use only ONE version of React
    dedupe: ['react', 'react-dom']
  }
});