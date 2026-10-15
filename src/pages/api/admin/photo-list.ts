import type { APIRoute } from "astro";
import { PUBLIC_SQL } from "../../../lib/catalog";
import { all } from "../../../lib/db";

// Admin-only: list of products that have a photo, for the "Download photos" export.
export const GET: APIRoute = async ({ url, locals }) => {
	const c = url.searchParams.get("controlled");
	const where = c === "no" ? `AND ${PUBLIC_SQL}` : c === "yes" ? `AND NOT ${PUBLIC_SQL}` : "";
	const rows = await all<{ id: number; sku: string; name: string; mime: string; image_rev: number }>(
		locals.env.DB,
		`SELECT p.id, p.sku, p.name, i.mime, p.image_rev FROM products p JOIN product_images i ON i.product_id = p.id WHERE 1=1 ${where} ORDER BY p.sku`,
	);
	return Response.json(
		rows.map((r) => ({ sku: r.sku, name: r.name, url: `/img/p/${r.id}?v=${r.image_rev}`, ext: r.mime === "image/png" ? "png" : r.mime === "image/webp" ? "webp" : r.mime === "image/gif" ? "gif" : "jpg" })),
		{ headers: { "cache-control": "no-store" } },
	);
};
