/**
 * A localStorage slot. Reading throws in a private window and returns nothing
 * on a first run, so every caller needs the same two try/catch blocks; this
 * is them, once.
 */
export function slot<T>(key: string, empty: T) {
    return {
        read(): T {
            try {
                const raw = localStorage.getItem(key);
                return raw ? (JSON.parse(raw) as T) : empty;
            } catch {
                return empty;
            }
        },
        write(value: T) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {}
        },
        clear() {
            try {
                localStorage.removeItem(key);
            } catch {}
        },
    };
}
