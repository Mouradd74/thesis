'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Award, Brain, Zap, CheckCircle2, XCircle, ArrowRight, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNextCATQuestion, submitCATAnswer } from '@/app/teacher/content/actions'
import { getAbilityLabel } from '@/lib/irt'

interface CATQuestion {
  question: string
  options: string[]
  answer: string
  hints?: string[]
  difficulty: number
  bank_index: number
}

interface AdaptiveExamPanelProps {
  examId: string
  initialTheta: number
}

type ExamState = 'loading' | 'answering' | 'feedback' | 'finished'

export function AdaptiveExamPanel({ examId, initialTheta }: AdaptiveExamPanelProps) {
  const [state, setState] = useState<ExamState>('loading')
  const [currentQuestion, setCurrentQuestion] = useState<CATQuestion | null>(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [theta, setTheta] = useState(initialTheta)
  const [standardError, setStandardError] = useState(Infinity)
  const [thetaHistory, setThetaHistory] = useState<number[]>([initialTheta])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<string>('')
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  // Client-side answer history — passed to server to avoid stale DB reads
  const [answerHistory, setAnswerHistory] = useState<{ bank_index: number; answer: string }[]>([])

  // Fetch the first (or next) question
  const fetchNextQuestion = useCallback(async () => {
    setState('loading')
    try {
      const result = await getNextCATQuestion(examId)

      if (result.finished) {
        setTheta(result.finalTheta || 0)
        setStandardError(result.standardError || 0)
        setTotalQuestions(result.totalQuestions || 0)
        // Rebuild theta history from responses
        if (result.responses && result.responses.length > 0) {
          setThetaHistory([initialTheta, ...result.responses.map((r: any) => r.theta_after)])
          // Rebuild answer history for resuming sessions
          setAnswerHistory(result.responses.map((r: any) => ({ bank_index: r.bank_index, answer: r.answer })))
        }
        setState('finished')
      } else {
        setCurrentQuestion(result.question || null)
        setQuestionNumber(result.questionNumber || 0)
        setTheta(result.currentTheta || 0)
        setStandardError(result.standardError || 0)
        setSelectedAnswer(null)
        setLastCorrect(null)
        setState('answering')
      }
    } catch (err) {
      console.error('Failed to fetch next CAT question:', err)
    }
  }, [examId, initialTheta])

  useEffect(() => {
    fetchNextQuestion()
  }, [fetchNextQuestion])

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return
    setSubmitting(true)

    try {
      const result = await submitCATAnswer(examId, currentQuestion.bank_index, selectedAnswer, answerHistory)

      // Track this answer in client history
      setAnswerHistory(prev => [...prev, { bank_index: currentQuestion.bank_index, answer: selectedAnswer }])

      setLastCorrect(result.correct)
      setLastCorrectAnswer(result.correctAnswer)
      setTheta(result.thetaAfter)
      setStandardError(result.seAfter)
      setThetaHistory(prev => [...prev, result.thetaAfter])

      setState('feedback')

      // Auto-advance using the next question from the SAME server call
      setTimeout(() => {
        const next = result.next
        if (next.finished) {
          setTheta(next.finalTheta)
          setStandardError(next.standardError)
          setTotalQuestions(next.totalQuestions)
          if (next.responses && next.responses.length > 0) {
            setThetaHistory([initialTheta, ...next.responses.map((r: any) => r.theta_after)])
          }
          setState('finished')
        } else {
          setCurrentQuestion(next.question)
          setQuestionNumber(next.questionNumber)
          setTheta(next.currentTheta)
          setStandardError(next.standardError)
          setSelectedAnswer(null)
          setLastCorrect(null)
          setState('answering')
        }
      }, 1800)
    } catch (err) {
      console.error('Failed to submit CAT answer:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Theta Gauge Visualization ----
  const thetaPercent = Math.max(0, Math.min(100, ((theta + 3) / 6) * 100))
  const seWidth = Math.min(40, standardError * 30) // Visual width of confidence band
  const abilityInfo = getAbilityLabel(theta)

  // ---- Loading State ----
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="relative">
          <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
          <Brain className="h-12 w-12 text-purple-400 relative animate-pulse" />
        </div>
        <p className="text-muted-foreground font-medium">Adaptive engine selecting optimal question...</p>
      </div>
    )
  }

  // ---- Finished State ----
  if (state === 'finished') {
    const abilityColors: Record<string, string> = {
      emerald: 'from-emerald-400 to-emerald-600',
      blue: 'from-blue-400 to-blue-600',
      cyan: 'from-cyan-400 to-cyan-600',
      amber: 'from-amber-400 to-amber-600',
      red: 'from-red-400 to-red-600',
    }

    return (
      <div className="flex flex-col items-center gap-8 py-10 animate-in zoom-in-95 duration-700">
        <div className="relative">
          <div className="absolute -inset-6 bg-purple-500/20 rounded-full blur-2xl animate-pulse"></div>
          <Award className="h-24 w-24 text-purple-500 relative" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-3xl font-bold text-foreground">Assessment Complete</h3>
          <p className="text-muted-foreground">Your ability has been precisely calibrated using Computerized Adaptive Testing.</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${abilityColors[abilityInfo.color] || 'from-purple-400 to-blue-500'}`}>
            θ = {theta.toFixed(2)}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest bg-${abilityInfo.color}-500/10 text-${abilityInfo.color}-500 border border-${abilityInfo.color}-500/20`}>
              {abilityInfo.label}
            </span>
            <span className="text-xs text-muted-foreground">± {standardError.toFixed(2)} SE</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-md">
          <div className="text-center p-4 bg-zinc-900/60 rounded-xl border border-white/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Questions</p>
            <p className="text-2xl font-bold">{totalQuestions}</p>
          </div>
          <div className="text-center p-4 bg-zinc-900/60 rounded-xl border border-white/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Precision</p>
            <p className="text-2xl font-bold">{Math.max(0, Math.round((1 - standardError) * 100))}%</p>
          </div>
          <div className="text-center p-4 bg-zinc-900/60 rounded-xl border border-white/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Scale</p>
            <p className="text-2xl font-bold text-purple-400">{theta >= 0 ? '+' : ''}{theta.toFixed(1)}</p>
          </div>
        </div>

        {/* Theta Convergence History */}
        {thetaHistory.length > 1 && (
          <div className="w-full max-w-md p-4 bg-zinc-900/40 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ability Convergence</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {thetaHistory.map((t, i) => {
                const height = Math.max(8, ((t + 3) / 6) * 100)
                const isLast = i === thetaHistory.length - 1
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-all duration-500 ${isLast ? 'bg-purple-500' : 'bg-zinc-700'}`}
                    style={{ height: `${height}%` }}
                    title={`Q${i}: θ = ${t.toFixed(2)}`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zinc-600">Start</span>
              <span className="text-[10px] text-zinc-600">End</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- Answering / Feedback State ----
  return (
    <div className="flex flex-col gap-6">
      {/* Live Theta Gauge */}
      <div className="p-4 bg-zinc-900/40 rounded-xl border border-purple-500/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Ability Estimate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-purple-400">θ = {theta.toFixed(2)}</span>
            <span className="text-[10px] text-zinc-600">SE: {standardError === Infinity ? '∞' : standardError.toFixed(2)}</span>
          </div>
        </div>

        {/* Gauge */}
        <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
          {/* Confidence band */}
          <div
            className="absolute h-full bg-purple-500/15 rounded-full transition-all duration-700"
            style={{
              left: `${Math.max(0, thetaPercent - seWidth)}%`,
              width: `${seWidth * 2}%`
            }}
          />
          {/* Theta marker */}
          <div
            className="absolute top-0 h-full w-1 bg-purple-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
            style={{ left: `${thetaPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-zinc-600">-3 Novice</span>
          <span className="text-[10px] text-zinc-600">0 Proficient</span>
          <span className="text-[10px] text-zinc-600">+3 Expert</span>
        </div>

        {/* Convergence indicator */}
        <div className="flex items-center gap-2 mt-3">
          <Zap className="h-3 w-3 text-cyan-400" />
          <span className="text-[10px] text-muted-foreground">
            Calibrating... {standardError !== Infinity ? `${Math.max(0, Math.round((1 - standardError / 1.5) * 100))}% confident` : 'Warming up'}
          </span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-700"
              style={{ width: `${standardError !== Infinity ? Math.max(0, Math.round((1 - standardError / 1.5) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block px-3 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Question {questionNumber}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono">
              Difficulty: {currentQuestion.difficulty > 0 ? '+' : ''}{currentQuestion.difficulty.toFixed(1)}
            </span>
          </div>

          <h3 className="text-2xl font-semibold text-foreground leading-tight mb-6">
            {currentQuestion.question}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === option
              const showFeedback = state === 'feedback'
              const isCorrect = option === lastCorrectAnswer
              const isWrongSelected = isSelected && !lastCorrect

              let classes = 'group relative flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all text-left '

              if (showFeedback) {
                if (isCorrect) classes += 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                else if (isWrongSelected) classes += 'bg-red-500/10 border-red-500/50 ring-1 ring-red-500/30'
                else classes += 'bg-zinc-900 border-border/50 opacity-40'
              } else if (isSelected) {
                classes += 'bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
              } else {
                classes += 'bg-zinc-900 border-border/50 hover:border-zinc-500 cursor-pointer'
              }

              return (
                <button
                  key={idx}
                  onClick={() => state === 'answering' && setSelectedAnswer(option)}
                  disabled={state !== 'answering'}
                  className={classes}
                >
                  <div className={`flex items-center justify-center h-8 w-8 rounded-lg border text-sm font-bold transition-all ${
                    showFeedback && isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' :
                    showFeedback && isWrongSelected ? 'bg-red-500 border-red-400 text-white' :
                    isSelected ? 'bg-purple-500 border-purple-400 text-white' :
                    'bg-zinc-800 border-zinc-700 text-muted-foreground'
                  }`}>
                    {showFeedback && isCorrect ? <CheckCircle2 className="h-4 w-4" /> :
                     showFeedback && isWrongSelected ? <XCircle className="h-4 w-4" /> :
                     String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`text-lg transition-colors ${
                    showFeedback && isCorrect ? 'text-emerald-300' :
                    showFeedback && isWrongSelected ? 'text-red-300' :
                    isSelected ? 'text-purple-100' :
                    'text-muted-foreground group-hover:text-zinc-300'
                  }`}>
                    {option}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Submit button */}
      {state === 'answering' && (
        <div className="flex justify-end pt-4 border-t border-border/40">
          <Button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || submitting}
            className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-8 h-12 flex items-center gap-2 shadow-lg"
          >
            {submitting ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>Confirm Answer <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}

      {/* Feedback state */}
      {state === 'feedback' && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border animate-in fade-in zoom-in-95 duration-300 ${
          lastCorrect
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {lastCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="font-medium">
            {lastCorrect ? 'Correct! Adjusting difficulty upward...' : 'Incorrect. Adjusting difficulty downward...'}
          </span>
          <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
