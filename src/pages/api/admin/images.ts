import type { APIRoute } from "astro";
import { first } from "../../../lib/db";
import { deleteProductImage, fetchImage, matchProductByFilename, openFactsImage, saveProductImage, type MatchedProduct } from "../../../lib/images";

// Admin-only (the middleware blocks /api/admin/* without an admin session).
//  multipart: file (+ product_id, or matched from the file name)
//  json: { product_id, url } | { product_id, openfacts: true } | { product_id, delete: true }
export const POST: APIRoute = async ({ request, locals }) => {
	const db = locals.env.DB;
	try {
		const type = request.headers.get("content-type") ?? "";
		if (type.includes("multipart/form-data")) {
			const fd = await request.formData();
			const file = fd.get("file");
			if (!(file instanceof File)) return Response.json({ ok: false, error: "No file" }, { status: 400 });
			const pid = Number(fd.get("product_id"));
			const name = String(fd.get("filename") || file.name);
			const product = pid
				? await first<MatchedProduct>(db, "SELECT id, sku, name, barcode FROM products WHERE id = ?", pid)
				: await matchProductByFilename(db, name);
			if (!product) return Response.json({ ok: false, error: `No product matches “${name}”. Name the file with the SKU or barcode.` });
			const url = await saveProductImage(db, product.id, new Uint8Array(await file.arrayBuffer()), `upload:${name}`);
			return Response.json({ ok: true, product_id: product.id, sku: product.sku, name: product.name, image_url: url });
		}

		const b = (await request.json()) as { product_id?: number; url?: string; openfacts?: boolean; delete?: boolean };
		const product = await first<MatchedProduct>(db, "SELECT id, sku, name, barcode FROM products WHERE id = ?", Number(b.product_id));
		if (!product) return Response.json({ ok: false, error: "Product not found" }, { status: 404 });
		if (b.delete) {
			await deleteProductImage(db, product.id);
			return Response.json({ ok: true, product_id: product.id, image_url: null });
		}
		let src = b.url ? String(b.url).trim() : "";
		if (b.openfacts) {
			src = (product.barcode && (await openFactsImage(product.barcode))) || "";
			if (!src) return Response.json({ ok: false, error: "No photo found for this barcode on Open Food Facts." });
			src = src.replace(/\.400\.jpg$/, ".full.jpg");
		}
		if (!src) return Response.json({ ok: false, error: "Paste an image link first." }, { status: 400 });
		const bytes = await fetchImage(src);
		if (bytes.byteLength > 1_500_000) {
			// Ask the browser to resize it and send it back as a file
			return Response.json({ ok: false, resize: true, error: "Image is large — resizing in your browser…" });
		}
		const url = await saveProductImage(db, product.id, bytes, src);
		return Response.json({ ok: true, product_id: product.id, sku: product.sku, name: product.name, image_url: url });
	} catch (err) {
		return Response.json({ ok: false, error: (err as Error).message }, { status: 200 });
	}
};
