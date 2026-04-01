'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { EventType, updateBayesianProfile, determineStyleAndConfidence, BayesianProfile } from '@/lib/naiveBayes'
import { BanditArm, selectBanditArm, ContentType } from '@/lib/banditEngine'

export async function logInteraction(subjectId: string, event: EventType, contentType?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 1. Insert interaction log
  const { error } = await supabase.from('student_interactions').insert({
    student_id: user.id,
    subject_id: subjectId,
    content_type: contentType || null,
    event_type: event.replace(/_(video|audio|text)$/, '') // Store base event type if wanted, but the schema allows any string in event_type if we didn't restrict it, wait.
  })
  if (error) console.error('Failed to log interaction', error)

  // DB Schema:
  // content_type text CHECK (content_type IN ('video','audio','text', 'general'))
  // event_type text CHECK (event_type IN ('content_open','hint_used','quiz_score_high','quiz_score_low','content_reopen'))

  let dbEventType = ''
  if (event.includes('content_open')) dbEventType = 'content_open'
  else if (event.includes('hint_used')) dbEventType = 'hint_used'
  else if (event.includes('quiz_score_high')) dbEventType = 'quiz_score_high'
  else if (event.includes('quiz_score_low')) dbEventType = 'quiz_score_low'
  else if (event.includes('content_reopen')) dbEventType = 'content_reopen'

  let dbContentType = contentType || 'general'
  if (event.includes('video')) dbContentType = 'video'
  else if (event.includes('audio')) dbContentType = 'audio'
  else if (event.includes('text')) dbContentType = 'text'

  await supabase.from('student_interactions').insert({
    student_id: user.id,
    subject_id: subjectId,
    content_type: dbContentType,
    event_type: dbEventType
  })

  // 2. Update Naive Bayes Profile
  // Get current profile
  let { data: profile } = await supabase
    .from('learning_style_profiles')
    .select('*')
    .eq('student_id', user.id)
    .eq('subject_id', subjectId)
    .maybeSingle()

  if (!profile) {
    // Create default
    profile = {
      student_id: user.id,
      subject_id: subjectId,
      visual_prob: 0.333,
      auditory_prob: 0.333,
      reading_prob: 0.334,
      interaction_count: 0
    }
  }

  const currentProb: BayesianProfile = {
    visualProb: profile.visual_prob,
    auditoryProb: profile.auditory_prob,
    readingProb: profile.reading_prob,
  }

  // Update
  const newProb = updateBayesianProfile(currentProb, event)
  const { predictedStyle, confidence } = determineStyleAndConfidence(newProb)

  // Save back
  await supabase
    .from('learning_style_profiles')
    .upsert({
      student_id: user.id,
      subject_id: subjectId,
      visual_prob: newProb.visualProb,
      auditory_prob: newProb.auditoryProb,
      reading_prob: newProb.readingProb,
      predicted_style: predictedStyle,
      confidence: confidence,
      interaction_count: (profile.interaction_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
}

export async function getLearningStyleProfile(studentId: string, subjectId?: string) {
  const supabase = await createClient()

  if (subjectId) {
    const { data: profile } = await supabase
      .from('learning_style_profiles')
      .select('*')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .maybeSingle()
    
    return profile
  } else {
    // Aggregate across all subjects
    const { data: profiles } = await supabase
      .from('learning_style_profiles')
      .select('*')
      .eq('student_id', studentId)

    if (!profiles || profiles.length === 0) return null

    // Simple majority vote for aggregated style
    let vProb = 0, aProb = 0, rProb = 0
    profiles.forEach(p => {
      vProb += Number(p.visual_prob)
      aProb += Number(p.auditory_prob)
      rProb += Number(p.reading_prob)
    })
    
    const count = profiles.length
    const avgProb: BayesianProfile = {
      visualProb: vProb / count,
      auditoryProb: aProb / count,
      readingProb: rProb / count
    }

    const { predictedStyle, confidence } = determineStyleAndConfidence(avgProb)
    return {
      predicted_style: predictedStyle,
      confidence,
      interaction_count: profiles.reduce((acc, p) => acc + (p.interaction_count || 0), 0)
    }
  }
}

export async function getBanditRecommendation(studentId: string, subjectId: string): Promise<ContentType> {
  const supabase = await createClient()
  
  const { data: arms } = await supabase
    .from('bandit_arms')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
  
  return selectBanditArm((arms || []) as BanditArm[])
}

export async function recordBanditReward(subjectId: string, contentType: ContentType, score: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  // Reward if score is >= 70
  const isWin = score >= 70 ? 1 : 0

  // Get current arm
  const { data: arm } = await supabase
    .from('bandit_arms')
    .select('*')
    .eq('student_id', user.id)
    .eq('subject_id', subjectId)
    .eq('content_type', contentType)
    .maybeSingle()

  await supabase
    .from('bandit_arms')
    .upsert({
      student_id: user.id,
      subject_id: subjectId,
      content_type: contentType,
      trials: (arm?.trials || 0) + 1,
      wins: (arm?.wins || 0) + isWin,
      updated_at: new Date().toISOString()
    })
}
