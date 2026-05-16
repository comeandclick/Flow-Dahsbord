import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CardSession from '@/components/cards/CardSession'
import Link from 'next/link'
interface SearchParams {
  cours?: string
}

interface CourseFilter {
  id: string
  title: string
  slug: string
}

export default async function CartesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const courseSlug = searchParams.cours

  // Load courses for filter
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('is_published', true)
    .order('order')

  // Load words
  let query = supabase
    .from('words')
    .select('*, options:word_options(*), course:courses(id, title, slug)')
    .eq('is_published', true)

  if (courseSlug) {
    const course = (courses ?? []).find((c: CourseFilter) => c.slug === courseSlug)
    if (course) query = query.eq('course_id', course.id)
  }

  const { data: words } = await query.order('created_at')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Cartes</h1>
        <p className="text-muted mt-1 text-sm">Apprenez le vocabulaire arabe avec des cartes interactives.</p>
      </div>

      {/* Course filter */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/cartes"
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${!courseSlug ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted hover:text-primary'}`}
        >
          Tous
        </Link>
        {(courses ?? []).map((c: CourseFilter) => (
          <Link
            key={c.id}
            href={`/cartes?cours=${c.slug}`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${courseSlug === c.slug ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted hover:text-primary'}`}
          >
            {c.title}
          </Link>
        ))}
      </div>

      <CardSession words={words ?? []} userId={user.id} />
    </div>
  )
}
