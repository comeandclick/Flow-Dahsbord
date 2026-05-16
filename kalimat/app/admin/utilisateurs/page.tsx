import { createClient } from '@/lib/supabase/server'
import { successRate, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Empty from '@/components/ui/Empty'

export default async function AdminUsersPage() {
  const supabase = createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id, username, role, created_at,
      stats:user_stats(total_correct, total_incorrect, cards_completed, streak_days)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Utilisateurs</h1>
        <p className="text-sm text-muted mt-0.5">{users?.length ?? 0} utilisateur{(users?.length ?? 0) > 1 ? 's' : ''}</p>
      </div>

      {!users || users.length === 0 ? (
        <Empty title="Aucun utilisateur" description="Les utilisateurs apparaîtront ici après leur inscription." />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Utilisateur</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Rôle</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3 hidden sm:table-cell">Réussites</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3 hidden md:table-cell">Taux</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3 hidden md:table-cell">Cartes</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3 hidden lg:table-cell">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const stats = Array.isArray(user.stats) ? user.stats[0] : user.stats
                  const total = (stats?.total_correct ?? 0) + (stats?.total_incorrect ?? 0)
                  const rate = successRate(stats?.total_correct ?? 0, total)
                  return (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-background">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {user.username[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-primary">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                          {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-sm text-success hidden sm:table-cell">
                        {stats?.total_correct ?? 0}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted hidden md:table-cell">
                        {rate}%
                      </td>
                      <td className="px-5 py-3 text-sm text-muted hidden md:table-cell">
                        {stats?.cards_completed ?? 0}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted hidden lg:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
