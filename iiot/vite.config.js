import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl()
  ],
  server: {
    host: true, // Listen on all network interfaces
    https: true, // Force HTTPS
    port: 9000,
    proxy: {
      '/rosbridge': {
        target: 'ws://127.0.0.1:9090',
        ws: true,
        rewrite: (path) => path.replace(/^\/rosbridge/, '')
      }
    }
  }
});
