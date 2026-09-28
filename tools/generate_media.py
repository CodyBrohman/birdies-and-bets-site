#!/usr/bin/env python3
"""Generate the site's hero video and photographs with the Higgsfield API.

Standard library only. Needs a Higgsfield API key pair (console.higgsfield.ai):

    set HF_API_KEY_ID=...      set HF_API_KEY_SECRET=...      (Windows cmd)
    $env:HF_API_KEY_ID='...';  $env:HF_API_KEY_SECRET='...'   (PowerShell)
    export HF_KEY='id:secret'                                  (bash, single var)

Then, from the website/ folder:

    python tools/generate_media.py            # generates only what is missing
    python tools/generate_media.py --force    # regenerate everything
    python tools/generate_media.py --only hero-still hero-loop
    python tools/generate_media.py --dry-run  # print the plan, spend nothing

Outputs land in assets/media/. Approximate cost with the defaults: four stills at
fractions of a cent each plus one 10s Kling 2.5 Turbo standard clip (~$1).
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.higgsfield.ai"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "media"))

NEGATIVE = "text, letters, watermark, logo, caption, signage, people faces close-up, cartoon, low quality, blurry, oversaturated"

JOBS = [
    {
        "name": "hero-still",
        "kind": "image",
        "path": "/higgsfield-ai/soul/standard",
        "ext": "jpg",
        "body": {
            "prompt": (
                "Cinematic wide photograph of an empty golf green at dusk, low warm sun behind distant trees, "
                "long shadows across closely mown grass, a single flagstick catching amber light, mist in the "
                "hollows, dark moody colour grade, deep blacks, editorial photography, shot on medium format, "
                "no people, no text"
            ),
            "aspect_ratio": "16:9",
            "resolution": "2K",
            "num_images": 1,
        },
    },
    {
        "name": "hero-loop",
        "kind": "video",
        "path": "/kling-video/v2.5-turbo/standard/image-to-video",
        "ext": "mp4",
        "from_image": "hero-still",
        "body": {
            "prompt": (
                "Very slow forward dolly across the green toward the flag, grass blades swaying gently in a light "
                "breeze, mist drifting, the flag stirring, warm light slowly shifting, calm and cinematic, seamless "
                "loop, no people, no text"
            ),
            "duration": 10,
            "cfg_scale": 0.5,
            "negative_prompt": NEGATIVE + ", fast motion, camera shake, people",
        },
    },
    {
        "name": "texture-green",
        "kind": "image",
        "path": "/higgsfield-ai/soul/standard",
        "ext": "jpg",
        "body": {
            "prompt": (
                "Extreme macro photograph of a putting green surface at golden hour, individual blades of mown "
                "bentgrass, dew, shallow depth of field, dark shadows, warm rim light, abstract texture, no text"
            ),
            "aspect_ratio": "3:2",
            "resolution": "2K",
            "num_images": 1,
        },
    },
    {
        "name": "group-19th",
        "kind": "image",
        "path": "/higgsfield-ai/soul/standard",
        "ext": "jpg",
        "body": {
            "prompt": (
                "Documentary photograph of four friends at a wooden clubhouse table at dusk after a round of golf, "
                "laughing, seen from behind and the side so faces are turned away or softly out of focus, golf caps, "
                "a scorecard and glasses on the table, warm tungsten light, dark background, candid, film grain, "
                "no text, no logos"
            ),
            "aspect_ratio": "4:5",
            "resolution": "2K",
            "num_images": 1,
        },
    },
]


def auth_header():
    pair = os.environ.get("HF_KEY")
    if not pair:
        kid = os.environ.get("HF_API_KEY_ID") or os.environ.get("HF_API_KEY")
        sec = os.environ.get("HF_API_KEY_SECRET") or os.environ.get("HF_API_SECRET")
        if kid and sec:
            pair = f"{kid}:{sec}"
    if not pair or ":" not in pair:
        sys.exit("No Higgsfield key. Set HF_API_KEY_ID and HF_API_KEY_SECRET (or HF_KEY='id:secret').")
    return f"Key {pair}"


def request(method, url, body=None, headers=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json" if not raw else "*/*")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            payload = r.read()
            return payload if raw else json.loads(payload.decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise SystemExit(f"HTTP {e.code} for {method} {url}\n{detail}")


def submit_and_wait(path, body, auth, label):
    print(f"  submit {path}")
    res = request("POST", API + path, body, {"Authorization": auth})
    status_url = res.get("status_url")
    rid = res.get("request_id")
    if not status_url:
        raise SystemExit(f"Unexpected response: {json.dumps(res)[:500]}")
    print(f"  queued {rid}")
    started = time.time()
    while True:
        time.sleep(4)
        st = request("GET", status_url, None, {"Authorization": auth})
        status = st.get("status")
        elapsed = int(time.time() - started)
        print(f"\r  {label}: {status} ({elapsed}s)", end="", flush=True)
        if status == "completed":
            print()
            return st
        if status in ("failed", "canceled", "nsfw"):
            print()
            raise SystemExit(f"Generation {status}: {st.get('error')}")
        if elapsed > 900:
            print()
            raise SystemExit("Timed out after 15 minutes")


def output_url(st, kind):
    if kind == "image":
        imgs = st.get("images") or []
        return imgs[0]["url"] if imgs else None
    vid = st.get("video") or {}
    return vid.get("url")


def upload_source(local_path):
    """Kling needs a public image_url. We use the just-generated Higgsfield URL,
    stored next to the file in a .url sidecar, so no upload is required."""
    side = local_path + ".url"
    if os.path.exists(side):
        return open(side, encoding="utf-8").read().strip()
    sys.exit(f"Missing {side}; regenerate the still with --force so its hosted URL is recorded.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    auth = None if args.dry_run else auth_header()

    for job in JOBS:
        if args.only and job["name"] not in args.only:
            continue
        dest = os.path.join(OUT, f"{job['name']}.{job['ext']}")
        if os.path.exists(dest) and not args.force:
            print(f"skip {job['name']} (exists)")
            continue
        print(f"{job['name']}: {job['kind']} via {job['path']}")
        if args.dry_run:
            print("  " + json.dumps(job["body"])[:160] + "...")
            continue
        body = dict(job["body"])
        if job.get("from_image"):
            src = os.path.join(OUT, f"{job['from_image']}.jpg")
            body["image_url"] = upload_source(src)
        st = submit_and_wait(job["path"], body, auth, job["name"])
        url = output_url(st, job["kind"])
        if not url:
            raise SystemExit(f"No output url in {json.dumps(st)[:500]}")
        blob = request("GET", url, raw=True)
        with open(dest, "wb") as f:
            f.write(blob)
        with open(dest + ".url", "w", encoding="utf-8") as f:
            f.write(url)
        print(f"  saved {dest} ({len(blob)/1e6:.2f} MB)")

    print("done")


if __name__ == "__main__":
    main()
