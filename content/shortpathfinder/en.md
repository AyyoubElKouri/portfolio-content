---
title: "ShortPathFinder: Visualizing Pathfinding with React, C++, and WebAssembly"
description: "Interactive pathfinding visualizer on a 2D grid with a React frontend and a C++ WebAssembly search engine."
date: 2026-09-28
updated: 2026-09-28
tags: ["React", "TypeScript", "C++", "WebAssembly"]
readTime: 5 min
slug: shortpathfinder
---

# ShortPathFinder: Visualizing Pathfinding with React, C++, and WebAssembly

## Introduction

ShortPathFinder is an interactive pathfinding visualizer that runs graph-search algorithms on a 2D grid in the browser. It supports eight algorithms: Dijkstra, AStar, IDAStar, BFS, DFS, Jump Point Search, Orthogonal JPS, and Trace, with four heuristics for informed search: Manhattan, Euclidean, Octile, and Chebyshev.

You place a start and an end node, draw walls by dragging, or generate a maze with recursive backtracking. You then run a search and watch visited nodes expand followed by the final path. You can clear walls, clear the path, reset the grid, and undo or redo edits.

The app offers two modes. Single-grid mode focuses on one run. Double-grid mode runs two configurations side by side on the same layout and reports cost and visited count for each.

![Figure 1: Single-grid maze run with visited nodes and final path](https://raw.githubusercontent.com/AyyoubElKouri/portfolio-content/main/content/shortpathfinder/shortpathfinder-single-grid.png)

![Figure 2: Double-grid comparison of two algorithms on the same layout](https://raw.githubusercontent.com/AyyoubElKouri/portfolio-content/main/content/shortpathfinder/shortpathfinder-double-grid.png)

## Pathfinding Fundamentals


A grid is a graph. Each walkable cell is a node. Orthogonal moves cost 1 and diagonal moves cost sqrt2. Walls are removed nodes. The task is to find a path from start to goal with minimal total cost. Two outputs matter: visited order, which shows where the search looked, and path, which shows what it selected.

Most methods below share one loop: keep candidates, pick one, expand neighbors, record provenance, and stop at the goal. Provenance is usually parent links. IDAStar keeps a path stack instead. Trace can add a BFS fallback.

### Uninformed template

BFS, Dijkstra, and DFS follow the same best first shape and differ only in priority. Simplified:

```
Search(start, goal, priority):
  best[*] = INF, best[start] = 0, parent = {}
  pq = [(priority(start), start)]
  while pq not empty:
    _, node = pq.pop_min()
    if node already expanded: continue
    visited.append(node)
    if node == goal: return reconstruct(parent, goal)
    for each walkable neighbor:
      cost = best[node] + move_cost(node, neighbor)
      if cost < best[neighbor]:
        best[neighbor] = cost, parent[neighbor] = node
        pq.push((priority(neighbor), neighbor))
  return failure
```

BFS sets priority to depth, so it expands in layers and is shortest on unweighted grids. Dijkstra sets priority to cost from start, so it is shortest on weighted grids. DFS uses a stack and goes deep first, so it is fast but often not shortest. The engine DFS uses an explicit stack with per node neighbor index, so order can differ from this compact form.

Trace is separate. It walks with the right hand on the wall from an East start and stops on loop or step cap. If the walk fails, it runs a full BFS and returns that path, while visited keeps the wall prefix for the visual effect.

### Informed template

AStar adds a heuristic estimate to the goal. It requires a heuristic. Simplified:

```
AStar(start, goal, h):
  if h is None: return failure
  g[*] = INF, g[start] = 0, parent = {}
  pq = [(h(start), start)]
  while pq not empty:
    _, node = pq.pop_min()
    visited.append(node)
    if node == goal: return reconstruct(parent, goal)
    for each walkable neighbor:
      next_cost = g[node] + move_cost(node, neighbor)
      if next_cost < g[neighbor]:
        g[neighbor] = next_cost, parent[neighbor] = node
        pq.push((next_cost + h(neighbor), neighbor))
  return failure
```

IDAStar repeats depth first searches under an f-cost bound that starts at h(start) and rises to the minimum overrun. It uses little memory but recounts nodes across iterations and aborts past 200k expansions.

Jump Point Search adds forced neighbor pruning to AStar. It jumps over uniform segments and decides only at jump points. Orthogonal JPS is the four directional variant that stops before walls. Both fall back to BFS when pruning finds no structure.

Heuristics apply only to AStar, IDAStar, Jump Point Search, and Orthogonal JPS:

| Heuristic | Use when movement is | Note for this engine |
|---|---|---|
| Manhattan | Four directional | Best without diagonals |
| Euclidean | Straight line distance | Admissible but less informed than Octile here |
| Octile | Eight directional | Best match for cost 1 and sqrt2 |
| Chebyshev | Eight directional with diagonal cost 1 | Weak here because diagonals cost sqrt2 |

Config: allowDiagonal switches 4 and 8 neighborhoods, except Orthogonal JPS which stays 4 directional. dontCrossCorners blocks diagonal moves through walls, but the current Dijkstra and AStar code paths do not check it. The bidirectional flag is stored but has no effect yet.


