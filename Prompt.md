# Responsive UI Requirements (POS)

This project must follow mobile‑first, responsive design for consistent behavior across 320px → 2xl screens. Use Tailwind utility classes and test at common breakpoints.

## 1) Mobile-First Design
- Start layouts for small screens first (min ~360px width).
- Scale up with Tailwind breakpoints:
  - `sm:` ≥ 640px
  - `md:` ≥ 768px
  - `lg:` ≥ 1024px
  - `xl:` ≥ 1280px
  - `2xl:` ≥ 1536px

## 2) POS Layout Rules
- Products Grid:
  - Always responsive: `grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- Cart Panel:
  - Mobile: collapsible bottom drawer.
  - Tablet/Desktop: fixed right-side panel.
- Sidebar Menu:
  - Mobile: collapsible drawer via hamburger icon.
  - Desktop: fixed left sidebar.

## 3) Typography & Scaling
- Adaptive sizes:
  - Text: `text-sm md:text-base lg:text-lg`
  - Spacing: buttons/cards use `p-2 sm:p-3 lg:p-4`

## 4) Containers
Wrap content with a responsive container to prevent overly wide lines and keep consistent paddings:

```tsx
<div className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6">
  {...content}
</div>
```

## 5) Testing Requirement
- Validate screens at 320px, 768px, 1024px, 1440px.
- No horizontal scrolling; fix overflow issues before merging.

---

## Project-specific notes and quick wins
- Product grid: use the full responsive column scale on POS and product listing pages.
- AppLayout: ensure a `max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6` container is applied to main content so it scales properly on large displays.
- Drawer behavior: implement a mobile drawer for sidebar and cart (tracked as a follow-up task).
- Prefer flex/grid over fixed widths; avoid absolute sizing except for icons/badges.