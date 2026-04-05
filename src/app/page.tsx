'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  runBFS, runDFS, runUCS, runAStar, runIDAStar,
  computeStats, Frame, RunStats
} from '@/lib/algorithms'

// ─── Constants ────────────────────────────────────────────────────────────────
const ALGOS = [
  { id: 'bfs',    name: 'BFS',   full: 'Breadth-First Search',      optimal: true  },
  { id: 'dfs',    name: 'DFS',   full: 'Depth-First Search',        optimal: false },
  { id: 'ucs',    name: 'UCS',   full: 'Uniform Cost Search',       optimal: true  },
  { id: 'astar',  name: 'A★',    full: 'A* (Manhattan)',            optimal: true  },
  { id: 'idastar',name: 'IDA★',  full: 'Iterative Deepening A*',   optimal: true  },
]

const SPEEDS = [
  { label: 'Slow',    ms: 80  },
  { label: 'Medium',  ms: 30  },
  { label: 'Fast',    ms: 8   },
  { label: 'Instant', ms: 0   },
]

const WEIGHT_COST = 5
const CELL_MIN = 14
const CELL_MAX = 36

type DrawMode = 'wall' | 'erase' | 'weight' | 'start' | 'end'
type CellType = 'empty' | 'wall' | 'start' | 'end' | 'weight'

// ─── Cell colours ─────────────────────────────────────────────────────────────
function getCellStyle(
  idx: number, type: CellType,
  visited: Set<number>, frontier: Set<number>, path: Set<number>,
  start: number, end: number
): React.CSSProperties {
  if (idx === start) return { background: '#1a5c38', boxShadow: 'inset 0 0 0 1px #3aad4e' }
  if (idx === end)   return { background: '#4a2808', boxShadow: 'inset 0 0 0 1px #c8640a' }
  if (type === 'wall') return {
    background: 'linear-gradient(135deg, #3a2c1a 0%, #2a1e10 100%)',
    boxShadow: 'inset 0 1px 0 #52402a'
  }
  if (path.has(idx)) return {
    background: '#c8960a',
    boxShadow: 'inset 0 0 0 1px #e6b020',
    animation: 'popIn 0.15s ease'
  }
  if (visited.has(idx)) return { background: '#1e3a6e', transition: 'background 0.1s' }
  if (frontier.has(idx)) return { background: '#2a52a0', transition: 'background 0.08s' }
  if (type === 'weight') return { background: '#1a4010', boxShadow: 'inset 0 0 0 1px #3a7020' }
  return { background: '#1a140c' }
}

// ─── Rat & Cheese SVG icons ───────────────────────────────────────────────────
function RatIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8" fill="#b8b0a8"/>
      <circle cx="8"  cy="7"  r="4" fill="#c8a0a0"/>
      <circle cx="8"  cy="7"  r="2.5" fill="#e0c0c0"/>
      <circle cx="16" cy="7"  r="4" fill="#c8a0a0"/>
      <circle cx="16" cy="7"  r="2.5" fill="#e0c0c0"/>
      <circle cx="10" cy="12" r="1.5" fill="#181010"/>
      <circle cx="14" cy="12" r="1.5" fill="#181010"/>
      <circle cx="10.5" cy="11.5" r="0.6" fill="white"/>
      <circle cx="14.5" cy="11.5" r="0.6" fill="white"/>
      <circle cx="12" cy="14.5" r="1.2" fill="#cc5050"/>
      <line x1="10" y1="14.5" x2="4"  y2="13.5" stroke="#d0c8b8" strokeWidth="0.7"/>
      <line x1="10" y1="15.2" x2="4"  y2="16"   stroke="#d0c8b8" strokeWidth="0.7"/>
      <line x1="14" y1="14.5" x2="20" y2="13.5" stroke="#d0c8b8" strokeWidth="0.7"/>
      <line x1="14" y1="15.2" x2="20" y2="16"   stroke="#d0c8b8" strokeWidth="0.7"/>
    </svg>
  )
}

function CheeseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="2,20 22,20 18,4 6,4" fill="#f0cc28"/>
      <polygon points="2,20 22,20 18,4 6,4" fill="none" stroke="#c09010" strokeWidth="1.2"/>
      <circle cx="9"  cy="14" r="2"   fill="#c09010"/>
      <circle cx="15" cy="11" r="2.5" fill="#c09010"/>
      <circle cx="11" cy="8"  r="1.5" fill="#c09010"/>
    </svg>
  )
}

function MossIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="14" r="5" fill="#2a6e22"/>
      <circle cx="8"  cy="10" r="4" fill="#3a8e30"/>
      <circle cx="16" cy="10" r="4" fill="#3a8e30"/>
      <circle cx="12" cy="7"  r="3" fill="#4aae40"/>
    </svg>
  )
}

// ─── Stats Modal ──────────────────────────────────────────────────────────────
function StatsModal({ stats, algo, onClose }: {
  stats: RunStats, algo: typeof ALGOS[0], onClose: () => void
}) {
  const cards = [
    { label: 'Cells Explored',   value: stats.visited,       color: '#3a7ad4', hint: 'Cells the rat sniffed' },
    { label: 'Nodes Expanded',   value: stats.nodesExpanded, color: '#3a7ad4', hint: 'Decisions made' },
    { label: 'Path Length',      value: `${stats.pathLength} steps`, color: '#c8960a', hint: 'Steps to the cheese' },
    { label: 'Path Cost',        value: stats.pathCost,      color: '#c8960a', hint: 'Total traversal cost' },
    { label: 'Moss Tiles Hit',   value: stats.weightsOnPath, color: '#60b030', hint: `Slow tiles (×${WEIGHT_COST}) on path` },
    { label: 'Peak Frontier',    value: stats.maxFrontier,   color: '#8060cc', hint: 'Max open-set size' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(6,4,2,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1208', border: '1px solid #3d2e1c',
        borderRadius: 20, overflow: 'hidden', width: 560, maxWidth: '95vw',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        animation: 'fadeIn 0.25s ease'
      }}>
        {/* Header */}
        <div style={{
          background: stats.found ? '#1a4a28' : '#4a1810',
          borderBottom: `1px solid ${stats.found ? '#2a6a38' : '#6a2810'}`,
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{ flexShrink: 0 }}>
            {stats.found ? <CheeseIcon size={40}/> : <RatIcon size={36}/>}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: stats.found ? '#80e090' : '#e06060' }}>
              {stats.found ? 'Rat Found the Cheese!' : 'No Path to Cheese'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>{algo.full}</div>
          </div>
        </div>

        {!stats.found ? (
          <div style={{ padding: 28 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20 }}>
              The cheese is unreachable from the rat's position.
            </p>
            {[
              ['Nodes Expanded', stats.nodesExpanded],
              ['Cells Visited',  stats.visited],
              ['Search Time',    `${stats.elapsedMs.toFixed(2)} ms`],
            ].map(([l,v]) => (
              <div key={l as string} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #2a1e10' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>{l}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize: 14 }}>{v}</span>
              </div>
            ))}
            <button onClick={onClose} style={{ marginTop:20, width:'100%', padding:'10px', background:'#2a1e10', color:'rgba(255,255,255,0.5)', borderRadius:8, fontSize:13 }}>
              Click anywhere to dismiss
            </button>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {cards.map(card => (
                <div key={card.label} style={{
                  background: '#0e0c08', borderRadius:10, padding:'12px 14px',
                  border:'1px solid #2a1e10', position:'relative', overflow:'hidden'
                }}>
                  <div style={{ position:'absolute', left:0, top:'20%', bottom:'20%', width:3, background:card.color, borderRadius:'0 2px 2px 0' }}/>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:4, paddingLeft:8 }}>{card.label}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:500, paddingLeft:8, color:'rgba(255,255,255,0.9)' }}>{card.value}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4, paddingLeft:8 }}>{card.hint}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'#0e0c08', borderRadius:10, border:'1px solid #2a1e10' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: algo.optimal ? '#3aad4e' : '#c84030' }}/>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }}>
                  {algo.optimal ? 'Optimal path guaranteed' : 'Not guaranteed optimal'}
                </span>
              </div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'rgba(255,255,255,0.35)' }}>
                {stats.elapsedMs.toFixed(2)} ms
              </span>
            </div>

            <button onClick={onClose} style={{ marginTop:12, width:'100%', padding:'10px', background:'#2a1e10', color:'rgba(255,255,255,0.4)', borderRadius:8, fontSize:12 }}>
              Click anywhere to dismiss · SPACE to run again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Page() {
  const [rows, setRows] = useState(18)
  const [cols, setCols] = useState(30)
  const [cells, setCells] = useState<CellType[]>(() => Array(18 * 30).fill('empty'))
  const [startIdx, setStartIdx] = useState(() => Math.floor(18/2) * 30 + 2)
  const [endIdx,   setEndIdx]   = useState(() => Math.floor(18/2) * 30 + 27)

  const [algoIdx,   setAlgoIdx]   = useState(0)
  const [speedIdx,  setSpeedIdx]  = useState(1)
  const [drawMode,  setDrawMode]  = useState<DrawMode>('wall')

  const [visited,  setVisited]  = useState<Set<number>>(new Set())
  const [frontier, setFrontier] = useState<Set<number>>(new Set())
  const [path,     setPath]     = useState<Set<number>>(new Set())

  const [animating, setAnimating] = useState(false)
  const [stats,     setStats]     = useState<RunStats | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [status,    setStatus]    = useState('Draw walls · Press SPACE to run · Help the rat find the cheese!')

  const frameRef   = useRef<Frame[]>([])
  const frameIdx   = useRef(0)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDrawing  = useRef(false)
  const lastDrawn  = useRef(-1)

  // Cell size based on viewport
  const [cellSize, setCellSize] = useState(26)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function calc() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      const sidebarW = mobile ? 0 : 280
      const vw = window.innerWidth - sidebarW - 24
      const vh = mobile ? window.innerHeight * 0.55 : window.innerHeight - 120
      const cs = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.min(Math.floor(vw/cols), Math.floor(vh/rows))))
      setCellSize(cs)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [rows, cols])

  // Recalculate cell size when rows/cols change
  useEffect(() => {
    const mobile = window.innerWidth < 768
    const sidebarW = mobile ? 0 : 280
    const vw = window.innerWidth - sidebarW - 24
    const vh = mobile ? window.innerHeight * 0.55 : window.innerHeight - 120
    setCellSize(Math.max(CELL_MIN, Math.min(CELL_MAX, Math.min(Math.floor(vw/cols), Math.floor(vh/rows)))))
  }, [rows, cols])

  const stopAnim = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setAnimating(false)
  }, [])

  const clearPath = useCallback(() => {
    stopAnim()
    setVisited(new Set()); setFrontier(new Set()); setPath(new Set())
    setStats(null); setShowStats(false)
    setStatus('Path cleared.')
  }, [stopAnim])

  const resetGrid = useCallback(() => {
    stopAnim()
    setCells(Array(rows * cols).fill('empty'))
    setVisited(new Set()); setFrontier(new Set()); setPath(new Set())
    setStats(null); setShowStats(false)
    setStatus('Grid reset.')
  }, [stopAnim, rows, cols])

  const randomMaze = useCallback(() => {
    stopAnim()
    setCells(prev => prev.map((_, i) => {
      if (i === startIdx || i === endIdx) return 'empty'
      return Math.random() < 0.33 ? 'wall' : 'empty'
    }))
    setVisited(new Set()); setFrontier(new Set()); setPath(new Set())
    setStats(null); setShowStats(false)
    setStatus('Random maze generated!')
  }, [stopAnim, startIdx, endIdx])

  const resizeGrid = useCallback((nr: number, nc: number) => {
    stopAnim()
    const newStart = Math.floor(nr/2) * nc + 2
    const newEnd   = Math.floor(nr/2) * nc + nc - 3
    setRows(nr); setCols(nc)
    setCells(Array(nr * nc).fill('empty'))
    setStartIdx(newStart); setEndIdx(newEnd)
    setVisited(new Set()); setFrontier(new Set()); setPath(new Set())
    setStats(null); setShowStats(false)
  }, [stopAnim])

  const runAlgo = useCallback(() => {
    if (animating) return
    clearPath()

    const walls   = new Set(cells.map((c,i) => c === 'wall' ? i : -1).filter(i => i >= 0))
    const weights = new Map(cells.map((c,i) => c === 'weight' ? [i, WEIGHT_COST] as [number,number] : null).filter(Boolean) as [number,number][])

    const t0 = performance.now()
    let frames: Frame[]
    switch (ALGOS[algoIdx].id) {
      case 'bfs':     frames = runBFS(startIdx, endIdx, cols, rows, walls); break
      case 'dfs':     frames = runDFS(startIdx, endIdx, cols, rows, walls); break
      case 'ucs':     frames = runUCS(startIdx, endIdx, cols, rows, walls, weights); break
      case 'astar':   frames = runAStar(startIdx, endIdx, cols, rows, walls, weights); break
      case 'idastar': frames = runIDAStar(startIdx, endIdx, cols, rows, walls, weights); break
      default:        frames = runBFS(startIdx, endIdx, cols, rows, walls); break
    }
    const elapsed = performance.now() - t0
    const s = computeStats(frames, weights, elapsed)

    frameRef.current = frames
    frameIdx.current = 0

    if (SPEEDS[speedIdx].ms === 0) {
      // Instant — jump to last frame
      const last = frames[frames.length - 1]
      setVisited(new Set(last.visited))
      setFrontier(new Set(last.frontier))
      setPath(new Set(last.path))
      setStats(s); setShowStats(true)
      setStatus(s.found
        ? `Rat found the cheese! ${s.pathLength} steps · cost ${s.pathCost}`
        : 'No path to cheese found!')
      return
    }

    setAnimating(true)
    setStatus(`Running ${ALGOS[algoIdx].name}... rat is sniffing!`)

    function step() {
      const idx = frameIdx.current
      const frames = frameRef.current
      if (idx >= frames.length) {
        setAnimating(false)
        setStats(s); setShowStats(true)
        setStatus(s.found
          ? `Rat found the cheese! ${s.pathLength} steps · cost ${s.pathCost}`
          : 'No path to cheese found!')
        return
      }
      const f = frames[idx]
      setVisited(new Set(f.visited))
      setFrontier(new Set(f.frontier))
      setPath(new Set(f.path))
      frameIdx.current++
      timerRef.current = setTimeout(step, SPEEDS[speedIdx].ms)
    }
    step()
  }, [animating, cells, algoIdx, speedIdx, cols, rows, startIdx, endIdx, clearPath])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showStats) { setShowStats(false); return }
      if (e.code === 'Space') { e.preventDefault(); runAlgo(); return }
      if (e.key === 'c' || e.key === 'C') clearPath()
      if (e.key === 'r' || e.key === 'R') resetGrid()
      if (e.key === 'm' || e.key === 'M') randomMaze()
      if (e.key === 's' || e.key === 'S') setDrawMode('start')
      if (e.key === 'e' || e.key === 'E') setDrawMode('end')
      if (e.key === 'w' || e.key === 'W') setDrawMode('weight')
      if (e.key === '=' || e.key === '+') resizeGrid(Math.min(rows+2,36), Math.min(cols+4,56))
      if (e.key === '-') resizeGrid(Math.max(rows-2,6), Math.max(cols-4,12))
      if (['1','2','3','4','5'].includes(e.key)) setAlgoIdx(+e.key - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showStats, runAlgo, clearPath, resetGrid, randomMaze, resizeGrid, rows, cols])

  // Paint cell
  const paintCell = useCallback((idx: number) => {
    if (idx === startIdx || idx === endIdx) return
    if (idx === lastDrawn.current) return
    lastDrawn.current = idx
    setCells(prev => {
      const next = [...prev]
      if (drawMode === 'wall')   { next[idx] = 'wall';   }
      if (drawMode === 'erase')  { next[idx] = 'empty';  }
      if (drawMode === 'weight') { next[idx] = 'weight'; }
      if (drawMode === 'start')  { setStartIdx(idx); next[idx] = 'empty'; }
      if (drawMode === 'end')    { setEndIdx(idx);   next[idx] = 'empty'; }
      return next
    })
  }, [drawMode, startIdx, endIdx])

  const handleMouseDown = (idx: number) => { isDrawing.current = true; lastDrawn.current = -1; paintCell(idx) }
  const handleMouseUp   = ()            => { isDrawing.current = false; lastDrawn.current = -1 }
  const handleMouseOver = (idx: number) => { if (isDrawing.current) paintCell(idx) }

  const getTouchIdx = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const idxStr = el?.getAttribute('data-idx')
    return idxStr !== null && idxStr !== undefined ? parseInt(idxStr) : -1
  }
  const handleTouchStart = (e: React.TouchEvent) => { e.preventDefault(); isDrawing.current = true; lastDrawn.current = -1; const i = getTouchIdx(e); if (i >= 0) paintCell(i) }
  const handleTouchMove  = (e: React.TouchEvent) => { e.preventDefault(); const i = getTouchIdx(e); if (i >= 0) paintCell(i) }
  const handleTouchEnd   = ()                     => { isDrawing.current = false; lastDrawn.current = -1 }

  const pathSet = path

  return (
    <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', height:'100vh', overflow: isMobile ? 'auto' : 'hidden', background:'var(--bg)', userSelect:'none' }}>

      {/* ── Side panel ── */}
      <aside style={{
        width: isMobile ? '100%' : 264, flexShrink: 0, background: 'var(--panel)',
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        display:'flex', flexDirection:'column',
        overflow:'hidden'
      }}>
        {/* Header */}
        <div style={{ padding:'20px 18px 14px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:10 }}>
            <RatIcon size={28}/> <CheeseIcon size={28}/>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, textAlign:'center', color:'var(--accent)', letterSpacing:'0.01em' }}>
            Rat in a Maze
          </h1>
          <p style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:3 }}>
            IAI Pathfinding Visualizer
          </p>
        </div>

        <div style={{ flex:1, overflow: isMobile ? 'auto' : 'auto', padding:'14px 14px 0', display: isMobile ? 'flex' : 'block', flexWrap: isMobile ? 'wrap' : undefined, gap: isMobile ? '0 16px' : undefined }}>

          {/* Algorithms */}
          <Section label="ALGORITHM">
            {ALGOS.map((a, i) => (
              <button key={a.id} onClick={() => setAlgoIdx(i)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:8,
                padding:'7px 10px', borderRadius:8, marginBottom:4,
                background: algoIdx === i ? '#2a1e08' : 'transparent',
                border: algoIdx === i ? '1px solid var(--border2)' : '1px solid transparent',
                color: algoIdx === i ? 'var(--accent2)' : 'var(--text2)',
                fontSize:13, textAlign:'left', transition:'all 0.15s',
                position:'relative'
              }}>
                {algoIdx === i && <div style={{ position:'absolute', left:0, top:4, bottom:4, width:3, background:'var(--accent)', borderRadius:'0 2px 2px 0' }}/>}
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, opacity:0.5, minWidth:16 }}>{i+1}</span>
                <span style={{ fontWeight: algoIdx===i ? 500 : 400 }}>{a.name}</span>
                <span style={{ fontSize:10, opacity:0.4, marginLeft:'auto' }}>[{i+1}]</span>
              </button>
            ))}
          </Section>

          {/* Draw mode */}
          <Section label="DRAW MODE">
            {([
              ['wall',   'Wall',           '#3a2c1a', null      ],
              ['erase',  'Erase',          '#5a2810', null      ],
              ['weight', `Moss (×${WEIGHT_COST})`, '#1a4010', 'moss'     ],
              ['start',  'Rat',            '#1a5c38', 'rat'     ],
              ['end',    'Cheese',         '#4a2808', 'cheese'  ],
            ] as [DrawMode, string, string, string|null][]).map(([mode, label, bg, icon]) => (
              <button key={mode} onClick={() => setDrawMode(mode)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:8,
                padding:'6px 10px', borderRadius:7, marginBottom:3,
                background: drawMode===mode ? '#2a1e08' : 'transparent',
                border: drawMode===mode ? '1px solid var(--border2)' : '1px solid transparent',
                color: drawMode===mode ? 'var(--text)' : 'var(--text2)',
                fontSize:13, textAlign:'left', transition:'all 0.15s'
              }}>
                <span style={{ width:16, height:16, borderRadius:3, background:bg, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {icon === 'rat' && <RatIcon size={12}/>}
                  {icon === 'cheese' && <CheeseIcon size={12}/>}
                  {icon === 'moss' && <MossIcon size={12}/>}
                </span>
                <span>{label}</span>
                <span style={{ marginLeft:'auto', fontSize:10, opacity:0.35, fontFamily:'var(--font-mono)' }}>
                  {mode==='wall'?'LMB':mode==='erase'?'RMB':mode==='weight'?'W':mode==='start'?'S':'E'}
                </span>
              </button>
            ))}
          </Section>

          {/* Speed */}
          <Section label="SPEED">
            <div style={{ display:'flex', gap:4 }}>
              {SPEEDS.map((s,i) => (
                <button key={s.label} onClick={() => setSpeedIdx(i)} style={{
                  flex:1, padding:'6px 0', borderRadius:6, fontSize:11,
                  background: speedIdx===i ? 'var(--accent)' : '#1e1408',
                  color: speedIdx===i ? '#000' : 'var(--text3)',
                  border: speedIdx===i ? 'none' : '1px solid var(--border)',
                  fontWeight: speedIdx===i ? 600 : 400,
                  transition:'all 0.15s'
                }}>{s.label}</button>
              ))}
            </div>
          </Section>

          {/* Maze size */}
          <Section label={`MAZE SIZE — ${cols}×${rows}`}>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => resizeGrid(Math.min(rows+2,36), Math.min(cols+4,56))} style={btnStyle}>+ Bigger</button>
              <button onClick={() => resizeGrid(Math.max(rows-2,6), Math.max(cols-4,12))} style={btnStyle}>- Smaller</button>
            </div>
          </Section>

          {/* Actions */}
          <Section label="ACTIONS">
            <button onClick={runAlgo} disabled={animating} style={{
              ...btnStyle, width:'100%', marginBottom:6,
              background: animating ? '#2a1e08' : 'var(--accent)',
              color: animating ? 'var(--text3)' : '#000',
              fontWeight:600, fontSize:14, padding:'9px',
              opacity: animating ? 0.5 : 1,
              animation: animating ? 'pulse 1.2s infinite' : 'none'
            }}>
              {animating ? 'Running...' : '▶ Run Algorithm'}
            </button>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
              {([['C','Clear',clearPath],['R','Reset',resetGrid],['M','Maze',randomMaze]] as [string, string, () => void][]).map(([k,l,fn]) => (
                <button key={k as string} onClick={() => (fn as () => void)()} style={{ ...btnStyle, flexDirection:'column', gap:1, padding:'7px 4px' }}>
                  <span style={{ fontFamily:'var(--font-mono)', color:'var(--accent)', fontSize:11 }}>[{k}]</span>
                  <span style={{ fontSize:11 }}>{l}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Legend */}
          <Section label="LEGEND">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px' }}>
              {[
                ['#1a5c38','Rat (start)', 'rat'],
                ['#4a2808','Cheese (end)', 'cheese'],
                ['#3a2c1a','Wall', null],
                ['#1a4010','Moss tile', 'moss'],
                ['#1e3a6e','Explored', null],
                ['#c8960a','Path', null],
              ].map(([col, lbl, icon]) => (
                <div key={lbl as string} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:14, height:14, borderRadius:3, background:col as string, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {icon==='rat' && <RatIcon size={10}/>}
                    {icon==='cheese' && <CheeseIcon size={10}/>}
                    {icon==='moss' && <MossIcon size={10}/>}
                  </span>
                  <span style={{ fontSize:11, color:'var(--text2)' }}>{lbl}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Status */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', fontSize:11, lineHeight:1.4, color: status.includes('found') && !status.includes('No') ? '#3aad4e' : status.includes('No path') ? '#c84030' : status.includes('Running') ? 'var(--accent)' : 'var(--text3)' }}>
          {status}
        </div>
      </aside>

      {/* ── Grid area ── */}
      <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative', minHeight: isMobile ? '55vh' : undefined }}>
        {/* Background texture */}
        <div style={{ position:'absolute', inset:0, opacity:0.03,
          backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(255,255,255,0.3) 20px,rgba(255,255,255,0.3) 21px),repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(255,255,255,0.3) 20px,rgba(255,255,255,0.3) 21px)'
        }}/>

        <div
          onMouseLeave={handleMouseUp}
          onContextMenu={e => { e.preventDefault(); isDrawing.current = true; setDrawMode('erase') }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ position:'relative', touchAction:'none' }}
        >
          {/* Stone border */}
          <div style={{ padding:4, background:'linear-gradient(135deg,#3d2e1c,#28200e)', borderRadius:10, boxShadow:'0 16px 48px rgba(0,0,0,0.6)' }}>
            <div style={{
              display:'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gap:1,
              background:'#0a0804',
              borderRadius:6,
              overflow:'hidden'
            }}
              onMouseUp={handleMouseUp}
            >
              {cells.map((type, idx) => {
                const isStart = idx === startIdx
                const isEnd   = idx === endIdx
                const style = getCellStyle(idx, type, visited, frontier, pathSet, startIdx, endIdx)

                return (
                  <div
                    key={idx}
                    data-idx={idx}
                    onMouseDown={() => handleMouseDown(idx)}
                    onMouseOver={() => handleMouseOver(idx)}
                    onMouseUp={handleMouseUp}
                    style={{
                      width: cellSize, height: cellSize,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor: 'crosshair', transition: type === 'wall' ? 'none' : 'background 0.08s',
                      ...style
                    }}
                  >
                    {isStart && <RatIcon size={Math.max(10, cellSize - 6)}/>}
                    {isEnd   && <CheeseIcon size={Math.max(10, cellSize - 6)}/>}
                    {!isStart && !isEnd && type === 'weight' && <MossIcon size={Math.max(8, cellSize - 8)}/>}
                    {/* Breadcrumb dot on path */}
                    {!isStart && !isEnd && pathSet.has(idx) && (
                      <div style={{ width: Math.max(3, cellSize/5), height: Math.max(3, cellSize/5), borderRadius:'50%', background:'#f0d040', boxShadow:'0 0 4px #f0d040' }}/>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ── Stats modal ── */}
      {showStats && stats && (
        <StatsModal stats={stats} algo={ALGOS[algoIdx]} onClose={() => setShowStats(false)}/>
      )}

      <style>{`
        @keyframes popIn  { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Section({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:'0.12em', color:'var(--text3)', marginBottom:7 }}>{label}</div>
      {children}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:4,
  padding:'7px 10px', borderRadius:7,
  background:'#1e1408', border:'1px solid var(--border)',
  color:'var(--text2)', fontSize:12, transition:'all 0.15s',
}
