# Apex Outlaws — Multi-page Firestore Website

A GTA-inspired player portal using Firebase Authentication + Cloud Firestore. The website is now split into separate pages:

- `index.html` — Home / landing page
- `news.html` — Public news and announcements feed
- `profile.html` — Signed-in player's UID, AC wallet, profile editing and activity
- `admin.html` — Separate restricted admin control room for publishing news and managing player AC
- `social.html` — Player search, friend requests, friends, followers and following
- `styles.css`, `app.js` — Shared styling and Firebase logic
- `firestore.rules` — Firestore security rules

## Firebase setup (required)
The uploaded `google-services.json` is the Android app configuration. Its Android App ID must NOT be used as the JavaScript Web App `appId`.

1. Firebase Console → Project settings → General → Your apps → Add app → Web (`</>`).
2. Copy the Web SDK config and the supplied Web App config is already inserted in `app.js` (including Web App ID `1:9526482179:web:d53630c64a717430a20536`). Verify it matches Firebase Console before deployment.
3. Firebase Console → Authentication → Sign-in method → enable Email/Password.
4. Publish the included `firestore.rules` in Firestore Database → Rules.
5. Host the folder on HTTPS (Netlify / Firebase Hosting) or run `python -m http.server 5500` from this folder and open `http://localhost:5500`.

## Admin access
The admin page is `admin.html`. The Admin navigation link appears only after the configured admin UID signs in. The page itself also checks the UID and shows a restricted-access message to other visitors.

Configured admin UID: `0u90kcoJ5Wfx1Prvoa5FKv8FZEF2`

Do not rely on hiding a page link for security: Firestore rules also enforce admin-only writes and player database access. Keep the UID in `app.js` and `firestore.rules` consistent.

## Firestore structure
Player profiles are stored at `users/{firebaseAuthUid}`. Currency is stored at `currency.AC`. News posts are stored in `news`; activity is stored under `users/{uid}/activity`.

Unity and the website must use the same Firebase project and Authentication UID. In Unity, read `users/{uid}` using the signed-in Firebase user's `UserId`. Merge fields into any existing Unity player schema rather than overwriting existing records.

## Security notes
- Never use public `allow read, write: if true` rules for player records or economy data.
- Players cannot edit their own AC, status or admin privilege fields under the supplied rules.
- Only the configured admin can publish news and adjust balances.
- The browser admin interface is a starter implementation. For a production economy, award/adjust AC through trusted Cloud Functions/server code and maintain an immutable transaction ledger; do not trust a client to award currency.
- Passwords are managed by Firebase Authentication and are never visible to the admin.
- The included rules do not define matchmaking permissions for `servers` or `rooms`; design those separately rather than restoring public writes.

## Current features
- Separate Home, News, Player Profile and Admin pages
- Firebase email/password sign-up and sign-in
- UID-based Firestore player profile sync
- Live AC wallet and recent activity
- Admin-only news publishing
- Admin player database with search and AC add/remove
- Profile gamer-tag editing


## Social network setup
The social page uses these Firestore paths:
- `publicProfiles/{uid}` — searchable public gamer tag and UID (readable only to signed-in users). Never put email, wallet, or private data here.
- `friendRequests/{fromUid_toUid}` — pending/accepted/rejected friend requests.
- `users/{uid}/friends/{otherUid}` — reciprocal friend list entries.
- `users/{uid}/following/{targetUid}` and `users/{uid}/followers/{followerUid}` — reciprocal follow relationships.

Publish the included `firestore.rules` before testing social features. Existing accounts get a public profile mirror created when they next sign in. New signups create it automatically. Gamer tags are prefix-searchable; full Firebase UID can also be searched.

Friend/follow counts are derived from relationship documents. Existing users may need to sign out and sign back in once so their `publicProfiles` mirror is created. If a Firestore query reports a missing composite index, use the Firebase Console link in the error to create it.

**Production note:** client-side Firestore transactions and security rules provide basic relationship integrity, but high-scale moderation, spam limits, block/report, username uniqueness and anti-abuse should be implemented with Cloud Functions/App Check before public launch.
