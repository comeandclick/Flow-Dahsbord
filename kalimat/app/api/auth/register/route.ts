import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email, password, username } = await request.json()

  if (!username || username.length < 3)
    return NextResponse.json({ error: "Nom d'utilisateur trop court (min. 3 caractères)." }, { status: 400 })

  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Mot de passe trop court (min. 6 caractères).' }, { status: 400 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  })

  if (error) {
    const msg = error.message.includes('already registered')
      ? 'Cette adresse email est déjà utilisée.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = data.user.id

  await supabaseAdmin.from('profiles').insert({ id: userId, username, role: 'user' })
  await supabaseAdmin.from('user_stats').insert({ user_id: userId })

  return NextResponse.json({ success: true })
}
