# Birdies & Bets website

Marketing site plus the privacy policy and support page for the Birdies & Bets iOS app.
Plain HTML, CSS and a little JavaScript. No build step. GSAP 3.12.5 (`assets/js/vendor/`) drives the motion and the fonts are self-hosted (`assets/fonts/`, SIL OFL), so the site loads nothing from third parties.

```
index.html                landing page
privacy.html              privacy policy (linked from the App Store listing)
support.html              support page (linked from the App Store listing)
terms.html                terms of service
refund.html               refund policy (App Store purchases and subscriptions)
cookies.html              cookie policy (the site sets none)
card.html                 shared scorecard viewer
assets/css/site.css       design tokens, type, layout, @font-face
assets/js/site.js         header, hero motion, reveals, carousel, scorecard mock
assets/js/hero-canvas.js  animated contour field behind the hero
assets/js/vendor/         GSAP 3.12.5 and ScrollTrigger (third-party, see below)
assets/fonts/             Inter, Playfair Display, JetBrains Mono (third-party, see below)
assets/img/               icon, favicon, app screens (resized from the mockups)
```

## Licences and credits

The MIT `LICENSE` covers only this site's own code (HTML, CSS, JavaScript). Everything else:

| What | Where | Source | Licence |
|---|---|---|---|
| Birdies & Bets name and spade logo | `assets/img/logo.*`, and the header logo, favicon, touch icon and share image made from it (`logo-96.png`, `favicon.png`, `apple-touch-icon.png`, `og.png`) | Made by St. Margaret's Ventures Inc. with an AI image tool | © St. Margaret's Ventures Inc., all rights reserved; trademarks of the company |
| Section photos | `assets/img/{hero,games,shots,cta}-bg*`, `nineteenth.*` | Generated with ChatGPT (OpenAI), whose terms give the output to the user, commercial use included. No real people. | © St. Margaret's Ventures Inc., all rights reserved |
| App screenshots | `assets/img/0*-*.png` | Captured from the Birdies & Bets app's demo data | © St. Margaret's Ventures Inc., all rights reserved |
| Page text | `*.html` | Written for the site | © St. Margaret's Ventures Inc., all rights reserved |
| Inline SVG icons | `index.html`, `assets/js/` | Drawn for the site | Part of the site's code (MIT) |
| GSAP 3.12.5 and ScrollTrigger | `assets/js/vendor/` | GreenSock | [Standard License](https://gsap.com/standard-license): free, including commercial use, no attribution required. Keep the `/*!` notices intact. The files are byte-identical to cdnjs's 3.12.5 builds and `index.html` checks them with SRI hashes. |
| Inter, Playfair Display, JetBrains Mono | `assets/fonts/` | Latin subsets from Google Fonts | SIL Open Font License 1.1. Each font's licence sits next to it (`OFL-*.txt`) and must ship with it. |

Purely AI-generated images may not be protected by copyright, so the name and logo rely on trademark protection.

## Preview

```
python -m http.server 8080
```

Open http://localhost:8080. The site is dark by design; there is no light theme.

## Deploy (GitHub Pages)

One-time setup, from this folder:

```
gh repo create CodyBrohman/birdies-and-bets-site --public --source=. --push
gh api -X POST repos/CodyBrohman/birdies-and-bets-site/pages -f 'source[branch]=main' -f 'source[path]=/'
```

Or without `gh`: create an empty repo on GitHub, then

```
git remote add origin https://github.com/CodyBrohman/birdies-and-bets-site.git
git push -u origin main
```

and enable Pages in the repo settings (Deploy from a branch, `main`, `/ (root)`).

The site is served at https://www.birdiesandbets.com/ and every push to `main` redeploys it.

## Before launch

- Replace the `#download` links in `index.html` (nav button and hero CTA) with the App Store URL and
  swap the email CTA at the bottom for an App Store badge. Search for `TODO`.
- Only then relabel the buttons: header "Early access" → "Get the app" (all pages), hero "Get early access" →
  "Get it on the App Store", `card.html` "Get early access" → "Get Birdies & Bets". Until the listing is live they
  must not promise a download.
- Keep `privacy.html` wording in sync with what the app actually does; bump the effective date when it changes.

## Emails

`emails/` holds the templates for launch-news emails (footer with the unsubscribe link), the newsletter sign-up wording,
and the Supabase sign-in code email, plus the anti-spam rules (CASL, CAN-SPAM). It isn't published. See `emails/README.md`.

## Data requests

`docs/data-requests.md` is the runbook for emailed requests to delete, see or correct someone's data: identity check,
the Supabase steps, reply wording and the 30-day deadline. It isn't published; the public page is `delete-account.html`.

## App screens

`assets/img/*.png` are produced from `../Birdies & Bets mobile UI/screens/{light,dark}` at 640 px wide.
To regenerate after the mockups change, run from `../birdies-and-bets` (it has `sharp` installed):

```
node -e "const s=require('sharp'),p=require('path');const src='../Birdies & Bets mobile UI/screens',out='../website/assets/img';(async()=>{for(const m of ['light','dark'])for(const n of ['01-home','05a-scorecard-hole','05b-scorecard-full','06-standings','07-summary'])await s(p.join(src,m,n+'.png')).resize({width:640}).png({compressionLevel:9,palette:true}).toFile(p.join(out,n+'-'+m+'.png'))})()"
```
