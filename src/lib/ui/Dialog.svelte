<script lang="ts">
import Button from "./Button.svelte";
import { dialog } from "./confirm.svelte";

// One dialog for the app, driven by lib/ui/confirm.svelte.ts. A question gets
// two buttons; a message gets one, and dismissing it is the only outcome.
//
// A real <dialog>, opened with showModal(): the backdrop, Escape, the focus
// trap and restoring focus afterwards are the platform's, not ours.
const req = $derived(dialog.current);

let el: HTMLDialogElement | undefined = $state();

$effect(() => {
    if (req && el && !el.open) el.showModal();
});
</script>

{#if req}
    <dialog
        bind:this={el}
        aria-label={req.title}
        oncancel={() => req.settle(false)}
        onclick={(e) => e.target === el && req.settle(false)}
    >
        <div class="sheet">
            <h2>{req.title}</h2>
            {#each req.body as line}<p>{line}</p>{/each}
            <div class="actions">
                {#if req.cancellable}
                    <Button
                        label="Cancel"
                        tone="quiet"
                        onclick={() => req.settle(false)}
                    />
                {/if}
                <Button
                    label={req.confirmLabel ?? "OK"}
                    tone={req.destructive ? "danger" : "accent"}
                    onclick={() => req.settle(true)}
                />
            </div>
        </div>
    </dialog>
{/if}

<style>
/* The element is the whole viewport, so the sheet can sit at the bottom of it
   and a tap anywhere outside the card lands on the dialog itself. */
dialog {
    position: fixed;
    inset: 0;
    z-index: var(--ui-z-dialog);
    max-width: none;
    max-height: none;
    width: 100%;
    height: 100%;
    margin: 0;
    border: 0;
    padding: var(--ui-gutter);
    padding-bottom: calc(var(--ui-safe-bottom) + var(--ui-gutter));
    background: none;
    color: inherit;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overscroll-behavior: contain;
}
dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
}
.sheet {
    animation: rise 0.24s cubic-bezier(0.32, 0.72, 0, 1);
    width: 100%;
    max-width: 420px;
    padding: 18px var(--ui-gutter) var(--ui-gutter);
    border-radius: var(--ui-r-card);
    background: var(--ui-card);
}
h2 {
    margin: 0;
    font-size: var(--ui-heading);
    font-weight: var(--ui-weight-heading);
}
p {
    margin: 8px 0 0;
    font-size: var(--ui-note);
    line-height: 1.4;
    color: var(--ui-muted);
}
.actions {
    display: flex;
    gap: var(--ui-gap);
    margin-top: 18px;
}
@keyframes rise {
    from {
        transform: translateY(16px);
        opacity: 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .sheet {
        animation: none;
    }
}
</style>
