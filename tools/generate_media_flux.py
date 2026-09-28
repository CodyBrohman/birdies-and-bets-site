#!/usr/bin/env python3
"""Generate the site's photographs locally with FLUX.1-schnell (Apache-2.0, open weights).

Runs on an 8 GB GPU: the transformer is a 4-bit GGUF (~6.8 GB) on the GPU, the T5 text encoder
runs on the CPU in bf16, and the VAE decodes with tiling. No API key, no account.

Setup (once), from website/tools:
    py -3.13 -m venv .venv
    .venv\\Scripts\\python -m pip install torch --index-url https://download.pytorch.org/whl/cu124
    .venv\\Scripts\\python -m pip install "diffusers>=0.33" transformers accelerate gguf sentencepiece protobuf pillow huggingface_hub

Run, from website/:
    tools\\.venv\\Scripts\\python tools\\generate_media_flux.py            # only what is missing
    tools\\.venv\\Scripts\\python tools\\generate_media_flux.py --force    # regenerate all
    tools\\.venv\\Scripts\\python tools\\generate_media_flux.py --only hero-still --seed 7

First run downloads ~17 GB of weights into tools/models/ (kept out of git).
Outputs land in assets/media/ as JPEG. The hero video is not produced here; the page uses the
still with a slow drift plus the contour canvas instead.
"""
import argparse
import gc
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "media"))
MODELS = os.path.join(HERE, "models")
os.environ.setdefault("HF_HOME", MODELS)
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

BASE = "black-forest-labs/FLUX.1-schnell"
GGUF_REPO = "city96/FLUX.1-schnell-gguf"
GGUF_FILE = "flux1-schnell-Q4_K_S.gguf"

JOBS = [
    {
        "name": "hero-still",
        "size": (1344, 768),  # 16:9
        "prompt": (
            "cinematic wide photograph of an empty golf green at dusk, low warm sun behind distant trees, "
            "long shadows across closely mown grass, a single flagstick catching amber light, thin mist in the "
            "hollows, dark moody colour grade, deep blacks, editorial photography, medium format, no people"
        ),
    },
    {
        "name": "texture-green",
        "size": (1152, 768),  # 3:2
        "prompt": (
            "extreme macro photograph of a putting green surface at golden hour, individual blades of mown "
            "bentgrass with dew, shallow depth of field, dark shadows, warm rim light, abstract texture"
        ),
    },
    {
        "name": "group-19th",
        "size": (896, 1120),  # 4:5
        "prompt": (
            "documentary photograph of four friends at a wooden clubhouse table at dusk after a round of golf, "
            "laughing, seen from behind and the side so faces are turned away or softly out of focus, golf caps, "
            "a scorecard and glasses on the table, warm tungsten light, dark background, candid, film grain"
        ),
    },
    {
        "name": "og",
        "size": (1200, 640),
        "prompt": (
            "cinematic photograph of a golf flagstick on a green at blue hour, amber light on the flag, dark "
            "treeline, mist, deep shadows, minimal composition with empty space on the left"
        ),
    },
]


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--steps", type=int, default=4)
    args = ap.parse_args()

    jobs = [j for j in JOBS if not args.only or j["name"] in args.only]
    os.makedirs(OUT, exist_ok=True)
    todo = [j for j in jobs if args.force or not os.path.exists(os.path.join(OUT, j["name"] + ".jpg"))]
    if not todo:
        log("nothing to do (use --force)")
        return

    import torch
    from diffusers import FluxPipeline, FluxTransformer2DModel, GGUFQuantizationConfig
    from huggingface_hub import hf_hub_download
    from transformers import CLIPTextModel, CLIPTokenizer, T5EncoderModel, T5TokenizerFast

    if not torch.cuda.is_available():
        sys.exit("CUDA not available; install the cu124 torch wheel.")
    dev = "cuda"

    # 1. Text encoders on CPU: encode every prompt up front, then free them.
    log("loading text encoders (CPU)")
    tok1 = CLIPTokenizer.from_pretrained(BASE, subfolder="tokenizer")
    enc1 = CLIPTextModel.from_pretrained(BASE, subfolder="text_encoder", torch_dtype=torch.bfloat16)
    tok2 = T5TokenizerFast.from_pretrained(BASE, subfolder="tokenizer_2")
    enc2 = T5EncoderModel.from_pretrained(BASE, subfolder="text_encoder_2", torch_dtype=torch.bfloat16)
    embeds = {}
    with torch.no_grad():
        for j in todo:
            log(f"encoding prompt: {j['name']}")
            t1 = tok1(j["prompt"], padding="max_length", max_length=77, truncation=True, return_tensors="pt")
            pooled = enc1(t1.input_ids, output_hidden_states=False).pooler_output
            t2 = tok2(j["prompt"], padding="max_length", max_length=256, truncation=True, return_tensors="pt")
            pe = enc2(t2.input_ids, output_hidden_states=False)[0]
            embeds[j["name"]] = (pe.to(dev), pooled.to(dev))
    del enc1, enc2
    gc.collect()

    # 2. Transformer as 4-bit GGUF on the GPU.
    log("loading FLUX.1-schnell transformer (GGUF Q4_K_S)")
    gguf_path = hf_hub_download(GGUF_REPO, GGUF_FILE)
    transformer = FluxTransformer2DModel.from_single_file(
        gguf_path, quantization_config=GGUFQuantizationConfig(compute_dtype=torch.bfloat16), torch_dtype=torch.bfloat16
    )
    pipe = FluxPipeline.from_pretrained(
        BASE, transformer=transformer, text_encoder=None, text_encoder_2=None, tokenizer=None, tokenizer_2=None,
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    pipe.vae.enable_slicing()

    for j in todo:
        w, h = j["size"]
        log(f"{j['name']}: {w}x{h}, {args.steps} steps")
        pe, pooled = embeds[j["name"]]
        g = torch.Generator(device="cpu").manual_seed(args.seed)
        img = pipe(
            prompt_embeds=pe, pooled_prompt_embeds=pooled,
            width=w, height=h, num_inference_steps=args.steps, guidance_scale=0.0, generator=g,
        ).images[0]
        dest = os.path.join(OUT, j["name"] + ".jpg")
        img.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
        log(f"saved {dest} ({os.path.getsize(dest)/1e6:.2f} MB)")
        torch.cuda.empty_cache()

    log("done")


if __name__ == "__main__":
    main()
