// Sortable by creation, no runtime dependency: base36 millis + random tail.
// Monotonic enough for ordering, random enough not to collide.
export const newId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
