import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rat in a Maze — Pathfinding Visualizer',
  description: 'Interactive AI pathfinding visualizer — BFS, DFS, UCS, A*, IDA*',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
