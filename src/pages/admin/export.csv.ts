import type { APIRoute } from "astro";
import { buildProductWhere, CATEGORY_SLUGS, type Product, type ProductQuery } from "../../lib/catalog";
import { all } from "../../lib/db";
import { toCsv } from "../../lib/csv";

const COLS = ["sku", "barcode", "name", "name_en", "unit", "price", "stock", "category", "consult_required", "active", "featured", "tags", "manufacturer", "description", "description_en", "weight_g", "intl_ok", "shopee_url", "lazada_url", "image_url"];

export const GET: APIRoute = async ({ url, locals }) => {
	if (!locals.admin) return new Response("Unauthorized", { status: 401 });
	const sp = url.searchParams;
	let rows: (string | number | null)[][] = [COLS];
	if (!sp.get("template")) {
		const q: ProductQuery = {
			q: sp.get("q") ?? "",
			category: CATEGORY_SLUGS.includes(sp.get("category") as never) ? (sp.get("category") as string) : "",
			tag: sp.get("tag") ?? "",
			consult: (sp.get("consult") ?? "") as ProductQuery["consult"],
			active: (sp.get("active") ?? "") as ProductQuery["active"],
			stock: (sp.get("stock") ?? "") as ProductQuery["stock"],
			includeInactive: true,
		};
		const { sql, params } = buildProductWhere(q);
		const products = await all<Product>(locals.env.DB, `SELECT * FROM products ${sql} ORDER BY name COLLATE NOCASE`, ...params);
		rows = rows.concat(
			products.map((p) => [
				p.sku,
				p.barcode,
				p.name,
				p.name_en,
				p.unit,
				p.price_satang / 100,
				p.stock,
				p.category,
				p.consult_required ? "yes" : "no",
				p.active ? "yes" : "no",
				p.featured ? "yes" : "no",
				p.tags,
				p.manufacturer,
				p.description,
				p.description_en,
				p.weight_g,
				p.intl_ok === null ? "" : p.intl_ok ? "yes" : "no",
				p.shopee_url,
				p.lazada_url,
				p.image_url,
			]),
		);
	}
	const date = new Date().toISOString().slice(0, 10);
	return new Response(toCsv(rows), {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="${sp.get("template") ? "products_template" : `products_${date}`}.csv"`,
			"cache-control": "no-store",
		},
	});
};
