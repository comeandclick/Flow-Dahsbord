import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { successRate, formatDate } from '@/lib/utils'
import Link from 'next/link'
import SignOutButton from '@/components/profile/SignOutButton'
import Button from '@/components/ui/Button'

export default async function ProfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, statsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
  ])

  const profile = profileResult.data
  const stats = statsResult.data

  // Get rank separately (needs stats.total_correct)
  const { count: rankCount } = await supabase
    .from('user_stats')
    .select('user_id', { count: 'exact' })
    .gt('total_correct', stats?.total_correct ?? 0)

  const { data: recent } = await supabase
    .from('attempts')
    .select('is_correct, created_at, word:words(french, arabic)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const rank = (rankCount ?? 0) + 1
  const total = (stats?.total_correct ?? 0) + (stats?.total_incorrect ?? 0)
  const rate = successRate(stats?.total_correct ?? 0, total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Profil</h1>
        <SignOutButton />
      </div>

      {/* Profile card */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
            {profile?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="font-semibold text-primary text-lg">{profile?.username}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <p className="text-xs text-muted mt-0.5">Membre depuis {profile ? formatDate(profile.created_at) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Réussites', value: stats?.total_correct ?? 0, color: 'text-success' },
          { label: 'Erreurs', value: stats?.total_incorrect ?? 0, color: 'text-error' },
          { label: 'Taux de réussite', value: `${rate}%`, color: 'text-accent' },
          { label: 'Cartes terminées', value: stats?.cards_completed ?? 0, color: 'text-primary' },
          { label: 'Cours commencés', value: stats?.courses_started ?? 0, color: 'text-primary' },
          { label: 'Classement', value: `#${rank}`, color: 'text-primary' },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-border p-4">
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Streak */}
      {stats && (
        <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-primary">{stats.streak_days} jour{stats.streak_days > 1 ? 's' : ''} de suite</p>
            <p className="text-xs text-muted">Série d&apos;activité consécutive</p>
          </div>
        </div>
      )}

      {/* Recent history */}
      {recent && recent.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Historique récent</h3>
          <div className="space-y-2">
            {recent.map((attempt, i) => {
              const word = Array.isArray(attempt.word) ? attempt.word[0] : attempt.word
              return (
                <div key={i} className="bg-surface rounded-xl border border-border px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${attempt.is_correct ? 'bg-success' : 'bg-error'}`} />
                    <span className="text-sm text-primary">{word?.french ?? '—'}</span>
                    <span className="text-sm arabic text-muted">{word?.arabic ?? '—'}</span>
                  </div>
                  <span className="text-xs text-muted">{formatDate(attempt.created_at)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/cartes">
          <Button variant="secondary" size="sm">Pratiquer les cartes</Button>
        </Link>
        <Link href="/classement">
          <Button variant="secondary" size="sm">Voir le classement</Button>
        </Link>
      </div>
    </div>
  )
}
