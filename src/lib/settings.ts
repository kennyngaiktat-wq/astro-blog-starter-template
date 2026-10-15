import { all } from "./db";

export interface Settings {
	shop_name_th: string;
	shop_name_en: string;
	phone: string;
	email: string;
	address_th: string;
	address_en: string;
	hours_th: string;
	hours_en: string;
	map_lat: string;
	map_lng: string;
	map_link: string;
	line_url: string;
	shopee_url: string;
	lazada_url: string;
	wongnai_url: string;
	facebook_url: string;
	member_discount_pct: string;
	shipping_fee: string;
	free_shipping_min: string;
	pickup_enabled: string;
	announcement_th: string;
	announcement_en: string;
	intl_enabled: string;
	intl_zones: string;
	refund_policy_th: string;
	refund_policy_en: string;
	checkout_mode: string;
	tiktok_url: string;
	show_controlled: string;
	pharmacy_license_no: string;
	pharmacist_name: string;
	pharmacist_license_no: string;
	pharmacist_hours_th: string;
	pharmacist_hours_en: string;
}

export const DEFAULT_SETTINGS: Settings = {
	shop_name_th: "บิ๊กฟาร์ม่า กรุ๊ป",
	shop_name_en: "Big Pharma Group",
	phone: "065 557 2588",
	email: "",
	address_th: "76/18 หมู่ 7 ต.บางโฉลง อ.บางพลี จ.สมุทรปราการ 10540",
	address_en: "76/18 Moo 7, Bang Chalong, Bang Phli, Samut Prakan 10540",
	hours_th: "เปิดทุกวัน 09:00 – 22:00 น.",
	hours_en: "Open daily 9:00 AM – 10:00 PM",
	map_lat: "13.6206393",
	map_lng: "100.7561232",
	map_link: "https://maps.app.goo.gl/kgt8eHBeXLc6NZos9",
	line_url: "https://line.me/ti/p/t4Mmtdefip",
	shopee_url: "",
	lazada_url: "",
	wongnai_url:
		"https://www.wongnai.com/businesses/3721373KE-%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B4%E0%B9%8A%E0%B8%81%E0%B8%9F%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%A1%E0%B9%88%E0%B8%B2-big-pharma-%E5%A4%A7%E8%8D%AF%E6%88%BF",
	facebook_url:
		"https://www.facebook.com/p/%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B4%E0%B9%8A%E0%B8%81%E0%B8%9F%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%A1%E0%B9%88%E0%B8%B2-BIG-Pharma-%E5%A4%A7%E8%8D%AF%E5%BA%97-61560575966274/",
	member_discount_pct: "5",
	shipping_fee: "50",
	free_shipping_min: "0",
	pickup_enabled: "1",
	announcement_th: "",
	announcement_en: "",
	intl_enabled: "0",
	intl_zones: "",
	refund_policy_th: "",
	refund_policy_en: "",
	checkout_mode: "auto",
	tiktok_url: "",
	show_controlled: "0",
	pharmacy_license_no: "",
	pharmacist_name: "",
	pharmacist_license_no: "",
	pharmacist_hours_th: "",
	pharmacist_hours_en: "",
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

let cache: { at: number; value: Settings } | null = null;

export async function loadSettings(db: D1Database): Promise<Settings> {
	if (cache && Date.now() - cache.at < 30_000) return cache.value;
	const rows = await all<{ key: string; value: string }>(db, "SELECT key, value FROM settings");
	const value = { ...DEFAULT_SETTINGS };
	for (const r of rows) {
		if (!(r.key in value)) continue;
		const canBeBlank = r.key.endsWith("_url") || r.key.startsWith("announcement") || r.key.startsWith("refund_policy") || ["email", "intl_zones"].includes(r.key) || r.key.startsWith("pharmac");
		if ((r.value ?? "") === "" && !canBeBlank) continue; // keep the default for required shop details
		(value as Record<string, string>)[r.key] = r.value ?? "";
	}
	cache = { at: Date.now(), value };
	return value;
}

export function clearSettingsCache() {
	cache = null;
}

export function num(v: string, fallback = 0): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
}

/** Online checkout is on when set to "on", or "auto" with Opn keys configured. */
export function checkoutEnabled(settings: Settings, env: { OPN_PUBLIC_KEY?: string; OPN_SECRET_KEY?: string }): boolean {
	if (settings.checkout_mode === "on") return true;
	if (settings.checkout_mode === "off") return false;
	return !!(env.OPN_PUBLIC_KEY && env.OPN_SECRET_KEY);
}
