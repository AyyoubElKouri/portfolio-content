---
title: "ShortPathFinder: An Interactive Pathfinding Visualizer"
description: "Visualize A*, Dijkstra, and BFS on a 2D grid with a React frontend and a C++ WebAssembly search engine."
date: 2026-09-26
updated: 2026-09-26
tags: ["React", "TypeScript", "Frontend", "Web"]
readTime: 4 min
slug: shortpathfinder
---
# ShortPathFinder: An Interactive Pathfinding Visualizer

ShortPathFinder is a web app that visualizes graph search on a 2D grid. You draw walls, place start and end nodes, then watch algorithms explore the grid and trace the shortest path. I built the UI in React and TypeScript, and I built the search engine in C++17 and compiled it to WebAssembly.

Live demo: https://ayyoubelkouri.github.io/ShortPathFinder/
Code: https://github.com/AyyoubElKouri/ShortPathFinder

## What it does

ShortPathFinder answers a simple question: how do pathfinding algorithms behave on the same map?

You can:

* Paint walls by clicking and dragging, move start and end nodes, and undo edits with Ctrl+Z.
* Generate a maze with recursive backtracking. The generator preserves start and end, guarantees reachability with BFS, then opens loops for multiple routes.
* Run A*, Dijkstra, or BFS and watch visited cells spread in order, followed by the final path animation.
* Compare two algorithms side by side in double-grid mode. Both grids share the same maze, run at once, and report cost and visited count.
* Hear the search through Tone.js sonification. Visited cells, path cells, and the success chord each trigger a distinct sound.

The goal was clarity. Each run shows where the algorithm looked, what path it chose, and how much work it took.

## How it works

The frontend handles interaction and animation. The C++ core handles search.

React keeps three pieces of state in Zustand stores: the grid and its history, the algorithm configuration for each grid, and the application mode. When you press Run, a `useRun` hook flattens the grid to a `Uint8Array`, where 0 means walkable and 1 means wall, finds start and goal indices in row-major order, then calls the WebAssembly module.

The C++ library exposes one entry point: `PathfindingEngine::findPath`. It receives the flat grid, width, height, start index, goal index, algorithm type, heuristic type, and flags for diagonals, corner cutting, and bidirectional search. A `GridGraph` class stores nodes in a contiguous vector and computes neighbors with bounds and wall checks. An `AlgorithmFactory` selects Dijkstra, A*, or BFS. A `HeuristicFactory` selects Manhattan, Euclidean, Octile, or Chebyshev for informed search.

The result returns five fields: `path`, `visited`, `cost`, `success`, and `time_us`. React maps node IDs back to coordinates with `id = y * width + x`, animates visited cells in batches of five, pauses briefly, then animates the path. Sound pitch rises with progress, so you hear the search converge.

This split keeps each layer fast and testable. JavaScript never searches. C++ never touches the DOM.

## Algorithms and options

The current UI exposes three algorithms:

* **BFS** explores in layers and finds the shortest path on unweighted grids.
* **Dijkstra** tracks distances in a priority queue and finds the shortest path on weighted graphs.
* **A\*** adds a heuristic to Dijkstra to guide the search toward the goal and converge faster.

The C++ core also implements DFS, IDA*, Jump Point Search, Orthogonal JPS, and Trace, ready for future UI work.

For A*, you can pick a heuristic to match movement: Manhattan for 4-directional moves, Octile or Chebyshev for 8-directional moves, and Euclidean for any-angle movement. You can also allow diagonals, forbid corner crossing through walls, and enable bidirectional search from both ends.

## Engineering details

**Performance:** Search runs in compiled C++ inside WebAssembly, not in JavaScript. The grid crosses the boundary once as a typed array, and the result returns as plain arrays. Animation uses batched state updates to keep the UI smooth.

**State design:** Undo and redo store cell deltas, not full grid snapshots. Maze generation, wall painting, and clearing all flow through the same history manager.

**Responsive grid:** A `useGrid` hook sizes the grid from viewport dimensions, so cells stay square on desktop and mobile.

**Audio:** A `useSound` hook builds Tone.js synths lazily after user input, which respects browser autoplay rules.

**Tooling:** Vite 7 builds the app, Tailwind CSS 4 styles it, Framer Motion animates panels, Lucide supplies icons, Jest and Testing Library cover logic, and Biome formats and lints.

## What I learned

This project taught me to draw a clean line between compute and presentation. Emscripten embind made the boundary explicit: typed arrays in, result object out. Factories made algorithms and heuristics pluggable without branching logic in the engine. Small choices, like delta history and batched animation, made the app feel fast even on large grids.

If you want to explore search behavior, start with double-grid mode. Run BFS against A* on the same maze with diagonals on. You will see BFS flood the map while A* aims for the goal, and the stats will show the tradeoff in visited nodes, path cost, and time.
