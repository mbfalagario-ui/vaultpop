# VaultPop Premium UI Rescue - Design QA

## Scope

- Target: iPhone 17 Pro portrait simulator at 402 x 874 points.
- Direction: one shared premium arcade shell with three distinct game identities.
- Classic: Vault Reactor in violet, cyan, and gold.
- Daily Vault: Prism Chain in cyan, ruby, and emerald.
- Streak: Coin Forge in gold, cyan, and green.

## Visual Checks

- Home establishes the VaultPop brand, coin system, primary Play action, mode shortcuts, and utility navigation without overlap.
- Mode Select uses compact rows, mode-specific glyphs, signal dots, and energy rails without decorative overload.
- Gameplay uses an 8 x 8 circular coin board, compact HUD, animated selection feedback, mode-specific meters, and a stable booster dock.
- Results preserves score dominance while keeping best score, chain, vault count, progress, replay, and mode selection visible.
- Shop separates product identity, price, explanation, exact included items, and purchase action. Booster Forge items explain both effect and inventory cost.
- How to Play covers matching, gravity, combos, vault charge, all three modes, and all three boosters with visual examples.
- Account and Settings retain readable forms, controls, and destructive-action separation.
- No source screen uses letter tiles, placeholder art, crypto logos, cash imagery, or financial-reward visuals.

## Interaction Checks

- Home Play and utility links expose visible button surfaces and accessible labels.
- All main screens are reachable through audited routes.
- A real connected group clear produced score, combo, selection, and vault-meter feedback.
- Shop renders a controlled unavailable state in Expo Go while retaining the native StoreKit path for development and production builds.
- Content scrolls vertically where needed; fixed-format boards, HUD rows, switches, and buttons retain stable dimensions.

## Evidence

- `outputs/ui-rescue/home-final.png`
- `outputs/ui-rescue/mode-select-final.png`
- `outputs/ui-rescue/gameplay-classic.png`
- `outputs/ui-rescue/gameplay-daily.png`
- `outputs/ui-rescue/gameplay-streak.png`
- `outputs/ui-rescue/combo-vault-meter.png`
- `outputs/ui-rescue/results-final.png`
- `outputs/ui-rescue/shop-final.png`
- `outputs/ui-rescue/how-to-play.png`
- `outputs/ui-rescue/account-final.png`
- `outputs/ui-rescue/settings-final.png`

The blue gear visible in simulator captures belongs to Expo Go and is not rendered by VaultPop in a native production build.

final result: passed
