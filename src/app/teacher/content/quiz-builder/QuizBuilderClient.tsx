'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Plus, Trash2, Zap, Save, RefreshCw } from 'lucide-react'
import { analyzeKnowledgeGaps, generateTargetedQuestions, saveCustomQuiz, suggestDifficulty } from './actions'

interface QuizQuestion {
  question: string
  options: string[]
  answer: string
  hints: string[]
  difficulty: number
}

interface GapMapping {
  concept: string
  avgMastery: number
  studentCount: number
}

export function QuizBuilderClient({ subjects }: { subjects: { id: string, title: string }[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '')
  const [lessonTitle, setLessonTitle] = useState('')
  const [gaps, setGaps] = useState<GapMapping[]>([])
  const [isLoadingGaps, setIsLoadingGaps] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (subjectId) {
      loadGaps()
    }
  }, [subjectId])

  async function loadGaps() {
    setIsLoadingGaps(true)
    const data = await analyzeKnowledgeGaps(subjectId)
    setGaps(data.slice(0, 5)) // Top 5 weakest concepts
    setIsLoadingGaps(false)
  }

  async function handleAutoGenerate() {
    if (gaps.length === 0) return alert('No knowledge gaps found to target. Try manual creation.')
    setIsGenerating(true)
    const weakConcepts = gaps.map(g => g.concept)
    const newQs = await generateTargetedQuestions(subjectId, weakConcepts)
    
    if (newQs && Array.isArray(newQs)) {
      setQuestions([...questions, ...newQs])
    } else {
      alert('Failed to generate questions. Please try again or create manually.')
    }
    setIsGenerating(false)
  }

  async function handleSave() {
    if (!lessonTitle) return alert('Please provide a Lesson Topic Name.')
    if (questions.length === 0) return alert('Please add at least one question.')
    
    setIsSaving(true)
    try {
      await saveCustomQuiz(subjectId, lessonTitle, questions)
      alert('Quiz successfully saved and published!')
      setLessonTitle('')
      setQuestions([])
    } catch (err: any) {
      alert('Error saving quiz: ' + err.message)
    }
    setIsSaving(false)
  }

  function updateQuestion(index: number, field: keyof QuizQuestion, value: any) {
    const newQs = [...questions]
    newQs[index] = { ...newQs[index], [field]: value }
    setQuestions(newQs)
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  function addEmptyQuestion() {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      answer: '',
      hints: ['', ''],
      difficulty: 0.0
    }])
  }

  async function handleSuggestDifficulty(index: number) {
    const q = questions[index]
    if (!q.question) return
    const diff = await suggestDifficulty(subjectId, q.question)
    updateQuestion(index, 'difficulty', diff)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Sidebar: Configuration & Gap Analysis */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        <Card className="bg-zinc-950/40 border-border/50">
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Target Subject</Label>
              <select 
                value={subjectId} 
                onChange={(e) => setSubjectId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Lesson / Topic Name</Label>
              <Input 
                value={lessonTitle} 
                onChange={(e) => setLessonTitle(e.target.value)} 
                placeholder="e.g. Linear Algebra Fundamentals" 
                className="bg-zinc-900 border-white/5" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/40 border-emerald-500/20 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
          <CardHeader>
            <CardTitle className="text-emerald-500 flex items-center justify-between">
              Knowledge Gaps
              {isLoadingGaps && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription className="text-xs">Based on class-wide BKT mastery across this subject.</CardDescription>
          </CardHeader>
          <CardContent>
            {gaps.length > 0 ? (
              <div className="flex flex-col gap-3">
                {gaps.map((g, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-lg border border-white/5">
                    <div className="flex flex-col max-w-[70%]">
                      <span className="text-xs font-medium truncate" title={g.concept}>{g.concept}</span>
                      <span className="text-[10px] text-muted-foreground">Tested locally by {g.studentCount} students</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${g.avgMastery < 0.5 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {Math.round(g.avgMastery * 100)}%
                    </span>
                  </div>
                ))}
                <Button 
                  onClick={handleAutoGenerate} 
                  disabled={isGenerating}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Auto-Generate Questions
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-zinc-900/30 p-4 rounded-xl border border-dashed border-white/10 text-center">
                Not enough data to analyze yet.
              </p>
            )}
          </CardContent>
        </Card>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving || questions.length === 0}
          className="w-full h-12 text-md shadow-md"
        >
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Save & Publish Quiz
        </Button>
      </div>

      {/* Main Content: Question Builder */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="flex justify-between items-center border-b border-border/50 pb-2">
          <h2 className="text-xl font-semibold tracking-tight">Question Pool ({questions.length})</h2>
          <Button variant="outline" size="sm" onClick={addEmptyQuestion} className="border-white/10 hover:bg-zinc-900">
            <Plus className="mr-2 h-4 w-4" /> Add Manual Question
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-950/40 rounded-2xl border border-dashed border-border/50">
            <BookOpenIcon className="h-12 w-12 text-zinc-800 mb-4" />
            <p className="text-muted-foreground text-center max-w-sm">
              Your quiz is empty. You can autogenerate targeted questions using the Knowledge Gap tool, or add your own manually.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {questions.map((q, idx) => (
              <Card key={idx} className="bg-zinc-950/40 border-border/50 relative overflow-visible">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeQuestion(idx)}
                  className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 z-10 transition-colors shadow-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                
                <CardContent className="pt-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Question {idx + 1}</Label>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">IRT Diff ({q.difficulty.toFixed(1)})</Label>
                        <input 
                          type="range" 
                          min="-3.0" max="3.0" step="0.1" 
                          value={q.difficulty}
                          onChange={(e) => updateQuestion(idx, 'difficulty', parseFloat(e.target.value))}
                          className="w-24 accent-purple-500"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 ml-1 hover:bg-zinc-800 text-purple-400" 
                          onClick={() => handleSuggestDifficulty(idx)}
                          title="Auto-Suggest Difficulty"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Input 
                      value={q.question} 
                      onChange={(e) => updateQuestion(idx, 'question', e.target.value)} 
                      placeholder="Enter question text..." 
                      className="bg-zinc-900 border-white/5 h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground ml-1">Option {oIdx + 1}</Label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name={`answer-${idx}`} 
                            checked={q.answer === opt && opt !== ''}
                            onChange={() => updateQuestion(idx, 'answer', opt)}
                            className="w-4 h-4 text-emerald-500 bg-zinc-900 border-white/10"
                            disabled={!opt}
                          />
                          <Input 
                            value={opt} 
                            onChange={(e) => {
                              const newOps = [...q.options];
                              newOps[oIdx] = e.target.value;
                              updateQuestion(idx, 'options', newOps);
                              if (q.answer === opt) updateQuestion(idx, 'answer', e.target.value);
                            }}
                            placeholder={`Choice ${oIdx + 1}`} 
                            className={`bg-zinc-900 border-white/5 ${q.answer === opt && opt !== '' ? 'border-emerald-500/50 ring-1 ring-emerald-500/50' : ''}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-white/5">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-amber-500 flex items-center gap-1 font-semibold uppercase">Hint Level 1 (Conceptual)</Label>
                      <Input 
                        value={q.hints[0] || ''} 
                        onChange={(e) => updateQuestion(idx, 'hints', [e.target.value, q.hints[1] || ''])} 
                        placeholder="Gentle nudge..." 
                        className="bg-zinc-900/50 border-white/5 text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold uppercase">Hint Level 2 (Specific)</Label>
                      <Input 
                        value={q.hints[1] || ''} 
                        onChange={(e) => updateQuestion(idx, 'hints', [q.hints[0] || '', e.target.value])} 
                        placeholder="Direct guidance..." 
                        className="bg-zinc-900/50 border-white/5 text-sm h-8"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BookOpenIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
