'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'

export function SubjectFilter({ subjects }: { subjects: { id: string, title: string }[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSubject = searchParams.get('subject') || 'all'

  const handleSelect = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'all') {
      params.delete('subject')
    } else {
      params.set('subject', id)
    }
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Button
        variant={currentSubject === 'all' ? 'default' : 'outline'}
        onClick={() => handleSelect('all')}
        className={`rounded-full h-8 px-4 text-xs ${currentSubject === 'all' ? 'bg-primary' : 'bg-transparent border-white/10 hover:bg-zinc-900 text-muted-foreground'}`}
      >
        All Subjects
      </Button>
      {subjects.map(sub => (
        <Button
          key={sub.id}
          variant={currentSubject === sub.id ? 'default' : 'outline'}
          onClick={() => handleSelect(sub.id)}
          className={`rounded-full h-8 px-4 text-xs ${currentSubject === sub.id ? 'bg-primary' : 'bg-transparent border-white/10 hover:bg-zinc-900 text-muted-foreground'}`}
        >
          {sub.title}
        </Button>
      ))}
    </div>
  )
}
