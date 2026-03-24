'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Award, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitExamAttempt } from '@/app/teacher/content/actions'

interface Question {
  question: string
  options: string[]
  answer: string
}

interface ExamPanelProps {
  examId: string
  questions: Question[]
}

export function ExamPanel({ examId, questions }: ExamPanelProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // Local storage check to see if already submitted (simple persistence)
  useEffect(() => {
    const saved = localStorage.getItem(`exam_${examId}`)
    if (saved) {
      const data = JSON.parse(saved)
      setAnswers(data.answers)
      setScore(data.score)
      setSubmitted(true)
    }
  }, [examId])

  const handleSelect = (qIdx: number, option: string) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIdx]: option }))
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Please answer all questions before submitting your final exam.')
      return
    }

    setLoading(true)
    try {
      let correctCount = 0
      questions.forEach((q, idx) => {
        if (answers[idx] === q.answer) correctCount++
      })

      const finalScore = Math.round((correctCount / questions.length) * 100)
      
      const formData = new FormData()
      formData.append('exam_id', examId)
      formData.append('answers', JSON.stringify(answers))
      formData.append('score', finalScore.toString())

      await submitExamAttempt(formData)
      
      setScore(finalScore)
      setSubmitted(true)
      localStorage.setItem(`exam_${examId}`, JSON.stringify({ answers, score: finalScore }))
    } catch (err) {
      console.error('Failed to submit exam:', err)
      alert('Error saving your exam. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-8 py-12 animate-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
          <Award className="h-24 w-24 text-purple-500 relative" />
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-3xl font-bold text-foreground">Exam Complete!</h3>
          <p className="text-muted-foreground italic">You've mastered the concepts you previously struggled with.</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
            {score}%
          </div>
          <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold uppercase tracking-widest">
            {score && score >= 80 ? 'Distinction' : score && score >= 50 ? 'Passed' : 'Completed'}
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={() => setSubmitted(false)} 
          className="rounded-full border-purple-500/30 hover:bg-purple-500/10"
        >
          Review My Answers
        </Button>
      </div>
    )
  }

  const activeQuestion = questions[currentStep]

  return (
    <div className="flex flex-col gap-8">
      {/* Progress Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {currentStep + 1} / {questions.length}
        </span>
      </div>

      <div className="min-h-[300px] animate-in slide-in-from-right-4 duration-300">
        <div className="mb-8">
            <span className="inline-block px-3 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Question {currentStep + 1}
            </span>
            <h3 className="text-2xl font-semibold text-foreground leading-tight">
                {activeQuestion.question}
            </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {activeQuestion.options.map((option, idx) => {
                const isSelected = answers[currentStep] === option
                return (
                    <button
                        key={idx}
                        onClick={() => handleSelect(currentStep, option)}
                        className={`group relative flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all text-left ${
                            isSelected 
                            ? 'bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                            : 'bg-zinc-900 border-border/50 hover:border-zinc-500'
                        }`}
                    >
                        <div className={`flex items-center justify-center h-8 w-8 rounded-lg border text-sm font-bold transition-all ${
                            isSelected ? 'bg-purple-500 border-purple-400 text-white' : 'bg-zinc-800 border-zinc-700 text-muted-foreground'
                        }`}>
                            {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-lg transition-colors ${isSelected ? 'text-purple-100' : 'text-muted-foreground group-hover:text-zinc-300'}`}>
                            {option}
                        </span>
                    </button>
                )
            })}
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-border/40">
        <Button
            variant="ghost"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="rounded-xl"
        >
            Previous
        </Button>

        {currentStep < questions.length - 1 ? (
            <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!answers[currentStep]}
                className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-8 h-12 flex items-center gap-2"
            >
                Next <ArrowRight className="h-4 w-4" />
            </Button>
        ) : (
            <Button
                onClick={handleSubmit}
                disabled={loading || Object.keys(answers).length < questions.length}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-8 h-12"
            >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Finalize Exam'}
            </Button>
        )}
      </div>
    </div>
  )
}
