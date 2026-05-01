'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { QUESTIONS, type QuestionId } from '@/data/onboardingQuestions';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ProgressBar } from './ProgressBar';
import { QuestionSlide } from './QuestionSlide';
import { NumberInput } from './inputs/NumberInput';
import { BinaryChoice } from './inputs/BinaryChoice';
import { ScaleChoice } from './inputs/ScaleChoice';
import { CompletionScreen } from './CompletionScreen';

type Answers = Partial<Record<QuestionId, string | number>>;

const TOTAL = QUESTIONS.length;
const AUTO_ADVANCE_DELAY = 320;

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { playTick, playAdvance, playBack } = useSoundEffects();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isComplete = step >= TOTAL;
  const question = isComplete ? null : QUESTIONS[step];

  const goForward = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    playAdvance();
    setDirection('forward');
    setStep((s) => s + 1);
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating, playAdvance]);

  const goBack = useCallback(() => {
    if (isAnimating || step === 0) return;
    setIsAnimating(true);
    playBack();
    setDirection('back');
    setStep((s) => s - 1);
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating, step, playBack]);

  const handleAnswer = useCallback((id: QuestionId, value: string | number, autoAdvance = false) => {
    playTick();
    setAnswers((prev) => ({ ...prev, [id]: value }));

    if (autoAdvance) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => goForward(), AUTO_ADVANCE_DELAY);
    }
  }, [playTick, goForward]);

  const handleRestart = () => {
    setAnswers({});
    setDirection('forward');
    setStep(0);
  };

  const handleCompleteOnboarding = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Insert onboarding answers
      const { error: insertError } = await supabase.from('student_onboarding').insert({
        student_id: user.id,
        age: (answers.age as number) ?? null,
        gender: (answers.gender as string) ?? null,
        internet_access: (answers.internet as string) ?? null,
        resource_usage: (answers.resources as string) ?? null,
        extracurricular: (answers.extracurricular as string) ?? null,
        motivation_level: (answers.motivation as string) ?? null,
        group_discussions: (answers.discussions as string) ?? null,
        tech_usage: (answers.tech as string) ?? null,
        stress_level: (answers.stress as string) ?? null,
      });

      if (insertError) {
        console.error('Failed to save onboarding:', insertError);
        setIsSaving(false);
        return;
      }

      // Mark profile as onboarded
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);

      // Navigate to student dashboard
      router.push('/student');
      router.refresh();
    } catch (err) {
      console.error('Onboarding error:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated mesh background */}
      <div className="onboarding-mesh-gradient" aria-hidden>
        <div className="onboarding-mesh-gradient-inner" />
      </div>

      {/* Progress bar (only during questions) */}
      {!isComplete && question && (
        <ProgressBar current={step} total={TOTAL} section={question.section} />
      )}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {isComplete ? (
          <CompletionScreen
            answers={answers}
            onRestart={handleRestart}
            onComplete={handleCompleteOnboarding}
            isSaving={isSaving}
          />
        ) : question ? (
          <QuestionSlide slideKey={step} direction={direction}>
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-8">
              {/* Question text */}
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  {question.question}
                </h2>
                {question.description && (
                  <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
                    {question.description}
                  </p>
                )}
              </div>

              {/* Smart input */}
              <div className="w-full">
                {question.type === 'number' && (
                  <NumberInput
                    value={(answers[question.id] as number | '') ?? ''}
                    onChange={(val) => setAnswers((prev) => ({ ...prev, [question.id]: val === '' ? undefined : val }))}
                    onSubmit={goForward}
                    min={question.min}
                    max={question.max}
                    placeholder={question.placeholder}
                  />
                )}

                {question.type === 'selection' && question.inputStyle === 'binary' && question.options && (
                  <BinaryChoice
                    options={question.options}
                    selected={(answers[question.id] as string) ?? ''}
                    onSelect={(val) => handleAnswer(question.id, val, true)}
                  />
                )}

                {question.type === 'selection' && question.inputStyle === 'scale' && question.options && (
                  <ScaleChoice
                    options={question.options}
                    selected={(answers[question.id] as string) ?? ''}
                    onSelect={(val) => handleAnswer(question.id, val, true)}
                  />
                )}
              </div>

              {/* Navigation row */}
              <div className="flex items-center justify-between w-full max-w-sm mt-2">
                <button
                  onClick={goBack}
                  disabled={step === 0}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  ← Back
                </button>

                <span className="text-xs text-muted-foreground/60">
                  {step + 1} / {TOTAL}
                </span>

                {question.type === 'selection' && answers[question.id] ? (
                  <button
                    onClick={goForward}
                    className="text-sm text-foreground hover:opacity-80 transition-opacity flex items-center gap-1"
                  >
                    Next →
                  </button>
                ) : (
                  <span className="w-16" />
                )}
              </div>
            </div>
          </QuestionSlide>
        ) : null}
      </div>
    </div>
  );
}
