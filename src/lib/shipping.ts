// International shipping: countries, zones and weight-based rates.
import type { Settings } from "./settings";

export interface Zone {
	id: string;
	name_th: string;
	name_en: string;
	first_kg: number; // THB for the first kilogram (or part of it)
	extra_kg: number; // THB for each additional kilogram (or part of it)
	days: string; // e.g. "3-5"
	countries: string[]; // ISO codes; the zone with "*" catches everything else
}

// Example rates only. Replace them with your own quotes (e.g. Thailand Post EMS World) in Admin → Settings.
export const DEFAULT_ZONES: Zone[] = [
	{ id: "asean", name_th: "อาเซียน", name_en: "ASEAN", first_kg: 650, extra_kg: 250, days: "3-5", countries: ["SG", "MY", "ID", "PH", "VN", "LA", "KH", "MM", "BN"] },
	{ id: "east_asia", name_th: "เอเชียตะวันออก", name_en: "East Asia", first_kg: 750, extra_kg: 300, days: "3-5", countries: ["CN", "HK", "MO", "TW", "JP", "KR"] },
	{ id: "south_asia_me", name_th: "เอเชียใต้และตะวันออกกลาง", name_en: "South Asia & Middle East", first_kg: 900, extra_kg: 350, days: "4-7", countries: ["IN", "BD", "LK", "NP", "PK", "AE", "SA", "QA", "KW", "BH", "OM", "IL", "TR"] },
	{ id: "oceania", name_th: "โอเชียเนีย", name_en: "Oceania", first_kg: 1000, extra_kg: 400, days: "4-6", countries: ["AU", "NZ"] },
	{ id: "europe", name_th: "ยุโรป", name_en: "Europe", first_kg: 1200, extra_kg: 450, days: "4-9", countries: ["GB", "IE", "DE", "FR", "NL", "BE", "LU", "CH", "AT", "IT", "ES", "PT", "SE", "NO", "DK", "FI", "PL", "CZ", "HU", "GR"] },
	{ id: "north_america", name_th: "อเมริกาเหนือ", name_en: "North America", first_kg: 1300, extra_kg: 500, days: "5-7", countries: ["US", "CA"] },
	{ id: "rest", name_th: "ประเทศอื่นๆ", name_en: "Rest of the world", first_kg: 1500, extra_kg: 550, days: "6-11", countries: ["*"] },
];

