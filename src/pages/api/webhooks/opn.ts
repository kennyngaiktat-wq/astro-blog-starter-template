import type { APIRoute } from "astro";
import { getCharge } from "../../../lib/opn";
import { applyCharge, getOrderByNo } from "../../../lib/orders";
import { first } from "../../../lib/db";
import type { Order } from "../../../lib/orders";

// Opn sends events here (Dashboard → Webhooks → https://bigpharmagroup.com/api/webhooks/opn).
// We never trust the payload: the charge is re-fetched from Opn with the secret key.
export const POST: APIRoute = async ({ request, locals }) => {
	const secret = locals.env.OPN_SECRET_KEY;
	if (!secret) return new Response("disabled", { status: 200 });
	const event = (await request.json().catch(() => null)) as { data?: { object?: string; id?: string } } | null;
	const chargeId = event?.data?.object === "charge" ? event.data.id : null;
	if (!chargeId || !/^chrg_[a-z0-9_]+$/i.test(chargeId)) return new Response("ignored", { status: 200 });

	try {
		const charge = await getCharge(secret, chargeId);
		let order: Order | null = null;
		if (charge.metadata?.order_no) order = await getOrderByNo(locals.env.DB, charge.metadata.order_no);
		if (!order) order = await first<Order>(locals.env.DB, "SELECT * FROM orders WHERE charge_id = ?", charge.id);
		if (order && order.total_satang === charge.amount) await applyCharge(locals.env.DB, order, charge);
	} catch (err) {
		console.error("webhook error", err);
		return new Response("error", { status: 500 });
	}
	return new Response("ok", { status: 200 });
};
