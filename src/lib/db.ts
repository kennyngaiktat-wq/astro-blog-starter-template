import schemaSql from "../../migrations/0001_init.sql?raw";

let schemaReady: Promise<void> | null = null;

/** Creates tables on first use, so a fresh D1 database works without manual setup. */
export function ensureSchema(db: D1Database): Promise<void> {
	if (!schemaReady) {
		schemaReady = (async () => {
			const statements = schemaSql
				.split("\n")
				.filter((l) => !l.trim().startsWith("--"))
				.join("\n")
				.split(";")
				.map((s) => s.trim())
				.filter(Boolean);
			await db.batch(statements.map((s) => db.prepare(s)));
			await addMissingColumns(db);
		})().catch((err) => {
			schemaReady = null;
			throw err;
		});
	}
	return schemaReady;
}

// Columns added after the first release. Existing databases get them on next start-up.
const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
	["products", "description_en", "TEXT"],
	["products", "manufacturer", "TEXT"],
	["products", "weight_g", "INTEGER"],
	["products", "intl_ok", "INTEGER"],
	["products", "image_rev", "INTEGER NOT NULL DEFAULT 0"],
	["customers", "country", "TEXT NOT NULL DEFAULT 'TH'"],
	["orders", "country", "TEXT NOT NULL DEFAULT 'TH'"],
	["orders", "shipping_zone", "TEXT"],
];

async function addMissingColumns(db: D1Database) {
	const tables = [...new Set(ADDED_COLUMNS.map(([t]) => t))];
	const existing = new Map<string, Set<string>>();
	for (const t of tables) {
		const cols = await db.prepare(`PRAGMA table_info(${t})`).all<{ name: string }>();
		existing.set(t, new Set((cols.results ?? []).map((c) => c.name)));
	}
	const alters = ADDED_COLUMNS.filter(([t, c]) => !existing.get(t)!.has(c)).map(([t, c, def]) =>
		db.prepare(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`),
	);
	if (alters.length) await db.batch(alters);
}

export async function all<T = Record<string, unknown>>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
	const res = await db.prepare(sql).bind(...params).all<T>();
	return res.results ?? [];
}

export async function first<T = Record<string, unknown>>(db: D1Database, sql: string, ...params: unknown[]): Promise<T | null> {
	return (await db.prepare(sql).bind(...params).first<T>()) ?? null;
}

export async function run(db: D1Database, sql: string, ...params: unknown[]) {
	return db.prepare(sql).bind(...params).run();
}

/** Run many statements in chunks (D1 batch limit friendly). */
export async function batchChunks(db: D1Database, stmts: D1PreparedStatement[], size = 80) {
	for (let i = 0; i < stmts.length; i += size) {
		await db.batch(stmts.slice(i, i + size));
	}
}
