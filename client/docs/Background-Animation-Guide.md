# Background Animation Guide (Simple English)

This short guide explains the background animations used in the client app: what they are, how they work, and where they live in the code.

## What animations exist?

There are two main background effects used in the login page area:

1) Soft "blob" shapes that slowly morph and move
- Purpose: create a soft, modern glow behind the form
- Where defined: `src/styles/login.css` (`@keyframes blob`)
- Where used: `src/pages/SimpleLogin.tsx` (three absolutely-positioned colored circles)

2) Tiny floating particles
- Purpose: add subtle depth and movement
- Where defined: `src/index.css` (`@keyframes float`)
- Where used: `src/pages/SimpleLogin.tsx` (rendered in a loop with different positions/delays)

## How does the blob animation work?

- CSS keyframes named `blob` are defined in `login.css`:
  - 0%: element is at the original position and normal size
  - 33%: element moves a bit and scales up slightly
  - 66%: element moves to another spot and scales down slightly
  - 100%: returns to the original position and size
- Any element with class `animate-blob` runs `animation: blob 7s infinite` (it repeats forever).
- We apply this class to three large, blurred, colored circles. Each has a different start delay (0s, 2s, 4s) so they don’t all move together.
- Visual tricks to make it glow:
  - `mix-blend-multiply` blends colors
  - `filter: blur(...)` softens edges
  - semi-transparent colors (like purple/yellow/pink) let colors overlap nicely

Snippet (Simplified)
```
// login.css
@keyframes blob {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(30px, -50px) scale(1.1); }
  66%  { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0, 0) scale(1); }
}

.animate-blob { animation: blob 7s infinite; }
```

```
// SimpleLogin.tsx (excerpt)
<div className="fixed inset-0 pointer-events-none">
  <div className="absolute ... bg-purple-300 blur-xl opacity-70 animate-blob" />
  <div className="absolute ... bg-yellow-300 blur-xl opacity-70 animate-blob animation-delay-2000" />
  <div className="absolute ... bg-pink-300   blur-xl opacity-70 animate-blob animation-delay-4000" />
</div>
```

## How do the floating particles work?

- CSS keyframes named `float` are defined in `src/index.css`:
  - 0% -> 50% -> 100% move the dot up and back down
- In React, we generate a small array of particle configs (position, speed, delay) using `useMemo` to keep them stable.
- Each particle is a tiny div with a circular shape and `animation: float ...`.

Snippet (Simplified)
```
// index.css
@keyframes float {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
}
```

```
// SimpleLogin.tsx (excerpt)
const particles = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
  id: `particle-${i}`,
  left: Math.random() * 100,
  top: Math.random() * 100,
  duration: 15 + i * 2,
  delay: i * 0.5,
})), []);

<div className="fixed inset-0 pointer-events-none">
  {particles.map(p => (
    <div
      key={p.id}
      className="absolute w-2 h-2 bg-white rounded-full opacity-30"
      style={{ left: `${p.left}%`, top: `${p.top}%`, animation: `float ${p.duration}s linear infinite`, animationDelay: `${p.delay}s` }}
    />
  ))}
</div>
```

## How is it "installed" or included?

- Stylesheets are imported globally:
  - `src/main.tsx` imports `./styles/theme.css` and `./index.css`
  - Pages/components can import extra CSS, e.g., `SimpleLogin.tsx` relies on `login.css` (ensure this file is imported somewhere; if not, import it in `SimpleLogin.tsx` or in a global entry)
- The animations are pure CSS + simple React markup—no extra npm packages are required.
- Build tool: Vite bundles CSS automatically; you don’t need to configure anything special.

## How to reuse the effect on another page

- For blobs:
  1. Ensure `login.css` (with the `@keyframes blob`) is imported (either globally or in that page).
  2. Add a container positioned over the entire page: `fixed inset-0 pointer-events-none`.
  3. Place 2–3 absolutely positioned colored circles with classes:
     - `rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob`
     - Use different positions and add `animation-delay-2000` / `animation-delay-4000` for variety.

- For particles:
  1. Ensure `@keyframes float` exists (it is in `index.css`).
  2. Render several small circles (2–3px) and apply inline `animation: float ...` with varying durations/delays.

## Performance tips

- Keep the number of blobs small (2–3 is plenty).
- Prefer `filter: blur()` and transforms over heavy shadows.
- Avoid large re-renders: use `useMemo` for particle configs.
- Test on low-end devices—reduce blur and particle count if needed.

## Quick checklist

- [ ] `login.css` imported (for blob keyframes and helpers)
- [ ] `index.css` has `@keyframes float` (for particles)
- [ ] Background layers are `pointer-events-none` so they don’t block clicks
- [ ] Colors are semi-transparent to blend nicely (`opacity-70` works well)
- [ ] Animations run with `animation: ... infinite` and optional delays

That’s it! The background is just a few blurred circles moving (blobs) plus tiny dots that float up and down (particles). Simple, lightweight, and easy to reuse.