import { fanOut } from "../lib/forwarding/forward.js";

export default async function (post) {
    await fanOut(post);
}
