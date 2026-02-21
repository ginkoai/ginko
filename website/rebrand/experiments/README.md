# Rebrand Experiments

Visual experiments for the ginko rebrand. Each experiment lives in its own numbered directory.

## Experiments Index

| ID | Name | Status | Description |
|----|------|--------|-------------|
| 001 | [Particles](./001-particles/) | In Progress | IYKY→g particle morph animation with rainbow gradient |

## Running Experiments

Start the dev server from the rebrand directory:

```bash
cd website/rebrand
python3 -m http.server 8889
```

Then open: `http://localhost:8889/experiments/001-particles/particles-prototype.html`

## Creating New Experiments

1. Create a new directory: `experiments/NNN-name/`
2. Add a `README.md` documenting the experiment
3. Update this index

## Terminology

- **Particle Animation**: Canvas 2D + JavaScript physics (what 001 uses)
- **Shader**: GPU programs using WebGL/GLSL for visual effects
- **CSS Animation**: Keyframe-based animations using CSS
