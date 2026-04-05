// ─── Types ────────────────────────────────────────────────────────────────────
export type CellState =
  | 'empty' | 'wall' | 'start' | 'end'
  | 'visited' | 'frontier' | 'path' | 'weight'

export interface Cell {
  id: number
  state: CellState
  weight: number   // 1 = normal, 5 = moss
}

export interface AlgoStep {
  visited: number[]
  frontier: number[]
  path: number[]   // empty until found
  done: boolean
  found: boolean
}

export interface RunStats {
  found: boolean
  visited: number
  nodesExpanded: number
  maxFrontier: number
  pathLength: number
  pathCost: number
  weightsOnPath: number
  elapsedMs: number
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────
export function getNeighbors(idx: number, cols: number, rows: number, walls: Set<number>): number[] {
  const r = Math.floor(idx / cols)
  const c = idx % cols
  const out: number[] = []
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      const n = nr * cols + nc
      if (!walls.has(n)) out.push(n)
    }
  }
  return out
}

export function manhattan(a: number, b: number, cols: number): number {
  return Math.abs(Math.floor(a/cols) - Math.floor(b/cols)) +
         Math.abs(a%cols - b%cols)
}

function reconstruct(prev: Map<number,number>, end: number, start: number): number[] {
  const path: number[] = []
  let cur = end
  while (cur !== start) {
    path.unshift(cur)
    cur = prev.get(cur)!
  }
  return path
}

// ─── Algorithm runners (return full step log synchronously) ───────────────────
// Each returns an array of frames for smooth animation

export interface Frame {
  visited: Set<number>
  frontier: Set<number>
  path: number[]
  done: boolean
  found: boolean
  nodesExpanded: number
  maxFrontier: number
}

function makeFrame(
  visited: Set<number>, frontier: Set<number>,
  path: number[], done: boolean, found: boolean,
  nodesExpanded: number, maxFrontier: number
): Frame {
  return {
    visited: new Set(visited), frontier: new Set(frontier),
    path, done, found, nodesExpanded, maxFrontier
  }
}

export function runBFS(
  start: number, end: number, cols: number, rows: number,
  walls: Set<number>
): Frame[] {
  const frames: Frame[] = []
  const queue: number[] = [start]
  const seen = new Set([start])
  const prev = new Map<number, number>()
  const visited = new Set<number>()
  const frontier = new Set<number>([start])
  let expanded = 0, maxF = 1

  while (queue.length > 0) {
    const cur = queue.shift()!
    frontier.delete(cur)
    visited.add(cur)
    expanded++

    if (cur === end) {
      const path = reconstruct(prev, end, start)
      frames.push(makeFrame(visited, frontier, path, true, true, expanded, maxF))
      return frames
    }

    for (const n of getNeighbors(cur, cols, rows, walls)) {
      if (!seen.has(n)) {
        seen.add(n); prev.set(n, cur)
        queue.push(n); frontier.add(n)
      }
    }
    maxF = Math.max(maxF, frontier.size)
    frames.push(makeFrame(visited, frontier, [], false, false, expanded, maxF))
  }
  frames.push(makeFrame(visited, frontier, [], true, false, expanded, maxF))
  return frames
}

export function runDFS(
  start: number, end: number, cols: number, rows: number,
  walls: Set<number>
): Frame[] {
  const frames: Frame[] = []
  const stack: number[] = [start]
  const seen = new Set([start])
  const prev = new Map<number, number>()
  const visited = new Set<number>()
  const frontier = new Set<number>([start])
  let expanded = 0, maxF = 1

  while (stack.length > 0) {
    const cur = stack.pop()!
    frontier.delete(cur)
    visited.add(cur)
    expanded++

    if (cur === end) {
      const path = reconstruct(prev, end, start)
      frames.push(makeFrame(visited, frontier, path, true, true, expanded, maxF))
      return frames
    }

    for (const n of getNeighbors(cur, cols, rows, walls)) {
      if (!seen.has(n)) {
        seen.add(n); prev.set(n, cur)
        stack.push(n); frontier.add(n)
      }
    }
    maxF = Math.max(maxF, frontier.size)
    frames.push(makeFrame(visited, frontier, [], false, false, expanded, maxF))
  }
  frames.push(makeFrame(visited, frontier, [], true, false, expanded, maxF))
  return frames
}

