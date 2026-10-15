import type { APIRoute } from "astro";
import { quoteCart, sanitiseCart } from "../../lib/pricing";
import { COUNTRY_CODES } from "../../lib/shipping";

export const POST: APIRoute = async ({ request, locals }) => {
	const body = (await request.json().catch(() => ({}))) as { cart?: unknown; delivery?: string; country?: string };
	const cart = sanitiseCart(body.cart);
	const quote = await quoteCart(locals.env.DB, cart, {
		member: !!locals.user,
		delivery: body.delivery === "pickup" ? "pickup" : "delivery",
		settings: locals.settings,
		country: COUNTRY_CODES.has(String(body.country)) ? String(body.country) : "TH",
	});
	return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
};
