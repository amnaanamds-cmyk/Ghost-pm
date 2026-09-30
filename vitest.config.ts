import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      // Next's "server-only" guard throws outside the React server runtime.
      { find: "server-only", replacement: path.resolve(__dirname, "tests/setup/empty.ts") },
      // next-auth imports "next/server" without an extension, which Node ESM can't resolve.
      { find: /^next\/(server|headers|navigation|cache)$/, replacement: "next/$1.js" },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup/env.ts"],
    globalSetup: ["tests/setup/global.ts"],
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
    server: { deps: { inline: ["next-auth", "@auth/core", "@auth/prisma-adapter"] } },
  },
});
