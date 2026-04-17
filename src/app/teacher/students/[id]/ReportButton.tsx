'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Loader2, Copy, Check } from 'lucide-react'
import { generateProgressReport } from './actions'

export function ReportButton({ studentId }: { studentId: string }) {
  const [report, setReport] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    
    const result = await generateProgressReport(studentId)
    
    if (result.error) {
      setError(result.error)
    } else if (result.report) {
      setReport(result.report)
    }
    
    setIsLoading(false)
  }

  function handleCopy() {
    if (report) {
      navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-4 items-end w-full md:w-auto mt-4 md:mt-0">
      <Button 
        onClick={handleGenerate} 
        disabled={isLoading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {report ? 'Regenerate Report' : 'Generate AI Report'}
      </Button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {report && (
        <Card className="w-full md:w-[600px] mt-4 bg-zinc-950/80 border-indigo-500/20 shadow-xl shadow-indigo-500/5 relative animate-in fade-in slide-in-from-top-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-8 w-8 hover:bg-zinc-800"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <CardContent className="pt-6 pb-6 px-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            <div 
              className="prose prose-sm prose-invert prose-indigo max-w-none"
              // A safer way would be to use a proper markdown renderer, but for a simple trusted LLM output, basic formatting is okay, 
              // or just splitting lines if simple. A robust way is replacing markdown elements to basic HTML to avoid dependency bloat.
              // We'll use a very simple regex replacer for bold and headers to keep it lightweight.
              dangerouslySetInnerHTML={{ 
                __html: report
                  .replace(/### (.*?)\n/g, '<h3 class="text-indigo-400 mt-4 mb-2 font-semibold">$&</h3>') // simple h3
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-300">$1</strong>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/- (.*?)\n/g, '<li class="ml-4 list-disc">$1</li>')
              }} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
