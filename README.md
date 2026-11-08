# DOOZIE!

A shared-screen toy-car knockout party game that runs in the browser. Inspired by the PS2 classic *Mashed*: one camera follows the whole pack, and **if you fall off the screen, you're out**. Last car standing wins the round; first to the target score wins the match.

**Play:** https://theisraelboyd-ai.github.io/doozie/

## Controls

| Player | Drive | Boost |
| --- | --- | --- |
| Controller (Xbox-style) | Left stick or D-pad to steer · RT / A to accelerate · LT / B to brake | X, Y, LB or RB |
| Red (keyboard) | W A S D | Q |
| Blue (keyboard) | Arrow keys | Right Shift |
| Green (keyboard) | I J K L | U |
| Gold (keyboard) | T F G H | R |
| Phone as controller | Scan the QR code on the start screen; big ◀ ▶ GO / BRAKE buttons | BOOST button |
| Phone as the screen | Tap **📱 Play on this phone** on the start screen (turn the phone sideways) | BOOST button |
| Rocket player | Mouse: click the track to fire; click near a car to lock on | — |

- **Controllers:** press **A** on the start screen to join (cars are taken in order Red, Blue, Green, Gold), **B** to leave, **Start** to begin or pause.
- **Keyboard:** click a car on the start screen to switch it between Keyboard, Computer and Empty.
- **Phones:** the start screen shows a QR code and a 4-letter room code. Scan it and your phone becomes a controller (it needs internet; phones and screen don't need to be on the same Wi-Fi, but it's quickest if they are). Press START on any phone to begin.
- **Esc / P** pauses, **V** switches Fancy / Simple graphics, **C** changes the camera (Cinematic, Classic, Calm).
- **Auto-accelerate** (start screen) makes cars drive forward on their own, so younger players only need to steer.

## Project layout

```
src/                  game source, split by system (loaded in filename order)
index.template.html   page shell, styles and menus
vendor/               three.js bundle (r159 + post-processing add-ons), PeerJS + QR code bundle
build.mjs             joins everything into one self-contained file
docs/index.html       the built game (served by GitHub Pages)
```

## Building

```bash
node build.mjs
```

This writes `docs/index.html`, a single file with no outside dependencies. It can be opened straight from disk or served by GitHub Pages (Settings → Pages → Deploy from branch → `main` / `docs`).

## Roadmap

1. ✅ Core knockout loop, keyboard and mouse rockets, Fancy graphics
2. ✅ Controller support
3. ✅ Swinging cinematic camera (Cinematic / Classic / Calm)
4. Track data format and grey-box builder
5. ✅ Phone controllers (QR join) and touch play · next: spectators (Bigfoot, Ghost car and friends)
6. Themed tracks (Haunted Harbour, Bigfoot Woods, Loch Road …)
7. Art polish: proper models, baked lighting, sound
8. Mini PC plug-and-play set-up
