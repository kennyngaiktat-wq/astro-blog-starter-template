import type { APIRoute } from "astro";
import { fetchImage, sniffImageType } from "../../../lib/images";

// Admin-only: fetches an image from another site so the browser can resize it before saving.
export const GET: APIRoute = async ({ url }) => {
	try {
		const bytes = await fetchImage(url.searchParams.get("url") ?? "");
		if (bytes.byteLength > 15_000_000) return new Response("Image too large", { status: 413 });
		return new Response(bytes, { headers: { "content-type": sniffImageType(bytes) ?? "application/octet-stream", "cache-control": "no-store" } });
	} catch (err) {
		return new Response((err as Error).message, { status: 400 });
	}
};
