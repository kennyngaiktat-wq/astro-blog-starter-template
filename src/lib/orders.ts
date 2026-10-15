import { all, first, run } from "./db";
import { getCharge, type OpnCharge } from "./opn";

export interface Order {
	id: number;
	order_no: string;
	access_key: string;
	customer_id: number | null;
	name: string;
	email: string;
	phone: string;
	delivery_method: string;
	address_line: string | null;
	subdistrict: string | null;
	district: string | null;
	province: string | null;
	postcode: string | null;
	note: string | null;
	subtotal_satang: number;
	discount_satang: number;
	shipping_satang: number;
	total_satang: number;
	payment_method: string | null;
	charge_id: string | null;
	qr_url: string | null;
	status: string;
	tracking_no: string | null;
	admin_notes: string | null;
	paid_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface OrderItem {
	id: number;
	order_id: number;
	product_id: number | null;
	sku: string;
	name: string;
	unit: string | null;
	price_satang: number;
	qty: number;
}

export const ORDER_STATUSES = ["awaiting_payment", "paid", "failed", "packing", "shipped", "completed", "cancelled"] as const;

export function newOrderNo(): string {
	// e.g. BP2610-4F7K2Q (year+month + random)
	const d = new Date(Date.now() + 7 * 3600 * 1000); // Bangkok time
	const ym = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
	const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
	const rnd = crypto.getRandomValues(new Uint8Array(6));
	return `BP${ym}-${[...rnd].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

export function newAccessKey(): string {
	return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrderByNo(db: D1Database, orderNo: string) {
	return first<Order>(db, "SELECT * FROM orders WHERE order_no = ?", orderNo);
}

export async function getItems(db: D1Database, orderId: number) {
	return all<OrderItem>(db, "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", orderId);
}

/** Moves an order to paid exactly once and decrements stock. */
export async function markPaid(db: D1Database, order: Order, paymentMethod?: string) {
	const res = await run(
		db,
		`UPDATE orders SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now'),
		 payment_method = COALESCE(?, payment_method)
		 WHERE id = ? AND status IN ('awaiting_payment', 'failed')`,
		paymentMethod ?? null,
		order.id,
	);
	if ((res.meta?.changes ?? 0) > 0) {
		const items = await getItems(db, order.id);
		const stmts = items
			.filter((i) => i.product_id)
			.map((i) => db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").bind(i.qty, i.product_id));
		if (stmts.length) await db.batch(stmts);
	}
}

export async function applyCharge(db: D1Database, order: Order, charge: OpnCharge, paymentMethod?: string) {
	if (charge.status === "successful" && charge.paid) {
		await markPaid(db, order, paymentMethod);
	} else if (charge.status === "failed" || charge.status === "expired") {
		await run(db, "UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ? AND status = 'awaiting_payment'", order.id);
	}
}

/** Re-checks the charge with Opn (never trusts the browser). */
export async function refreshOrderPayment(db: D1Database, secretKey: string | undefined, order: Order): Promise<Order> {
	if (!secretKey || !order.charge_id || order.status !== "awaiting_payment") return order;
	try {
		const charge = await getCharge(secretKey, order.charge_id);
		await applyCharge(db, order, charge);
		return (await getOrderByNo(db, order.order_no)) ?? order;
	} catch {
		return order;
	}
}
