import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import CompressionPlugin from 'vite-plugin-compression';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        CompressionPlugin({
            algorithm: 'brotliCompress',
        }),
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
    },
    server: {
        port: 3000,
        host: true,
        allowedHosts: true,
    },
    build: {
        outDir: 'build',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                }
            }
        }
    },
    esbuild: {
        loader: 'tsx',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    }
});
