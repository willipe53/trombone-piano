# Deployment

The public site is `https://trombonepiano.com`. `www.trombonepiano.com` redirects to it. Deploys run from this machine with the `ditch` AWS profile in account `866519949379`. There is no GitHub Action.

The hosted zone is `Z05272973TT12BV8B7ON5`. SES production access is already enabled. Inbound mail uses the existing active receipt rule set `INBOUND_MAIL`. The Trombone Piano rule is added to that set. The Extent Devices rule stays in place.

## Web

First time, and again if the hosting resources are missing:

```bash
aws sso login --profile ditch
./scripts/provision-web.sh
```

That script keeps the bucket private, puts CloudFront in front of it with an origin access control, requests the certificate, and writes `.env.deploy`. That file is gitignored.

Later publishes:

```bash
npm run web-deploy
```

`/piano`, `/games`, and `/help` are not separate files. A missing path returns `index.html` and keeps the address, so those URLs open the matching screen.

`web-deploy` reads the latest iOS build from EAS and writes its version and build number into `src/buildInfo.ts` before the export. If EAS has no iOS build yet, the file stays at `2.0.0` and build `1`. The help screen shows that pair as `Version: 2.0.0+1`. A web deploy does not bump the store version. Commit `src/buildInfo.ts` when the next native build should carry the same pair.

The marketing version is `expo.version` in `app.json`, edited by hand. EAS `autoIncrement` on the production profile bumps the iOS build number and the Android version code once per production store build, and stores them on EAS.

The privacy page and the support page are copied to the root of the site:

- `https://trombonepiano.com/privacy-policy.html`
- `https://trombonepiano.com/support.html`

## Mail

```bash
./scripts/provision-mail.sh
```

Mail to any address at `trombonepiano.com` is stored, then forwarded to `peter@ditchnavigation.com`. The copy is a new message from `support@trombonepiano.com`, with `Reply-To` set to the original sender. SES signs it with Easy DKIM for `trombonepiano.com`. The envelope sender is `mail.trombonepiano.com`.

DNS on the apex:

- MX `10 inbound-smtp.us-east-1.amazonaws.com`
- TXT `v=spf1 include:amazonses.com -all`
- three Easy DKIM CNAMEs
- TXT `_dmarc.trombonepiano.com` at `p=quarantine`. DKIM alignment is strict. SPF alignment is relaxed, because the envelope sender is `mail.trombonepiano.com`. Reports go to `dmarc@trombonepiano.com`.

DNS on `mail.trombonepiano.com`:

- MX `10 feedback-smtp.us-east-1.amazonses.com`
- TXT `v=spf1 include:amazonses.com ~all`

Raw mail expires after 14 days. Inbound TLS is optional.

A forwarded message to `peter@ditchnavigation.com` showed `spf=pass`, `dkim=pass`, and `dmarc=pass` for `trombonepiano.com`, so the DMARC policy is `p=quarantine`. The account stays on SES shared sending addresses.

## Stores

Store checklists are in [app-store/NOTES.md](app-store/NOTES.md) and [play-store/NOTES.md](play-store/NOTES.md). Nothing is uploaded from this setup.

```bash
npm run ios-build
npm run android-build
```
