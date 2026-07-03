# App Privacy Answers Draft

## Tracking

- Data used to track users: Yes, potentially by Google AdMob when the user authorizes tracking.
- ATT requested: Yes, only when deferred advertising initialization occurs.
- Device identifiers and advertising data: Declare according to the Google Mobile Ads SDK privacy manifest and current App Store Connect guidance.

## Data Linked to the User

- Account data: Optional email address, account identifier, role, session, linked install ID, and account inventory are processed when a user chooses to sign in.
- Contact information: Optional email is collected only when a user enters it in Support. It is used for support communication and is not used for tracking.
- Purchases: Apple purchase and entitlement information is processed to verify purchases and prevent duplicate consumable grants.

## Data Not Linked to the User

- User ID: An anonymous install ID is used for local entitlement, purchase ledger, and support routing.
- Diagnostics: App version, build number, and device model may accompany a user-submitted support ticket.
- User content: The private support message and selected support category are collected only when submitted.
- Advertising data: Google AdMob may process device identifiers, coarse location, product interaction, advertising, performance, crash, and diagnostic data for consent, ad delivery, measurement, and fraud prevention under its SDK disclosures.

## Not Collected

VaultPop does not request contacts, photos, camera, microphone, health, fitness, browsing history, search history, financial account details, or public user content. Google AdMob's SDK disclosure includes coarse location and must be represented in App Store Connect.

Privacy Policy URL: `https://vaultpop-api.fly.dev/privacy`

Support URL: `https://vaultpop-api.fly.dev/support`
