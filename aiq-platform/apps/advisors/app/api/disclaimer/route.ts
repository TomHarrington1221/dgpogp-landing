import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const forwardedFor = req.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // Log the disclaimer acceptance
  await serviceSupabase.from('disclaimer_logs').insert({
    user_id: user.id,
    version: '1.0',
    ip_address: ip,
    user_agent: userAgent,
  })

  // Mark user as accepted
  await serviceSupabase
    .from('users')
    .update({
      disclaimer_accepted: true,
      disclaimer_accepted_at: new Date().toISOString(),
      disclaimer_version: '1.0',
    })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
