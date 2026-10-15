import { all } from "./db";
import { canBuyOnline, type Product } from "./catalog";
import { num, type Settings } from "./settings";

export interface CartLine {
	sku: string;
	qty: number;
}

export interface PricedLine {
	product_id: number;
	sku: string;
	name: string;
	name_en: string | null;
	unit: string | null;
	category: string;
	image_url: string | null;
	price_satang: number;
	qty: number;
	line_satang: number;
	stock: number;
}

export interface Quote {
	lines: PricedLine[];
	removed: string[];
	adjusted: string[];
	subtotal: number;
	discount: number;
	shipping: number;
	total: number;
	discountPct: number;
	member: boolean;
}

export function sanitiseCart(input: unknown): CartLine[] {
	const out = new Map<string, number>();
	const list = Array.isArray(input)
		? input
		: input && typeof input === "object"
			? Object.entries(input as Record<string, unknown>).map(([sku, qty]) => ({ sku, qty }))
			: [];
	for (const raw of list.slice(0, 100)) {
		const r = raw as { sku?: unknown; qty?: unknown };
		const sku = String(r.sku ?? "").slice(0, 64);
		const qty = Math.floor(Number(r.qty));
		if (!sku || !Number.isFinite(qty) || qty < 1) continue;
		out.set(sku, Math.min(99, (out.get(sku) ?? 0) + qty));
	}
	return [...out.entries()].map(([sku, qty]) => ({ sku, qty }));
}

export async function quoteCart(
	db: D1Database,
	cart: CartLine[],
	opts: { member: boolean; delivery: "delivery" | "pickup"; settings: Settings },
): Promise<Quote> {
	const skus = cart.map((c) => c.sku);
	const products = skus.length
		? await all<Product>(db, `SELECT * FROM products WHERE sku IN (${skus.map(() => "?").join(",")})`, ...skus)
		: [];
	const bySku = new Map(products.map((p) => [p.sku, p]));
	const lines: PricedLine[] = [];
	const removed: string[] = [];
	const adjusted: string[] = [];

	for (const c of cart) {
		const p = bySku.get(c.sku);
		if (!p || !canBuyOnline(p) || p.stock <= 0 || p.price_satang <= 0) {
			removed.push(c.sku);
			continue;
		}
		let qty = c.qty;
		if (qty > p.stock) {
			qty = p.stock;
			adjusted.push(c.sku);
		}
		lines.push({
			product_id: p.id,
			sku: p.sku,
			name: p.name,
			name_en: p.name_en,
			unit: p.unit,
			category: p.category,
			image_url: p.image_url,
			price_satang: p.price_satang,
			qty,
			line_satang: p.price_satang * qty,
			stock: p.stock,
		});
	}

	const subtotal = lines.reduce((a, l) => a + l.line_satang, 0);
	const discountPct = opts.member ? num(opts.settings.member_discount_pct, 0) : 0;
	const discount = Math.round((subtotal * discountPct) / 100);
	const afterDiscount = subtotal - discount;
	const fee = Math.round(num(opts.settings.shipping_fee, 0) * 100);
	const freeMin = Math.round(num(opts.settings.free_shipping_min, 0) * 100);
	let shipping = 0;
	if (opts.delivery === "delivery" && lines.length) {
		shipping = freeMin > 0 && afterDiscount >= freeMin ? 0 : fee;
	}
	return {
		lines,
		removed,
		adjusted,
		subtotal,
		discount,
		shipping,
		total: afterDiscount + shipping,
		discountPct,
		member: opts.member,
	};
}
