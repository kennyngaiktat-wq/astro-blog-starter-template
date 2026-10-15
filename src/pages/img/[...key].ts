import type { APIRoute } from "astro";
import { first } from "../../lib/db";

// Serves product photos stored in D1: /img/p/<productId>?v=<revision>
export const GET: APIRoute = async ({ params, locals }) => {
	const m = /^p\/(\d+)$/.exec(params.key ?? "");
	if (!m) return new Response("Not found", { status: 404 });
	const row = await first<{ mime: string; data: ArrayBuffer | number[] }>(locals.env.DB, "SELECT mime, data FROM product_images WHERE product_id = ?", Number(m[1]));
	if (!row) return new Response("Not found", { status: 404 });
	const body = row.data instanceof ArrayBuffer ? row.data : new Uint8Array(row.data as number[]);
	return new Response(body, {
		headers: {
			"content-type": row.mime,
			"cache-control": "public, max-age=31536000, immutable",
		},
	});
};
