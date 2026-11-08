// ---------- Track definitions ----------
// Each track is just data: a closed route (x, z points the road passes through), tagged zones,
// and a theme kit that dresses it. New layouts only need a new entry here.
//   zones: { type, from, to } with from/to as a fraction of a lap (0 = start line)
//     narrow – verge shrinks to almost nothing (piers, log bridges): easy to fall off
//     mud    – sticky patch on the road that slows cars
const TRACKS = [
  {
    id: 'harbour', name: 'Harbour Dash', theme: 'harbour',
    points: [[0, 0], [120, -30], [210, 10], [240, 100], [190, 170], [115, 150], [60, 210],
      [-40, 235], [-125, 190], [-145, 110], [-90, 62], [-155, 0], [-100, -55]],
    zones: [{ type: 'narrow', from: 0.30, to: 0.38 }, { type: 'narrow', from: 0.68, to: 0.74 }],
  },
  {
    id: 'forest', name: 'Bigfoot Woods', theme: 'forest',
    points: [[0, 0], [90, -40], [170, -20], [200, 50], [160, 110], [200, 170], [150, 240], [60, 220],
      [20, 150], [-50, 190], [-130, 160], [-150, 80], [-90, 40], [-140, -20], [-80, -60]],
    zones: [
      { type: 'narrow', from: 0.17, to: 0.23 }, // rope-and-log bridge over the ravine
      { type: 'mud', from: 0.44, to: 0.51 },
      { type: 'narrow', from: 0.77, to: 0.82 },
      { type: 'mud', from: 0.90, to: 0.95 },
    ],
  },
];
TRACKS.push({
  id: 'haunted', name: 'Haunted Hollow', theme: 'haunted',
  points: [[0, 0], [80, -50], [170, -40], [230, 20], [210, 100], [140, 120], [110, 190], [30, 230],
    [-60, 200], [-90, 130], [-160, 110], [-190, 30], [-130, -30], [-60, -60]],
  zones: [
    { type: 'narrow', from: 0.30, to: 0.35 }, // squeeze between the crypts
    { type: 'mud', from: 0.52, to: 0.58 },    // graveyard bog
    { type: 'narrow', from: 0.80, to: 0.85 },
  ],
});
