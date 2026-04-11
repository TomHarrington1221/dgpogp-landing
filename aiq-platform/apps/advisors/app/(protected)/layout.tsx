import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check disclaimer acceptance (skip for disclaimer page itself)
  const { data: profile } = await supabase
    .from('users')
    .select('disclaimer_accepted')
    .eq('id', user.id)
    .single()

  // Will be null on very first load before trigger fires — treat as not accepted
  const disclaimerAccepted = profile?.disclaimer_accepted ?? false

  return (
    <>
      {children}
      {/* Disclaimer check is handled per-page for disclaimer route itself */}
    </>
  )
}
