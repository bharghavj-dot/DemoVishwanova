"""
nail_extractor.py
-----------------
Extracts 5 active nail features using OpenCV (CPU).

Active  : nail_brittleness, nail_shape_abnormality, nail_clubbing_ratio,
          nail_pitting_count, nail_ridge_score
"""

import cv2
import numpy as np


# ── helpers ──────────────────────────────────────────────────────────────────

def _segment_nail(img: np.ndarray):
    """
    Returns (nail_mask, nail_contour | None).
    Thresholds on pinkish-skin HSV range, morphs, picks largest contour.
    Falls back to a central crop mask.
    """
    hsv    = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, w   = img.shape[:2]

    # Nail / skin-pink range in HSV
    mask = cv2.inRange(hsv, (0,  10, 100), (25, 210, 255))

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    mask   = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask   = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        fb = np.zeros((h, w), dtype=np.uint8)
        fb[h // 6: 5 * h // 6, w // 6: 5 * w // 6] = 255
        return fb, None

    best_c = max(contours, key=cv2.contourArea)
    result = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(result, [best_c], 255)
    return result, best_c


def _gabor_bank(img_gray: np.ndarray, mask: np.ndarray) -> float:
    """Mean absolute Gabor response over 4 orientations inside mask."""
    responses = []
    for theta in (0.0, np.pi / 4, np.pi / 2, 3 * np.pi / 4):
        k = cv2.getGaborKernel(
            ksize=(21, 21), sigma=4.0, theta=theta,
            lambd=10.0, gamma=0.5, psi=0.0,
        )
        resp = cv2.filter2D(img_gray.astype(np.float32), cv2.CV_32F, k)
        if np.any(mask > 0):
            responses.append(float(np.mean(np.abs(resp[mask > 0]))))
    return float(np.mean(responses)) if responses else 0.0


# ── main extractor ────────────────────────────────────────────────────────────

def extract_nail_features(image_path: str) -> dict:
    """
    Parameters
    ----------
    image_path : str
        Close-up photo of a fingernail (single nail preferred).

    Returns
    -------
    dict with 5 nail feature keys.
    All active values normalised to [0, 1].
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    nail_mask, nail_contour = _segment_nail(img)

    # ── Feature 1: nail_brittleness ──────────────────────────────────────────
    # Brittle nails show high-frequency texture irregularities on the surface.
    # Measure via standard deviation of Laplacian (edge roughness) inside nail.
    gray_f = gray.astype(np.float32)
    lap = cv2.Laplacian(gray_f, cv2.CV_32F)
    if np.any(nail_mask > 0):
        lap_std = float(np.std(lap[nail_mask > 0]))
        # Empirical scale: brittle nails show lap_std ~20-60; healthy ~5-15
        nail_brittleness = float(np.clip(lap_std / 50.0, 0.0, 1.0))
    else:
        nail_brittleness = 0.0

    # ── Feature 2: nail_shape_abnormality (contour vs. fitted ellipse IoU) ───
    if nail_contour is not None and len(nail_contour) >= 5:
        ellipse      = cv2.fitEllipse(nail_contour)
        ell_mask     = np.zeros(gray.shape, dtype=np.uint8)
        cv2.ellipse(ell_mask, ellipse, 255, -1)

        intersection = float(np.logical_and(nail_mask > 0, ell_mask > 0).sum())
        union        = float(np.logical_or (nail_mask > 0, ell_mask > 0).sum())
        iou          = intersection / (union + 1e-6)
        # Halve the penalty so normal shadows don't trigger severe abnormality
        nail_shape_abnormality = float(np.clip((1.0 - iou) / 2.0, 0.0, 1.0))
    else:
        nail_shape_abnormality = 0.0

    # ── Feature 3: nail_clubbing_ratio ───────────────────────────────────────
    # Clubbing: the nail curves downward and the fingertip bulges.
    # Approximate by measuring the aspect ratio (height / width) of the nail
    # bounding rect — clubbed nails have a higher ratio (more rounded/convex).
    if nail_contour is not None:
        x, y, bw, bh = cv2.boundingRect(nail_contour)
        aspect = float(bh) / float(bw + 1e-6)
        # Normal nail aspect ~ 0.3–0.6; clubbed ≈ 0.7–1.0+
        nail_clubbing_ratio = float(np.clip((aspect - 0.5) / 0.5, 0.0, 1.0))
    else:
        nail_clubbing_ratio = 0.0

    # ── Feature 4: nail_pitting_count ────────────────────────────────────────
    # Pits are small depressions on the nail surface. Detect as local dark
    # spots (local minima) inside the nail mask using morphological top-hat.
    if np.any(nail_mask > 0):
        pit_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, pit_kernel)
        blackhat[nail_mask == 0] = 0
        # Threshold to find prominent pits (raised from 25 to 40 to avoid noise)
        _, pit_mask = cv2.threshold(blackhat, 40, 255, cv2.THRESH_BINARY)
        # Count connected components (pits)
        num_labels, _ = cv2.connectedComponents(pit_mask)
        pit_count = max(0, num_labels - 1)   # subtract background label
        # Normalise: Web images have more noise, scale to 200 instead of 30
        nail_pitting_count = float(np.clip(pit_count / 200.0, 0.0, 1.0))
    else:
        nail_pitting_count = 0.0

    # ── Feature 5: nail_ridge_score (Gabor energy) ───────────────────────────
    raw_ridge      = _gabor_bank(gray, nail_mask)
    # Empirical scale: raw gabor energy can reach 1000-2000+ on detailed images
    nail_ridge_score = float(np.clip(raw_ridge / 7000.0, 0.0, 1.0))

    return {
        "nail_brittleness":       nail_brittleness,
        "nail_shape_abnormality": nail_shape_abnormality,
        "nail_clubbing_ratio":    nail_clubbing_ratio,
        "nail_pitting_count":     nail_pitting_count,
        "nail_ridge_score":       nail_ridge_score,
    }


# ── CLI quick-test ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "nail.jpeg"
    feats = extract_nail_features(path)
    print("=== Nail features ===")
    for k, v in feats.items():
        print(f"  {k:<30} {v:.4f}")
