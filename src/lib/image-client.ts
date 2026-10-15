// Browser helpers for the admin photo tools: resize, upload, paste.

export async function resizeImage(blob: Blob, max = 900, quality = 0.85): Promise<Blob> {
	const bmp = await createImageBitmap(blob);
	const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
	const w = Math.round(bmp.width * scale);
	const h = Math.round(bmp.height * scale);
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d")!;
	ctx.fillStyle = "#fff"; // transparent PNGs get a white background
	ctx.fillRect(0, 0, w, h);
	ctx.drawImage(bmp, 0, 0, w, h);
	bmp.close();
	return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality));
}

export interface UploadResult {
	ok: boolean;
	error?: string;
	product_id?: number;
	sku?: string;
	name?: string;
	image_url?: string | null;
	resize?: boolean;
}

/** Resize then upload. Without productId the server matches the file name to a SKU or barcode. */
export async function uploadImage(blob: Blob, opts: { productId?: number; filename?: string }): Promise<UploadResult> {
	const small = await resizeImage(blob);
	const fd = new FormData();
	fd.append("file", small, "photo.jpg");
	if (opts.productId) fd.append("product_id", String(opts.productId));
	if (opts.filename) fd.append("filename", opts.filename);
	const res = await fetch("/api/admin/images", { method: "POST", body: fd });
	return res.json();
}

async function postJson(body: Record<string, unknown>): Promise<UploadResult> {
	const res = await fetch("/api/admin/images", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
	return res.json();
}

/** Save from a link; large images are fetched through the server and resized here. */
export async function imageFromUrl(productId: number, url: string): Promise<UploadResult> {
	const r = await postJson({ product_id: productId, url });
	if (r.ok || !r.resize) return r;
	const res = await fetch(`/api/admin/image-proxy?url=${encodeURIComponent(url)}`);
	if (!res.ok) return { ok: false, error: await res.text() };
	return uploadImage(await res.blob(), { productId });
}

export function openFacts(productId: number): Promise<UploadResult> {
	return postJson({ product_id: productId, openfacts: true });
}

export function deleteImage(productId: number): Promise<UploadResult> {
	return postJson({ product_id: productId, delete: true });
}

/** Returns the first image (file or link) found in a paste event. */
export async function imageFromPaste(e: ClipboardEvent): Promise<{ blob?: Blob; url?: string } | null> {
	const items = e.clipboardData?.items ?? ([] as unknown as DataTransferItemList);
	for (const it of Array.from(items)) {
		if (it.kind === "file" && it.type.startsWith("image/")) {
			const f = it.getAsFile();
			if (f) return { blob: f };
		}
	}
	const html = e.clipboardData?.getData("text/html") ?? "";
	const m = /<img[^>]+src="([^"]+)"/i.exec(html);
	if (m && /^https?:/.test(m[1])) return { url: m[1] };
	const text = (e.clipboardData?.getData("text/plain") ?? "").trim();
	if (/^https?:\/\/\S+$/.test(text)) return { url: text };
	return null;
}
