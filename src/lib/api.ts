import type { Route, RouteConfig } from "./types";

/**
 * Endpoints go through Telegram, not HTTP: the platform sends the init data
 * and verifies it before the endpoint runs, so there is no auth header here.
 */
export class ApiError extends Error {
    constructor(
        message: string,
        readonly code?: string,
        readonly parameters: Record<string, unknown> = {},
    ) {
        super(message);
    }
}

type Serverless = {
    call(
        name: string,
        input: unknown,
        cb: (
            error: {
                message: string;
                type: string;
                parameters?: Record<string, unknown>;
            } | null,
            result: unknown,
        ) => void,
    ): void;
};

const serverless = (
    globalThis as { Telegram?: { WebApp?: { Serverless?: Serverless } } }
).Telegram?.WebApp?.Serverless;

function call<T>(
    name: string,
    input: Record<string, unknown> = {},
): Promise<T> {
    if (!serverless) {
        return Promise.reject(
            new ApiError("Open this page from inside Telegram.", "NO_BRIDGE"),
        );
    }
    return new Promise((resolve, reject) => {
        serverless.call(name, input, (error, result) => {
            if (error) {
                const params = error.parameters ?? {};
                reject(
                    new ApiError(
                        error.message || "Something went wrong.",
                        params.code as string | undefined,
                        params,
                    ),
                );
            } else {
                resolve(result as T);
            }
        });
    });
}

export type ResolvedChat = {
    chatId: number;
    title?: string;
    username?: string;
    type: string;
};

export const resolveChat = (input: string) =>
    call<ResolvedChat>("resolveChat", { input });

export const createRoute = (sourceChatId: number, destChatId: number) =>
    call<{ route: Route; routes: Route[] }>("addRoute", {
        sourceChatId,
        destChatId,
    });

export const listRoutes = () =>
    call<{ routes: Route[] }>("getRoutes").then((r) => r.routes);

export const refreshChatNames = () =>
    call<{ updated: number; failed: number; revived: number; routes: Route[] }>(
        "refreshChats",
    );

export const updateRoute = (
    id: string,
    patch: { config?: RouteConfig; status?: string },
) => call<{ route: Route }>("saveRoute", { id, ...patch }).then((r) => r.route);

export const deleteRoute = (id: string) =>
    call<{ removed: boolean }>("removeRoute", { id }).then(() => undefined);

export const chatPhotos = (known: Record<string, string>, chatIds: number[]) =>
    call<{
        photos: Record<number, { id: string; uri: string }>;
        drop: string[];
        more: number[];
    }>("getChatPhotos", { known, chatIds });

export type PickButtons = { channel: string; group: string };

export const pickButtons = (role: "source" | "destination" | "fix") =>
    call<PickButtons>("pickButtons", { role });

export type PickedChat = { chatId: number; name?: string };
export type PickState = {
    source: PickedChat | null;
    dest: PickedChat | null;
    error: string | null;
};

export const pickState = () => call<PickState>("pickState");

export const clearPicker = () => call<{ cleared: boolean }>("clearPicker");

export const bootstrap = () =>
    call<{ routes: Route[]; settings: Settings }>("bootstrap");

export type Settings = {
    isAdmin: boolean;
    private: boolean;
    bot: { username: string };
};

export const setPrivate = (on: boolean) =>
    call<{ private: boolean }>("setPrivate", { private: on });

export const message = (error: unknown) =>
    error instanceof Error ? error.message : String(error);
