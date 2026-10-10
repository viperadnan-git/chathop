/**
 * `fn` over every item, `width` at a time. Workers pull from one cursor, so a
 * slow call cannot idle the rest, and the Bot API never sees the whole burst.
 *
 * One item's failure is logged, not propagated: the callers sweep independent
 * chats, and losing the whole sweep to one of them discards the rest.
 */
export async function pooled(items, fn, width = 5) {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const item = items[next++];
            try {
                await fn(item);
            } catch (error) {
                console.warn(`pooled task failed: ${error?.message}`);
            }
        }
    };
    await Promise.all(
        Array.from({ length: Math.min(width, items.length) }, worker),
    );
}
