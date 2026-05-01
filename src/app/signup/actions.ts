'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        role: formData.get('role') as string,
      }
    }
  }

  const { error, data: authData } = await supabase.auth.signUp(data)

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  if (authData?.user) {
    const { error: profileError } = await supabase.from('profiles').insert([
      { 
        id: authData.user.id, 
        role: formData.get('role') as string,
        full_name: formData.get('full_name') as string
      }
    ])
    if (profileError) {
      return redirect(`/signup?error=${encodeURIComponent('Profile Error: ' + profileError.message)}`)
    }
  }

  revalidatePath('/', 'layout')
  
  if (formData.get('role') === 'teacher') return redirect('/teacher')
  return redirect('/onboarding')
}
