# Apex Outlaws — Firestore Edition

GTA-inspired official player portal using Firebase Authentication + **Cloud Firestore**.

## Project details already filled
- Firebase project ID: `apex-outlaws-2509`
- Messaging sender ID: `9526482179`
- Storage bucket: `apex-outlaws-2509.firebasestorage.app`
- Admin UID: `0u90kcoJ5Wfx1Prvoa5FKv8FZEF2`
- Firestore player document path: `users/{firebaseAuthUid}`
- Currency field: `currency.AC`

## IMPORTANT: finish the Web App configuration
The uploaded `google-services.json` is the Android app configuration. Its `mobilesdk_app_id` is an Android App ID and must NOT be used as the Firebase JavaScript Web App `appId`.

1. Open Firebase Console → Project settings → General.
2. Under Your apps, click **Add app** → Web (`</>`).
3. Register the web app (for example, name it `Apex Outlaws Website`).
4. Copy the Firebase SDK config for the Web app.
5. In `app.js`, replace `PASTE_WEB_APP_ID_FROM_FIREBASE_CONSOLE` with the Web app's `appId`. Confirm the other config values against the Web config shown by Firebase.
6. In Firebase Console → Authentication → Sign-in method, enable Email/Password.
7. Make sure Cloud Firestore is created in the same project.

The API key is a client identifier, not a secret. Do not add service-account JSON or Admin SDK credentials to this website.

## Publish Firestore rules
1. Open Firestore Database → Rules.
2. Replace the current rules with the contents of `firestore.rules`.
3. Click Publish.

These rules intentionally do NOT preserve the supplied public write permissions. The supplied `allow read, write: if true` for users/servers/rooms would let strangers alter profiles and game data. This starter secures `users` and `news`; it does not add permissive rules for `servers` or `rooms`. If your multiplayer backend needs those collections, add narrowly scoped rules or route writes through a trusted server.

## Run locally
From this folder:
```bash
python -m http.server 5500
```
Open `http://localhost:5500`. ES modules will not work from a `file://` URL.

Deploy `index.html`, `styles.css`, and `app.js` to Netlify / Firebase Hosting / another HTTPS static host. Keep `firestore.rules` for the Firebase Console.

## Unity UID sync
Website Authentication and Unity must use the same Firebase project and authentication provider. After sign-in, the website uses the Firebase Auth UID as the Firestore document ID:
```text
users/{uid}
```
The website profile currently writes:
```json
{
  "uid": "FIREBASE_AUTH_UID",
  "username": "Outlaw",
  "email": "player@example.com",
  "createdAt": 1793500000000,
  "status": "active",
  "currency": { "AC": 0 }
}
```
Your Unity client should sign in with Firebase Authentication, get `FirebaseAuth.DefaultInstance.CurrentUser.UserId`, and read `users/{uid}`.

If your existing Unity `users` documents use a different field layout, merge the `username` and `currency.AC` fields into the existing schema rather than overwriting existing player records.

## Security / economy notes
- Admin UID is configured in both `app.js` and `firestore.rules`.
- Admin can list player documents and change `currency.AC`.
- A player can read their own profile and update ordinary profile/game fields, but cannot update `currency`, `status`, or admin privilege fields.
- News can be read publicly; only the admin UID can create, update or delete posts.
- The sample admin browser UI uses Firestore transactions for AC adjustments. For a production economy, use a trusted Cloud Function/server plus an immutable transaction ledger; never trust a client to award itself currency.
- Admin cannot see passwords. Firebase Authentication never exposes them.
- The rules do not yet define secure matchmaking writes for `servers` or `rooms`. Do not re-add public write access for those collections without a threat model.

## Included
- Firebase email/password sign up and sign in
- UID-based Firestore profile sync
- Live AC wallet
- News feed and admin publishing
- Admin player database and AC add/remove
- Profile editing
- Firestore security rules
