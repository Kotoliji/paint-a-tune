# Our Little Palace · 小小紫禁城

A small site for two people, Chinese by default with an English toggle. Three pages:

- **Notes** (`index.html`) — sticky notes over a Forbidden City photo. Each note has a big title and small text, its own note and text color. Answer under any note in one of 5 colors.
- **Tier list** (`tier.html`) — drag 30 activities (camping, tea ceremony, pottery…) into 5 tiers: LOVE IT / Like it / Don't mind / If you want / NO. Press Match when everything is placed. Open your partner's list side by side, add your own cards.
- **Paint a tune** (`paint.html`) — paint tiles on a grid and hear them play as handpan or xylophone.

No passwords: on first visit each person picks who they are (names live in `config.js`).

## Sync between two devices

Without setup, data stays in the browser of one device. To share it, create a free Firebase Realtime Database:

1. https://console.firebase.google.com → Add project.
2. Build → Realtime Database → Create database → Start in **test mode**.
3. Rules tab → set `{ "rules": { ".read": true, ".write": true } }` → Publish (test mode rules expire after 30 days).
4. Project settings → Your apps → Web app (`</>`) → copy `firebaseConfig`.
5. Paste it into `config.js` as `firebase: { ... }` (it must include `databaseURL`) and push.

Anyone who knows the database URL can read and write it, so keep nothing secret there.

Photo: Peter Zhou / Unsplash.
