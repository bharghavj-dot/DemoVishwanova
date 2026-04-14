"""
tongue_extractor.py
-------------------
Extracts 5 active tongue features using OpenCV (CPU).

Active  : tongue_pallor, tongue_crack_density, tongue_fur_color,
          tongue_surface_smoothness, tongue_moisture
"""

import cv2
import numpy as np


# ── helpers ──────────────────────────────────────────────────────────────────


def _segment_tongue(img: np.ndarray):
    """
    Returns a binary mask of the tongue region.
    Strategy: HSV red/pink range → morph cleanup → largest contour fill.
    Falls back to a centre-crop mask if nothing is found.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Tongue hue sits in two HSV red wraps: 0-20 and 160-180
    m1 = cv2.inRange(hsv, (0,   40,  60), (20,  255, 255))
    m2 = cv2.inRange(hsv, (160, 40,  60), (180, 255, 255))
    mask = cv2.bitwise_or(m1, m2)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        # fallback: middle half of the image
        h, w = img.shape[:2]
        fallback = np.zeros(img.shape[:2], dtype=np.uint8)
        fallback[h // 4: 3 * h // 4, w // 4: 3 * w // 4] = 255
        return fallback

    best = max(contours, key=cv2.contourArea)
    result = np.zeros(img.shape[:2], dtype=np.uint8)
    cv2.fillPoly(result, [best], 255)
    return result


def _apply_clahe(img: np.ndarray) -> np.ndarray:
    """
    Normalize uneven lighting via CLAHE on the L channel of LAB color space.
    This makes color-based features (pallor, fur_color, moisture) more
    consistent across different phone cameras and lighting conditions.
    """
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge([l, a, b])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


# ── main extractor ────────────────────────────────────────────────────────────

def extract_tongue_features(image_path: str) -> dict:
    """
    Parameters
    ----------
    image_path : str
        Path to a well-lit, close-up tongue photograph.

    Returns
    -------
    dict with 5 tongue feature keys.
    All values normalised to [0, 1].
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    img = _apply_clahe(img)  # normalize lighting before feature extraction

    mask = _segment_tongue(img)
    hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── pixels inside tongue mask ──
    pix_hsv = hsv[mask > 0] if np.any(mask > 0) else hsv.reshape(-1, 3)

    # ── Feature 1: tongue_pallor ──────────────────────────────────────────────
    # Pale tongue → low HSV saturation
    mean_sat = float(np.mean(pix_hsv[:, 1])) / 255.0
    # Map so that normal saturation (~0.6) gives ~0.0 pallor, and low (~0.2) gives ~0.8
    tongue_pallor = float(np.clip((0.6 - mean_sat) * 2.0, 0.0, 1.0))

    # ── Feature 2: tongue_crack_density ───────────────────────────────────────
    # Cracks appear as fine edges on the tongue surface.
    # Use Canny edge detection inside the tongue mask, then compute
    # the fraction of edge pixels relative to total tongue pixels.
    gray_tongue = gray.copy()
    gray_tongue[mask == 0] = 0
    edges = cv2.Canny(gray_tongue, 50, 150)
    edges[mask == 0] = 0            # confine to tongue ROI
    total_tongue_pix = int(np.sum(mask > 0)) or 1
    edge_pix = int(np.sum(edges > 0))
    # Typical crack density range 0–15% of surface; scale up ×6 for [0,1]
    tongue_crack_density = float(np.clip(edge_pix / total_tongue_pix * 6.0, 0.0, 1.0))

    # ── Feature 3: tongue_fur_color ───────────────────────────────────────────
    # Fur / coating colour: healthy tongue coating is thin & white; pathological
    # coatings shift toward yellow (hypothyroidism/liver) or brown.
    # Measure via mean Hue of the low-saturation (coated) pixels inside the mask.
    s_ch = hsv[:, :, 1]
    v_ch = hsv[:, :, 2]
    coating_mask = (mask > 0) & (s_ch < 100) & (v_ch > 120)
    if np.sum(coating_mask) > 10:
        coating_hue = hsv[coating_mask, 0].astype(float)
        mean_hue = float(np.mean(coating_hue))
        # Map hue to [0,1]: 0 = no yellow coating (hue ~0 red), 1 = deep yellow (hue ~30)
        tongue_fur_color = float(np.clip(mean_hue / 45.0, 0.0, 1.0))
    else:
        tongue_fur_color = 0.0

    # ── Feature 4: tongue_surface_smoothness ──────────────────────────────────
    # Low Laplacian variance inside mask → smooth surface
    gray_f = gray.astype(np.float32)
    lap = cv2.Laplacian(gray_f, cv2.CV_32F)
    lap_vals = lap[mask > 0] if np.any(mask > 0) else lap.ravel()
    lap_var  = float(np.var(lap_vals))
    # Sigmoid-like normalisation; 500 is a reasonable mid-point for phone photos
    tongue_surface_smoothness = float(np.clip(1.0 - lap_var / (lap_var + 500.0), 0.0, 1.0))

    # ── Feature 5: tongue_moisture ────────────────────────────────────────────
    # A moist tongue produces specular highlights (bright spots with low
    # saturation and very high value).  We measure the fraction of such
    # pixels inside the tongue mask.  A dry tongue (diabetes, hypothyroidism)
    # will have fewer specular highlights → lower moisture score.
    highlight_mask = (mask > 0) & (s_ch < 60) & (v_ch > 200)
    highlight_frac = float(np.sum(highlight_mask)) / float(total_tongue_pix)
    # Scale: 0-5% specular pixels maps to [0,1]; >5% → clipped to 1.0
    tongue_moisture = float(np.clip(highlight_frac * 20.0, 0.0, 1.0))

    return {
        "tongue_pallor":            tongue_pallor,
        "tongue_crack_density":     tongue_crack_density,
        "tongue_fur_color":         tongue_fur_color,
        "tongue_surface_smoothness": tongue_surface_smoothness,
        "tongue_moisture":          tongue_moisture,
    }


# ── CLI quick-test ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "_tounge.jpeg"
    f = extract_tongue_features(path)
    for k, v in f.items():
        print(f"  {k:<30} {v:.4f}")
