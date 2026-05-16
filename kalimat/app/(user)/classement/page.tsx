import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { successRate } from '@/lib/utils'
import Empty from '@/components/ui/Empty'

export default async function ClassementPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: leaderboard } = await supabase
    .from('user_stats')
    .select('user_id, total_correct, total_incorrect, cards_completed, profiles:profiles(username)')
    .order('total_correct', { ascending: false })
    .limit(50)

  const entries = (leaderboard ?? []).map((row, i) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const total = row.total_correct + row.total_incorrect
    return {
      rank: i + 1,
      user_id: row.user_id,
      username: profile?.username ?? 'Anonyme',
      total_correct: row.total_correct,
      total_incorrect: row.total_incorrect,
      cards_completed: row.cards_completed,
      rate: successRate(row.total_correct, total),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Classement</h1>
        <p className="text-muted mt-1 text-sm">Les apprenants les plus actifs de la communauté.</p>
      </div>

      {entries.length === 0 ? (
        <Empty
          title="Aucun classement disponible"
          description="Complétez des exercices pour apparaître dans le classement."
        />
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border">
            <div className="col-span-1 text-xs font-medium text-muted">#</div>
            <div className="col-span-4 text-xs font-medium text-muted">Utilisateur</div>
            <div className="col-span-3 text-xs font-medium text-muted text-right hidden sm:block">Réussites</div>
            <div className="col-span-2 text-xs font-medium text-muted text-right hidden sm:block">Taux</div>
            <div className="col-span-3 sm:col-span-2 text-xs font-medium text-muted text-right">Score</div>
          </div>

          {entries.map((entry) => {
            const isCurrentUser = entry.user_id === user.id
            return (
              <div
                key={entry.user_id}
                className={`grid grid-cols-12 gap-3 px-5 py-4 border-b border-border last:border-0 transition-colors ${
                  isCurrentUser ? 'bg-accent/5' : 'hover:bg-background'
                }`}
              >
                <div className="col-span-1 flex items-center">
                  <span className={`text-sm font-semibold ${
                    entry.rank === 1 ? 'text-amber-500' :
                    entry.rank === 2 ? 'text-gray-400' :
                    entry.rank === 3 ? 'text-amber-700' :
                    'text-muted'
                  }`}>
                    {entry.rank}
                  </span>
                </div>
                <div className="col-span-4 sm:col-span-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {entry.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-accent' : 'text-primary'}`}>
                      {entry.username}
                    </p>
                    {isCurrentUser && <p className="text-xs text-muted">Vous</p>}
                  </div>
                </div>
                <div className="col-span-3 hidden sm:flex items-center justify-end">
                  <span className="text-sm text-success font-medium">{entry.total_correct}</span>
                </div>
                <div className="col-span-2 hidden sm:flex items-center justify-end">
                  <span className="text-sm text-muted">{entry.rate}%</span>
                </div>
                <div className="col-span-7 sm:col-span-2 flex items-center justify-end">
                  <span className="text-sm font-semibold text-primary">{entry.cards_completed}</span>
                  <span className="text-xs text-muted ml-1">cartes</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
