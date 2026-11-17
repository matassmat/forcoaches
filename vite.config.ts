import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Vite savaime PORT kintamojo neskaito. Be šito automatinis porto
    // priskyrimas neveiktų ir serveris liptų ant užimto 5174.
    port: Number(process.env.PORT) || 5174,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // Bibliotekos į atskirus failus: jos keičiasi retai, todėl po kiekvieno
        // mūsų kodo pakeitimo naršyklė jų nebeatsisiunčia iš naujo.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
