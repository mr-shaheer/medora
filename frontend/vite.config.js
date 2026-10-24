import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// In dev, /api calls are proxied to the FastAPI backend (uvicorn api:app --port 8000).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': process.env.VITE_API_URL || 'http://localhost:8000' } },
});
