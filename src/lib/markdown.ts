// Small, safe Markdown renderer for articles (headings, lists, bold/italic, links, images, quotes).
// All text is HTML-escaped first; only the formatting below is turned into tags.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function safeUrl(u: string): string {
	const url = u.trim();
	return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url) ? url : "#";
}

function inline(text: string): string {
	let s = esc(text);
	// images ![alt](url)
	s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy" />`);
	// links [text](url)
	s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, url) => {
		const href = safeUrl(url);
		const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : "";
		return `<a href="${href}"${ext}>${t}</a>`;
	});
	s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
	return s;
}

export function renderMarkdown(md: string): string {
	const lines = (md ?? "").replace(/\r\n?/g, "\n").split("\n");
	const out: string[] = [];
	let para: string[] = [];
	let list: { type: "ul" | "ol"; items: string[] } | null = null;
	const flushPara = () => {
		if (para.length) out.push(`<p>${para.map(inline).join("<br />")}</p>`);
		para = [];
	};
	const flushList = () => {
		if (list) out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
		list = null;
	};
	for (const raw of lines) {
		const line = raw.trimEnd();
		let m: RegExpExecArray | null;
		if (!line.trim()) {
			flushPara();
			flushList();
		} else if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
			flushPara();
			flushList();
			const level = Math.min(4, Math.max(2, m[1].length)); // # and ## → h2 (the page title is h1)
			out.push(`<h${level}>${inline(m[2])}</h${level}>`);
		} else if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
			flushPara();
			if (!list || list.type !== "ul") {
				flushList();
				list = { type: "ul", items: [] };
			}
			list.items.push(m[1]);
		} else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
			flushPara();
			if (!list || list.type !== "ol") {
				flushList();
				list = { type: "ol", items: [] };
			}
			list.items.push(m[1]);
		} else if ((m = /^>\s?(.*)$/.exec(line))) {
			flushPara();
			flushList();
			out.push(`<blockquote>${inline(m[1])}</blockquote>`);
		} else if (/^---+$/.test(line.trim())) {
			flushPara();
			flushList();
			out.push("<hr />");
		} else {
			flushList();
			para.push(line);
		}
	}
	flushPara();
	flushList();
	return out.join("\n");
}

export function slugify(s: string): string {
	const slug = s
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
	return slug || `article-${Date.now()}`;
}

export function readingMinutes(text: string): number {
	return Math.max(1, Math.round((text ?? "").length / 900));
}
