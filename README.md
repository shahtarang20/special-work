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

## AdSense status

Publisher ID `ca-pub-5841910105267784` is already wired into:
- the AdSense loader script and every `data-ad-client` in `index.html`
- the `google-adsense-account` verification meta tag in `<head>`
- `ads.txt`

To finish going live:

1. In Google AdSense, verify the site (Sites → special-work.vercel.app → Verify site ownership) —
   the meta tag / ads.txt method will pass automatically since both are already deployed.
2. Once the site is approved, create real ad units (Ads → By ad unit → Display ads) for:
   - Top banner
   - Left rail (desktop)
   - Right rail (desktop)
   - Inline (game-over screen)
   - Bottom banner
   Replace each placeholder `data-ad-slot="..."` value in `index.html` with the real slot ID.
3. If you attach a custom domain in Vercel, also add that domain in AdSense's site list and re-verify.

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
