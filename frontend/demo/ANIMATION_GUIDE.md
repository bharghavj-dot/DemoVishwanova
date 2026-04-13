# Doc Tong — Animation Mechanics Guide

This document explains the technical implementation of the animations used in the Doc Tong landing page.

## 1. Hero Scroll-Driven Frame Animation
The primary animation in the hero section is a **frame-by-frame canvas sequence** that responds to the user's scroll position.

### How it Works:
*   **Frame Data**: There are 192 individual PNG frames (located in `img/ezgif-frame-XXX.png`) that represent a high-resolution 3D animation sequence.
*   **Preloading**: In `script.js`, the `preloadFrames()` function loads all 192 images into an array before the animation begins to ensure smooth playback without flickering.
*   **Sticky Container**: In `style.css`, the `#hero` section is given a large height calculated by `calc(192 * 35px + 100vh)`. This creates a long scrollable area. The `.hero-sticky` class uses `position: sticky; top: 0;` to keep the canvas fixed in the viewport while the user scrolls through this distance.
*   **Scroll Mapping**: 
    - The `onScroll()` function calculates the "scroll progress" (a value from 0 to 1) based on how far the user has scrolled within the `#hero` section.
    - This progress is then mapped to a frame index (0 to 191).
    - `requestAnimationFrame` is used to draw the corresponding image onto the `#hero-canvas` using the Canvas API's `drawImage()` method.
*   **Aspect Ratio Handling**: The `drawFrame()` function calculates a "cover-fit" logic (similar to `object-fit: cover`) to ensure the animation always fills the screen regardless of window proportions.

## 2. Progress Indicator & UI Hints
*   **Hero Progress Bar**: A thin gradient bar at the bottom of the hero section (`#hero-progress-bar`) expands from `0%` to `100%` width as the user scrolls through the animation sequence.
*   **Scroll Hint**: A floating "Scroll to explore" prompt at the bottom of the screen. It uses a CSS `@keyframes float` animation and automatically fades out via the `hidden` class once the user begins scrolling (detected in the `onScroll` handler).

## 3. Intersection Observer Reveals
For the sections below the hero (`How It Works`, `Features`, `Tech Stack`, `Roadmap`), we use a modern **Intersection Observer API** approach for "reveal-on-scroll" effects.

### Implementation:
*   **CSS Setup**: Elements intended to animate are given the `.reveal` class, which sets `opacity: 0` and a `translateY(32px)` transform.
*   **JS Observer**: The `initRevealAnimations()` function creates an `IntersectionObserver` that watches for when these elements enter the viewport.
*   **Trigger**: Once an element becomes visible (threshold set to 0.12), the `.visible` class is added, triggering a CSS transition that fades the element in and slides it up to its natural position.
*   **Staggering**: Many cards use inline CSS variables (e.g., `--delay: 0.12s`) to stagger the animations, creating a "wave" effect as you scroll down.

## 4. Micro-Interactions
*   **Header Transition**: The site header adds a `.scrolled` class via JavaScript when the user scrolls past 40px, increasing its background opacity and adding a subtle shadow for better readability.
*   **Interactive Cards**: Feature and Story cards use CSS `:hover` states with scale transforms, border-color shifts, and glow effects (`box-shadow`) to provide tactile feedback.
*   **Smooth Scroll**: All internal links (e.g., `#features`) use a JavaScript `scrollIntoView({ behavior: 'smooth' })` polyfill for consistent across-browser smoothness.
