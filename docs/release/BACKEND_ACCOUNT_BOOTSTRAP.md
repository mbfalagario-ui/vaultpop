# Backend Account Bootstrap

The VaultPop API creates or updates the required owner and test-player accounts at server
startup. Passwords are supplied only through the secure server environment:

- `VAULTPOP_ADMIN_PASSWORD`
- `VAULTPOP_REVIEWER_PASSWORD`

The corresponding email variables have non-secret defaults and may be overridden with
`VAULTPOP_ADMIN_EMAIL` and `VAULTPOP_REVIEWER_EMAIL`.

Startup fails closed when either password variable is missing. Passwords are processed with
salted `scrypt`; only the salt and derived value are stored. Session bearer tokens are random,
expire after 24 hours, and are stored server-side only as SHA-256 digests.

Production values belong in the Fly secret store. They must not be added to `.env`, shell
history, source control, EAS configuration, or the mobile client.
