import type { AstroCookies } from "astro";
import { first, run } from "./db";

export interface SessionUser {
	id: number;
	email: string;
	name: string;
	phone: string;
	address_line: string | null;
	subdistrict: string | null;
	district: string | null;
	province: string | null;
	postcode: string | null;
	preferred_payment: string | null;
	country: string | null;
}

const CUSTOMER_COOKIE = "bpg_session";
const ADMIN_COOKIE = "bpg_admin";
const ITERATIONS = 60_000;
const DAY = 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array): string {
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
	for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
	const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
	return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${await pbkdf2(password, salt, ITERATIONS)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [scheme, iter, salt, hash] = stored.split("$");
	if (scheme !== "pbkdf2" || !salt || !hash) return false;
	const candidate = await pbkdf2(password, fromHex(salt), Number(iter));
	return safeEqual(candidate, hash);
}

export function safeEqual(a: string, b: string): boolean {
	const ab = enc.encode(a);
	const bb = enc.encode(b);
	let diff = ab.length ^ bb.length;
	for (let i = 0; i < Math.max(ab.length, bb.length); i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
	return diff === 0;
}

function newToken(): string {
	return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

function cookieOpts(secure: boolean, days: number) {
	return { path: "/", httpOnly: true, sameSite: "lax" as const, secure, maxAge: days * 86400 };
}

export async function createCustomerSession(db: D1Database, cookies: AstroCookies, customerId: number, secure: boolean) {
	const token = newToken();
	await run(db, "INSERT INTO sessions (token, kind, customer_id, expires_at) VALUES (?, 'customer', ?, ?)", token, customerId, Date.now() + 30 * DAY);
	cookies.set(CUSTOMER_COOKIE, token, cookieOpts(secure, 30));
}

export async function createAdminSession(db: D1Database, cookies: AstroCookies, secure: boolean) {
	const token = newToken();
	await run(db, "INSERT INTO sessions (token, kind, customer_id, expires_at) VALUES (?, 'admin', NULL, ?)", token, Date.now() + 1 * DAY);
	cookies.set(ADMIN_COOKIE, token, { ...cookieOpts(secure, 1), sameSite: "strict" });
}

export async function getCustomer(db: D1Database, cookies: AstroCookies): Promise<SessionUser | null> {
	const token = cookies.get(CUSTOMER_COOKIE)?.value;
	if (!token) return null;
	return first<SessionUser>(
		db,
		`SELECT c.id, c.email, c.name, c.phone, c.address_line, c.subdistrict, c.district, c.province, c.postcode, c.preferred_payment, c.country
		 FROM sessions s JOIN customers c ON c.id = s.customer_id
		 WHERE s.token = ? AND s.kind = 'customer' AND s.expires_at > ? AND c.disabled = 0`,
		token,
		Date.now(),
	);
}

export async function isAdmin(db: D1Database, cookies: AstroCookies): Promise<boolean> {
	const token = cookies.get(ADMIN_COOKIE)?.value;
	if (!token) return false;
	const row = await first(db, "SELECT token FROM sessions WHERE token = ? AND kind = 'admin' AND expires_at > ?", token, Date.now());
	return !!row;
}

export async function logoutCustomer(db: D1Database, cookies: AstroCookies) {
	const token = cookies.get(CUSTOMER_COOKIE)?.value;
	if (token) await run(db, "DELETE FROM sessions WHERE token = ?", token);
	cookies.delete(CUSTOMER_COOKIE, { path: "/" });
}

export async function logoutAdmin(db: D1Database, cookies: AstroCookies) {
	const token = cookies.get(ADMIN_COOKIE)?.value;
	if (token) await run(db, "DELETE FROM sessions WHERE token = ?", token);
	cookies.delete(ADMIN_COOKIE, { path: "/" });
}

export async function cleanupSessions(db: D1Database) {
	await run(db, "DELETE FROM sessions WHERE expires_at < ?", Date.now());
}
