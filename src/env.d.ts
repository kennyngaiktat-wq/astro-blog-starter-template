/// <reference path="../worker-configuration.d.ts" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

interface AppEnv {
	DB: D1Database;
	IMAGES?: R2Bucket;
	SITE_URL?: string;
	OPN_PUBLIC_KEY?: string;
	OPN_SECRET_KEY?: string;
	GOOGLEPAY_MERCHANT_ID?: string;
	ADMIN_EMAIL?: string;
	ADMIN_PASSWORD?: string;
}

declare namespace App {
	interface Locals extends Runtime {
		lang: "th" | "en";
		user: import("./lib/auth").SessionUser | null;
		admin: boolean;
		checkout: boolean;
		settings: import("./lib/settings").Settings;
		env: AppEnv;
	}
}
