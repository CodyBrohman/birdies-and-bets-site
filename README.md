# Birdies & Bets website

Marketing site plus the privacy policy and support page for the Birdies & Bets iOS app.
Plain HTML, CSS and a little JavaScript. No build step. GSAP is loaded from cdnjs for the motion.

```
index.html                landing page
privacy.html              privacy policy (linked from the App Store listing)
support.html              support page (linked from the App Store listing)
assets/css/site.css       design tokens, type, layout
assets/js/site.js         header, hero motion, reveals, carousel, video control, scorecard mock
assets/js/hero-canvas.js  animated contour field used behind the hero when there is no video
assets/img/               icon, favicon, app screens (resized from the mockups)
assets/media/             generated hero video and photographs (see below)
tools/generate_media_flux.py  local FLUX.1-schnell script that produces assets/media/
tools/generate_media.py       optional Higgsfield API script for the hero video
```

## Preview

```
python -m http.server 8080
```

Open http://localhost:8080. The site is dark by design; there is no light theme.

## Generated media

The hero photograph, its Open Graph variant, a green texture and the 19th-hole photograph are
generated locally with FLUX.1-schnell (open weights, Apache-2.0, no account or key). The site works
without them: the hero falls back to the contour animation and the photo tiles use gradients. When
the files exist in `assets/media/`, the page picks them up. The hero photo gets a slow drift in CSS.

Requirements: an NVIDIA GPU with 8 GB or more, ~17 GB of disk for weights, Python 3.13.

```
cd tools
py -3.13 -m venv .venv
.venv\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cu124
.venv\Scripts\python -m pip install "diffusers>=0.33" transformers accelerate gguf sentencepiece protobuf pillow huggingface_hub
cd ..
tools\.venv\Scripts\python tools\generate_media_flux.py            # generates what is missing
tools\.venv\Scripts\python tools\generate_media_flux.py --force    # regenerate all
tools\.venv\Scripts\python tools\generate_media_flux.py --only hero-still --seed 42
```

Weights download into `tools/models/` on first run. Prompts and sizes are at the top of the script.

### Optional: hero video via Higgsfield

`tools/generate_media.py` can produce a 10 s image-to-video loop (`hero-loop.mp4`) through the
Higgsfield API from the still. It needs a funded account and a key pair from console.higgsfield.ai
set as `HF_API_KEY_ID` and `HF_API_KEY_SECRET` (or `HF_KEY='id:secret'`), never committed.
Run `python tools/generate_media.py --only hero-loop` with `HERO_STILL_URL` set to a public URL of `hero-still.jpg` (the GitHub Pages URL once the site is pushed). When the mp4 exists the page plays it
instead of drifting the still. Keep it under ~8 MB (use `duration: 5` in the script if needed).

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

The site is served at https://codybrohman.github.io/birdies-and-bets-site/ and every push to `main` redeploys it.

## Before launch

- Replace the `#download` links in `index.html` (nav button and hero CTA) with the App Store URL and
  swap the email CTA at the bottom for an App Store badge. Search for `TODO`.
- Keep `privacy.html` wording in sync with what the app actually does; bump the effective date when it changes.

## App screens

`assets/img/*.png` are produced from `../Birdies & Bets mobile UI/screens/{light,dark}` at 640 px wide.
To regenerate after the mockups change, run from `../birdies-and-bets` (it has `sharp` installed):

```
node -e "const s=require('sharp'),p=require('path');const src='../Birdies & Bets mobile UI/screens',out='../website/assets/img';(async()=>{for(const m of ['light','dark'])for(const n of ['01-home','05a-scorecard-hole','05b-scorecard-full','06-standings','07-summary'])await s(p.join(src,m,n+'.png')).resize({width:640}).png({compressionLevel:9,palette:true}).toFile(p.join(out,n+'-'+m+'.png'))})()"
```
