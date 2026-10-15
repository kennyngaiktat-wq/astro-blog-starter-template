// Minimal ZIP writer (no compression — photos are already compressed). Runs in the browser.
const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(data: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

export class ZipWriter {
	private parts: Uint8Array[] = [];
	private central: Uint8Array[] = [];
	private offset = 0;
	private count = 0;

	add(name: string, data: Uint8Array) {
		const nameBytes = new TextEncoder().encode(name);
		const crc = crc32(data);
		const local = new DataView(new ArrayBuffer(30));
		local.setUint32(0, 0x04034b50, true);
		local.setUint16(4, 20, true);
		local.setUint16(6, 0x0800, true); // UTF-8 file names (Thai)
		local.setUint16(8, 0, true); // stored
		local.setUint32(14, crc, true);
		local.setUint32(18, data.length, true);
		local.setUint32(22, data.length, true);
		local.setUint16(26, nameBytes.length, true);
		this.parts.push(new Uint8Array(local.buffer), nameBytes, data);

		const cen = new DataView(new ArrayBuffer(46));
		cen.setUint32(0, 0x02014b50, true);
		cen.setUint16(4, 20, true);
		cen.setUint16(6, 20, true);
		cen.setUint16(8, 0x0800, true);
		cen.setUint16(10, 0, true);
		cen.setUint32(16, crc, true);
		cen.setUint32(20, data.length, true);
		cen.setUint32(24, data.length, true);
		cen.setUint16(28, nameBytes.length, true);
		cen.setUint32(42, this.offset, true);
		this.central.push(new Uint8Array(cen.buffer), nameBytes);

		this.offset += 30 + nameBytes.length + data.length;
		this.count++;
	}

	finish(): Blob {
		const cenSize = this.central.reduce((a, p) => a + p.length, 0);
		const end = new DataView(new ArrayBuffer(22));
		end.setUint32(0, 0x06054b50, true);
		end.setUint16(8, this.count, true);
		end.setUint16(10, this.count, true);
		end.setUint32(12, cenSize, true);
		end.setUint32(16, this.offset, true);
		return new Blob([...this.parts, ...this.central, new Uint8Array(end.buffer)] as BlobPart[], { type: "application/zip" });
	}
}

/** Safe file name: "IT-0000455 - Adult's Tylenol 500mg (Bottle_100s).jpg" */
export function photoFileName(sku: string, name: string, ext: string): string {
	const clean = `${sku} - ${name}`
		.replace(/[\\/:*?"<>|]+/g, "_")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 150);
	return `${clean}.${ext}`;
}
