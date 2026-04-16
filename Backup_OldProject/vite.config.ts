import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // Tăng limit từ 500KB lên 1000KB
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Tách vendor libraries thành chunks riêng
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'mui-vendor': ['@mui/material', '@mui/x-charts', '@emotion/react', '@emotion/styled'],
          // 'icons-vendor': ['react-icons'], // Để Vite tự động split dynamic imports
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
    pure: ['console.log', 'console.info', 'console.debug', 'console.trace'],
    legalComments: 'none',
    treeShaking: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Manual registration - we'll register our custom SW manually
      injectRegister: false, // Don't auto-register, we'll do it manually in main.tsx
      includeAssets: ['vite.svg', 'icon-192x192.png', 'icon-512x512.png', 'bogin-logo.png', 'logo-nontext.png'],
      manifest: {
        name: 'BOfin App',
        short_name: 'BOfin',
        description: 'BOfin Financial Application',
        theme_color: '#10b981',
        background_color: '#10b981',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/login',
        scope: '/',
        display_override: ['fullscreen', 'standalone'],
        categories: ['finance', 'productivity'],
        lang: 'vi',
        dir: 'ltr',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Đăng nhập',
            short_name: 'Login',
            description: 'Đăng nhập vào BOfin',
            url: '/login',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Cache strategy: CacheFirst for static assets, NetworkFirst for API
        runtimeCaching: [
          // Static assets - Cache first (fastest)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // API calls - Network first with cache fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 3 // Fallback to cache after 3 seconds
            }
          },
          // Auth endpoints - Network only (no cache for security)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Images and assets - Cache first
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Fonts - Cache first
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  // Server config only for local development, not needed for production build
  server: process.env.NODE_ENV === 'development' ? (() => {
    const baseConfig = {
      host: '192.168.1.200',
      port: 3100,
    }

    // Enable HTTPS only if VITE_USE_HTTPS is set to 'true'
    // For local development, you can use HTTP unless you need HTTPS features
    // To enable HTTPS: set VITE_USE_HTTPS=true in .env file
    if (process.env.VITE_USE_HTTPS === 'true') {
      // Try to use mkcert certificate if available (recommended for local dev)
      const certPath = path.resolve(__dirname, 'localhost+2.pem')
      const keyPath = path.resolve(__dirname, 'localhost+2-key.pem')

      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        console.log('✅ Using mkcert certificate for HTTPS')
        return {
          ...baseConfig,
          https: {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          },
        }
      } else {
        // Fallback to self-signed certificate
        // Browser will show warning - click "Advanced" -> "Proceed to site"
        console.warn('⚠️  Using self-signed certificate. Browser will show security warning.')
        console.warn('💡 Tip: Install mkcert for trusted local certificates: https://github.com/FiloSottile/mkcert')
        return {
          ...baseConfig,
          https: true as any, // Vite accepts boolean but TypeScript types don't reflect this
        }
      }
    }

    // Default: HTTP
    return baseConfig
  })() : undefined,
})
