import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { levelLabel } from '@/lib/utils'

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!course) notFound()

  const { data: words } = await supabase
    .from('words')
    .select('id, arabic, french, phonetic, example_arabic, example_french')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('created_at')

  const levelVariant: Record<string, 'default' | 'success' | 'info' | 'warning'> = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'info',
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/cours" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux cours
      </Link>

      {/* Header */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl font-semibold text-primary">{course.title}</h1>
          <Badge variant={levelVariant[course.level] ?? 'default'}>{levelLabel(course.level)}</Badge>
        </div>
        {course.description && (
          <p className="text-muted text-sm mb-5">{course.description}</p>
        )}
        <div className="flex gap-3">
          <Link href={`/cartes?cours=${course.slug}`}>
            <Button variant="primary" size="sm">S&apos;entraîner avec les cartes</Button>
          </Link>
          <Link href={`/ecriture?cours=${course.slug}`}>
            <Button variant="secondary" size="sm">S&apos;entraîner à l&apos;écriture</Button>
          </Link>
        </div>
      </div>

      {/* Words list */}
      {words && words.length > 0 ? (
        <div>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
            {words.length} mot{words.length > 1 ? 's' : ''}
          </h2>
          <div className="space-y-2">
            {words.map((word) => (
              <div key={word.id} className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted">{word.french}</p>
                    {word.phonetic && (
                      <p className="text-xs text-muted/70 mt-0.5">{word.phonetic}</p>
                    )}
                  </div>
                  <p className="arabic text-xl font-medium text-primary text-right">{word.arabic}</p>
                </div>
                {(word.example_arabic || word.example_french) && (
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {word.example_french && (
                      <p className="text-xs text-muted italic">{word.example_french}</p>
                    )}
                    {word.example_arabic && (
                      <p className="arabic text-xs text-muted text-right">{word.example_arabic}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted text-sm">
          Aucun mot dans ce cours pour le moment.
        </div>
      )}
    </div>
  )
}
