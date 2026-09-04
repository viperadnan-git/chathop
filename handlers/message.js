// handlers/message.js — runs on each `message` update. The file name is the
// Telegram update type; the platform calls the default export with the matching
// payload (here, a Message). The full update is available as `ctx.update`.

import { api } from 'sdk';

export default async function (message, ctx) {
  // Echo the text back — replace with your own logic.
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `You said: ${message.text ?? '(no text)'}`,
  });
}
