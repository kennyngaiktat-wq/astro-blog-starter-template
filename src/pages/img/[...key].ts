import type { APIRoute } from "astro";

// Serves product images uploaded to the optional R2 bucket (binding: IMAGES).
export const GET: APIRoute = async ({ params, locals }) => {
	const bucket = locals.env.IMAGES;
	const key = params.key ?? "";
	if (!bucket || !key.startsWith("products/")) return new Response("Not found", { status: 404 });
	const obj = await bucket.get(key);
	if (!obj) return new Response("Not found", { status: 404 });
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("etag", obj.httpEtag);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	return new Response(obj.body, { headers });
};