function runWeighted(
  start: number, end: number, cols: number, rows: number,
  walls: Set<number>, weights: Map<number,number>, useH: boolean
): Frame[] {
  const frames: Frame[] = []
  const dist = new Map([[start, 0]])
  const prev = new Map<number, number>()
  const done = new Set<number>()
  const visited = new Set<number>()
  const frontier = new Set<number>([start])
  let expanded = 0, maxF = 1

  // Min-heap via sorted array (small grids ok)
  const h = (n: number) => useH ? manhattan(n, end, cols) : 0
  const heap: [number, number, number][] = [[h(start), 0, start]]

  while (heap.length > 0) {
    heap.sort((a, b) => a[0] - b[0])
    const [, g, cur] = heap.shift()!
    if (done.has(cur)) continue
    done.add(cur); frontier.delete(cur); visited.add(cur); expanded++

    if (cur === end) {
      const path = reconstruct(prev, end, start)
      frames.push(makeFrame(visited, frontier, path, true, true, expanded, maxF))
      return frames
    }

    for (const n of getNeighbors(cur, cols, rows, walls)) {
      const ng = g + (weights.get(n) ?? 1)
      if (!dist.has(n) || ng < dist.get(n)!) {
        dist.set(n, ng); prev.set(n, cur)
        frontier.add(n)
        heap.push([ng + h(n), ng, n])
      }
    }
    maxF = Math.max(maxF, frontier.size)
    frames.push(makeFrame(visited, frontier, [], false, false, expanded, maxF))
  }
  frames.push(makeFrame(visited, frontier, [], true, false, expanded, maxF))
  return frames
}

export function runUCS(
  start: number, end: number, cols: number, rows: number,
  walls: Set<number>, weights: Map<number,number>
): Frame[] { return runWeighted(start, end, cols, rows, walls, weights, false) }

export function runAStar(
  start: number, end: number, cols: number, rows: number,
  walls: Set<number>, weights: Map<number,number>
): Frame[] { return runWeighted(start, end, cols, rows, walls, weights, true) }

export function runIDAStar(
  start: number, end: number, cols: number, rows: number,
  walls: Set<number>, weights: Map<number,number>
): Frame[] {
  const frames: Frame[] = []
  const h = (n: number) => manhattan(n, end, cols)
  let bound = h(start)
  let expanded = 0, maxF = 0
  let foundPath: number[] | null = null

  for (let iter = 0; iter < 200 && !foundPath; iter++) {
    const visited = new Set<number>()
    const frontier = new Set<number>()
    let nextBound = Infinity
    const prev = new Map<number, number>()

    function search(node: number, g: number, pathSet: Set<number>): number {
      const f = g + h(node)
      if (f > bound) return f
      visited.add(node); expanded++
      maxF = Math.max(maxF, frontier.size)
      if (node === end) return -1

      let min = Infinity
      for (const n of getNeighbors(node, cols, rows, walls)) {
        if (!pathSet.has(n)) {
          pathSet.add(n); frontier.add(n); prev.set(n, node)
          const result = search(n, g + (weights.get(n) ?? 1), pathSet)
          if (result === -1) return -1
          if (result < min) min = result
          pathSet.delete(n); frontier.delete(n)
        }
      }
      return min
    }

    const result = search(start, 0, new Set([start]))
    frames.push(makeFrame(visited, frontier, [], result === -1, result === -1, expanded, maxF))

    if (result === -1) {
      foundPath = reconstruct(prev, end, start)
      frames[frames.length - 1] = makeFrame(visited, frontier, foundPath, true, true, expanded, maxF)
      return frames
    }
    if (result === Infinity) break
    bound = result
  }

  if (!foundPath) {
    const last = frames[frames.length - 1] ?? makeFrame(new Set(), new Set(), [], true, false, expanded, maxF)
    frames.push({ ...last, done: true, found: false })
  }
  return frames
}

// ─── Compute stats from final frame ───────────────────────────────────────────
export function computeStats(
  frames: Frame[], weights: Map<number,number>, elapsedMs: number
): RunStats {
  const last = frames[frames.length - 1]
  const pathCost = last.path.reduce((s, n) => s + (weights.get(n) ?? 1), 1)
  return {
    found: last.found,
    visited: last.visited.size,
    nodesExpanded: last.nodesExpanded,
    maxFrontier: last.maxFrontier,
    pathLength: last.path.length + (last.found ? 2 : 0),
    pathCost: last.found ? pathCost : 0,
    weightsOnPath: last.path.filter(n => weights.has(n)).length,
    elapsedMs,
  }
}
