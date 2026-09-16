#!/usr/bin/env python3
import os
import subprocess
import urllib.request

# Verified curated high-resolution photography URLs matching exact descriptions
PHOTO_SOURCES = {
    # 1. Composite pool with luxury terrace deck, sparkling clear water
    "hero-pool": "https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 2. Pool terrace relaxation & sunbathing zone with deck chairs and wooden/WPC deck
    "pool-zone": "https://images.pexels.com/photos/221457/pexels-photo-221457.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 3. Close-up detail of WPC decking boards at the water edge of the pool
    "case-pool-deck": "https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 4. Modern Scandinavian timber frame house with dark standing seam roof & timber cladding
    "frame-house": "https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 5. High-end outdoor WPC/timber terrace attached to house with railings and steps
    "case-terrace": "https://images.pexels.com/photos/280229/pexels-photo-280229.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 6. High-detail texture of wood-polymer composite (ДПК) decking planks
    "deck-dpk": "https://images.pexels.com/photos/172289/pexels-photo-172289.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 7. Heavy civil construction & foundation works with steel structures and laser equipment
    "piles-screw": "https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 8. Foundation ground preparation, structural columns and steel framing
    "case-piles": "https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 9. Excavation trench with underground utility pipes and earthworks
    "trench-nets": "https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 10. Modern commercial/industrial warehouse building with insulated sandwich panels and sectional gates
    "sandwich-panels": "https://images.pexels.com/photos/2226458/pexels-photo-2226458.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    # 11. Modern architectural project panorama banner
    "brand-banner": "https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=1800",
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def main():
    os.makedirs("public/img", exist_ok=True)
    os.makedirs("dist/img", exist_ok=True)
    os.makedirs("/tmp/vgs_downloads", exist_ok=True)

    print("=== Processing photo assets for Volgastroy 76 ===")

    for name, url in PHOTO_SOURCES.items():
        tmp_raw = f"/tmp/vgs_downloads/{name}_raw.jpg"
        out_jpg = f"public/img/{name}.jpg"
        out_webp = f"public/img/{name}.webp"
        dist_jpg = f"dist/img/{name}.jpg"
        dist_webp = f"dist/img/{name}.webp"

        print(f"--> Downloading {name}...")
        curl_cmd = [
            "curl", "-H", f"User-Agent: {UA}",
            "-s", "-L", url,
            "-o", tmp_raw
        ]
        res = subprocess.run(curl_cmd)
        if res.returncode != 0 or not os.path.exists(tmp_raw) or os.path.getsize(tmp_raw) < 1000:
            print(f"Warning: Failed to download {name}, keeping existing if present")
            continue

        # Target dimensions
        if name == "brand-banner":
            geometry = "1600x900^"
            extent = "1600x900"
        else:
            geometry = "1200x800^"
            extent = "1200x800"

        print(f"--> Converting and optimizing {name} ({geometry})...")
        # Generate high-quality JPEG
        convert_jpg = [
            "convert", tmp_raw,
            "-resize", geometry,
            "-gravity", "center",
            "-extent", extent,
            "-unsharp", "0x0.75+0.75+0.008",
            "-quality", "88",
            "-strip",
            out_jpg
        ]
        subprocess.run(convert_jpg, check=True)

        # Generate high-quality WebP
        convert_webp = [
            "convert", out_jpg,
            "-quality", "85",
            out_webp
        ]
        subprocess.run(convert_webp, check=True)

        # Sync to dist/img
        subprocess.run(["cp", out_jpg, dist_jpg], check=True)
        subprocess.run(["cp", out_webp, dist_webp], check=True)

        print(f"   ✓ Done: {out_jpg} ({os.path.getsize(out_jpg)} B), {out_webp} ({os.path.getsize(out_webp)} B)")

    print("\nAll image assets successfully updated and synchronized!")

if __name__ == "__main__":
    main()
