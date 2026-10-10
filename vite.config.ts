import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// Served from the host root by Telegram Serverless, so the default base is right.
export default defineConfig({
    plugins: [svelte()],
    resolve: {
        alias: {
            // The route config shape is defined once, in the module the bot
            // itself uses. Both are plain, dependency-free JavaScript, so the
            // browser can bundle them and the two can never drift.
            $config: fileURLToPath(
                new URL("./tgcloud/lib/config.js", import.meta.url),
            ),
            $status: fileURLToPath(
                new URL("./tgcloud/lib/health.js", import.meta.url),
            ),
        },
    },
    build: { outDir: "dist", emptyOutDir: true },
});
