import type { APIRoute } from "astro";
import { getOrderByNo, refreshOrderPayment } from "../../lib/orders";
import { safeEqual } from "../../lib/auth";

export const GET: APIRoute = async ({ url, locals }) => {
	const no = url.searchParams.get("no") ?? "";
	const key = url.searchParams.get("k") ?? "";
	let order = await getOrderByNo(locals.env.DB, no);
	if (!order || !safeEqual(key, order.access_key)) return Response.json({ error: "not_found" }, { status: 404 });
	order = await refreshOrderPayment(locals.env.DB, locals.env.OPN_SECRET_KEY, order);
	return Response.json({ status: order.status }, { headers: { "Cache-Control": "no-store" } });
};
