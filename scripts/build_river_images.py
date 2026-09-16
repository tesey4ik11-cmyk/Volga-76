#!/usr/bin/env python3
import os
import subprocess

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Curated simpler, river-bank / Volga-focused authentic photos
PEXELS_BASE = "https://images.pexels.com/photos"

IMAGE_PLAN = {
    # 1. Panorama of the Volga River: wide peaceful river waters, green grassy riverbank, Russian landscape
    "brand-banner": {
        "type": "local",
        "path": "/tmp/volga_tree.jpg",
        "fallback_url": f"{PEXELS_BASE}/1438832/pexels-photo-1438832.jpeg?auto=compress&cs=tinysrgb&w=1800",
        "geom": "1600x900^",
        "extent": "1600x900"
    },
    # 2. Modest wooden frame house directly on the river bank, calm water reflection, simple cozy architecture (135 m²)
    "frame-house": {
        "type": "url",
        "url": f"{PEXELS_BASE}/1438832/pexels-photo-1438832.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 3. Modest private cottage pool with wooden/composite deck on a green lawn
    "hero-pool": {
        "type": "url",
        "url": f"{PEXELS_BASE}/261187/pexels-photo-261187.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 4. Relaxation deck zone with loungers by pool / water
    "pool-zone": {
        "type": "url",
        "url": f"{PEXELS_BASE}/221457/pexels-photo-221457.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 5. Detail of WPC terrace boards at the edge of the pool water
    "case-pool-deck": {
        "type": "url",
        "url": f"{PEXELS_BASE}/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 6. Cozy wooden terrace with steps and railing overlooking green garden/water
    "case-terrace": {
        "type": "url",
        "url": f"{PEXELS_BASE}/280229/pexels-photo-280229.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 7. Clean macro texture of parallel WPC composite decking planks
    "deck-dpk": {
        "type": "url",
        "url": f"{PEXELS_BASE}/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 8. Real Russian screw piles (Винтовые сваи) for country cottage foundation
    "piles-screw": {
        "type": "local",
        "path": "/tmp/vint_svai.jpg",
        "fallback_url": "https://upload.wikimedia.org/wikipedia/commons/a/a4/%D0%92%D0%B8%D0%BD%D1%82%D0%BE%D0%B2%D1%8B%D0%B5_%D1%81%D0%B2%D0%B0%D0%B8.jpg",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 9. Foundation site layout with steel supports and neat ground preparation
    "case-piles": {
        "type": "url",
        "url": f"{PEXELS_BASE}/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 10. Modest country trench with utility pipes in grass/soil for suburban cottage
    "trench-nets": {
        "type": "url",
        "url": f"{PEXELS_BASE}/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    },
    # 11. Modest private workshop / garage / hangar from sandwich panels (15x12 m scale)
    "sandwich-panels": {
        "type": "url",
        "url": f"{PEXELS_BASE}/175039/pexels-photo-175039.jpeg?auto=compress&cs=tinysrgb&w=1600",
        "geom": "1200x800^",
        "extent": "1200x800"
    }
}

def main():
    os.makedirs("/tmp/vgs_river_raw", exist_ok=True)
    os.makedirs("public/img", exist_ok=True)
    os.makedirs("dist/img", exist_ok=True)

    print("=== Generating simpler, river/Volga-oriented image assets ===")

    for name, item in IMAGE_PLAN.items():
        raw_file = f"/tmp/vgs_river_raw/{name}_raw.jpg"
        out_jpg = f"public/img/{name}.jpg"
        out_webp = f"public/img/{name}.webp"
        dist_jpg = f"dist/img/{name}.jpg"
        dist_webp = f"dist/img/{name}.webp"

        # Step 1: acquire raw file
        if item["type"] == "local" and os.path.exists(item["path"]):
            raw_file = item["path"]
        else:
            url = item.get("url") or item.get("fallback_url")
            print(f"--> Fetching {name} from {url}...")
            curl_cmd = [
                "curl", "-H", f"User-Agent: {UA}",
                "-s", "-L", url,
                "-o", raw_file
            ]
            subprocess.run(curl_cmd, check=True)

        if not os.path.exists(raw_file) or os.path.getsize(raw_file) < 500:
            print(f"Error: {raw_file} is empty or missing, skipping.")
            continue

        geom = item["geom"]
        extent = item["extent"]
        print(f"--> Optimizing {name} to {extent}...")

        # Convert to high-quality JPEG
        convert_jpg = [
            "convert", raw_file,
            "-resize", geom,
            "-gravity", "center",
            "-extent", extent,
            "-unsharp", "0x0.75+0.75+0.008",
            "-quality", "88",
            "-strip",
            out_jpg
        ]
        subprocess.run(convert_jpg, check=True)

        # Convert to WebP
        convert_webp = [
            "convert", out_jpg,
            "-quality", "85",
            out_webp
        ]
        subprocess.run(convert_webp, check=True)

        # Copy to dist/img
        subprocess.run(["cp", out_jpg, dist_jpg], check=True)
        subprocess.run(["cp", out_webp, dist_webp], check=True)

        print(f"   ✓ Generated: {out_jpg} ({os.path.getsize(out_jpg)} bytes)")

    print("\n=== All river-oriented assets successfully generated and synced! ===")

if __name__ == "__main__":
    main()
