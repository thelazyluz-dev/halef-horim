# החלף הורים — Claude Code Guide

## Project Overview
A humorous React app where kids can "post themselves" for adoption and get matched with fictional parents.
Built with React + Vite. Uses the Anthropic API directly from the browser to generate funny parent profiles and contract clauses.

## Tech Stack
- **React + Vite** (JSX, no TypeScript)
- **Anthropic API** via `fetch` (no SDK — browser direct calls)
- **DiceBear avatars** for fictional parent portraits
- **Canvas API** for signature drawing

## Project Structure
```
src/
  App.jsx       — entire app (single component, all styles inline)
  main.jsx      — entry point
  index.css     — minimal reset only
index.html      — sets lang="he" dir="rtl"
```

## App Flow
1. **form** — child fills in name, age, reason for switching parents, desired parents
2. **loading** — animated search screen with funny status messages
3. **match** — Claude-generated fictional parents with avatars, perks, warning
4. **contract** — official-looking "Parent Transfer Contract" with canvas signature
5. **signed** — confetti + stamp animation, reveal it's a joke

## Anthropic API Usage
The app calls `https://api.anthropic.com/v1/messages` directly from the browser.
Model: `claude-sonnet-4-20250514`
The API key is injected automatically by the Claude.ai artifact environment — no `.env` needed there.

**For local development**, create a proxy or use a backend to avoid exposing the API key.
See `vite.config.js` for proxy setup placeholder.

## Key Component State
```js
step: "form" | "loading" | "match" | "contract" | "signed"
formData: { name, age, reason, wantedParents }
match: { momName, dadName, location, tagline, momDesc, dadDesc, perks[], warning, clause1, clause2, clause3, momAvatar, dadAvatar }
signature: base64 canvas data URL
```

## Claude API Prompt
Returns JSON with: momName, dadName, location, tagline, momDesc, dadDesc, perks (array of 4), warning, clause1, clause2, clause3.
All content is humorous Hebrew, tailored to the child's stated reason and desired parents.

## Styling
All styles are inline JS objects in the `styles` const at the bottom of App.jsx.
Uses Google Fonts: Fredoka One (headings), Rubik (body), IM Fell English (contract).

## Development
```bash
npm install
npm run dev
```

## Known Todos
- Add local dev proxy for Anthropic API key
- Add share button (screenshot of signed contract)
- Support English language toggle
