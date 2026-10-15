import type { APIRoute } from "astro";
import { createCharge } from "../../lib/opn";
import { applyCharge, getOrderByNo } from "../../lib/orders";
import { run } from "../../lib/db";
import { safeEqual } from "../../lib/auth";

export const POST: APIRoute = async ({ request, locals, url }) => {
	const env = locals.env;
	if (!env.OPN_SECRET_KEY) return Response.json({ error: "payments_disabled" }, { status: 503 });

	const b = (await request.json().catch(() => ({}))) as { order_no?: string; access_key?: string; nonce?: string; method?: string };
	const order = b.order_no ? await getOrderByNo(env.DB, String(b.order_no)) : null;
	if (!order || !safeEqual(String(b.access_key ?? ""), order.access_key)) {
		return Response.json({ error: "not_found" }, { status: 404 });
	}
	if (order.status !== "awaiting_payment" && order.status !== "failed") {
		return Response.json({ error: "already_processed", status: order.status }, { status: 409 });
	}
	const nonce = String(b.nonce ?? "");
	if (!/^(tokn|src)_[a-z0-9_]+$/i.test(nonce)) return Response.json({ error: "bad_nonce" }, { status: 400 });

	const site = env.SITE_URL || url.origin;
	const returnUri = `${site}/order/${order.order_no}?k=${order.access_key}`;
	const method = ["promptpay", "googlepay", "applepay", "card"].includes(String(b.method)) ? String(b.method) : order.payment_method ?? "card";

	try {
		const charge = await createCharge(env.OPN_SECRET_KEY, {
			amount: order.total_satang,
			token: nonce.startsWith("tokn_") ? nonce : undefined,
			source: nonce.startsWith("src_") ? nonce : undefined,
			returnUri,
			description: `Big Pharma Group order ${order.order_no}`,
			metadata: { order_no: order.order_no },
		});
		const qr = charge.source?.scannable_code?.image?.download_uri ?? null;
		const finalMethod = charge.source?.type === "promptpay" ? "promptpay" : method;
		await run(
			env.DB,
			"UPDATE orders SET charge_id = ?, qr_url = ?, payment_method = ?, status = 'awaiting_payment', updated_at = datetime('now') WHERE id = ?",
			charge.id,
			qr,
			finalMethod,
			order.id,
		);
		await applyCharge(env.DB, { ...order, status: "awaiting_payment" }, charge, finalMethod);

		return Response.json({
			status: charge.status,
			authorize_uri: charge.status === "pending" && !qr ? charge.authorize_uri : null,
			qr_url: qr,
			redirect: returnUri,
			failure: charge.failure_message,
		});
	} catch (err) {
		console.error("charge failed", err);
		return Response.json({ error: "charge_failed", message: (err as Error).message }, { status: 502 });
	}
};
