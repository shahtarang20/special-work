# Skyline Stacker

A responsive block-stacking arcade game (HTML/CSS/JS, no build step) with Google AdSense slots wired in, ready to deploy on Vercel.

## Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
cd special-work
vercel            # first deploy, follow the prompts
vercel --prod     # deploy to your production domain
```

Or connect this git repo to Vercel via the dashboard (New Project → Import) — no config needed, it's a static site.

## Before you go live with AdSense

1. **Apply for AdSense** at https://www.google.com/adsense with your live Vercel URL (or custom domain).
2. Once approved, get your **publisher ID** (`ca-pub-XXXXXXXXXXXXXXXX`) and replace every occurrence of
   `ca-pub-XXXXXXXXXXXXXXXX` in `index.html`.
3. Update `ads.txt` at the project root with your real publisher ID (replace `pub-XXXXXXXXXXXXXXXX`).
4. In your AdSense dashboard, create ad units (Ads → By ad unit → Display ads) for:
   - Top banner
   - Left rail (desktop)
   - Right rail (desktop)
   - Inline (game-over screen)
   - Bottom banner
   Replace each `data-ad-slot="..."` value in `index.html` with the real slot ID.
5. Point your custom domain (if any) at Vercel and add it in AdSense's site list.
6. AdSense generally wants to see genuine content and some traffic before approving a site — keeping
   the privacy policy page (`privacy.html`) linked and having the game playable helps meet their policies.

## Files

- `index.html` — page structure + ad slot placeholders
- `style.css` — responsive styling (phone + laptop)
- `game.js` — game engine (canvas, physics, scoring, sound, localStorage best score)
- `ads.txt` — required by AdSense to verify ad reseller authorization
- `privacy.html` — minimal privacy policy (recommended for AdSense approval)
- `vercel.json` — static hosting config + security headers

## Notes

- Ads only render where you've supplied real IDs — until then, the dashed placeholder boxes will stay
  empty (this is normal and doesn't break the game).
- The desktop side-rail ads auto-hide below 1100px width so they never crowd the game on tablets/phones.
- Sound effects are synthesized with the Web Audio API — no external audio files needed.
