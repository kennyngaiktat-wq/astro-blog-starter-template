import { CATEGORY_SLUGS, normaliseTags, toSatang, type Product } from "./catalog";
import { all, batchChunks } from "./db";
import { parseCsv } from "./csv";

// Header aliases: our own export format + the POS "Stock current balance" export (Thai headers)
const HEADER_MAP: Record<string, string> = {
	sku: "sku",
	"รหัสสินค้า": "sku",
	barcode: "barcode",
	"บาร์โค้ด": "barcode",
	name: "name",
	"ชื่อสินค้า": "name",
	name_en: "name_en",
	unit: "unit",
	"หน่วยขาย": "unit",
	price: "price",
	"ราคาขายต่อหน่วย": "price",
	stock: "stock",
	"จำนวนปัจจุบัน": "stock",
	category: "category",
	consult_required: "consult_required",
	active: "active",
	featured: "featured",
	tags: "tags",
	description: "description",
	image_url: "image_url",
	manufacturer: "manufacturer",
	description_en: "description_en",
	weight_g: "weight_g",
	intl_ok: "intl_ok",
	"ประเภทสินค้า": "pos_type",
};

// Default category for brand-new SKUs coming from the POS export
const POS_TYPE_DEFAULT: Record<string, { category: string; consult: number }> = {
	"ยา": { category: "other_medication", consult: 1 },
	"ยาคุมกำเนิด": { category: "other_medication", consult: 1 },
	"เวชภัณฑ์": { category: "medical_supplies", consult: 0 },
	"สมุนไพร": { category: "otc", consult: 0 },
	"อาหารเสริม & วิตามิน": { category: "health_supplements", consult: 0 },
	"สินค้าทั่วไป": { category: "medical_supplies", consult: 0 },
	"เครื่องสำอาง": { category: "health_supplements", consult: 0 },
	"อื่นๆ": { category: "medical_supplies", consult: 0 },
	"ขนมกินเล่น": { category: "health_supplements", consult: 0 },
	"อุปกรณ์สำหรับเด็ก": { category: "medical_supplies", consult: 0 },
};

const CATEGORY_ALIASES: Record<string, string> = {
	"medical equipment": "medical_equipment",
	"medical supplies": "medical_supplies",
	"health & supplements": "health_supplements",
	"health and supplements": "health_supplements",
	otc: "otc",
	"other medication": "other_medication",
	"อุปกรณ์การแพทย์": "medical_equipment",
	"เวชภัณฑ์": "medical_supplies",
	"สุขภาพและอาหารเสริม": "health_supplements",
	"ยาสามัญ (otc)": "otc",
	"ยาอื่นๆ (ปรึกษาเภสัชกร)": "other_medication",
};

const yes = (v: string) => /^(1|y|yes|true|ใช่|on)$/i.test(v.trim());

export interface ImportResult {
	created: number;
	updated: number;
	unchanged: number;
	skipped: { line: number; reason: string }[];
	hidden: number;
	columns: string[];
}

