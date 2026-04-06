# Google Play — first release (ConstructPro)

## 1. One-time setup

1. **Expo account** — [expo.dev](https://expo.dev) sign in; install EAS CLI: `npm install` (already includes `eas-cli`).
2. **Link the project** (from repo root):

   ```bash
   npx eas login
   npx eas init
   ```

   This adds `extra.eas.projectId` to `app.json` (commit that change).

3. **Firebase / Android**
   - Package name: `com.digiqraft.constructpro` (must match Play Console and `google-services.json`).
   - For release builds, add your **release keystore SHA-1/256** in Firebase and Google Cloud OAuth if you re-enable Google Sign-In later.

4. **Environment variables on EAS** (Production secrets for store builds):

   ```bash
   npx eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..." --scope project --type string
   ```

   Repeat for `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, and optional `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_OF_USE_URL` (HTTPS URLs hosted by you — same as Play listing).

   Or use **EAS Environment Variables** in the Expo dashboard for the `production` environment.

## 2. Versioning (each upload)

- **`app.json` → `expo.version`** — user-facing version (current: **`1.1.0`**; bump semver each release, e.g. `1.1.1` for patches).
- **`app.json` → `expo.android.versionCode`** — integer, **must increase** for every new Play upload (current: **`2`**).
- **`app.json` → `expo.ios.buildNumber`** — bump each App Store / TestFlight upload (current: **`2`**).

## 3. Production Android build (AAB)

```bash
npm run build:android
```

Or: `npx eas build --platform android --profile production`

- Output: **AAB** for Play (`eas.json` → `production` → `app-bundle`).
- Download the artifact from the Expo build page when it finishes.

## 4. Google Play Console (manual steps)

1. Create app → **Production** (or **Internal testing** first).
2. **App signing** — use Play App Signing (recommended).
3. **Store listing** — short/full description, screenshots, feature graphic, icon.
4. **Privacy policy** — **required URL** (host your policy or use the same page as in-app; set `EXPO_PUBLIC_PRIVACY_POLICY_URL` to match).
5. **Data safety** — declare data collected (account, email, photos if punch list, etc.) consistent with the app.
6. **Content rating** — questionnaire (IARC).
7. **Target audience** / **News app** / **COVID-19** declarations as applicable.
8. Upload **AAB** → **Release** → roll out.

## 5. Optional: `eas submit`

After configuring a Google Play service account JSON (not committed; see `.gitignore`), you can add a `submit` profile to `eas.json` and run `npx eas submit --platform android`. For the first release, uploading the AAB manually in Play Console is fine.

## 6. Pre-flight checks

```bash
npx expo-doctor
npm run build:android
```

EAS runs `npm ci` on the project. The repo includes **`.npmrc`** with `legacy-peer-deps=true` so peer dependency resolution matches local installs (expo-router / web transitive deps). **`package-lock.json` must be committed** after any `npm install` change.

---

**Legal:** Host counsel-reviewed privacy/terms if required; point `EXPO_PUBLIC_*_URL` and the Play listing to those URLs. In-app screens summarize policy when URLs are omitted.



