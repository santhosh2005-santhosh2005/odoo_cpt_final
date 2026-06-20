import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

// Custom Vite plugin to serve landing.html at "/" and React app for /app/* Custom Vite plugin to serve landing.html at "/" and React app for /app/* routes
const landingPagePlugin = () => {
  return {
    name: "landing-page-plugin",
    configureServer(server) {
      // Make sure our middleware runs BEFORE Vite's default middleware
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        
        // Only handle the root route "/" and "/index.html"
        if (url === "/" || url === "/index.html") {
          // Serve landing page
          const landingPath = path.resolve(__dirname, "landing.html");
          const content = fs.readFileSync(landingPath, "utf-8");
          res.setHeader("Content-Type", "text/html");
          res.end(content);
        } else {
          // Let Vite handle everything else, including /app/* and assets
          next();
        }
      });
    },
    closeBundle() {
      // After build, rename landing.html to index.html
      const distDir = path.resolve(__dirname, "dist");
      const landingPath = path.join(distDir, "landing.html");
      const indexPath = path.join(distDir, "index.html");
      
      if (fs.existsSync(landingPath)) {
        // First, rename the existing index.html (React app) to app/index.html
        const appDir = path.join(distDir, "app");
        if (!fs.existsSync(appDir)) {
          fs.mkdirSync(appDir, { recursive: true });
        }
        const reactIndexPath = path.join(appDir, "index.html");
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, reactIndexPath);
        }
        // Then rename landing.html to index.html
        fs.copyFileSync(landingPath, indexPath);
        fs.unlinkSync(landingPath);
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), landingPagePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "/",
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5001",
        changeOrigin: true,
        ws: true,
      },
    },
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "landing.html"),
        "app/index": path.resolve(__dirname, "index.html"),
      },
      output: {
        // Make sure React app assets are in assets/app/
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.facadeModuleId?.includes("index.html")) {
            return "assets/app/[name]-[hash].js";
          }
          return "assets/[name]-[hash].js";
        },
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.facadeModuleId?.includes("index.html")) {
            return "assets/app/[name]-[hash].js";
          }
          return "assets/[name]-[hash].js";
        },
        assetFileNames: (assetInfo) => {
          // Check if this asset is for the app
          return "assets/[name]-[hash][extname]";
        }
      }
    },
  },
});
