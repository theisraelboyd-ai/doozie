# DOOZIE!

A shared-screen toy-car knockout party game that runs in the browser. Inspired by the PS2 classic *Mashed*: one camera follows the whole pack, and **if you fall off the screen, you're out**. Last car standing wins the round; first to the target score wins the match.

**Play:** https://theisraelboyd-ai.github.io/doozie/

## Controls

| Player | Drive | Boost | Fire |
| --- | --- | --- | --- |
| Controller (Xbox-style) | Left stick or D-pad · RT / A accelerate · LT / B brake | Y or LB | X or RB |
| Red (keyboard) | W A S D | Q | E |
| Blue (keyboard) | Arrow keys | Right Shift | / |
| Green (keyboard) | I J K L | U | O |
| Gold (keyboard) | T F G H | R | Y |
| Phone as controller | Scan the QR code, choose **Player**; ◀ ▶ GO / BRAKE buttons | BOOST | FIRE |
| Phone as viewer | Scan the QR code, choose **Viewer**: emoji cheers, *Rocket the leader*, *Boost the back car*, **Bigfoot**, **Ghost car** | — | — |
| Phone as the screen | Tap **📱 Play on this phone** (turn it sideways) | BOOST | FIRE |
| Rocket player | Mouse: click the track to fire; click near a car to lock on | — | — |

- **Controllers:** press **A** on the start screen to join (cars are taken in order Red, Blue, Green, Gold), **B** to leave, **Start** to begin or pause.
- **Keyboard:** click a car on the start screen to switch it between Keyboard, Computer and Empty.
- **Phones:** the start screen shows a QR code and a 4-letter room code. Scan it and your phone becomes a controller (it needs internet; phones and screen don't need to be on the same Wi-Fi, but it's quickest if they are). Press START on any phone to begin. A green dot on the phone means it's connected; if the link drops it reconnects by itself and keeps your car (the computer drives it meanwhile, for up to 30 seconds).
- **Creatures:** Bigfoot roams Bigfoot Woods and the Ghost car haunts Haunted Hollow by themselves every 30–45 seconds. Set Creatures to *Anywhere* and he and the Ghost car visit every track, or *Off*. During a race **B** calls Bigfoot and **Z** the Ghost car.
- **Esc / P** pauses, **V** switches Fancy / Simple graphics, **C** changes the camera (Cinematic, Classic, Calm).
- **Auto-accelerate** (start screen) makes cars drive forward on their own, so younger players only need to steer.

## Weapons

Drive through the glowing **?** crates (three across the road at six spots a lap) with empty hands to get an item, then press FIRE. Cars at the back are more likely to get the nasty ones. Crates come back after 4 seconds. Turn weapons off on the start screen for pure racing.

| Item | What it does |
| --- | --- |
| 🛢️ Oil slick | Drops a slick behind you; cars that hit it lose grip and spin |
| 💣 Mines ×2 | Drops a mine that arms after a second and blows up on contact |
| 🚀 Missile | Fires straight ahead; blast throws cars about |
| 🎯 Homing missile | Locks on to the nearest car ahead |
| 🔫 Machine gun | A short burst of tracers that nudges the car in front |
| 🔥 Flamethrower | Burns the car behind you, slowing it down |
| ☄️ Mortar ×3 | Lobbed shells that land where the car ahead is heading |
| 🧨 Drum bomb | Rolls out behind you and explodes on contact |
| 💥 Shockwave | Shoves every nearby car away from you |
| 🛡️ Shield | Blocks the next hit (10 seconds) |
| 🐏 Ram boost | Speed burst; cars you hit go flying, you barely slow |

## Tracks

| Track | Theme | Watch out for |
| --- | --- | --- |
| Harbour Dash | Harbour, containers, cranes, boats | Two narrow piers; fall in and you're out |
| Bigfoot Woods | Dirt trail through thick, foggy pine forest | Leave the road and the woods swallow you; tight squeezes, mud patches, Bigfoot crossing |
| Haunted Hollow | Night lane through dead woods: lanterns, weeping willows, abandoned houses, a ruined chapel and graveyard, drifting ghosts | Headlights on; leave the lane and the ghosts take you; the Ghost car haunts it by itself; owls, crows, wind, wails and screams |

Pick a track (or Random) on the start screen. Tracks are plain data in `src/03-a-tracks-data.js`: a loop of points the road passes through, tagged zones (`narrow`, `mud`) and a theme kit that dresses it. Adding a layout means adding an entry there.

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
1b. ✅ Weapons and item crates (11 items), computer drivers use them too
2. ✅ Controller support
3. ✅ Swinging cinematic camera (Cinematic / Classic / Calm)
4. ✅ Track data format, theme kits, second track (Bigfoot Woods)
5. ✅ Phone controllers (QR join), touch play, viewers with cheers, Bigfoot and the Ghost car
6. Themed tracks (Haunted Harbour, Bigfoot Woods, Loch Road …)
7. Art polish: proper models, baked lighting, sound
8. Mini PC plug-and-play set-up
