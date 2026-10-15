import { defineMiddleware } from "astro:middleware";
import { ensureSchema } from "./lib/db";
import { getCustomer, isAdmin } from "./lib/auth";
import { loadSettings, DEFAULT_SETTINGS, checkoutEnabled } from "./lib/settings";

export const onRequest = defineMiddleware(async (context, next) => {
	const path = context.url.pathname;
	// Static assets never need the database
	if (/\.(css|js|svg|png|jpg|jpeg|webp|ico|woff2?|txt|xml)$/.test(path) && !path.startsWith("/img/")) {
		return next();
	}

	const env = (context.locals.runtime?.env ?? {}) as unknown as AppEnv;
	context.locals.env = env;

	const langCookie = context.cookies.get("lang")?.value;
	context.locals.lang = langCookie === "en" ? "en" : "th";
	context.locals.user = null;
	context.locals.admin = false;
	context.locals.checkout = false;
	context.locals.settings = { ...DEFAULT_SETTINGS };

	if (!env.DB) {
		if (path === "/setup-required") return next();
		return new Response(
			"Database not connected. Add a D1 binding named DB in wrangler.json (see README).",
			{ status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
		);
	}

	await ensureSchema(env.DB);
	context.locals.settings = await loadSettings(env.DB);
	context.locals.checkout = checkoutEnabled(context.locals.settings, env);
	// Online consultation was retired — the site is "ask us on LINE or visit the shop"
	if (/^\/teleconsult\/?$/.test(path)) return context.redirect("/contact", 301);
	// Shop-only pages are switched off when online checkout is off
	if (!context.locals.checkout && /^\/(cart|checkout)\/?$/.test(path)) return context.redirect("/products");
	if (!context.locals.checkout && /^\/account(\/(register|login))?\/?$/.test(path)) return context.redirect("/contact");
	if (!context.locals.checkout && /^\/api\/(checkout|pay)$/.test(path)) return Response.json({ error: "checkout_off" }, { status: 403 });
	context.locals.user = await getCustomer(env.DB, context.cookies);

	if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
		context.locals.admin = await isAdmin(env.DB, context.cookies);
		const open = path === "/admin/login" || path === "/admin/login/";
		if (!context.locals.admin && !open) {
			if (path.startsWith("/api/")) return new Response("Unauthorized", { status: 401 });
			return context.redirect("/admin/login");
		}
	}

	const res = await next();
	if (path.startsWith("/admin") || path.startsWith("/account") || path.startsWith("/order")) {
		res.headers.set("Cache-Control", "no-store");
		res.headers.set("X-Robots-Tag", "noindex");
	}
	res.headers.set("X-Content-Type-Options", "nosniff");
	res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	return res;
});
