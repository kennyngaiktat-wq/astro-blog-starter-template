// Opens the Opn Payments pre-built form and sends the result to /api/pay.
declare global {
	interface Window {
		OmiseCard?: {
			configure: (o: Record<string, unknown>) => void;
			open: (o: Record<string, unknown>) => void;
		};
	}
}

let loading: Promise<void> | null = null;
function loadOmise(): Promise<void> {
	if (window.OmiseCard) return Promise.resolve();
	if (!loading) {
		loading = new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = "https://cdn.omise.co/omise.js";
			s.onload = () => resolve();
			s.onerror = () => reject(new Error("Could not load payment form"));
			document.head.appendChild(s);
		});
	}
	return loading;
}

export interface PayOptions {
	publicKey: string;
	orderNo: string;
	accessKey: string;
	amount: number; // satang
	method: string; // promptpay | googlepay | card
	lang: "th" | "en";
	shopName: string;
	googlepayMerchantId?: string;
	onClosed?: () => void;
	onError?: (msg: string) => void;
}

const DEFAULT_METHOD: Record<string, string> = {
	promptpay: "promptpay",
	googlepay: "googlepay",
	card: "credit_card",
	applepay: "credit_card",
};

export async function openPayment(o: PayOptions) {
	await loadOmise();
	const OmiseCard = window.OmiseCard!;
	OmiseCard.configure({ publicKey: o.publicKey });
	let submitted = false;
	OmiseCard.open({
		amount: o.amount,
		currency: "THB",
		frameLabel: o.shopName,
		frameDescription: `#${o.orderNo}`,
		submitLabel: o.lang === "th" ? "ชำระเงิน" : "Pay",
		locale: o.lang,
		defaultPaymentMethod: DEFAULT_METHOD[o.method] ?? "credit_card",
		otherPaymentMethods: "promptpay,googlepay",
		...(o.googlepayMerchantId ? { googlepayMerchantId: o.googlepayMerchantId } : {}),
		onCreateTokenSuccess: async (nonce: string) => {
			submitted = true;
			const method = nonce.startsWith("tokn_") ? (o.method === "googlepay" ? "googlepay" : "card") : o.method;
			try {
				const res = await fetch("/api/pay", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ order_no: o.orderNo, access_key: o.accessKey, nonce, method }),
				});
				const data: any = await res.json();
				if (!res.ok) throw new Error(data.message || data.error || "Payment error");
				if (data.authorize_uri) window.location.href = data.authorize_uri;
				else window.location.href = data.redirect;
			} catch (err) {
				o.onError?.((err as Error).message);
			}
		},
		onFormClosed: () => {
			if (!submitted) o.onClosed?.();
		},
	});
}
