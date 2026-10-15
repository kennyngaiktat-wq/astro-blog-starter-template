import type { APIRoute } from "astro";
import { quoteCart, sanitiseCart } from "../../lib/pricing";

export const POST: APIRoute = async ({ request, locals }) => {
	const body = (await request.json().catch(() => ({}))) as { cart?: unknown; delivery?: string };
	const cart = sanitiseCart(body.cart);
	const quote = await quoteCart(locals.env.DB, cart, {
		member: !!locals.user,
		delivery: body.delivery === "pickup" ? "pickup" : "delivery",
		settings: locals.settings,
	});
	return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
};
