'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowUpDown } from 'lucide-react'

interface HeatmapData {
  students: { id: string, name: string }[]
  concepts: string[]
  matrix: Record<string, Record<string, number>> // student_id -> concept -> p_mastery
}

export function MasteryHeatmap({ data }: { data: HeatmapData }) {
  const [sortConcept, setSortConcept] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const sortedStudents = useMemo(() => {
    let sorted = [...data.students]
    if (sortConcept) {
      sorted.sort((a, b) => {
        const valA = data.matrix[a.id]?.[sortConcept] || 0
        const valB = data.matrix[b.id]?.[sortConcept] || 0
        return sortAsc ? valA - valB : valB - valA
      })
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [data, sortConcept, sortAsc])

  function handleSort(concept: string) {
    if (sortConcept === concept) {
      setSortAsc(!sortAsc)
    } else {
      setSortConcept(concept)
      setSortAsc(true)
    }
  }

  // Calculate averages per concept
  const conceptAverages = useMemo(() => {
    const avgs: Record<string, number> = {}
    data.concepts.forEach(c => {
      let sum = 0
      let count = 0
      data.students.forEach(s => {
        if (data.matrix[s.id] && typeof data.matrix[s.id][c] === 'number') {
          sum += data.matrix[s.id][c]
          count++
        }
      })
      avgs[c] = count > 0 ? sum / count : 0
    })
    return avgs
  }, [data])

  function getColor(val?: number) {
    if (val === undefined) return 'bg-zinc-900 border-white/5' // no data
    if (val < 0.4) return 'bg-red-500/80 border-red-500 hover:bg-red-500' // bad
    if (val < 0.8) return 'bg-amber-500/80 border-amber-500 hover:bg-amber-500' // medium
    return 'bg-emerald-500/80 border-emerald-500 hover:bg-emerald-500' // good
  }

  if (data.concepts.length === 0 || data.students.length === 0) {
    return null
  }

  return (
    <Card className="bg-zinc-950/40 border-border/50 shadow-none overflow-hidden mt-8">
      <CardHeader>
        <CardTitle className="text-xl">Class-Wide Mastery Heatmap</CardTitle>
        <CardDescription>Visual matrix of topic mastery. Click a column header to sort students.</CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 overflow-x-auto custom-scrollbar">
        <div className="min-w-max pb-4">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground uppercase bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-r border-white/5 sticky left-0 z-20 bg-zinc-900/80 backdrop-blur-md">
                  Student Snapshot
                </th>
                {data.concepts.map((c, i) => (
                  <th 
                    key={i} 
                    className="px-4 py-4 font-medium border-b border-white/5 cursor-pointer hover:bg-zinc-800 transition-colors group relative"
                    onClick={() => handleSort(c)}
                  >
                    <div className="flex items-center gap-1 justify-center whitespace-nowrap">
                      {c.length > 20 ? c.substring(0,20)+'...' : c}
                      <ArrowUpDown className={`h-3 w-3 transition-opacity ${sortConcept === c ? 'opacity-100 text-foreground' : 'opacity-0 group-hover:opacity-50'}`} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-white/5">
              {sortedStudents.map(student => (
                <tr key={student.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-3 border-r border-white/5 sticky left-0 z-10 bg-zinc-950/80 backdrop-blur-md font-medium whitespace-nowrap">
                    <Link href={`/teacher/students/${student.id}`} className="hover:text-emerald-400 transition-colors">
                      {student.name}
                    </Link>
                  </td>
                  {data.concepts.map((c, i) => {
                    const val = data.matrix[student.id]?.[c]
                    return (
                      <td key={i} className="px-2 py-2">
                        <div 
                          className={`w-full h-8 rounded-md border flex items-center justify-center transition-all cursor-help ${getColor(val)}`}
                          title={val !== undefined ? `${c}: ${Math.round(val * 100)}% mastery` : 'No data'}
                        >
                          {val !== undefined ? (
                            <span className="text-[10px] font-bold text-white shadow-sm drop-shadow-md">
                              {Math.round(val * 100)}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">-</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>

            <tfoot className="bg-zinc-900/30">
              <tr>
                <td className="px-6 py-4 font-semibold border-t border-r border-white/5 sticky left-0 z-20 bg-zinc-900 text-right text-muted-foreground uppercase text-xs">
                  Class Average
                </td>
                {data.concepts.map((c, i) => (
                  <td key={i} className="px-4 py-4 border-t border-white/5 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${conceptAverages[c] < 0.5 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {Math.round(conceptAverages[c] * 100)}%
                    </span>
                  </td>
                ))}
              </tr>
            </tfoot>

          </table>
        </div>
      </CardContent>
    </Card>
  )
}
