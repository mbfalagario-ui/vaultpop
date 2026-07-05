# VaultPop QA and Audit Checklist

## Prompt 1 Scaffold Gate

- [x] Expo React Native TypeScript scaffold exists.
- [x] App identity is configured as `VaultPop`.
- [x] Bundle identifier is `app.vaultpop`.
- [x] iOS is the only configured platform.
- [x] Portrait orientation is configured.
- [x] Required source directories exist.
- [x] Required asset directories exist.
- [x] Required release docs exist.
- [x] Scaffold screen modules exist for every v1 screen.
- [x] Theme constants define premium dark arcade styling.
- [x] Game-state model definitions exist.
- [x] Local save model definitions exist.
- [x] App Store listing draft outline exists.
- [x] Screenshot asset plan exists.

## Compliance Gate

- [x] No backend code or deployment config added.
- [x] No Fly.io deployment added.
- [x] No Android config added.
- [x] No ad SDK added.
- [x] No ad unit IDs added.
- [x] No IAP SDK added.
- [x] No purchase products added.
- [x] No account system added.
- [x] No login flow added.
- [x] No real-world prize mechanics added.
- [x] Banned visible/store-facing language scan script exists.
- [x] Banned visible/store-facing language scan passes.

## Secret Gate

- [x] No raw secret values committed.
- [x] `.env` files are ignored.
- [x] `.p8` files are ignored.
- [x] `.p12` files are ignored.
- [x] Provisioning profiles are ignored.
- [x] Build outputs are ignored.
- [x] `.env.example` contains variable names only, plus non-secret constants.

## Build and Submission Gate

- [x] No iOS binary created.
- [x] No EAS build command run.
- [x] No App Store Connect submission attempted.
- [x] No backend deployment attempted.

## Prompt 2 Entry Gate

- [x] Prompt 1 product contract exists.
- [x] Prompt 1 compliance rulebook exists.
- [x] Prompt 1 App Store Connect constants doc exists.
- [x] Prompt 1 acceptance criteria exists.
- [x] Prompt 1 report exists.
- [x] No Prompt 1 blockers remain.

## Prompt 2 Implementation Gate

- [x] Home screen is implemented.
- [x] Mode select screen is implemented.
- [x] Classic Mode is playable.
- [x] Daily Vault uses a deterministic daily seed.
- [x] Streak Mode is playable with a round end condition.
- [x] Gameplay uses an 8x8 board.
- [x] Gameplay has at least five tile types.
- [x] Connected-group detection is implemented.
- [x] Gravity and refill behavior are implemented.
- [x] Score, combo, vault meter, vault bonus, timer, restart, and round completion are implemented.
- [x] Results screen shows score, best score, combo summary, fictional points, replay, and mode select.
- [x] Cosmetics use local-only unlocks and visual themes.
- [x] Settings include sound, haptics, reduced motion, reset local progress, and legal/support access.
- [x] Local persistence includes best scores, settings, cosmetics, and Daily Vault state.
- [x] Generated screenshot references exist for every main screen.
- [x] Simple icon draft exists.
- [x] TypeScript check passes.
- [x] Unit tests pass.
- [x] Navigation audit passes.
- [x] Banned-language scan passes with legal/compliance allowances only.
- [x] Secret scan passes.
- [x] No iOS binary was built.
- [x] No submission occurred.
