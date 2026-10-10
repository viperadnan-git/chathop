/**
 * A chat picked or repaired through Telegram's own sheet reaches the *bot*,
 * which acts on it a moment later — so one read afterwards is a coin flip.
 */
export async function until<T>(
    read: () => Promise<T>,
    done: (value: T) => boolean,
    { tries = 10, gap = 400 } = {},
): Promise<boolean> {
    for (let i = 0; i < tries; i++) {
        await new Promise((r) => setTimeout(r, gap));
        if (done(await read())) return true;
    }
    return false;
}
