import { createClient } from '@/lib/supabase/server'
import CourseManager from '@/components/admin/CourseManager'

export default async function AdminCoursPage() {
  const supabase = createClient()
  const { data: courses } = await supabase
    .from('courses')
    .select('*, words:words(count)')
    .order('order')

  return <CourseManager initialCourses={courses ?? []} />
}
