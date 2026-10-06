# Rehearse the group chat

Run `npm run dev:rehearsal` and open http://localhost:5173/rehearsal.html.
Stop an existing dev server first if those ports are occupied. The root `.env`
still supplies the Astra API key. This command forces real Astra and mocked
Lovable, regardless of the mode values in `.env`; no new Lovable projects are
created. Set `DEMO_PARTY_URL`, `DEMO_WAKEUP_URL`, and `DEMO_BOBA_URL` to reuse ready
sites. Without a URL, that scenario returns a clearly labelled local receipt.

Pick a scene, click a suggested line, and send it. The first two lines are ordinary
friends talking. The third tags Astra with a vague request; it should ask one
short clarifying question. The fourth accepts the proposal and triggers the
matching app. These are editable suggestions, not scripted assistant responses.
Astra generates every reply.

Edit `packages/prompts/agent.md`, save, and reset the chat to try another flow.
The file reloads for every tagged request. Resetting removes earlier responses
that could otherwise influence the new experiment. The rehearsal room is
separate from the main demo room.

Try freeform messages too: explicit build requests should skip clarification;
an explicit “wait for Sam” should wait; untagged chatter should get no reply.
Every follow-up that needs an Astra response must tag `@Astra` again.

The three Lovable prompts remain fixed. Chat details do not customise them.
The conversation prompt belongs to Moishi; the main WhatsApp UI and Lovable
prompts belong to the frontend teammate. The rehearsal page is a separate entry
point and does not change the main UI or WebSocket protocol.
