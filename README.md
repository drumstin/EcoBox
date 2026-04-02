# EcoBox

EcoBox is a mobile-first, web-based idle frog terrarium game.

## Current features

- 32-bit-style frog habitat presentation
- Frog, cricket, and pill bug ecosystem loop
- Droppings, cleanup behavior, and fungus growth
- Cricket farm popup with breeder boxes
- Multi-buy quick actions
- Local save support

## Local workflow

This is a static web app. Open `index.html` directly or serve it with any static server.

### Cache busting for Pages

Before pushing releases, stamp the current git revision into asset URLs:

```bash
bash scripts/stamp-assets.sh
```

This updates `index.html` so browsers fetch the latest `style.css` and `src/main.js` after deploys.
