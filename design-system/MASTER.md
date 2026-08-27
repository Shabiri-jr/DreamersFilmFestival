# Dreamers Pass Design System

Query: `African cinematic cultural premium modern film festival ticketing mobile-first`

## Product Pattern
Optimize for fast capture, safe areas, one-handed operation, persistent state, and large touch targets.

Avoid: Tiny icon-only controls near screen edges.

## Visual Style
Premium luxury: Use restrained palettes, excellent photography, elegant type, high whitespace, and precise alignment.

Avoid: Heavy gradients and generic stock imagery.

## Color System
The supplied festival posters override generic product defaults. Use burnt orange `#E84B16`, charcoal `#17120F`, deep green `#086544`, warm cream `#F3EAD8`, paper `#FFF7E7`, restrained red `#A91F14`, and golden accent `#EAA42C`.

Avoid: Generic blue SaaS palettes, neon cyberpunk color, excessive glass, and pure black.

## Typography
Use Barlow Condensed for cinematic display type and Manrope for readable body/UI copy. Load through `next/font`, keep body text at least 16px on mobile, and preserve system fallbacks and text scaling.

Avoid: Inter, Arial, generic default type, or condensed body copy.

## Layout And Conversion Pattern
Lead with product name or category, visible product signal, one CTA, and social proof near the first viewport.

Avoid: Abstract gradient hero with no product evidence.

## UX Priorities
- Responsive: Design mobile-first, prevent horizontal scroll, increase gutters on larger screens, and keep text measure readable.
- Touch targets: Use 44px or larger tap areas and keep at least 8px between adjacent targets.
- Reduced motion: Respect `prefers-reduced-motion` and keep core information available without animation.
- Loading feedback: Show skeletons for slower loading, reserve space, and make async buttons visibly busy.
- Focus states: Keep visible focus rings on all interactive controls and align tab order with visual order.

## Data Visualization
Bar chart: Use for category comparison. Horizontal bars work well on mobile or for long labels.

Avoid: Rotated labels that are hard to read.

## Implementation Rules
- Use semantic tokens for colors, spacing, radius, shadows, and state colors.
- Use African geometric motifs as low-opacity structure, never as a readability-obscuring texture.
- Keep customer pages cinematic; keep future operational pages calmer and denser.
- Use local festival imagery with explicit dimensions and Next Image optimization.
- Keep touch targets at least 44px and preserve keyboard focus visibility.
- Reserve space for async content, images, and charts.
- Test small mobile width, tablet width, desktop width, dark mode, and reduced motion when relevant.
- Use one icon family and label icon-only controls.
