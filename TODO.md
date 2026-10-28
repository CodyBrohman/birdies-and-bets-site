# Birdies & Bets: what's left after the compliance pass

Written 2026-10-20, after the website compliance pass (website commit `838b149`, app commit `f4ef647`).
This file lists everything still open from that pass: things only you can do (accounts, DNS, App Store Connect,
legal), app code changes, and website text that has to change when they land. The app's own build and release
plan is in `../birdies-and-bets/TODO.md`; where the two overlap, this file says so.

This file isn't published: the Pages workflow copies only the site files.

**2026-10-27:** the app's `TODO.md` was rewritten as the one list of everything left for you, with step-by-step
instructions, and it took over every [You] item here. Work from that list. This file keeps the detail behind Claude's
code and website items, which the app TODO points to by section (§3.3 and so on).

**How to read it**
- **[You]**: you do it (accounts, dashboards, DNS, your phone, App Store Connect, legal).
- **[Claude]**: code or copy work. Ask in a session ("do TODO item 3.4") and it can be done and tested for you.
- **(blocker)**: must be done before the app is submitted or the site is promoted, because the site or the
  privacy policy already promises it.
- Line numbers in app files are as of 2026-10-20 and may drift; search for the names given.
- When an item is done, delete it (git history keeps it). Numbers aren't reused, so references to the rest stay
  right.

**Suggested order:** section 1 (it makes today's promises true), then 2 and 3 alongside the app work in
`../birdies-and-bets/TODO.md`, then 6 and 7 before submission, then 9 on launch day.

---

## 1. Do these first (the live site already promises them)

### 1.1 [You] (blocker) Turn on sign-in log cleanup for deleted accounts
The privacy policy and `delete-account.html` say deleting an account also deletes the sign-in records Supabase
keeps (email, IP address, time). The code for that is committed (`f4ef647`) but not live yet.

1. Supabase dashboard → your project → **SQL Editor** → New query. Paste the whole of
   `../birdies-and-bets/supabase/migrations/0004_delete_sign_in_log.sql` and run it.
   - If it says `permission denied for table audit_log_entries`, stop and tell Claude: Supabase restricts some
     `auth` tables on newer projects and the function will need a different approach.
2. In a terminal in `../birdies-and-bets`: `npx supabase functions deploy delete-account`
   (needs `npx supabase login` and `npx supabase link` first; app TODO 2.1).
3. The same function needs the Sign in with Apple secrets or Apple accounts can't be deleted at all (it returns
   "Account deletion is not set up yet"). If you haven't yet: Supabase → Edge Functions → Secrets, add
   `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID` and `APPLE_PRIVATE_KEY` (the whole `.p8` file). App TODO 2.2,
   2.5 and 2.6 walk through it.

**Check:** on a dev build, sign in with a throwaway email, then delete the account in the app. In the SQL editor run
`select count(*) from auth.audit_log_entries where payload->>'actor_username' = 'that@email';` → it should be `0`.

### 1.2 [Claude] + [You] (blocker) Stop crash reports leaking the account ID and search text
The privacy policy promises crash reports carry no account identifier and nothing you typed. Today they can: Sentry's
iPhone-level code records every network request as a breadcrumb (category `http`), including
`profiles?id=eq.<account id>` and the course search `/search?q=<typed text>`, and those bypass the app's
`scrubEvent` filter. Native crash reports also carry a per-install ID as `user.id`.

**Status 2026-10-20:** steps 1-4 are done in the app (`src/services/telemetry.ts`, with tests), app commit `5ea17af`, not yet
on a build. App-hang and watchdog tracking are now off. Left: a dev build and the Check below, and your steps 5-6.

**[Claude], in `../birdies-and-bets/src/services/telemetry.ts`:**
1. Add `http` to the dropped breadcrumb categories (the regex near line 35 that drops `console|touch|ui.|xhr|fetch`).
2. In `Sentry.init` (near line 88) pass `enableNetworkBreadcrumbs: false`. It isn't in the React Native types, so it
   needs a cast; React Native forwards it to the iOS SDK. Consider `enableAppHangTracking: false` and
   `enableWatchdogTerminationTracking: false` too (those events skip `scrubEvent` entirely).
