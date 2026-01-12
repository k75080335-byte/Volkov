
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 플랫폼이 런타임에 주입할 수 있도록 문자열 그대로를 유지하거나 환경 변수를 참조하게 합니다.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
