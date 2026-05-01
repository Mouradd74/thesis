import { login } from './actions'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'
import { Layers } from 'lucide-react'

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px]">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80">
        <Layers className="h-5 w-5" />
        EduPlatform
      </Link>
      
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col space-y-2 text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Enter your credentials to access your portal</p>
        </div>

        <Card className="border-border/50 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
          <form action={login}>
            <CardContent className="pt-6">
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-zinc-950/50" />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="#" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="password" name="password" type="password" required className="bg-zinc-950/50" />
                </div>
                
                {error && (
                  <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                    {error}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-6">
              <SubmitButton className="w-full h-11">Sign In</SubmitButton>
              <div className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup" className="text-foreground hover:underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
