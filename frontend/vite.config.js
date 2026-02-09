import { defineConfig } from 'vite';
import { resolve } from "path";

export default defineConfig({
    root: '.',
    server: {
      host: true,
      port: 8080,
      proxy: {
          '/api': {
              target: 'http://backend:3000',
              changeOrigin: true,
              secure: false,
          },
      },
    },

    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                login: resolve(__dirname, 'pages/login.html'),
                admin: resolve(__dirname, 'pages/admin.html'),
                dashboard_operation: resolve(__dirname, 'pages/dashboard_operation.html'),
                dashboard_analysis: resolve(__dirname, 'pages/dashboard_analysis.html'),
                chat: resolve(__dirname, 'pages/chat.html'),
                users: resolve(__dirname, 'pages/users.html'),
                logs: resolve(__dirname, 'pages/logs.html'),
            },
        },
    },

    plugins: [
    {
      name: 'rewrite-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // CSSやJS、画像などのアセットへのリクエストはリライトしない
          if (req.url.includes('.')) {
            return next();
          }

          // URLとHTMLファイルのマッピング
          if (req.url.startsWith('/login')) {
            req.url = '/pages/login.html';
          } else if (req.url.startsWith('/admin')) {
            req.url = '/pages/admin.html';
          } else if (req.url.startsWith('/dashboard')) {
            req.url = '/pages/dashboard_operation.html';
          } else if (req.url.startsWith('/chat')) {
            req.url = '/pages/chat.html';
          } else if (req.url.startsWith('//users')) {
            req.url = '/pages/users.html';
          } else if (req.url.startsWith('/logs')) {
            req.url = '/pages/logs.html';
          }
          
          next();
        });
      },
    },
  ],
});