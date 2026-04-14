"""
eye_extractor.py
----------------
Extracts 5 active eye features using OpenCV (CPU).

Active  : eye_sclera_yellow, eye_conjunctiva_pallor, eye_cornea_clarity,
          eye_pupil_symmetry, eye_discharge_present
"""

import cv2
import numpy as np


# ── helpers ──────────────────────────────────────────────────────────────────

def _detect_iris(gray: np.ndarray, img: np.ndarray):
    """
    Returns (cx, cy, cr) of the primary iris/eye circle.
    Falls back to image centre if HoughCircles finds nothing.
    """
    h, w = gray.shape
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=h // 4,
        param1=100,
        param2=30,
        minRadius=max(15, h // 8),
        maxRadius=h // 3,
    )
    if circles is not None:
        c = np.round(circles[0, 0]).astype(int)
        return int(c[0]), int(c[1]), int(c[2]), circles
    return w // 2, h // 2, min(h, w) // 5, None


def _build_sclera_mask(shape, cx, cy, cr):
    """Ring mask: sclera is outside iris but inside 1.6× radius."""
    m = np.zeros(shape[:2], dtype=np.uint8)
    cv2.circle(m, (cx, cy), int(cr * 1.6), 255, -1)
    cv2.circle(m, (cx, cy), cr,             0,   -1)   # cut iris out
    return m


def _apply_clahe(img: np.ndarray) -> np.ndarray:
    """
    Normalize uneven lighting via CLAHE on the L channel of LAB color space.
    This makes color-based features (sclera yellow, conjunctiva pallor) more
    consistent across different phone cameras and lighting conditions.
    """
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge([l, a, b])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


# ── main extractor ────────────────────────────────────────────────────────────

