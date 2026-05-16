'use client'

import { useState } from 'react'
import { Word, Course } from '@/types'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Empty from '@/components/ui/Empty'

interface Props {
  initialWords: Word[]
  courses: Pick<Course, 'id' | 'title'>[]
}

type FormLevel = 'beginner' | 'intermediate' | 'advanced'

interface WordForm {
  arabic: string
  french: string
  phonetic: string
  course_id: string
  level: FormLevel
  example_arabic: string
  example_french: string
  is_published: boolean
  options: string[]
}

const emptyForm: WordForm = {
  arabic: '',
  french: '',
  phonetic: '',
  course_id: '',
  level: 'beginner',
  example_arabic: '',
  example_french: '',
  is_published: true,
  options: ['', '', ''],
}

export default function WordManager({ initialWords, courses }: Props) {
  const supabase = createClient()
  const [words, setWords] = useState(initialWords)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [form, setForm] = useState<WordForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterCourse, setFilterCourse] = useState('')

  const filtered = words.filter((w) => {
    const q = search.toLowerCase()
    const matchSearch = !q || w.arabic.includes(search) || w.french.toLowerCase().includes(q)
    const matchCourse = !filterCourse || w.course_id === filterCourse
    return matchSearch && matchCourse
  })

  function openCreate() {
    setEditingWord(null)
    setForm(emptyForm)
    setError('')
    setIsModalOpen(true)
  }

  function openEdit(word: Word) {
    setEditingWord(word)
    const currentOptions = word.options?.filter((o) => o.language === 'french').map((o) => o.option_text) ?? []
    setForm({
      arabic: word.arabic,
      french: word.french,
      phonetic: word.phonetic ?? '',
      course_id: word.course_id ?? '',
      level: word.level,
      example_arabic: word.example_arabic ?? '',
      example_french: word.example_french ?? '',
      is_published: word.is_published,
      options: [...currentOptions, '', '', ''].slice(0, 3),
    })
    setError('')
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!form.arabic.trim() || !form.french.trim()) {
      setError('Le mot arabe et la traduction française sont obligatoires.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      arabic: form.arabic.trim(),
      french: form.french.trim(),
      phonetic: form.phonetic.trim() || null,
      course_id: form.course_id || null,
      level: form.level,
      example_arabic: form.example_arabic.trim() || null,
      example_french: form.example_french.trim() || null,
      is_published: form.is_published,
    }

    try {
      if (editingWord) {
        const { error: updateError } = await supabase
          .from('words')
          .update(payload)
          .eq('id', editingWord.id)

        if (updateError) throw updateError

        // Update options: delete old, insert new
        await supabase.from('word_options').delete().eq('word_id', editingWord.id)

        const validOptions = form.options.filter((o) => o.trim())
        if (validOptions.length > 0) {
          await supabase.from('word_options').insert(
            validOptions.map((o) => ({ word_id: editingWord.id, option_text: o.trim(), language: 'french' }))
          )
        }

        const course = courses.find((c) => c.id === form.course_id)
        setWords((prev) =>
          prev.map((w) =>
            w.id === editingWord.id
              ? {
                  ...w,
                  ...payload,
                  course: course ? { ...w.course!, id: course.id, title: course.title } : undefined,
                  options: validOptions.map((o, i) => ({ id: `tmp-${i}`, word_id: w.id, option_text: o, language: 'french' as const })),
                }
              : w
          )
        )
      } else {
        const { data: newWord, error: insertError } = await supabase
          .from('words')
          .insert(payload)
          .select()
          .single()

        if (insertError) throw insertError

        const validOptions = form.options.filter((o) => o.trim())
        if (validOptions.length > 0 && newWord) {
          await supabase.from('word_options').insert(
            validOptions.map((o) => ({ word_id: newWord.id, option_text: o.trim(), language: 'french' }))
          )
        }

        const course = courses.find((c) => c.id === form.course_id)
        setWords((prev) => [
          {
            ...newWord,
            course: course ? { id: course.id, title: course.title } as Course : undefined,
            options: validOptions.map((o, i) => ({ id: `tmp-${i}`, word_id: newWord.id, option_text: o, language: 'french' as const })),
          },
          ...prev,
        ])
      }

      setIsModalOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(word: Word) {
    if (!confirm(`Supprimer "${word.french}" ? Cette action est irréversible.`)) return

    const { error } = await supabase.from('words').delete().eq('id', word.id)
    if (!error) {
      setWords((prev) => prev.filter((w) => w.id !== word.id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Mots</h1>
          <p className="text-sm text-muted mt-0.5">{words.length} mot{words.length > 1 ? 's' : ''} au total</p>
        </div>
        <Button onClick={openCreate}>Ajouter un mot</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Rechercher un mot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-primary focus:border-accent focus:outline-none"
        >
          <option value="">Tous les cours</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Empty
          title="Aucun mot trouvé"
          description={search ? 'Essayez une autre recherche.' : 'Ajoutez votre premier mot.'}
          action={!search ? <Button onClick={openCreate}>Ajouter un mot</Button> : undefined}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Arabe</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Français</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3 hidden sm:table-cell">Cours</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3 hidden md:table-cell">Niveau</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3 hidden md:table-cell">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((word) => (
                  <tr key={word.id} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-5 py-3">
                      <span className="arabic text-lg text-primary">{word.arabic}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-primary">{word.french}</td>
                    <td className="px-5 py-3 text-sm text-muted hidden sm:table-cell">
                      {word.course?.title ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted hidden md:table-cell capitalize">
                      {word.level}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${word.is_published ? 'text-success' : 'text-muted'}`}>
                        {word.is_published ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(word)}
                          className="text-xs text-muted hover:text-primary transition-colors px-2 py-1"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(word)}
                          className="text-xs text-muted hover:text-error transition-colors px-2 py-1"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWord ? 'Modifier le mot' : 'Ajouter un mot'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mot en arabe *"
              value={form.arabic}
              onChange={(e) => setForm((f) => ({ ...f, arabic: e.target.value }))}
              arabic
              placeholder="الكلمة"
            />
            <Input
              label="Traduction française *"
              value={form.french}
              onChange={(e) => setForm((f) => ({ ...f, french: e.target.value }))}
              placeholder="Le mot"
            />
            <Input
              label="Phonétique"
              value={form.phonetic}
              onChange={(e) => setForm((f) => ({ ...f, phonetic: e.target.value }))}
              placeholder="al-kalima"
            />
            <div>
              <label className="text-sm font-medium text-primary block mb-1.5">Cours</label>
              <select
                value={form.course_id}
                onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-primary focus:border-accent focus:outline-none"
              >
                <option value="">Aucun cours</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-primary block mb-1.5">Niveau</label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as FormLevel }))}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-primary focus:border-accent focus:outline-none"
              >
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="is_published"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="is_published" className="text-sm text-primary">Publié</label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Exemple en français"
              value={form.example_french}
              onChange={(e) => setForm((f) => ({ ...f, example_french: e.target.value }))}
              placeholder="Ex. : C'est un livre."
            />
            <Input
              label="Exemple en arabe"
              value={form.example_arabic}
              onChange={(e) => setForm((f) => ({ ...f, example_arabic: e.target.value }))}
              arabic
              placeholder="مثال"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-primary block mb-2">
              Mauvaises propositions (cartes)
            </label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <Input
                  key={i}
                  value={opt}
                  onChange={(e) => setForm((f) => {
                    const options = [...f.options]
                    options[i] = e.target.value
                    return { ...f, options }
                  })}
                  placeholder={`Option incorrecte ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-error bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingWord ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