3. Right after init, `Sentry.setUser({ id: 'anonymous' })` so native events don't carry the install ID.
4. In `scrubEvent` (near lines 52-61) also delete details nobody needs for debugging:
   `contexts.app.device_app_hash`, `contexts.app.app_start_time`, `contexts.device.boot_time`, `free_storage`,
   `storage_size`, `battery_level`, `charging`, `timezone`, `locale`, the whole `contexts.culture`, and
   `contexts.os.kernel_version`. Keep model, OS version, memory, screen.

**[You], in the Sentry dashboard** (Settings → Projects → your project → Security & Privacy):
5. Turn on **Prevent Storing of IP Addresses** (the policy says the IP isn't stored).
6. Keep **Data Scrubber** and **Use Default Scrubbers** on. Add an Advanced Data Scrubbing rule that removes values
   from breadcrumb URLs, as a backstop for native events the app can't scrub (see Sentry's "Advanced Data
   Scrubbing" docs for the exact selector).

**Check:** on a dev build with crash reports on, search for a course, then trigger a test error (Sentry's
`Sentry.nativeCrash()` in a debug-only button, or throw from a debug screen). In Sentry, open the event: no `http`
breadcrumbs, no search text, `user.id` is `anonymous`, no IP address.

**Then:** leave the policy's device-details list ("screen size, memory, language and time zone") as it is unless step 6
also strips language and time zone on Sentry's side: native crash reports skip the app's filter and still carry them.

### 1.3 [You] (blocker) Make hello@birdiesandbets.com work and deliver
The whole site now says hello@birdiesandbets.com. The domain's mail already goes to Microsoft 365, but two things
are missing.

1. **Create the address.** Microsoft 365 admin center → Teams & groups → **Shared mailboxes** → Add a shared mailbox
   named "Birdies & Bets", address `hello@birdiesandbets.com` (shared mailboxes need no licence), and give yourself
   Full Access and Send As. Or add `hello@` as an alias on your own mailbox (Users → your user → Manage username
   and email → add alias).
2. **Fix SPF.** The current record `v=spf1 include:secureserver.net -all` doesn't include Microsoft, and `-all`
   tells receivers to reject anything else, so your replies can bounce or land in spam. At GoDaddy → your domain →
   DNS, edit that TXT record to:
   `v=spf1 include:spf.protection.outlook.com include:secureserver.net -all`
   (keep `secureserver.net` only if GoDaddy itself sends mail for the domain, such as forwarding; otherwise drop it).
   A domain may have only one SPF record. Later, a newsletter service may ask you to add its own `include:`.
3. **Turn on DKIM.** Microsoft Defender portal (security.microsoft.com) → Email & collaboration → Policies & rules →
   Threat policies → **Email authentication settings** → DKIM → select `birdiesandbets.com`. It shows two CNAME
   records (`selector1._domainkey` and `selector2._domainkey`). Add both at GoDaddy exactly as shown, wait for DNS,
   then switch DKIM on in the portal.
4. **Add DMARC.** At GoDaddy add a TXT record, name `_dmarc`, value
   `v=DMARC1; p=none; rua=mailto:hello@birdiesandbets.com`. `p=none` only reports. After two or three weeks of
   clean reports, change it to `p=quarantine`.

**Check:** send a message from Gmail to hello@ and reply from hello@. Then send one from hello@ to the address
mail-tester.com gives you: aim for 9/10 or better, with SPF, DKIM and DMARC all passing.

### 1.4 [You] Confirm which tool made the website photos
You said ChatGPT (OpenAI), so the README's credits and the licence notes say that. But the app TODO used to call
them "the Gemini photos". Check your history (app TODO 5.6).
- If they were made with **Gemini** (Google): Google's terms also let you use generated images commercially, and they
  carry an invisible SynthID watermark. Ask Claude to change the README table.
- Either way, keep the prompts or chat history somewhere safe as a record of where they came from.
- App TODO 5.6 also asks whether the website keeps AI photos at all; that decision is still yours.

---

## 2. Email and the early-access list

### 2.1 [You] Send Claude the mailing address
Canada's anti-spam law (CASL) and the US CAN-SPAM Act require a postal address in every marketing email. A PO box
or the company's office works. It goes only in `emails/launch-footer.html`, `emails/launch-footer.txt` and
`emails/signup-consent.txt` (they say `[mailing address]` now), never on the website.

### 2.2 [You] Pick and set up a newsletter service
Buttondown, MailerLite or Mailchimp all work. Whichever you pick:
1. Sign up as St. Margaret's Ventures Inc., sender name "Birdies & Bets", from address hello@birdiesandbets.com.
2. **Authenticate the domain** in the service (it gives you DKIM CNAMEs and sometimes an SPF include). Add them at
   GoDaddy. Without this, launch emails go to spam.
3. Turn on **double opt-in** (people confirm by email before they're added).
4. Build the sign-up form from `emails/signup-consent.txt`: heading, an **unticked** consent box with that exact
   label, the small print with company name, mailing address, hello@ and the privacy link.
5. Use `emails/signup-consent.txt`'s confirmation email text for the double opt-in email.
6. Add `emails/launch-footer.html` to the email template, replacing `{UNSUBSCRIBE}` with the service's tag
   (Buttondown `{{ unsubscribe_url }}`, MailerLite `{$unsubscribe}`, Mailchimp `*|UNSUB|*`). Leave the service's
   List-Unsubscribe header switched on (it gives Gmail and Apple Mail their own unsubscribe button).
7. Send Claude the hosted sign-up page's URL (item 2.4).

**Check:** sign up with a test address, confirm it, receive a test campaign, click Unsubscribe, and confirm the
address shows as unsubscribed in the service.

### 2.3 [You] Move earlier early-access requests into the service
People who emailed hello@ (or your Gmail) asking for early access gave implied consent that lasts 6 months from their
email. Import them using the service's **double opt-in import** (they get the confirmation email and only join if
they click), so you end up with lasting express consent. Never import people who only received sign-in codes, or
players someone added to a round.

### 2.4 [Claude] Point the website at the sign-up form
Once 2.2 is done: change the "Ask for early access" button in `index.html` (`#download` section) from the `mailto:`
link to the service's hosted sign-up page (a plain link, not an embedded form, so the site still loads nothing from
other companies). In `privacy.html`, name the service where early access is described ("Why we use it", "How long we
keep it") and in "Where it is kept". Update `sitemap.xml` dates.

### 2.5 [You] Use the branded sign-in code email
Supabase → Authentication → **Email Templates**. Paste `emails/sign-in-code.html` into both **Magic Link** and
**Confirm signup** (the first sign-in uses Confirm signup); subject: "Your Birdies & Bets sign-in code". It keeps
`{{ .Token }}`, which the app needs.
- Supabase's built-in email sender has a low hourly limit and a supabase.io sender. For launch, set up **custom
  SMTP** (Authentication → SMTP Settings): Microsoft 365 SMTP or a transactional service such as Resend or Postmark,
  sending from an address like `no-reply@birdiesandbets.com`, with that service's SPF/DKIM added at GoDaddy.

**Check:** request a code in the app; it arrives from your domain, looks like the template, and the code works.

---

## 3. App code: before release (blockers)

All in `../birdies-and-bets`. Each is a [Claude] task unless marked; run `npm test`, `npm run typecheck` and a dev
build after each group.

### 3.1 [Claude] (blocker) Stop syncing the retired "bag" and "home area"
Nothing in the app reads them any more, but they still upload and come back on a new phone, and "home area" is
free-text location (the privacy policy currently has to mention them).
1. Remove `'bag', 'homeArea'` from `SYNCED_PREFS` in `src/services/sync.ts` (near line 59).
2. Remove them from the `Preferences` type, `sanitizePreferences`, `apply` and `current` in
   `src/store/preferencesStore.ts` (near lines 19-24 and 74-114), so server data with them is ignored.
3. Add storage migration v6 in `src/store/storage/migrate.ts` that deletes them from `bb:preferences` (v5 is the
   2026-10-27 friends change).
4. New `supabase/migrations/0008_drop_legacy_prefs.sql` (0005–0007 are friends, shared rounds and push):
   `update public.user_settings set data = data - 'bag' - 'homeArea' where data ?| array['bag','homeArea'];`
5. [You] run 0008 in the SQL editor after the app ships.

**Then:** ask Claude to remove "the bag and home area that older versions asked for" from `privacy.html`.

### 3.3 [Claude] + [You] (blocker) Upgrade to Expo SDK 58
The only security advisory that reaches the shipped app (`decode-uri-component`, a malformed deep link can freeze the
app, GHSA-vcc3-ghjq-m6fr) is fixed only in `expo-router` 58.
1. `npx expo install expo@^58 --fix` (never `npm audit fix --force`, which suggests downgrades).
2. `npx expo-doctor` and fix what it reports; read Expo's SDK 58 changelog for breaking changes.
3. Bump Sentry from `~7.11.0` to the version SDK 58 expects (at least `^7.13.0`; 8.x if supported).
4. Check or replace `@react-native-segmented-control/segmented-control` (unmaintained since Dec 2024, old
   architecture). It's used once, in `src/components/ui/SegmentedControl.tsx`.
5. Remove `legacy-peer-deps=true` from `.npmrc`, then `npx expo install --check` and fix real conflicts.
6. `npm test`, typecheck, then [You] build a new dev client and run device test 1 again.

### 3.4 [Claude] (blocker) Link the terms in the app
Apple requires Terms of Use and Privacy links in the app for auto-renewing subscriptions (guideline 3.1.2). Since
2026-10-27 `TERMS_URL` exists (`src/services/telemetry.ts`), and the username step in sign-in and the username sheet
(`src/app/friend/username.tsx`) link the terms. Left:
1. Welcome screen (`src/app/sign-in.tsx`): replace the lone privacy link with
   "By continuing you agree to the Terms of Service and Privacy Policy", both linked.
2. Settings and Profile: add a "Terms of service" row beside "Privacy policy".

### 3.5 [Claude] (blocker) Fair privacy choices on first launch
1. **Equal buttons** on the usage-analytics page (`src/app/onboarding.tsx` near lines 85-89): both
   `variant="secondary"` (same size, no haptic), labelled "Share usage counts" and "Don't share".
2. **Say crash reports are on** before any can be sent: add to the last tour page, in every build, "Crash reports
   are on: if the app crashes it sends a report to Sentry with no names, scores or courses. Turn them off in
   Settings › Privacy." Change the Settings footer (`settings.tsx` near line 229) to "Crash reports are on unless you
   turn them off. Usage analytics are off unless you said yes. Neither includes names, scores or courses."
3. **Clear consent text** in both places (`onboarding.tsx:22` and the Home alert in `src/app/(tabs)/(home)/index.tsx`
   near line 42): "Tells us (through Aptabase) when rounds start and finish and which games are used, so we know what
   to improve. Never names, scores or courses. Change it any time in Settings." plus a Privacy policy link.
4. **Ask once:** in "How it works", only include the consent page when `analytics === undefined`
   (`onboarding.tsx` near line 28).
5. Say "not linked to you" instead of "anonymous", and call the setting "Usage analytics" everywhere.
6. Welcome screen (`sign-in.tsx:145` and `:194`): text "Accounts are optional. Sign in to sync your rounds across
   phones, or keep everything on this iPhone." and make "Continue without an account" `variant="secondary" size="lg"`
   so it's as visible as the email button.

### 3.6 [Claude] (blocker) Age question on first launch
The terms and privacy policy now set 13 as the minimum and ask under-16s to get a parent's OK for analytics.
1. New first screen, before the welcome/sign-in screen and the analytics question: "What year were you born?" with a
   year picker that has **no default** and doesn't hint at a required age.
2. Store only an age band (`under13`, `13to15`, `16plus`) in preferences on the phone: never the year, not in
   `SYNCED_PREFS`, not in backups, not sent anywhere. Don't offer a way to change it (a reinstall resets it).
3. **Under 13:** no sign-in (local scoring only; hide the welcome screen's sign-in buttons), no analytics question,
   crash reports off by default.
4. **13 to 15:** the analytics question adds "Ask a parent or guardian before you say yes."
5. Tests for each band.

**Then:** ask Claude to add one sentence about the age question to the privacy policy's "Children" section.

### 3.7 [Claude] (blocker) No real-money stakes
If someone names the points "$", every screen shows "+$12" or "$15 from each player", which contradicts "points only"
and risks rejection under App Store guideline 5.3 (gambling).
1. Where the points name is typed (Settings near `settings.tsx:203-213`, Round options near
   `src/app/new-round/options.tsx:46-56`), refuse currency names: anything matching
   `/[$€£¥₹]|^(usd|eur|gbp|dollars?|bucks|euros?|quid|cash)$/i` falls back to "points", with a short note.
2. Delete the currency-symbol branch in `formatStake` (`src/lib/format.ts` near line 149).
3. `src/games/skins.ts` near line 114: drop "from each player".
4. Rename each game's "Stake" field to "Points value"; add "Points are a tally between players. Nothing is paid in
   the app." under the Friends balance (`friends/[id].tsx` near line 76).
5. Replace the alcohol defaults so they match the age-rating answers: "Carry the drinks" (`src/games/hotSeat.ts:9`)
   → "Carry everyone's clubs"; placeholder "e.g. beers, pushups" → "e.g. pushups, laps"
   (`options.tsx:47`, `settings.tsx:204`).

### 3.8 [Claude] (blocker) VoiceOver can reach every control, and shares say who won
1. `src/components/ui/List.tsx` near line 153: a row without `onPress` becomes one VoiceOver element and hides its
   controls (stake steppers, Holes, Tee time, "Points are called", Hole count). Use
   `accessible={!(isSwitch || trailing != null)}`.
2. `src/components/share/ShareCardButton.tsx` near line 41: put the result in the share text, e.g.
   "Our card from Heronmere Golf Club: Maya Chen won, net 66. Full card: <link>" (build it with the same
   `resultRows`/`resultHeadline` the image uses), so people who can't see the image, or get no link because the card
   is too big, still get the result.

**Check:** with VoiceOver on, you can adjust every control in New round and Settings; a shared message reads the
result aloud.

### 3.10 [Claude] (blocker) Remove offline wording from the app and listing
The website no longer claims the app works offline (live shared rounds will need a connection).
- `src/app/onboarding.tsx:19`: "Every tap is saved, even offline." → "Every tap is saved as you go."
- `docs/store-listing.md:28`: "…even with no signal; close the app…" → "Every tap is saved at once; close the app and
  pick up where you left off"; line 53: "…so you can try it with no signal" → "…so you can try it straight away".

---

## 4. App code: should do before release

### 4.1 [Claude] Privacy manifest and App Privacy answers match reality
1. `app.config.ts` privacy manifest (near lines 28-44):
   - Add the collected type **Other Diagnostic Data** (not linked, no tracking, App Functionality). Performance Data
     isn't needed: the Sentry fix turned off app-hang and watchdog tracking.
   - Add required-reason APIs: SystemBootTime `35F9.1`, DiskSpace `E174.1`, and `3B52.1` alongside `C617.1` for
     FileTimestamp. Prebuilt React Native may skip merging the libraries' own manifests, so declare them here.
   - If the owner keeps them (app TODO 5.2): `NSPrivacyCollectedDataTypeDeviceID` (push tokens) and
     `NSPrivacyCollectedDataTypeContacts` (the friends list), linked, not tracking, App Functionality. See
     `docs/store-listing.md` › App Privacy.
2. Update `docs/store-listing.md`: add Other Diagnostic Data; correct "the EAS Update check carries no user data" (it
   sends a random install ID and, after a crash, the error text); "no location" becomes true once 3.1 is done.
3. [You] After the first production archive, open it in Xcode (Window → Organizer → right-click the archive →
   **Generate Privacy Report**) and check every library appears, including Hermes with a signature.

### 4.2 [Claude] + [You] Sign over-the-air updates
Updates published with EAS Update aren't signed today (`app.config.ts:76-80`, `scripts/publish.mjs:27`), so anyone with
your Expo credentials could push code, or change server addresses and keys, without App Review.
1. `npx expo-updates codesigning:generate --key-output-directory keys --certificate-output-directory certs
   --certificate-validity-duration-years 10 --certificate-common-name "St. Margaret's Ventures Inc."`
2. `npx expo-updates codesigning:configure --certificate-input-directory certs --key-input-directory keys`
3. Add `keys/` to `.gitignore`; keep `keys/private-key.pem` in a password manager. Commit `certs/`.
4. Publish with `--private-key-path keys/private-key.pem` (update `scripts/publish.mjs`).
5. [You] Needs a new native build; older builds keep accepting unsigned updates.

### 4.3 [Claude] Collect less
- Keep `profiles.handicap_index`: since 2026-10-27 friends see it (`friend_list()`), so it is no longer unused.
- Sign in with Apple asks for email it doesn't need (`auth.ts:139`): request `FULL_NAME` only. Test that Supabase's
  Apple provider accepts a token without an email first. Don't save the Apple email in `bb:auth`.
- Full backup files stay in the cache folder after Back up or Restore (`settings.tsx` near lines 100-113): delete
  both copies in a `finally` block.
- Backups include things they don't need (`src/store/backup.ts:10`): exclude `courseCache`, the old
  `themePreference`, `photoUri` and the retired bag/home area.
- Course search cache keeps old queries forever (`courseStore.ts` near lines 58-66): prune expired entries on load.
- Delete account leaves the profile photo (`auth.ts` near lines 242-246): delete the file and `photoUri` too.
- Shared card links carry a millisecond timestamp but only show the date (`src/lib/cardLink.ts:62`): send the day.
- `teeTime` is copied into started rounds and synced but never read (`roundStore.ts:191`): drop it there.
- Email sign-in suggests the email's first part as the player name (`sign-in.tsx:96`): default to empty.
- The `bb:auth` snapshot keeps email and user id in plain storage (`auth.ts:27`): move to SecureStore or drop.

### 4.4 [Claude] Accessibility, medium
- Plus-handicap "gives a stroke back" isn't announced (`PlayerScore.tsx:103`, `format.ts:166`).
- "CH +2" is read as "minus 2" (`ResultsTable.tsx:56`): say "plus 2".
- Scorecard columns don't say gross or net; read-only cards announce "dimmed" (`NineCard.tsx` near 92-93, 114, 130);
  use the unused `describeTotalsRow` / `describeHoleRow` helpers in `format.ts`.
- The Undo toast and form errors aren't announced on iPhone (`accessibilityLiveRegion` is Android-only): call
  `AccessibilityInfo.announceForAccessibility` (`app/round/play.tsx` near 77-79 and 223, and the other error
  messages), and keep the toast up longer while VoiceOver is on.
- Invalid fields are shown by colour only (`add-course.tsx` near 341-347, `FormRow.tsx:30`): add ", invalid" to the
  label.
- The skins hole-by-hole strip has no spoken version (`StandingsCard.tsx:37`, `format.ts:193`): add a skins branch.

### 4.5 [Claude] Course data and Worker housekeeping
- In `worker/`: `npm update wrangler` (4.151.3 fixes a `sharp` advisory in local tooling only).

---

## 5. App code: nice to have

- [Claude] NetInfo pings Google about once a minute while signed in (`src/services/sync.ts` near line 466). The app
  only reads `isConnected`, so call `NetInfo.configure({ reachabilityShouldRun: () => false })` before first use.
  **Then:** ask Claude to remove the "Connection checks" bullet from `privacy.html`.
- [Claude] Accessibility, low: hide the scorecard's label column and `StrokeDots`' unused label; spell out "E", "–",
  "HCP +1.8 · CH +2", "+3" and "Double" for VoiceOver; busy state on share buttons; name the tee colour in course rows.
- [Claude] Delete-account confirmation (`settings.tsx` near 76-81): suggest Back up first, and don't claim settings
  are deleted (haptics and privacy choices stay on the phone).
- [Claude] Privacy choices aren't synced, so a new phone starts with crash reports on: say so in Settings, or sync
  them.

---

## 6. Accounts and dashboards

- [You] **Sentry**: items 5-6 in 1.2.
- [You] **Cloudflare**: Workers & Pages → the course-lookup Worker → Settings → Observability: make sure **Workers
  Logs** is off (the privacy policy says the Worker keeps nothing but a one-minute rate-limit key and cached results).
- [You] **Course search must be live at launch**, because the site says "Thousands of courses" and promises search:
  deploy the Worker with its GolfCourseAPI key, and pick a paid GolfCourseAPI plan (the free tier allows 35 requests
  a day; app TODO 3.1 and 3.4).
- [You] **Supabase plan**: free projects pause after 7 days without activity (app TODO 2.9). Upgrade or keep it
  active through review.
- [You] (optional, needs a paid Supabase plan) Authentication → Sessions: set an inactivity timeout, so stale sessions
  expire.
- [Claude] + [You] Clean up abandoned email sign-ups (a code was requested but never used, so the email sits in
  `auth.users` forever). A migration with pg_cron (Database → Extensions → enable `pg_cron`):
  ```sql
  select cron.schedule('prune-unconfirmed-users', '0 4 * * *',
    $$ delete from auth.users where email_confirmed_at is null and created_at < now() - interval '1 day' $$);
  ```
  Same permission caveat as 1.1. Optionally also prune old sign-in log entries
  (`delete from auth.audit_log_entries where created_at < now() - interval '90 days'`); if you do, ask Claude to add
  "sign-in records are kept for 90 days" to the privacy policy.

---

## 7. App Store Connect (before submission)

### 7.1 [You] (blocker) Publish as the company
- The developer account should belong to **St. Margaret's Ventures Inc.**, an organization account, so the App Store
  shows the company as the seller. That needs a **D-U-N-S number** for the company (free; look it up or request it
  through Apple's D-U-N-S lookup tool on developer.apple.com). If you enrolled as an individual, ask Apple Developer
  Support to convert the membership to an organization.

### 7.2 [You] (blocker) App information
- **Privacy Policy URL**: `https://www.birdiesandbets.com/privacy.html`
- **Support URL**: `https://www.birdiesandbets.com/support.html`
- **Licence agreement**: keep Apple's standard EULA (the terms point to it), and once there's a subscription put
  "Terms of Use: https://www.birdiesandbets.com/terms.html" in the app description (guideline 3.1.2).
- **Third-party content**: course data comes from GolfCourseAPI; answer the content-rights question accordingly (see
  8.3).

### 7.3 [You] (blocker) App Privacy questionnaire
2026-10-27: `docs/store-listing.md` › App Privacy replaces this table. It adds the friends features (Device ID,
Contacts, and more under User Content); answer from there (app TODO 10.4).

Answer after 1.2 and 3.1 are done:

| Data | Linked to the user | Used for tracking | Purpose |
|---|---|---|---|
| Name | Yes | No | App Functionality |
| Email Address | Yes | No | App Functionality |
| User ID | Yes | No | App Functionality |
| Other User Content (rounds, players, courses) | Yes | No | App Functionality |
| Crash Data | No | No | App Functionality |
| Other Diagnostic Data | No | No | App Functionality |
| Product Interaction (opt-in usage analytics) | No | No | Analytics |

Tracking: **No**. Optional: Search History (course search text the Worker caches for 7 days, not linked).
Purchases gets added once the subscription exists (item 8.1).

### 7.4 [You] (blocker) Age rating 13+
The site now says 13 and up. In the questionnaire, answer so the result is **13+**; `docs/store-listing.md`
Option A ("Simulated Gambling: Infrequent") gives that. Update the review notes to match, and the line
"no in-app purchase" once the subscription exists.

### 7.5 [You] EU trader details (Digital Services Act)
To sell in the EU with a paid subscription, Apple needs trader details: address, phone number and email, shown on the
EU App Store listing. Set them in App Store Connect (Business section). A business phone line and the PO box from 2.1
are fine.

---

## 8. Legal and brand

### 8.1 [You] Get a lawyer's read
Claude isn't a lawyer. The terms, privacy, refund, cookie and deletion pages are reasonable for a small Canadian
app business, but have an Ontario lawyer read them once before launch, especially the liability cap (CA$50),
governing law, the 30-day reply promise and the children's section.

### 8.2 [You] Trademark
Purely AI-made images may not be protected by copyright, so the name and logo depend on trademark protection.
1. Search "Birdies & Bets" (and close variants) in the Canadian Trademarks Database (CIPO) and in the USPTO's
   trademark search.
2. If clear, file in Canada (and the US if you'll market there) for the name and the logo, in the classes for
   downloadable software and games/entertainment. A registered trademark agent can do the filing and the class
   choice.
3. Keep a record of which AI tool made the logo and the prompts or session.

### 8.3 [You] Course data rights
The app bundles a sample course (`assets/courses/cedar-ridge.json`) and caches course search results from
GolfCourseAPI. Read GolfCourseAPI's terms (or ask them) to confirm bundling and caching are allowed on your plan. If
"Cedar Ridge Golf Club, Elk Grove, CA" is a real course's data, replace it with an invented sample if needed.

### 8.4 [You] Decide the app's logo
The website now uses the spade logo, but the app kept the chip logo (a 2026-10-14 decision; app TODO 5.5), and the
app screenshots on the website still show the chip. Pick one. If the app moves to the spade, Claude
can update the app icon and brand mark and recapture the website screenshots (`scripts/website-shots` in the app
repo).

---

## 9. Launch day (website switch-over)

Do these only once the App Store listing is live. [Claude] unless noted.

1. Put the App Store URL in place of `#download`: the header button on all pages, the hero button in `index.html`,
   and the button in `card.html` (search for `TODO`).
2. Relabel the buttons, which must not promise a download before then: header "Early access" → "Get the app", hero
   "Get early access" → "Get it on the App Store", `card.html` "Get early access" → "Get Birdies & Bets".
3. Replace the bottom early-access section ("Coming to iPhone") with Apple's official **"Download on the App Store"**
   badge. [You] download it from Apple's Marketing Resources and Identity Guidelines; it must be used unaltered.
4. **Early-access promise:** the privacy policy says early-access emails are "kept until the app launches, then
   deleted unless you have written to us about something else". At launch, either delete the list, or (better)
   before launch ask Claude to change that line to cover an ongoing newsletter people agreed to in 2.2.
5. If the subscription is out: add the price to the support FAQ ("What does it cost?") and the terms.
6. Bump the effective date on any policy page that changed, and `sitemap.xml` dates.

---

## 10. When the subscription is built

- [Claude] Paywall shows, next to the buy button: price, billing period, that it renews automatically, any free
  trial and what it turns into, how to cancel, and links to the terms and privacy policy (Apple guideline 3.1.2;
  California's automatic-renewal law).
- [Claude] No pricier plan pre-selected, no hidden or delayed close button, a visible "Restore purchases".
- [Claude] Keep scoring and the games free: the support FAQ now promises that.
- [Claude] If you use a purchase service (RevenueCat or similar), name it in `privacy.html` and declare Purchases in
  the App Privacy questionnaire (7.3).
- [You] Update `docs/store-listing.md`'s review note ("no in-app purchase").

---

## 11. Website polish (optional)

- [Claude] The scrolling games banner never stops and only a mouse hover pauses it; keyboard and touch users can't
  (accessibility rule WCAG 2.2.2). Add a small pause button, or stop it after a few loops.
- [Claude] The "Thousands of courses" tile uses a headphones icon; swap it for a flag or a map.

---

## 12. Website text that changes when other work lands

| When this is done | Change on the website |
|---|---|
| 1.2 Sentry fix | Trim the device-details list under "Crash reports" in `privacy.html` |
| 2.2 newsletter service chosen | Early-access button, service named in `privacy.html` (item 2.4) |
| 3.1 bag/home area removed | Remove "the bag and home area that older versions asked for" from `privacy.html` |
| 3.6 age question shipped | One sentence about it in `privacy.html` "Children" |
| 5 NetInfo change | Remove the "Connection checks" bullet from `privacy.html` |
| 6 sign-in log pruning | "Sign-in records are kept for 90 days" in `privacy.html` |
| App launch | Section 9 |
