// Minimal Opn Payments (Omise) API client for Cloudflare Workers.
// Docs: https://docs.opn.ooo/charges-api

const API = "https://api.omise.co";

export interface OpnCharge {
	object: "charge";
	id: string;
	status: "pending" | "successful" | "failed" | "expired" | "reversed";
	amount: number;
	currency: string;
	paid: boolean;
	authorize_uri: string | null;
	failure_code: string | null;
	failure_message: string | null;
	source?: {
		type: string;
		scannable_code?: { image?: { download_uri?: string } };
	} | null;
	card?: { brand?: string; last_digits?: string } | null;
	metadata?: Record<string, string>;
}

interface OpnError {
	object: "error";
	code: string;
	message: string;
}

function authHeader(secretKey: string) {
	return "Basic " + btoa(`${secretKey}:`);
}

async function opnFetch<T>(secretKey: string, path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: {
			Authorization: authHeader(secretKey),
			"Content-Type": "application/json",
			"Omise-Version": "2019-05-29",
			...(init.headers ?? {}),
		},
	});
	const data = (await res.json()) as T | OpnError;
	if ((data as OpnError).object === "error") {
		const e = data as OpnError;
		throw new Error(`${e.code}: ${e.message}`);
	}
	return data as T;
}

export async function createCharge(
	secretKey: string,
	args: {
		amount: number; // satang
		token?: string;
		source?: string;
		returnUri: string;
		description: string;
		metadata: Record<string, string>;
	},
): Promise<OpnCharge> {
	const body: Record<string, unknown> = {
		amount: args.amount,
		currency: "THB",
		return_uri: args.returnUri,
		description: args.description,
		metadata: args.metadata,
	};
	if (args.token) body.card = args.token;
	if (args.source) body.source = args.source;
	return opnFetch<OpnCharge>(secretKey, "/charges", { method: "POST", body: JSON.stringify(body) });
}

export async function getCharge(secretKey: string, chargeId: string): Promise<OpnCharge> {
	return opnFetch<OpnCharge>(secretKey, `/charges/${encodeURIComponent(chargeId)}`);
}

export function paymentMethodFromCharge(c: OpnCharge, fallback: string): string {
	const t = c.source?.type;
	if (t === "promptpay") return "promptpay";
	if (t === "googlepay") return "googlepay";
	if (t === "applepay") return "applepay";
	if (c.card) return fallback === "googlepay" || fallback === "applepay" ? fallback : "card";
	return fallback;
}
