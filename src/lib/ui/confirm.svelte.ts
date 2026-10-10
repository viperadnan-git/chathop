type Request = {
    title: string;
    body: string[];
    confirmLabel?: string;
    destructive: boolean;
    cancellable: boolean;
    settle: (ok: boolean) => void;
};

export const dialog = $state<{ current: Request | null }>({ current: null });

function open(req: Omit<Request, "settle">): Promise<boolean> {
    // A second request would strand the first caller's promise for ever.
    dialog.current?.settle(false);

    return new Promise((resolve) => {
        dialog.current = {
            ...req,
            settle: (ok) => {
                dialog.current = null;
                resolve(ok);
            },
        };
    });
}

export const ask = (
    title: string,
    body: string | string[],
    confirmLabel?: string,
    destructive = true,
): Promise<boolean> =>
    open({
        title,
        body: Array.isArray(body) ? body : [body],
        confirmLabel,
        destructive,
        cancellable: true,
    });

export const alert = (title: string, body: string | string[]): Promise<void> =>
    open({
        title,
        body: Array.isArray(body) ? body : [body],
        destructive: false,
        cancellable: false,
    }).then(() => {});
