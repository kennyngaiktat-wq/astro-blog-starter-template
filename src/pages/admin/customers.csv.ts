import type { APIRoute } from "astro";
import { all } from "../../lib/db";
import { toCsv } from "../../lib/csv";

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.admin) return new Response("Unauthorized", { status: 401 });
	const rows = await all<Record<string, string | number | null>>(
		locals.env.DB,
		`SELECT c.id, c.name, c.email, c.phone, c.address_line, c.subdistrict, c.district, c.province, c.postcode, c.preferred_payment,
		        c.marketing_opt_in, c.disabled, c.created_at,
		        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid','packing','shipped','completed')) AS paid_orders
		 FROM customers c ORDER BY c.id`,
	);
	const cols = ["id", "name", "email", "phone", "address_line", "subdistrict", "district", "province", "postcode", "preferred_payment", "marketing_opt_in", "disabled", "created_at", "paid_orders"];
	const csv = toCsv([cols, ...rows.map((r) => cols.map((c) => r[c]))]);
	return new Response(csv, {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="customers_${new Date().toISOString().slice(0, 10)}.csv"`,
			"cache-control": "no-store",
		},
	});
};