export async function importProducts(db: D1Database, text: string, opts: { createNew: boolean; hideMissing: boolean }): Promise<ImportResult> {
	const rows = parseCsv(text);
	if (rows.length < 2) throw new Error("The file has no data rows.");
	const header = rows[0].map((h) => HEADER_MAP[h.trim().toLowerCase()] ?? HEADER_MAP[h.trim()] ?? "");
	if (!header.includes("sku")) throw new Error("The file needs a 'sku' (or 'รหัสสินค้า') column.");
	const columns = [...new Set(header.filter(Boolean))];

	const existing = await all<Product>(db, "SELECT * FROM products");
	const bySku = new Map(existing.map((p) => [p.sku, p]));
	const seen = new Set<string>();
	const stmts: D1PreparedStatement[] = [];
	const result: ImportResult = { created: 0, updated: 0, unchanged: 0, skipped: [], hidden: 0, columns };

	rows.slice(1).forEach((r, i) => {
		const line = i + 2;
		const rec: Record<string, string> = {};
		header.forEach((key, idx) => {
			if (key) rec[key] = (r[idx] ?? "").trim();
		});
		const sku = rec.sku;
		if (!sku) return result.skipped.push({ line, reason: "missing SKU" });
		if (seen.has(sku)) return result.skipped.push({ line, reason: `duplicate SKU ${sku}` });
		seen.add(sku);

		const upd: Record<string, string | number | null> = {};
		if ("name" in rec && rec.name) upd.name = rec.name.replace(/\s+/g, " ").slice(0, 300);
		if ("name_en" in rec) upd.name_en = rec.name_en || null;
		if ("barcode" in rec) upd.barcode = rec.barcode.replace(/\.0$/, "") || null;
		if ("unit" in rec) upd.unit = rec.unit || null;
		if ("price" in rec && rec.price !== "") {
			const s = toSatang(rec.price);
			if (!Number.isFinite(s) || s < 0) return result.skipped.push({ line, reason: `bad price "${rec.price}"` });
			upd.price_satang = s;
		}
		if ("stock" in rec && rec.stock !== "") {
			const n = Math.floor(Number(rec.stock.replace(/,/g, "")));
			if (Number.isFinite(n)) upd.stock = n;
		}
		if ("category" in rec && rec.category) {
			const c = CATEGORY_SLUGS.includes(rec.category as never) ? rec.category : CATEGORY_ALIASES[rec.category.toLowerCase()];
			if (!c) return result.skipped.push({ line, reason: `unknown category "${rec.category}"` });
			upd.category = c;
		}
		if ("consult_required" in rec && rec.consult_required !== "") upd.consult_required = yes(rec.consult_required) ? 1 : 0;
		if ("active" in rec && rec.active !== "") upd.active = yes(rec.active) ? 1 : 0;
		if ("featured" in rec && rec.featured !== "") upd.featured = yes(rec.featured) ? 1 : 0;
		if ("tags" in rec) upd.tags = normaliseTags(rec.tags);
		if ("description" in rec) upd.description = rec.description || null;
		if ("image_url" in rec && rec.image_url !== "") upd.image_url = rec.image_url;
		if ("manufacturer" in rec) upd.manufacturer = rec.manufacturer || null;
		if ("description_en" in rec) upd.description_en = rec.description_en || null;
		if ("weight_g" in rec && rec.weight_g !== "") {
			const w = Math.floor(Number(rec.weight_g));
			if (Number.isFinite(w) && w >= 0) upd.weight_g = w || null;
		}
		if ("intl_ok" in rec) upd.intl_ok = rec.intl_ok === "" ? null : yes(rec.intl_ok) ? 1 : 0;

		const cur = bySku.get(sku);
		if (cur) {
			const changed = Object.entries(upd).filter(([k, v]) => String((cur as unknown as Record<string, unknown>)[k] ?? "") !== String(v ?? ""));
			if (!changed.length) {
				result.unchanged++;
				return;
			}
			const set = changed.map(([k]) => `${k} = ?`).join(", ");
			stmts.push(db.prepare(`UPDATE products SET ${set}, updated_at = datetime('now') WHERE id = ?`).bind(...changed.map(([, v]) => v), cur.id));
			result.updated++;
		} else {
			if (!opts.createNew) return result.skipped.push({ line, reason: `new SKU ${sku} (creating new products is switched off)` });
			if (!upd.name) return result.skipped.push({ line, reason: `new SKU ${sku} has no name` });
			const def = POS_TYPE_DEFAULT[rec.pos_type ?? ""] ?? { category: "medical_supplies", consult: 0 };
			const row = {
				sku,
				name: upd.name,
				name_en: upd.name_en ?? null,
				barcode: upd.barcode ?? null,
				unit: upd.unit ?? null,
				price_satang: upd.price_satang ?? 0,
				stock: upd.stock ?? 0,
				category: upd.category ?? def.category,
				consult_required: upd.consult_required ?? def.consult,
				active: upd.active ?? 1,
				featured: upd.featured ?? 0,
				tags: upd.tags ?? "",
				description: upd.description ?? null,
				image_url: upd.image_url ?? null,
				manufacturer: upd.manufacturer ?? null,
				description_en: upd.description_en ?? null,
				weight_g: upd.weight_g ?? null,
				intl_ok: upd.intl_ok ?? null,
			};
			const keys = Object.keys(row);
			stmts.push(db.prepare(`INSERT INTO products (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).bind(...Object.values(row)));
			result.created++;
		}
	});

	if (opts.hideMissing) {
		for (const p of existing) {
			if (!seen.has(p.sku) && p.active === 1) {
				stmts.push(db.prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?").bind(p.id));
				result.hidden++;
			}
		}
	}
	await batchChunks(db, stmts, 80);
	return result;
}
