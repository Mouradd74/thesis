'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSubject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  await supabase.from('subjects').insert({
    teacher_id: user.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
  })

  revalidatePath('/teacher', 'layout')
}

export async function createContent(formData: FormData) {
  const supabase = await createClient()
  
  await supabase.from('content').insert({
    subject_id: formData.get('subject_id') as string,
    title: formData.get('title') as string,
    type: formData.get('type') as string,
    url: formData.get('url') as string || null,
    body: formData.get('body') as string || null,
  })

  revalidatePath('/teacher', 'layout')
}
