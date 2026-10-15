// Browser-side cart kept in localStorage: { [sku]: qty }
const KEY = "bpg_cart_v1";

export type Cart = Record<string, number>;

export function readCart(): Cart {
	try {
		const raw = localStorage.getItem(KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export function writeCart(cart: Cart) {
	try {
		localStorage.setItem(KEY, JSON.stringify(cart));
	} catch {
		/* storage unavailable */
	}
	window.dispatchEvent(new CustomEvent("cart:changed"));
}

export function addToCart(sku: string, qty = 1) {
	const cart = readCart();
	cart[sku] = Math.min(99, (cart[sku] ?? 0) + qty);
	writeCart(cart);
}

export function setQty(sku: string, qty: number) {
	const cart = readCart();
	if (qty <= 0) delete cart[sku];
	else cart[sku] = Math.min(99, qty);
	writeCart(cart);
}

export function clearCart() {
	writeCart({});
}

export function cartCount(): number {
	return Object.values(readCart()).reduce((a, b) => a + b, 0);
}
