# Page Flip Sound — Implementation Logic

Production SFX for the digital book reader: soft paper sounds on page flips, cover open/close, and End Session rewind.

## Goal

Make page turns feel physical without shipping audio files. Sound must:

- Work after the user’s first click/tap/key (browser autoplay rules)
- Stay pleasant during fast End Session rewind (not a machine-gun)
- Be muteable via localStorage
- Require no `.mp3` / `.wav` assets

## Core module

**File:** `src/services/pageFlipSound.ts`

| Export | Role |
|--------|------|
| `bindPageFlipSoundUnlock()` | One-time listeners; resumes `AudioContext` on first gesture |
| `playPageFlipSound({ mode?, force? })` | Play one flip cue |
| `setPageFlipSoundMuted(true/false)` | Persist mute (`stringstack-reader:flip-sound-muted`) |
| `isPageFlipSoundMuted()` | Read mute state |

### Synthesis (Web Audio API)

Each cue is generated in-memory:

1. **Noise burst** → bandpass filter → paper rustle  
2. **Sine sweep** (high → low) → soft thump as the leaf settles  
3. **Master envelope** → fade in / fade out so cues don’t click

No binary media; no CDN; works offline once the app is loaded.

### Modes

| Mode | When | Volume / length | Rate limit |
|------|------|-----------------|------------|
| `normal` | Reading flips | Fuller (~0.22 peak, ~160ms) | ≥ 90ms between plays |
| `rapid` | End Session rewind + cover shut | Quieter (~0.12 peak, ~110ms) | ≥ 155ms (aligned with ~200ms rewind steps) |
| `force: true` | Cover open/close, mobile End Session jump | Bypasses rate limit once | — |

## Wiring (call sites)

```
BookOpenStage
  └─ bindPageFlipSoundUnlock() on mount

FlipBookReader
  ├─ onFlip (desktop swipe / animated flip)
  │     → playPageFlipSound({ mode: rewinding ? 'rapid' : 'normal' })
  ├─ flipNext / flipPrev fallback (mobile / no animation)
  │     → playPageFlipSound()  // normal
  └─ flipToStartRapid (End Session)
        → rapid cues on each rewind step / mobile jump

CoverPageFlip
  ├─ open  → playPageFlipSound({ force: true })
  └─ close → playPageFlipSound({ force: true, mode: 'rapid' })
```

## End Session flow + sound

```
User taps End Session
        │
        ▼
Phase 1 — Rapid rewind (FlipBookReader.flipToStartRapid)
        • Desktop: flipPrev every ~200ms → onFlip plays rapid SFX
        • Mobile: one rapid force cue, jump to page 0
        │
        ▼
Phase 2 — Cover soft-flip shut (CoverPageFlip mode=close)
        • One rapid force cue as the cover closes
        │
        ▼
Closed cover (silent)
```

Rapid mode is intentional: many leaves in a few seconds must sound like a soft flutter, not stacked full-volume rustles.

## Why not mute rewind?

Early builds skipped SFX while `rewinding === true`. Stakeholders wanted audio through the close sequence. Production approach: **keep sound, lower intensity + rate-limit**.

## Mute / rollback

```js
// DevTools console
localStorage.setItem('stringstack-reader:flip-sound-muted', '1') // off
localStorage.removeItem('stringstack-reader:flip-sound-muted')  // on
```

Or call `setPageFlipSoundMuted(true)` from a future UI toggle.

## Files touched

| File | Change |
|------|--------|
| `src/services/pageFlipSound.ts` | **New** — synthesis + unlock + mute |
| `src/components/book/BookOpenStage.tsx` | Bind unlock on mount |
| `src/components/book/FlipBookReader.tsx` | Play on flip / rewind |
| `src/components/book/CoverPageFlip.tsx` | Play on cover open/close |

## QA checklist

- [ ] First open of book: after first click, Start Learning cover flip has sound  
- [ ] Arrow / swipe pages: one cue per spread  
- [ ] End Session: soft flutter during rewind, then one cue on cover shut  
- [ ] Mobile: End Session still has at least one close cue  
- [ ] Mute key in localStorage silences all cues  
- [ ] No console errors if AudioContext is blocked until gesture  

## Stakeholder one-liner

> Page flips use a synthesized paper sound (no audio files). Reading uses a fuller cue; End Session uses a quieter flutter so the quick close still feels real without being noisy.
