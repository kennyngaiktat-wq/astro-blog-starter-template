import type { APIRoute } from "astro";
import { MAX_IMAGE_BYTES, sniffImageType } from "../../../lib/images";

// Admin-only: stores an (already resized) image for articles and returns its URL.
export const POST: APIRoute = async ({ request, locals }) => {
	const fd = await request.formData();
	const file = fd.get("file");
	if (!(file instanceof File)) return Response.json({ ok: false, error: "No file" }, { status: 400 });
	const bytes = new Uint8Array(await file.arrayBuffer());
	const mime = sniffImageType(bytes);
	if (!mime) return Response.json({ ok: false, error: "Not an image" }, { status: 400 });
	if (bytes.byteLength > MAX_IMAGE_BYTES) return Response.json({ ok: false, error: "Image too large" }, { status: 400 });
	const row = await locals.env.DB.prepare("INSERT INTO media (mime, data) VALUES (?, ?) RETURNING id").bind(mime, bytes).first<{ id: number }>();
	return Response.json({ ok: true, id: row!.id, url: `/img/m/${row!.id}` });
};
