import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error local Vite build helper is plain JavaScript
import {agoraIceCompat,agoraIceOptimizer} from './scripts/agora-ice-compat.mjs';
import tailwindcss from '@tailwindcss/vite';
import {fileURLToPath, URL} from 'node:url';
export default defineConfig({plugins:[agoraIceCompat(),react(),tailwindcss()],optimizeDeps:{esbuildOptions:{plugins:[agoraIceOptimizer()]}},resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},server:{port:4177,strictPort:true,proxy:{'/api/nia':{target:'http://127.0.0.1:4179',changeOrigin:false,ws:true},'/api':{target:'http://127.0.0.1:4178',changeOrigin:false}}},build:{outDir:'dist'}});
