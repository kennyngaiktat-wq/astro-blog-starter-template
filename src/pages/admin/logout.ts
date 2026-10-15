import type { APIRoute } from "astro";
import { logoutAdmin } from "../../lib/auth";

export const POST: APIRoute = async ({ locals, cookies, redirect }) => {
	await logoutAdmin(locals.env.DB, cookies);
	return redirect("/admin/login", 303);
};
