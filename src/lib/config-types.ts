// Types for the shared `$config` module, which is plain JavaScript because the
// bot's runtime has no build step. Kept beside it so the two stay in step.

export type MatchTarget = "text" | "filename";

export type MediaKind =
    | "text"
    | "photo"
    | "video"
    | "animation"
    | "audio"
    | "document"
    | "sticker"
    | "voice"
    | "video_note"
    | "poll"
    | "contact"
    | "location"
    | "dice"
    | "paid_media";

export type Rule =
    | {
          type: "keyword";
          value: string;
          caseSensitive: boolean;
          target: MatchTarget;
      }
    | {
          type: "regex";
          pattern: string;
          caseSensitive: boolean;
          target: MatchTarget;
      }
    | { type: "media"; kinds: MediaKind[] }
    | { type: "sender"; ids: number[]; usernames: string[] };

export type Replacement = {
    pattern: string;
    replacement: string;
    isRegex: boolean;
    caseSensitive: boolean;
};

export type RouteConfig = {
    mode: "copy" | "forward";
    protectContent: boolean;
    silent: boolean;
    removeButtons: boolean;
    filters: { whitelist: Rule[]; blacklist: Rule[] };
    caption: {
        strip: boolean;
        prepend?: string;
        append?: string;
        replace: Replacement[];
        removeLinks: boolean;
        removeMentions: boolean;
    };
};

export type RouteStatus =
    | "active"
    | "paused"
    | "removed"
    | "blocked"
    | "no_rights"
    | "not_admin"
    | "gone"
    | "deactivated"
    | "is_bot"
    | "never_messaged";
