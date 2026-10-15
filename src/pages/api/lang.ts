import type { APIRoute } from "astro";

export const GET: APIRoute = ({ url, cookies, redirect }) => {
	const to = url.searchParams.get("to") === "en" ? "en" : "th";
	const back = url.searchParams.get("back") ?? "/";
	const safeBack = back.startsWith("/") && !back.startsWith("//") ? back : "/";
	cookies.set("lang", to, { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
	return redirect(safeBack, 302);
};
