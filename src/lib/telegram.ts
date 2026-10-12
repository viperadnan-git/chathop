type WebApp = {
    initData: string;
    Serverless?: unknown;
    initDataUnsafe?: { user?: { id: number } };
    ready(): void;
    expand(): void;
    close(): void;
    isExpanded?: boolean;
    disableVerticalSwipes?(): void;
    // Colour keys, not hex, so they keep following the user's theme.
    setHeaderColor?(color: string): void;
    setBackgroundColor?(color: string): void;
    setBottomBarColor?(color: string): void;
    openLink?(url: string): void;
    openTelegramLink?(url: string): void;
    isVersionAtLeast?(version: string): boolean;
    requestChat?(requestId: string, cb?: (ok: boolean) => void): void;
    HapticFeedback?: {
        notificationOccurred(t: "error" | "success" | "warning"): void;
        impactOccurred(
            style: "light" | "medium" | "heavy" | "rigid" | "soft",
        ): void;
        selectionChanged(): void;
    };
    BackButton?: {
        show(): void;
        hide(): void;
        onClick(cb: () => void): void;
    };
};

type WithTelegram = { Telegram?: { WebApp?: WebApp } };

export const webApp = (globalThis as WithTelegram).Telegram?.WebApp;

/**
 * Version-gated methods exist on the object whatever the client's version and
 * *throw* when too old, so optional chaining is no protection.
 */
export function safely(call: () => void) {
    try {
        call();
    } catch {}
}

export function init() {
    if (!webApp) return;
    const app = webApp;

    app.ready();
    app.expand();

    safely(() => app.disableVerticalSwipes?.());

    // Pages sit on the grouped-list background; the header and the area behind
    // the webview default to bg_color, which shows as a seam in most themes.
    safely(() => app.setHeaderColor?.("secondary_bg_color"));
    safely(() => app.setBackgroundColor?.("secondary_bg_color"));
    safely(() => app.setBottomBarColor?.("secondary_bg_color"));
}

export const close = () => webApp?.close();

/** Both events fire on a return; whichever lands first wins. Returns the
 * unsubscribe. */
export function onReturn(run: () => void) {
    const back = () => {
        if (!document.hidden) run();
    };
    addEventListener("focus", back);
    document.addEventListener("visibilitychange", back);
    return () => {
        removeEventListener("focus", back);
        document.removeEventListener("visibilitychange", back);
    };
}

/** `unknown`: the sheet closed but Telegram never said how — a dismissal, or a
 * pick whose callback was late. The caller must re-read, not report either. */
export type PickResult = "picked" | "cancelled" | "unsupported" | "unknown";

// A picker is open: its own return is not the user coming back to the app, and
// reloading then would race the caller's own poll.
let picking = 0;
export const isPicking = () => picking > 0;

// Telegram does not always call back when the picker closes. Focus returning
// ends the wait, after a moment in case the answer is still on its way.
const SETTLE_MS = 700;

export const requestChat = (requestId: string) =>
    new Promise<PickResult>((resolve) => {
        if (!webApp?.requestChat) return resolve("unsupported");

        picking += 1;
        let settled = false;
        let timer: ReturnType<typeof setTimeout>;
        let stop = () => {};
        const settle = (result: PickResult) => {
            if (settled) return;
            settled = true;
            picking -= 1;
            clearTimeout(timer);
            stop();
            resolve(result);
        };
        stop = onReturn(() => {
            clearTimeout(timer);
            timer = setTimeout(() => settle("unknown"), SETTLE_MS);
        });

        try {
            webApp.requestChat(requestId, (ok) =>
                settle(ok ? "picked" : "cancelled"),
            );
        } catch {
            settle("unsupported");
        }
    });

export const TOO_OLD =
    "This version of Telegram cannot open the chat list. Update it, or enter the chats yourself.";

export function backButton(visible: boolean) {
    safely(() =>
        visible ? webApp?.BackButton?.show() : webApp?.BackButton?.hide(),
    );
}

export const onBackButton = (cb: () => void) =>
    safely(() => webApp?.BackButton?.onClick(cb));

export const openLink = (url: string) => {
    if (webApp?.openLink) safely(() => webApp.openLink?.(url));
    else globalThis.open(url, "_blank");
};

export const openTelegramLink = (url: string) => {
    if (webApp?.openTelegramLink) webApp.openTelegramLink(url);
    else globalThis.open(url, "_blank");
};

export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
