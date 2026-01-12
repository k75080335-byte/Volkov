
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // define 블록을 제거하여 플랫폼의 런타임 환경 변수 주입을 방해하지 않도록 합니다.
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
