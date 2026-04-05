# Rat in a Maze - Pathfinding Visualizer

An interactive visualization project that demonstrates how different pathfinding algorithms help a rat navigate through a maze to find cheese. Built using **Next.js**, **TypeScript**, and **React**, this project highlights algorithm behavior through real-time graphical simulation deployed as a web application on Vercel.

---

## Overview

This project provides a visual understanding of how various search algorithms explore a grid to find a path from a start node (rat) to a goal node (cheese).

It is designed as an educational tool for learning concepts in Artificial Intelligence and search algorithms, with support for both unweighted and weighted pathfinding.

---

## Grid Environment

- **Structure:** 2D grid-based maze
- **Elements:**
  - Start node → Rat
  - End node → Cheese
  - Walls → Obstacles
  - Weighted cells → Moss (higher traversal cost ×5)
- **Customization:** Users can draw, erase, and modify the grid dynamically via mouse (desktop) or touch (mobile)

---

## Algorithms Implemented

| Algorithm | Optimal | Description |
|---|---|---|
| BFS (Breadth-First Search) | Yes (Unweighted) | Explores level by level; guarantees shortest path |
| DFS (Depth-First Search) | No | Explores deeply first; fast but not optimal |
| UCS (Uniform Cost Search) | Yes | Cost-aware search; supports weighted grids |
| A* | Yes | Uses cost + heuristic for efficient pathfinding |
| IDA* | Yes | Memory-efficient version of A* |

---

## Technologies Used

- **Next.js 14** (App Router)
- **TypeScript**
- **React 18**
- **Vercel** (deployment & hosting)

No external UI libraries — all rendering is done via React and inline styles.

---

## Features

- Interactive grid editing (draw walls, erase, place nodes) via mouse or touch
- Real-time step-by-step algorithm visualization
- Weighted pathfinding using moss tiles (cost ×5)
- Adjustable animation speed (Slow / Medium / Fast / Instant)
- Adjustable grid size
- Random maze generation
- Post-run statistics: path length, path cost, nodes expanded, peak frontier, search time
- Responsive layout: optimized for both desktop and mobile screens
- Clean dark-themed interface

---

## Controls

| Input | Action |
|---|---|
| Left Click / Drag | Draw walls |
| Right Click / Drag | Erase |
| Touch & Drag | Draw walls (mobile) |
| S + Click | Place start (rat) |
| E + Click | Place end (cheese) |
| W + Click | Place moss (cost ×5) |
| SPACE | Run algorithm |
| C | Clear path |
| R | Reset grid |
| M | Random maze |
| 1–5 | Switch algorithm |
| + / − | Resize grid |

---

## Visualization Output

- Step-by-step exploration of nodes with color-coded visited/frontier cells
- Final path clearly highlighted in gold
- Post-run stats modal with detailed metrics
- Real-time comparison of algorithm behavior across runs

---

## Key Insights

- BFS guarantees shortest paths but explores more nodes
- DFS is faster but may produce non-optimal paths
- UCS and A* effectively handle weighted environments
- A* significantly reduces search space using heuristics (Manhattan distance)
- IDA* balances optimality with lower memory usage

---

## Outcomes

This project demonstrates how search algorithms operate visually, helping in understanding path optimality, efficiency, and trade-offs between time and space complexity. It provides a strong foundation for learning AI-based pathfinding and graph traversal techniques.

---

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Live Demo

Deployed on Vercel: [rat-in-a-maze.vercel.app](https://rat-in-a-maze-seven.vercel.app)

Source Code: [github.com/EshaniKatiyar/RatInAMaze](https://github.com/EshaniKatiyar/RatInAMaze)
