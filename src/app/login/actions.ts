'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single()
  
  revalidatePath('/', 'layout')
  if (profile?.role === 'teacher') return redirect('/teacher')
  return redirect('/student')
}
