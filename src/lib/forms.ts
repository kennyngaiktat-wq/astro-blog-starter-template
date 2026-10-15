export function str(fd: FormData, key: string, max = 300): string {
	return String(fd.get(key) ?? "")
		.replace(/[\u0000-\u001f]/g, " ")
		.trim()
		.slice(0, max);
}

export function safeNext(next: string | null | undefined, fallback = "/account"): string {
	if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
	return next;
}

export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export const PREFERRED_PAYMENTS = ["promptpay", "googlepay", "card"] as const;
