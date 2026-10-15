import { all, first } from "./db";

export type Lang = "th" | "en";

export const CATEGORIES = [
	{
		slug: "medical_equipment",
		th: "อุปกรณ์การแพทย์",
		en: "Medical Equipment",
		descTh: "รถเข็น เตียงผู้ป่วย เครื่องวัดความดัน และอุปกรณ์ดูแลผู้ป่วยที่บ้าน สั่งซื้อทาง LINE",
		descEn: "Wheelchairs, hospital beds, blood pressure monitors and home-care devices — order on LINE",
		icon: "equipment",
	},
	{
		slug: "medical_supplies",
		th: "เวชภัณฑ์",
		en: "Medical Supplies",
		descTh: "พลาสเตอร์ ผ้าก๊อซ หน้ากากอนามัย แอลกอฮอล์ ชุดตรวจ และของใช้ทำแผล",
		descEn: "Plasters, gauze, masks, alcohol, test kits and wound care",
		icon: "supplies",
	},
	{
		slug: "health_supplements",
		th: "สุขภาพและอาหารเสริม",
		en: "Health & Supplements",
		descTh: "วิตามิน อาหารเสริม และผลิตภัณฑ์ดูแลผิว",
		descEn: "Vitamins, supplements and personal care",
		icon: "supplements",
	},
	{
		slug: "otc",
		th: "ยาสามัญ (OTC)",
		en: "Over-the-Counter (OTC) Medicine",
		descTh: "ยาสามัญประจำบ้าน ยาแก้ปวด ยาลดกรด ยาอม ยาหม่อง และยาสมุนไพร",
		descEn: "Household remedies, pain relief, antacids, lozenges, balms and herbal medicine",
		icon: "otc",
	},
	{
		slug: "other_medication",
		th: "ยาอื่นๆ (ปรึกษาเภสัชกร)",
		en: "Other Medication (Pharmacist Consultation)",
		descTh: "ยาที่ต้องได้รับคำแนะนำจากเภสัชกรก่อนจ่าย มีจำหน่ายที่ร้าน",
		descEn: "Medicines dispensed after a pharmacist consultation, available in store",
		icon: "rx",
	},
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as CategorySlug[];

const NAV_NAMES: Record<string, { th: string; en: string }> = {
	otc: { th: "ยาสามัญ (OTC)", en: "OTC Medicine" },
	other_medication: { th: "ยาอื่นๆ", en: "Other Medication" },
};

/** Shorter label for the top navigation bar. */
export function navName(slug: string, lang: Lang): string {
	return NAV_NAMES[slug]?.[lang] ?? categoryName(slug, lang);
}

export function categoryName(slug: string, lang: Lang): string {
	const c = CATEGORIES.find((x) => x.slug === slug);
	return c ? c[lang] : slug;
}

export const TAG_LABELS: Record<string, { th: string; en: string }> = {
	"pain-fever": { th: "แก้ปวด ลดไข้", en: "Pain & fever" },
	"muscle-joint": { th: "ปวดเมื่อยกล้ามเนื้อ", en: "Muscle & joint" },
	"cough-cold": { th: "ไอ เจ็บคอ หวัด", en: "Cough & cold" },
	allergy: { th: "ภูมิแพ้", en: "Allergy" },
	digestive: { th: "ระบบทางเดินอาหาร", en: "Digestive" },
	skin: { th: "ผิวหนังและความงาม", en: "Skin care" },
	"eye-care": { th: "ดูแลดวงตา", en: "Eye care" },
	"first-aid": { th: "ปฐมพยาบาล", en: "First aid" },
	"sexual-health": { th: "สุขภาพทางเพศ", en: "Sexual health" },
	"womens-health": { th: "สุขภาพผู้หญิง", en: "Women's health" },
	vitamins: { th: "วิตามิน", en: "Vitamins" },
	herbal: { th: "สมุนไพรไทย", en: "Thai herbal" },
	kids: { th: "สำหรับเด็ก", en: "Kids" },
	"test-kits": { th: "ชุดตรวจ", en: "Test kits" },
	"masks-hygiene": { th: "หน้ากากและสุขอนามัย", en: "Masks & hygiene" },
	contraception: { th: "คุมกำเนิด", en: "Contraception" },
	inhalant: { th: "ยาดม", en: "Inhalants" },
	antibiotic: { th: "ยาปฏิชีวนะ", en: "Antibiotics" },
	"heart-bp-cholesterol": { th: "หัวใจ ความดัน ไขมัน", en: "Heart, BP & cholesterol" },
	diabetes: { th: "เบาหวาน", en: "Diabetes" },
	snacks: { th: "ของฝาก ขนม", en: "Snacks" },
	mobility: { th: "รถเข็นและอุปกรณ์ช่วยเดิน", en: "Wheelchairs & mobility" },
	beds: { th: "เตียงผู้ป่วยและที่นอน", en: "Hospital beds & mattresses" },
	respiratory: { th: "อุปกรณ์ระบบหายใจ", en: "Respiratory equipment" },
};

export function tagLabel(tag: string, lang: Lang): string {
	return TAG_LABELS[tag]?.[lang] ?? tag;
}

export interface Product {
	id: number;
	sku: string;
	barcode: string | null;
	name: string;
	name_en: string | null;
	unit: string | null;
	price_satang: number;
	stock: number;
	category: string;
	consult_required: number;
	active: number;
	featured: number;
	tags: string;
	description: string | null;
	image_url: string | null;
	description_en: string | null;
	manufacturer: string | null;
	weight_g: number | null;
	intl_ok: number | null;
	image_rev: number;
	shopee_url: string | null;
	lazada_url: string | null;
	created_at: string;
	updated_at: string;
}

export function splitTags(tags: string | null | undefined): string[] {
	return (tags ?? "")
		.split(",")
		.map((t) => t.trim().toLowerCase())
		.filter(Boolean);
}

export function normaliseTags(input: string | string[]): string {
	const list = Array.isArray(input) ? input : input.split(",");
	return [...new Set(list.map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))].join(",");
}

