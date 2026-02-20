# 001: Particle Morph Animation

**Status**: In Progress
**Created**: 2026-02-16
**Type**: Particle Animation (Canvas 2D + JavaScript)

## Overview

Particles morph through the sequence **I → Y → K → Y → g+leaf**, revealing the ginko brand. The final state shows the ginkgo leaf positioned above the rainbow-gradient "g".

## Files

- `particles-prototype.html` - Main animation prototype
- `logo-composer.html` - Tool for positioning leaf on g (used to create the logo asset)

## Assets Used

- `../../assets/yg-leaf-logo.png` - Screenshot of positioned y+g with leaf
- `../../assets/iykyg-leaf.svg` - Original leaf SVG (used in logo-composer)

## Technical Details

- **Particle count**: 3,500
- **Physics**: Spring-based return force with cursor repulsion
- **Colors**: Sunset gradient (yellow → orange → red → violet → purple)
- **Edge weighting**: 70% particles on edges, 30% fill (for crisp letter shapes)

## Configuration

Key parameters in `particles-prototype.html`:

```javascript
particleCount: 3500
particleRadius: 1.8
returnForce: 0.03
damping: 0.92
cursorRadius: 100
cursorForce: 8
morphDuration: 800  // ms
holdTime: 600       // ms between letters
```

## Logo Composer Settings

Final leaf position (saved from logo-composer):
- Leaf X: -23
- Leaf Y: 38
- Leaf Size: 90
- Leaf Rotation: 1

## Running

```bash
cd website/rebrand
python3 -m http.server 8889
```

Open: http://localhost:8889/experiments/001-particles/particles-prototype.html

## Next Steps

- [ ] Polish timing (morph duration, hold times)
- [ ] Consider integration into main rebrand page
- [ ] Explore shader-based version for better performance
