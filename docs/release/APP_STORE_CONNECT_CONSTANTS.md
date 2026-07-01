# App Store Connect Constants

| Field | Value |
|---|---|
| Apple Team ID | `UHF3KNM9F9` |
| Registered App Name | `VaultPop` |
| Subtitle | `Pop Coins. Complete the Chain.` |
| Bundle ID | `app.vaultpop` |
| SKU | `vp-ios-001` |
| App Store Connect App ID | `6784736480` |
| Primary Category | Games - Puzzle/Simulation |
| Secondary Category | Education |

## EAS Mapping

- `app.json` sets `expo.name` to `VaultPop`.
- `app.json` sets `expo.ios.bundleIdentifier` to `app.vaultpop`.
- `app.json` limits `platforms` to `ios`.
- `app.json` sets portrait orientation.
- `eas.json` sets `submit.production.ios.ascAppId` to `6784736480`.
- `eas.json` sets `submit.production.ios.appleTeamId` to `UHF3KNM9F9`.

## Secret Variable Names

- `EXPO_TOKEN`
- `EXPO_APPLE_TEAM_ID`
- `EXPO_ASC_ISSUER_ID`
- `EXPO_ASC_KEY_ID`
- `EXPO_ASC_API_KEY_PATH`
- `ASC_APP_ID`
- `ASC_BUNDLE_ID`
- `GITHUB_TOKEN`

Deferred until explicitly approved later:

- `FLY_API_TOKEN`
- `IAP_PRIVATE_KEY_PATH`
- `IAP_KEY_ID`
