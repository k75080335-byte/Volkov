
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // build 타겟을 최신으로 설정하여 process.env 참조를 유연하게 합니다.
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'terser'
  }
});