def extract_eye_features(image_path: str) -> dict:
    """
    Parameters
    ----------
    image_path : str
        Close-up photo of ONE eye (or a face photo; iris detection adapts).

    Returns
    -------
    dict with 5 eye feature keys.
    All active values normalised to [0, 1].
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    img = _apply_clahe(img)  # normalize lighting before feature extraction

    gray    = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv     = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    ycrcb   = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    h, w    = img.shape[:2]

    cx, cy, cr, raw_circles = _detect_iris(gray, img)
    sclera_mask = _build_sclera_mask(img.shape, cx, cy, cr)
    iris_mask   = np.zeros(gray.shape, dtype=np.uint8)
    cv2.circle(iris_mask, (cx, cy), cr, 255, -1)

    # ── Feature 1: eye_sclera_yellow (YCrCb Cb; low Cb = yellow) ─────────────
    cb_ch = ycrcb[:, :, 2].astype(float)          # Cb channel
    if np.any(sclera_mask > 0):
        mean_cb = float(np.mean(cb_ch[sclera_mask > 0]))
        # Cb for neutral white ≈ 130; drops sharply toward yellow (<110)
        # Scaled so that Cb=130 -> 0.0 (healthy) and Cb=100 -> 1.0 (severe jaundice)
        eye_sclera_yellow = float(np.clip((130.0 - mean_cb) / 30.0, 0.0, 1.0))
    else:
        eye_sclera_yellow = 0.0

    # ── Feature 2: eye_conjunctiva_pallor ─────────────────────────────────────
    # Use a thin horizontal strip just below the iris where inner eyelid is visible
    strip_y1 = min(h - 1, cy + cr)
    strip_y2 = min(h,     cy + cr + max(8, cr // 5))
    strip_x1 = max(0, cx - cr)
    strip_x2 = min(w, cx + cr)

    if strip_y1 < strip_y2 and strip_x1 < strip_x2:
        strip_hsv = hsv[strip_y1:strip_y2, strip_x1:strip_x2]
        mean_s    = float(np.mean(strip_hsv[:, :, 1])) / 255.0
        # If mean_s ~0.4 (pinkish), pallor ~0.0. If mean_s ~0.1 (pale/shadow), pallor ~0.6.
        eye_conjunctiva_pallor = float(np.clip((0.4 - mean_s) * 2.0, 0.0, 1.0))
    else:
        eye_conjunctiva_pallor = 0.5      # neutral default

    # ── Feature 3: eye_cornea_clarity (Laplacian sharpness in iris region) ────
    gray_f  = gray.astype(np.float32)
    lap     = cv2.Laplacian(gray_f, cv2.CV_32F)
    if np.any(iris_mask > 0):
        lap_var = float(np.var(lap[iris_mask > 0]))
        # Higher variance = sharper = clearer cornea
        eye_cornea_clarity = float(np.clip(lap_var / (lap_var + 800.0), 0.0, 1.0))
    else:
        eye_cornea_clarity = 0.5

    # ── Feature 4: eye_pupil_symmetry ─────────────────────────────────────────
    if raw_circles is not None and len(raw_circles[0]) >= 2:
        # Two iris circles detected (left + right eye in a face shot)
        c0 = raw_circles[0][0]
        c1 = raw_circles[0][1]
        r_a, r_b = float(c0[2]), float(c1[2])
        eye_pupil_symmetry = float(np.clip(min(r_a, r_b) / (max(r_a, r_b) + 1e-6), 0.0, 1.0))
    else:
        # Single circle: measure its own circularity via ellipse fit
        ring = np.zeros(gray.shape, dtype=np.uint8)
        cv2.circle(ring, (cx, cy), cr, 255, 2)
        cnts, _ = cv2.findContours(ring, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if cnts and len(cnts[0]) >= 5:
            ell = cv2.fitEllipse(cnts[0])
            a, b = ell[1]
            eye_pupil_symmetry = float(np.clip(min(a, b) / (max(a, b) + 1e-6), 0.0, 1.0))
        else:
            eye_pupil_symmetry = 1.0

    # ── Feature 5: eye_discharge_present ──────────────────────────────────────
    # Eye discharge (mucus/pus) appears as yellowish-white material
    # concentrated at the medial canthus (inner corner) of the eye.
    # We look for low-saturation, high-value, slightly yellow-shifted pixels
    # in the region to the left of the iris (medial side).
    # Build a medial canthus ROI: horizontal strip from image left edge to iris
    mc_x1 = max(0, cx - int(cr * 2.0))
    mc_x2 = max(0, cx - cr)
    mc_y1 = max(0, cy - cr // 2)
    mc_y2 = min(h, cy + cr // 2)

    if mc_x1 < mc_x2 and mc_y1 < mc_y2:
        mc_hsv = hsv[mc_y1:mc_y2, mc_x1:mc_x2]
        # Discharge: low-to-mid saturation, high value, hue in yellow range (15-35)
        discharge_mask = (
            (mc_hsv[:, :, 0] >= 10) & (mc_hsv[:, :, 0] <= 40) &   # yellow-ish hue
            (mc_hsv[:, :, 1] < 120) &                               # not vivid
            (mc_hsv[:, :, 2] > 150)                                 # bright
        )
        total_mc_pix = max(1, mc_hsv.shape[0] * mc_hsv.shape[1])
        discharge_frac = float(np.sum(discharge_mask)) / float(total_mc_pix)
        # Scale: 0-10% discharge pixels → [0, 1]
        eye_discharge_present = float(np.clip(discharge_frac * 10.0, 0.0, 1.0))
    else:
        # Also check the lateral canthus (right side) as fallback
        lc_x1 = min(w, cx + cr)
        lc_x2 = min(w, cx + int(cr * 2.0))
        if lc_x1 < lc_x2 and mc_y1 < mc_y2:
            lc_hsv = hsv[mc_y1:mc_y2, lc_x1:lc_x2]
            discharge_mask = (
                (lc_hsv[:, :, 0] >= 10) & (lc_hsv[:, :, 0] <= 40) &
                (lc_hsv[:, :, 1] < 120) &
                (lc_hsv[:, :, 2] > 150)
            )
            total_lc_pix = max(1, lc_hsv.shape[0] * lc_hsv.shape[1])
            discharge_frac = float(np.sum(discharge_mask)) / float(total_lc_pix)
            eye_discharge_present = float(np.clip(discharge_frac * 10.0, 0.0, 1.0))
        else:
            eye_discharge_present = 0.0

    return {
        "eye_sclera_yellow":      eye_sclera_yellow,
        "eye_conjunctiva_pallor": eye_conjunctiva_pallor,
        "eye_cornea_clarity":     eye_cornea_clarity,
        "eye_pupil_symmetry":     eye_pupil_symmetry,
        "eye_discharge_present":  eye_discharge_present,
    }


# ── CLI quick-test ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "eye.jpeg"
    f = extract_eye_features(path)
    for k, v in f.items():
        print(f"  {k:<30} {v:.4f}")
