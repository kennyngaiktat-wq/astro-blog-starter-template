import type { APIRoute } from "astro";
import { quoteCart, sanitiseCart } from "../../lib/pricing";
import { newAccessKey, newOrderNo } from "../../lib/orders";
import { run } from "../../lib/db";

const PAYMENT_METHODS = ["promptpay", "googlepay", "applepay", "card"];

function clean(v: unknown, max = 200): string {
	return String(v ?? "")
		.replace(/[\u0000-\u001f]/g, " ")
		.trim()
		.slice(0, max);
}

export const POST: APIRoute = async ({ request, locals }) => {
	const db = locals.env.DB;
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const delivery = b.delivery === "pickup" && locals.settings.pickup_enabled === "1" ? "pickup" : "delivery";
	const f = {
		name: clean(b.name, 120),
		email: clean(b.email, 160).toLowerCase(),
		phone: clean(b.phone, 30),
		address_line: clean(b.address_line, 300),
		subdistrict: clean(b.subdistrict, 100),
		district: clean(b.district, 100),
		province: clean(b.province, 100),
		postcode: clean(b.postcode, 10),
		note: clean(b.note, 500),
	};
	const payment = PAYMENT_METHODS.includes(String(b.payment_method)) ? String(b.payment_method) : "promptpay";

	const missing = !f.name || !f.phone || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email);
	const missingAddr = delivery === "delivery" && (!f.address_line || !f.district || !f.province || !f.postcode);
	if (missing || missingAddr) return Response.json({ error: "required" }, { status: 400 });

	const cart = sanitiseCart(b.cart);
	const quote = await quoteCart(db, cart, { member: !!locals.user, delivery, settings: locals.settings });
	if (!quote.lines.length) return Response.json({ error: "empty" }, { status: 400 });
	if (quote.removed.length || quote.adjusted.length) {
		return Response.json({ error: "changed", quote }, { status: 409 });
	}
	if (quote.total < 2000) {
		return Response.json({ error: "minimum" }, { status: 400 }); // Opn minimum charge is 20 THB
	}

	const orderNo = newOrderNo();
	const accessKey = newAccessKey();
	const inserted = await db
		.prepare(
			`INSERT INTO orders (order_no, access_key, customer_id, name, email, phone, delivery_method, address_line, subdistrict, district, province, postcode, note,
			 subtotal_satang, discount_satang, shipping_satang, total_satang, payment_method)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		)
		.bind(
			orderNo,
			accessKey,
			locals.user?.id ?? null,
			f.name,
			f.email,
			f.phone,
			delivery,
			f.address_line || null,
			f.subdistrict || null,
			f.district || null,
			f.province || null,
			f.postcode || null,
			f.note || null,
			quote.subtotal,
			quote.discount,
			quote.shipping,
			quote.total,
			payment,
		)
		.first<{ id: number }>();
	const orderId = inserted!.id;
	await db.batch(
		quote.lines.map((l) =>
			db
				.prepare("INSERT INTO order_items (order_id, product_id, sku, name, unit, price_satang, qty) VALUES (?, ?, ?, ?, ?, ?, ?)")
				.bind(orderId, l.product_id, l.sku, l.name, l.unit, l.price_satang, l.qty),
		),
	);

	// Members: remember address / preferred payment when asked
	if (locals.user && b.save_profile) {
		await run(
			db,
			`UPDATE customers SET phone = ?, address_line = ?, subdistrict = ?, district = ?, province = ?, postcode = ?, preferred_payment = ?, updated_at = datetime('now') WHERE id = ?`,
			f.phone,
			f.address_line || locals.user.address_line,
			f.subdistrict || locals.user.subdistrict,
			f.district || locals.user.district,
			f.province || locals.user.province,
			f.postcode || locals.user.postcode,
			payment,
			locals.user.id,
		);
	}

	return Response.json({
		order_no: orderNo,
		access_key: accessKey,
		total: quote.total,
		payment_method: payment,
		payments_enabled: !!(locals.env.OPN_PUBLIC_KEY && locals.env.OPN_SECRET_KEY),
	});
};
