'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function enrollStudent(formData: FormData) {
  const supabase = await createClient()
  
  await supabase.from('enrollments').insert({
    student_id: formData.get('student_id') as string,
    subject_id: formData.get('subject_id') as string,
    motivation_score: 5,
    attendance_rate: 100
  })

  revalidatePath('/teacher', 'layout')
}

export async function updateMetrics(formData: FormData) {
  const supabase = await createClient()

  await supabase.from('enrollments').update({
    motivation_score: parseInt(formData.get('motivation_score') as string),
    attendance_rate: parseFloat(formData.get('attendance_rate') as string)
  }).eq('id', formData.get('enrollment_id') as string)

  revalidatePath('/teacher', 'layout')
}
