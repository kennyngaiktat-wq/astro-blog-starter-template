import type { Lang } from "./catalog";

export interface Article {
	id: number;
	slug: string;
	title_th: string;
	title_en: string | null;
	excerpt_th: string | null;
	excerpt_en: string | null;
	body_th: string | null;
	body_en: string | null;
	cover_media_id: number | null;
	tags: string;
	published: number;
	published_at: string | null;
	created_at: string;
	updated_at: string;
}

export const ARTICLE_LIST_COLS = "id, slug, title_th, title_en, excerpt_th, excerpt_en, cover_media_id, tags, published, published_at, created_at, updated_at";

export function aTitle(a: Pick<Article, "title_th" | "title_en">, lang: Lang) {
	return lang === "en" && a.title_en ? a.title_en : a.title_th;
}
export function aExcerpt(a: Pick<Article, "excerpt_th" | "excerpt_en">, lang: Lang) {
	return (lang === "en" ? a.excerpt_en || a.excerpt_th : a.excerpt_th || a.excerpt_en) ?? "";
}
export function aBody(a: Pick<Article, "body_th" | "body_en">, lang: Lang) {
	return (lang === "en" ? a.body_en || a.body_th : a.body_th || a.body_en) ?? "";
}
export function aCover(a: Pick<Article, "cover_media_id">) {
	return a.cover_media_id ? `/img/m/${a.cover_media_id}` : null;
}
export function aDate(a: Pick<Article, "published_at" | "created_at">, lang: Lang) {
	const d = new Date((a.published_at || a.created_at).replace(" ", "T") + (a.published_at?.length === 10 ? "" : "Z"));
	return d.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}
