---
title: "ShortPathFinder: Visualizing Pathfinding with React, C++, and WebAssembly"
description: "Interactive pathfinding visualizer on a 2D grid with a React frontend and a C++ WebAssembly search engine."
date: 2026-09-28
updated: 2026-09-28
tags: ["React", "TypeScript", "C++", "WebAssembly"]
readTime: 2 min
slug: shortpathfinder
---
# ShortPathFinder: Visualizing Pathfinding with React, C++, and WebAssembly

## Introduction

ShortPathFinder is an interactive pathfinding visualizer that runs graph-search algorithms on a 2D grid in the browser. It supports eight algorithms: Dijkstra, AStar, IDAStar, BFS, DFS, Jump Point Search, Orthogonal JPS, and Trace, with four heuristics for informed search: Manhattan, Euclidean, Octile, and Chebyshev.

You place a start and an end node, draw walls by dragging, or generate a maze with recursive backtracking. You then run a search and watch visited nodes expand followed by the final path. You can clear walls, clear the path, reset the grid, and undo or redo edits.

The app offers two modes. Single-grid mode focuses on one run. Double-grid mode runs two configurations side by side on the same layout and reports cost and visited count for each.

![Figure 1: Single-grid maze run with visited nodes and final path](https://raw.githubusercontent.com/AyyoubElKouri/portfolio-content/main/content/shortpathfinder/shortpathfinder-single-grid.png)

![Figure 2: Double-grid comparison of two algorithms on the same layout](https://raw.githubusercontent.com/AyyoubElKouri/portfolio-content/main/content/shortpathfinder/shortpathfinder-double-grid.png)
