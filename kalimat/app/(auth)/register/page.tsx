'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (username.length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères.')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Create profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        role: 'user',
      })

      // Initialize stats
      await supabase.from('user_stats').insert({
        user_id: data.user.id,
      })
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-8">
      <h2 className="text-xl font-semibold text-primary mb-6">Créer un compte</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom d'utilisateur"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="votre_nom"
          required
          autoComplete="username"
        />
        <Input
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          required
          autoComplete="email"
        />
        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Au moins 6 caractères"
          required
          autoComplete="new-password"
        />

        {error && (
          <p className="text-sm text-error bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Créer mon compte
        </Button>
      </form>

      <p className="text-sm text-muted text-center mt-5">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-accent hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