export function displayName(p: Pick<Product, "name" | "name_en">, lang: Lang): string {
	return lang === "en" && p.name_en ? p.name_en : p.name;
}

export function baht(satang: number, withSymbol = true): string {
	const v = (satang / 100).toLocaleString("en-US", { minimumFractionDigits: satang % 100 ? 2 : 0, maximumFractionDigits: 2 });
	return withSymbol ? `฿${v}` : v;
}

export function toSatang(v: string | number): number {
	const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
	return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** Controlled medicines: listed, but only supplied after a pharmacist consultation. */
export function isControlled(p: Pick<Product, "consult_required" | "category">): boolean {
	return p.consult_required === 1 || p.category === "other_medication";
}

/** Medical equipment (wheelchairs, beds…) is always shown as available, even with no stock on hand. */
export function isAlwaysAvailable(p: Pick<Product, "category">): boolean {
	return p.category === "medical_equipment";
}

/** Can go in the cart (server-side rule; stock is checked separately). */
export function canBuyOnline(p: Pick<Product, "consult_required" | "category" | "active" | "price_satang">): boolean {
	return p.active === 1 && !isControlled(p) && p.price_satang > 0;
}

export type BuyAction = "cart" | "consult" | "marketplace" | "line";

export interface BuyInfo {
	action: BuyAction;
	available: boolean; // show "in stock / available"
	outOfStock: boolean;
	shopee: string | null;
	lazada: string | null;
}

/** Decides which button a product shows, given whether online checkout is switched on. */
export function buyInfo(
	p: Pick<Product, "consult_required" | "category" | "active" | "price_satang" | "stock" | "shopee_url" | "lazada_url">,
	ctx: { checkout: boolean; shopShopee?: string; shopLazada?: string },
): BuyInfo {
	const always = isAlwaysAvailable(p);
	const outOfStock = !always && p.stock <= 0;
	const shopee = p.shopee_url || null;
	const lazada = p.lazada_url || null;
	if (isControlled(p)) return { action: "consult", available: false, outOfStock: false, shopee: null, lazada: null };
	if (ctx.checkout && canBuyOnline(p) && !outOfStock) return { action: "cart", available: true, outOfStock, shopee, lazada };
	if (!ctx.checkout && (shopee || lazada)) return { action: "marketplace", available: !outOfStock, outOfStock, shopee, lazada };
	return { action: "line", available: always || !outOfStock, outOfStock, shopee: null, lazada: null };
}

export function displayDescription(p: Pick<Product, "description" | "description_en">, lang: Lang): string {
	return (lang === "en" ? p.description_en || p.description : p.description || p.description_en) ?? "";
}

export interface ProductQuery {
	q?: string;
	category?: string;
	tag?: string;
	consult?: "yes" | "no" | "";
	active?: "yes" | "no" | "";
	stock?: "in" | "out" | "";
	image?: "yes" | "no" | "";
	sort?: string;
	page?: number;
	perPage?: number;
	includeInactive?: boolean;
}

export function buildProductWhere(q: ProductQuery) {
	const where: string[] = [];
	const params: unknown[] = [];
	if (!q.includeInactive) where.push("active = 1");
	if (q.active === "yes") where.push("active = 1");
	if (q.active === "no") where.push("active = 0");
	if (q.category) {
		where.push("category = ?");
		params.push(q.category);
	}
	if (q.tag) {
		where.push("(',' || tags || ',') LIKE ?");
		params.push(`%,${q.tag},%`);
	}
	if (q.consult === "yes") where.push("consult_required = 1");
	if (q.consult === "no") where.push("consult_required = 0");
	if (q.stock === "in") where.push("stock > 0");
	if (q.stock === "out") where.push("stock <= 0");
	if (q.image === "yes") where.push("IFNULL(image_url,'') != ''");
	if (q.image === "no") where.push("IFNULL(image_url,'') = ''");
	if (q.q) {
		const terms = q.q.trim().split(/\s+/).slice(0, 5);
		for (const term of terms) {
			where.push("(name LIKE ? OR IFNULL(name_en,'') LIKE ? OR sku LIKE ? OR IFNULL(barcode,'') LIKE ? OR tags LIKE ? OR IFNULL(manufacturer,'') LIKE ?)");
			const like = `%${term}%`;
			params.push(like, like, like, like, like, like);
		}
	}
	return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

const SORTS: Record<string, string> = {
	name: "name COLLATE NOCASE ASC",
	price_asc: "price_satang ASC",
	price_desc: "price_satang DESC",
	newest: "id DESC",
	updated: "updated_at DESC",
	stock: "stock ASC",
	default: "featured DESC, (stock > 0) DESC, name COLLATE NOCASE ASC",
};

export async function queryProducts(db: D1Database, q: ProductQuery) {
	const { sql, params } = buildProductWhere(q);
	const perPage = q.perPage ?? 24;
	const page = Math.max(1, q.page ?? 1);
	const order = SORTS[q.sort ?? "default"] ?? SORTS.default;
	const totalRow = await first<{ n: number }>(db, `SELECT COUNT(*) AS n FROM products ${sql}`, ...params);
	const items = await all<Product>(db, `SELECT * FROM products ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, perPage, (page - 1) * perPage);
	const total = totalRow?.n ?? 0;
	return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function allTags(db: D1Database, includeInactive = false): Promise<{ tag: string; n: number }[]> {
	const rows = await all<{ tags: string }>(db, `SELECT tags FROM products WHERE tags != '' ${includeInactive ? "" : "AND active = 1"}`);
	const counts = new Map<string, number>();
	for (const r of rows) for (const t of splitTags(r.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
	return [...counts.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n);
}
