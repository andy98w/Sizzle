# Cooking-view rendering

The Matter.js counter used to copy its entire item array into React state on
every engine update. Each sprite then changed `left` and `top` as React rendered.
It also started its runner from two effects; stopping one loop did not reliably
pause the simulation.

Physics now writes sprite transforms through element refs. React still owns
the item list, loading state and controls, but not each simulation frame. One
effect owns the runner and stops it when hidden, paused or reduced motion is
requested. Cleanup removes the engine and mouse listeners.

Ingredients can receive keyboard focus and move with the arrow keys. The
slideshow ignores navigation keys originating in editable fields or ingredient
controls. Reduced-motion users get a static grid, and slideshow navigation skips
the ingredient exit animation. The existing palette and artwork are unchanged.

## Local measurement

On September 11, 2026, a 20-item scene in the Codex in-app browser was measured
after a five-second warm-up, over a five-second sample:

| Implementation | React commits during sample |
| --- | ---: |
| Baseline `8405468` | 301 |
| Ref-based transforms | 0 |

The corrected scene recorded 5,936 style-transform mutations in that sample,
confirming that updates continued. Its in-page checks passed pause and keyboard
movement. The count is development-mode instrumentation, not an FPS, CPU,
production latency or cross-device benchmark. Random initial body positions
were not seeded; no physics-quality or frame-time comparison is inferred.

## Reproduce the current checks

```sh
cd frontend
npm ci --legacy-peer-deps
npm run dev -- --port 3016
```

Open `/physics-lab` and keep it visible for eleven seconds. It uses twenty local
fixture images, requires no backend or generation calls, reports React commits,
then exercises pause and keyboard movement through DOM events. With the browser's
reduced-motion preference enabled before loading, it checks for zero transform
updates instead. This is a focused component check, not a complete accessibility
audit or a full recipe-generation end-to-end test.

The route only mounts the scene in development. Its fixed fixture URL expects
port 3016. CI type-checks the frontend and runs both motion modes through the
browser CLI. No public deployment was made in this pass.
