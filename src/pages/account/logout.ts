import type { APIRoute } from "astro";
import { logoutCustomer } from "../../lib/auth";

export const POST: APIRoute = async ({ locals, cookies, redirect }) => {
	await logoutCustomer(locals.env.DB, cookies);
	return redirect("/", 303);
};
