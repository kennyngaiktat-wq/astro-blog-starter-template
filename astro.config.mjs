// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	site: "https://bigpharmagroup.com",
	output: "server",
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
	security: {
		// Astro checks the Origin header on form POSTs (CSRF protection)
		checkOrigin: true,
	},
});
