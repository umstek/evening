import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        author: 'umstek',
        license: 'MIT',
        icon: 'https://vitejs.dev/logo.svg',
        namespace: 'https://github.com/umstek',
        match: ['https://x.com/*'],
      },
      build: {
        autoGrant: true,
        externalGlobals: {
          react: cdn.jsdelivr('React', 'umd/react.production.min.js'),
          'react-dom': cdn.jsdelivr(
            'ReactDOM',
            'umd/react-dom.production.min.js',
          ),
          localforage: cdn.jsdelivr('localforage', 'dist/localforage.min.js'),
          'lucide-react': cdn.jsdelivr(
            'lucide-react',
            'dist/cjs/lucide-react.min.js',
          ),
        },
      },
    }),
  ],
  build: {
    minify: true,
    cssMinify: true,
  },
});
