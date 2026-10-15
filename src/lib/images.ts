import { first, run } from "./db";

export const MAX_IMAGE_BYTES = 1_500_000;

export interface MatchedProduct {
	id: number;
	sku: string;
	name: string;
	barcode: string | null;
}

/** Finds a product from a file name like "IT-0000455.jpg", "8850007850496.png" or "455.webp". */
export async function matchProductByFilename(db: D1Database, filename: string): Promise<MatchedProduct | null> {
	const stem = filename.replace(/\.[a-z0-9]+$/i, "").replace(/\s*\(\d+\)$/, "").trim();
	if (!stem) return null;
	const candidates = [stem];
	if (/^\d{1,6}$/.test(stem)) candidates.push(`IT-${stem.padStart(7, "0")}`);
	for (const c of candidates) {
		const p = await first<MatchedProduct>(db, "SELECT id, sku, name, barcode FROM products WHERE sku = ? COLLATE NOCASE OR barcode = ? LIMIT 1", c, c);
		if (p) return p;
	}
	return null;
}

export function sniffImageType(bytes: Uint8Array): string | null {
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
	if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
	if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
	if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
	return null;
}

export async function saveProductImage(db: D1Database, productId: number, bytes: Uint8Array, source: string): Promise<string> {
	const mime = sniffImageType(bytes);
	if (!mime) throw new Error("That file isn't a JPG, PNG, WebP or GIF image.");
	if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is too large (max 1.5 MB). Upload it through the admin page so it's resized automatically.");
	await run(
		db,
		`INSERT INTO product_images (product_id, mime, data, source, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
		 ON CONFLICT(product_id) DO UPDATE SET mime = excluded.mime, data = excluded.data, source = excluded.source, updated_at = excluded.updated_at`,
		productId,
		mime,
		bytes,
		source.slice(0, 300),
	);
	const row = await first<{ image_rev: number }>(
		db,
		"UPDATE products SET image_rev = image_rev + 1, image_url = '/img/p/' || id || '?v=' || (image_rev + 1), updated_at = datetime('now') WHERE id = ? RETURNING image_rev",
		productId,
	);
	return `/img/p/${productId}?v=${row?.image_rev ?? 1}`;
}

export async function deleteProductImage(db: D1Database, productId: number) {
	await run(db, "DELETE FROM product_images WHERE product_id = ?", productId);
	await run(db, "UPDATE products SET image_url = NULL, updated_at = datetime('now') WHERE id = ?", productId);
}

/** Downloads an image from a link (server side) — used for "paste image link". */
export async function fetchImage(url: string): Promise<Uint8Array<ArrayBuffer>> {
	if (!/^https?:\/\//i.test(url)) throw new Error("Enter a link starting with http:// or https://");
	const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (BigPharmaGroup product image fetch)", Accept: "image/*" }, redirect: "follow" });
	if (!res.ok) throw new Error(`The site returned ${res.status}. Try copying the image itself and pasting it instead.`);
	const buf = new Uint8Array(await res.arrayBuffer());
	if (!sniffImageType(buf)) throw new Error("That link isn't a direct image. Right-click the picture → “Copy image address”, or copy the image and paste it.");
	return buf;
}

/** Looks up a barcode on Open Food / Beauty / Products Facts (CC BY-SA photos). */
export async function openFactsImage(barcode: string): Promise<string | null> {
	if (!/^\d{8,14}$/.test(barcode)) return null;
	for (const host of ["world.openfoodfacts.org", "world.openbeautyfacts.org", "world.openproductsfacts.org"]) {
		try {
			const res = await fetch(`https://${host}/api/v2/product/${barcode}.json?fields=image_front_url`, {
				headers: { "User-Agent": "BigPharmaGroup/1.0 (https://bigpharmagroup.com)" },
			});
			if (!res.ok) continue;
			const d = (await res.json()) as { product?: { image_front_url?: string } };
			if (d.product?.image_front_url) return d.product.image_front_url;
		} catch {
			/* try next */
		}
	}
	return null;
}