export const COUNTRIES: { code: string; th: string; en: string }[] = [
	{ code: "TH", th: "ไทย", en: "Thailand" },
	{ code: "SG", th: "สิงคโปร์", en: "Singapore" },
	{ code: "MY", th: "มาเลเซีย", en: "Malaysia" },
	{ code: "ID", th: "อินโดนีเซีย", en: "Indonesia" },
	{ code: "PH", th: "ฟิลิปปินส์", en: "Philippines" },
	{ code: "VN", th: "เวียดนาม", en: "Vietnam" },
	{ code: "LA", th: "ลาว", en: "Laos" },
	{ code: "KH", th: "กัมพูชา", en: "Cambodia" },
	{ code: "MM", th: "เมียนมา", en: "Myanmar" },
	{ code: "BN", th: "บรูไน", en: "Brunei" },
	{ code: "CN", th: "จีน", en: "China" },
	{ code: "HK", th: "ฮ่องกง", en: "Hong Kong" },
	{ code: "MO", th: "มาเก๊า", en: "Macau" },
	{ code: "TW", th: "ไต้หวัน", en: "Taiwan" },
	{ code: "JP", th: "ญี่ปุ่น", en: "Japan" },
	{ code: "KR", th: "เกาหลีใต้", en: "South Korea" },
	{ code: "IN", th: "อินเดีย", en: "India" },
	{ code: "BD", th: "บังกลาเทศ", en: "Bangladesh" },
	{ code: "LK", th: "ศรีลังกา", en: "Sri Lanka" },
	{ code: "NP", th: "เนปาล", en: "Nepal" },
	{ code: "PK", th: "ปากีสถาน", en: "Pakistan" },
	{ code: "AE", th: "สหรัฐอาหรับเอมิเรตส์", en: "United Arab Emirates" },
	{ code: "SA", th: "ซาอุดีอาระเบีย", en: "Saudi Arabia" },
	{ code: "QA", th: "กาตาร์", en: "Qatar" },
	{ code: "KW", th: "คูเวต", en: "Kuwait" },
	{ code: "BH", th: "บาห์เรน", en: "Bahrain" },
	{ code: "OM", th: "โอมาน", en: "Oman" },
	{ code: "IL", th: "อิสราเอล", en: "Israel" },
	{ code: "TR", th: "ตุรกี", en: "Türkiye" },
	{ code: "AU", th: "ออสเตรเลีย", en: "Australia" },
	{ code: "NZ", th: "นิวซีแลนด์", en: "New Zealand" },
	{ code: "GB", th: "สหราชอาณาจักร", en: "United Kingdom" },
	{ code: "IE", th: "ไอร์แลนด์", en: "Ireland" },
	{ code: "DE", th: "เยอรมนี", en: "Germany" },
	{ code: "FR", th: "ฝรั่งเศส", en: "France" },
	{ code: "NL", th: "เนเธอร์แลนด์", en: "Netherlands" },
	{ code: "BE", th: "เบลเยียม", en: "Belgium" },
	{ code: "LU", th: "ลักเซมเบิร์ก", en: "Luxembourg" },
	{ code: "CH", th: "สวิตเซอร์แลนด์", en: "Switzerland" },
	{ code: "AT", th: "ออสเตรีย", en: "Austria" },
	{ code: "IT", th: "อิตาลี", en: "Italy" },
	{ code: "ES", th: "สเปน", en: "Spain" },
	{ code: "PT", th: "โปรตุเกส", en: "Portugal" },
	{ code: "SE", th: "สวีเดน", en: "Sweden" },
	{ code: "NO", th: "นอร์เวย์", en: "Norway" },
	{ code: "DK", th: "เดนมาร์ก", en: "Denmark" },
	{ code: "FI", th: "ฟินแลนด์", en: "Finland" },
	{ code: "PL", th: "โปแลนด์", en: "Poland" },
	{ code: "CZ", th: "เช็กเกีย", en: "Czechia" },
	{ code: "HU", th: "ฮังการี", en: "Hungary" },
	{ code: "GR", th: "กรีซ", en: "Greece" },
	{ code: "US", th: "สหรัฐอเมริกา", en: "United States" },
	{ code: "CA", th: "แคนาดา", en: "Canada" },
	{ code: "MX", th: "เม็กซิโก", en: "Mexico" },
	{ code: "BR", th: "บราซิล", en: "Brazil" },
	{ code: "ZA", th: "แอฟริกาใต้", en: "South Africa" },
	{ code: "RU", th: "รัสเซีย", en: "Russia" },
];

export const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export function countryName(code: string, lang: "th" | "en"): string {
	return COUNTRIES.find((c) => c.code === code)?.[lang] ?? code;
}

export function loadZones(settings: Settings): Zone[] {
	try {
		const z = JSON.parse(settings.intl_zones || "[]") as Zone[];
		if (Array.isArray(z) && z.length) return z;
	} catch {
		/* fall through */
	}
	return DEFAULT_ZONES;
}

export function zoneFor(country: string, zones: Zone[]): Zone | null {
	return zones.find((z) => z.countries.includes(country)) ?? zones.find((z) => z.countries.includes("*")) ?? null;
}

/** Default weight when a product has none recorded. */
export const DEFAULT_ITEM_WEIGHT_G = 300;
/** Box and packing material added to every parcel. */
export const PACKAGING_G = 200;

export function intlRate(zone: Zone, grams: number): number {
	const kg = Math.max(1, Math.ceil(grams / 1000));
	return Math.round((zone.first_kg + (kg - 1) * zone.extra_kg) * 100); // satang
}

/** Medicines stay domestic unless the shop explicitly allows a product overseas. */
export function canShipAbroad(p: { intl_ok: number | null; category: string }): boolean {
	if (p.intl_ok === 1) return true;
	if (p.intl_ok === 0) return false;
	return p.category === "medical_supplies" || p.category === "health_supplements";
}
