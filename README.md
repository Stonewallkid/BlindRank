# BlindRank

A blind ranking game where you rank items one at a time without seeing what's coming next.

**Live:** https://blind-rank.vercel.app

## How to Play

1. Pick a category (Cutest Animals, Best Movies, etc.)
2. Choose ranking size (Top 3, 5, 10, or 15 after unlocking)
3. Items appear one at a time - place them where you think they belong
4. After placing all items, re-rank them now that you've seen everything
5. See your Vibe Check score - how well your blind picks matched your true preferences

## Features

- 70+ categories across 4 content tiers (Kids, Teen, Mature, 18+)
- GOAT slot appears as a surprise every 5th game
- Swap tokens: earn 1 every 20 games to swap an item during play
- Top 15 ranking unlocks after 15 games played
- Community rankings stored in Supabase
- Dark/light theme

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build tools)
- Supabase for community rankings database
- Hosted on Vercel

## Development

```bash
# Run locally
open index.html

# Or use a local server
npx serve .
```

## Deploy

Push to `main` branch - Vercel auto-deploys.

```bash
git add . && git commit -m "your message" && git push
```
