import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pkmn: ['@pkmn/dex', '@pkmn/data'],
          smogon: ['@smogon/calc'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
    testTimeout: 30000,
  },
});
