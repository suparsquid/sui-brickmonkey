import { defineConfig, splitVendorChunkPlugin } from "vite";
// import { sentryVitePlugin } from "@sentry/vite-plugin";
import { resolve as pathResolve } from "path";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import nodePolyfills from "rollup-plugin-polyfill-node";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

import { dependencies } from "./package.json";

function renderChunks(deps: Record<string, string>) {
  const chunks = {};
  Object.keys(deps).forEach((key) => {
    if (["react", "react-router-dom", "react-dom"].includes(key)) return;
    chunks[key] = [key];
  });
  return chunks;
}

export default defineConfig((configEnv) => {
  const isDevelopment = configEnv.mode === "development";

  return {
    plugins: [react(), splitVendorChunkPlugin()],
    build: {
      // minify: false,
      // target: "es2015",
      outDir: "dist_web",
      sourcemap: true,
      // commonjsOptions: {
      //   include: [
      //     "node_modules/lodash-es/**/*.js",
      //     "node_modules/lodash/**/*.js",
      //     "node_modules/lodash.*/**/*.js",
      //   ],
      // },
      rollupOptions: {
        plugins: [
          // Enable rollup polyfills plugin
          // used during production bundling
          nodePolyfills({
            include: ["node_modules/**/*.js", "../../node_modules/**/*.js"],
          }),
          typescript({
            tsconfig: "./tsconfig.json",
            include: ["src/**/*.ts", "src/**/*.tsx"],
          }),
          // commonjs(),
        ],
      },
    },
    resolve: {
      alias: {
        "@app": pathResolve(__dirname, "src", "app"),
        "@components": pathResolve(__dirname, "src", "components"),
        "@hooks": pathResolve(__dirname, "src", "hooks"),
        "@pages": pathResolve(__dirname, "src", "pages"),
        "@utils": pathResolve(__dirname, "src", "utils"),
        "@codegen": pathResolve(__dirname, "src", "codegen"),
        "@providers": pathResolve(__dirname, "src", "providers"),
        lodash: "lodash-es",
        process: "rollup-plugin-node-polyfills/polyfills/process-es6",
        buffer: "rollup-plugin-node-polyfills/polyfills/buffer-es6",
        events: "rollup-plugin-node-polyfills/polyfills/events",
        util: "rollup-plugin-node-polyfills/polyfills/util",
        sys: "util",
        stream: "rollup-plugin-node-polyfills/polyfills/stream",
        _stream_duplex: "rollup-plugin-node-polyfills/polyfills/readable-stream/duplex",
        _stream_passthrough: "rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough",
        _stream_readable: "rollup-plugin-node-polyfills/polyfills/readable-stream/readable",
        _stream_writable: "rollup-plugin-node-polyfills/polyfills/readable-stream/writable",
        _stream_transform: "rollup-plugin-node-polyfills/polyfills/readable-stream/transform",
      },
    },
    css: {
      modules: {
        generateScopedName: isDevelopment ? "[name]__[local]__[hash:base64:5]" : "[hash:base64:5]",
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: "globalThis",
        },
        // Enable esbuild polyfill plugins
        plugins: [
          NodeGlobalsPolyfillPlugin({
            process: true,
          }),
          NodeModulesPolyfillPlugin(),
        ],
      },
    },
  };
});
