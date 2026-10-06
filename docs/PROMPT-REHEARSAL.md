# Rehearse the group chat

Run `npm run dev:rehearsal` and open http://localhost:5173/rehearsal.html.
Stop an existing dev server first if those ports are occupied. The root `.env`
still supplies the Astra API key. This command forces real Astra and mocked
Lovable, regardless of the mode values in `.env`; no new Lovable projects are
created. Set `DEMO_PARTY_URL`, `DEMO_WAKEUP_URL`, and `DEMO_BOBA_URL` to reuse ready
sites. Without a URL, that scenario returns a clearly labelled local receipt.

Party, Morning, and Boba are separate group chats. Each is prefilled with the two
opening messages from the recording script, and the next human line is ready in
the composer. Switching groups preserves their messages, builds, and unsent
drafts. Reset restores only the active group's opening messages and first draft.

Party shows the clarification flow: send the request, wait for Astra's question,
then send the prefilled yes. Morning and Boba use explicit build requests so the
recording can spend more time inside the apps. The suggestions remain editable;
Astra generates every assistant reply. Opening a chat never calls Astra or builds
a site by itself.

Edit `packages/prompts/agent.md`, save, and reset the chat to try another flow.
The file reloads for every tagged request. Resetting removes earlier responses
that could otherwise influence the new experiment. The three rehearsal rooms
are separate from the main demo room. Histories survive switches and page reloads
while the server is running; restarting the backend clears them.

Try freeform messages too: explicit build requests should skip clarification;
an explicit “wait for Sam” should wait; untagged chatter should get no reply.
Every follow-up that needs an Astra response must tag `@Astra` again.

The three Lovable prompts remain fixed. Chat details do not customise them.
The conversation prompt belongs to Moishi; the main WhatsApp UI and Lovable
prompts belong to the frontend teammate. The rehearsal page is a separate entry
point and does not change the main UI or WebSocket protocol.
