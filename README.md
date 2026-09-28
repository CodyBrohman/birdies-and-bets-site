# Birdies & Bets website

Static marketing site plus the privacy policy and support page for the Birdies & Bets iOS app.
Plain HTML and CSS, no build step, no dependencies.

```
index.html        landing page
privacy.html      privacy policy (linked from the App Store listing)
support.html      support page (linked from the App Store listing)
assets/css/site.css   tokens + layout; colours mirror ../birdies-and-bets/src/theme/tokens.ts
assets/img/       icon, favicon, resized app mockups (light + dark)
```

## Preview

```
python -m http.server 8080
```

Then open http://localhost:8080. Light and dark follow the OS setting.

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

and enable Pages in the repo settings (Source: Deploy from a branch, `main`, `/ (root)`).

The site is then served at https://codybrohman.github.io/birdies-and-bets-site/ and every push to `main` redeploys it.

## Before launch

- Replace the two `#download` links in `index.html` (nav button and hero CTA) with the App Store URL, and swap the email CTA at the bottom for an App Store badge. Search for `TODO`.
- Keep `privacy.html` wording in sync with what the app actually does; bump the effective date when it changes.

## Screenshots

`assets/img/*.png` are produced from `../Birdies & Bets mobile UI/screens/{light,dark}` at 640px wide.
To regenerate after the mockups change, run from `../birdies-and-bets` (it has `sharp` installed):

```
node -e "const s=require('sharp'),p=require('path');const src='../Birdies & Bets mobile UI/screens',out='../website/assets/img';(async()=>{for(const m of ['light','dark'])for(const n of ['01-home','05a-scorecard-hole','05b-scorecard-full','06-standings','07-summary'])await s(p.join(src,m,n+'.png')).resize({width:640}).png({compressionLevel:9,palette:true}).toFile(p.join(out,n+'-'+m+'.png'))})()"
```
