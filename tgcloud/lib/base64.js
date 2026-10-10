// The runtime has neither btoa nor Buffer, so this is the whole encoder.
// Dependency-free on purpose: the offline check imports it directly.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = bytes[i + 1];
        const c = bytes[i + 2];
        out += B64[a >> 2];
        out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
        out += b === undefined ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
        out += c === undefined ? "=" : B64[c & 63];
    }
    return out;
}
