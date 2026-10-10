import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { project } from "./lib/project";
import { webApp } from "./lib/telegram";

// No signed launch payload means this was not opened from Telegram, so there
// is no bot to configure and every request would 401. Skipped in dev so the
// app can still be previewed in a plain browser.
if (webApp?.initData || import.meta.env.DEV) {
    const target = document.getElementById("app");
    if (!target) throw new Error("index.html has no #app to mount into");
    mount(App, { target });
} else {
    location.replace(project.repo);
}
