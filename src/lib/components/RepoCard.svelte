<script lang="ts">
import { project } from "../project";
import { openLink } from "../telegram";
import Icon from "../ui/Icon.svelte";

const path = project.repo.replace(/^https?:\/\/(www\.)?github\.com\//, "");
const [owner, name] = path.split("/");
</script>

<button type="button" class="repo" onclick={() => openLink(project.repo)}>
    <span class="mark" aria-hidden="true">
        <Icon name="github" size={32} />
    </span>

    <span class="who">
        <span class="path"><span class="owner">{owner}/</span>{name}</span>
        <span class="tags">
            <span class="tag">{project.licence}</span>
            <span class="tag">Serverless</span>
        </span>
    </span>

    <span class="go" aria-hidden="true"><Icon name="source" size={18} /></span>
</button>

<style>
.repo {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px var(--ui-gutter);
    border: 0;
    border-radius: var(--ui-r-card);
    background: var(--ui-card);
    color: var(--ui-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.repo:active {
    background: var(--ui-press);
}
@media (hover: hover) {
    .repo:hover {
        background: var(--ui-hover);
    }
}
.mark {
    display: flex;
    flex-shrink: 0;
    color: var(--ui-text);
}
.who {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.path {
    font-size: var(--ui-body);
    font-weight: var(--ui-weight-button);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.owner {
    font-weight: 400;
    color: var(--ui-muted);
}
.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}
.tag {
    padding: 2px 7px;
    border-radius: var(--ui-r-pill);
    background: var(--ui-inset);
    color: var(--ui-muted);
    font-size: 11px;
    line-height: 1.5;
    white-space: nowrap;
}
.go {
    display: flex;
    flex-shrink: 0;
    color: var(--ui-accent);
}
</style>
