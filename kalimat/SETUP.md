# Kalimat — Guide de démarrage

## 1. Supprimer le fichier en conflit

```bash
rm app/page.tsx
```

## 2. Créer le projet Supabase

1. Aller sur https://supabase.com → "New project"
2. Récupérer les clés dans Settings > API
3. Copier `.env.example` → `.env.local` et remplir les valeurs

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## 3. Configurer la base de données

Dans le SQL Editor de Supabase, exécuter dans l'ordre :

```sql
-- Étape 1 : Schéma
\i supabase/schema.sql

-- Étape 2 : Données de base
\i supabase/seed.sql
```

Ou copier-coller le contenu de chaque fichier directement dans l'éditeur SQL.

## 4. Créer un compte admin

1. Créer un compte via /register dans l'app
2. Dans Supabase → Table Editor → profiles
3. Changer le champ `role` de `user` à `admin` pour votre compte

## 5. Lancer en local

```bash
npm install
npm run dev
```

L'application est disponible sur http://localhost:3000

## 6. Tests

```bash
npm test
```

## 7. Déployer sur Vercel

```bash
# Option A : via CLI
npm i -g vercel
vercel

# Option B : connecter le repo GitHub sur vercel.com
# et ajouter les variables d'environnement dans le projet Vercel
```

Variables d'environnement à ajouter dans Vercel :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Structure des fichiers

```
kalimat/
├── app/
│   ├── (auth)/          ← pages login / register
│   ├── (user)/          ← toutes les pages utilisateur
│   │   ├── page.tsx     ← Accueil /
│   │   ├── cartes/      ← /cartes
│   │   ├── ecriture/    ← /ecriture
│   │   ├── cours/       ← /cours et /cours/[slug]
│   │   ├── profil/      ← /profil
│   │   └── classement/  ← /classement
│   └── admin/           ← panneau d'administration
├── components/
│   ├── layout/          ← Navbar, AdminSidebar
│   ├── ui/              ← Button, Input, Badge, Modal...
│   ├── cards/           ← CardSession, FlashCard
│   ├── writing/         ← WritingSession
│   ├── profile/         ← SignOutButton
│   └── admin/           ← WordManager, CourseManager
├── lib/
│   ├── supabase/        ← clients browser + server
│   └── utils.ts         ← fonctions utilitaires
├── supabase/
│   ├── schema.sql       ← structure de la base de données
│   └── seed.sql         ← données de départ
└── __tests__/           ← tests Jest
```

## Gérer le contenu depuis l'admin

- **Ajouter un mot** : Admin → Mots → Ajouter un mot
- **Ajouter un cours** : Admin → Cours → Ajouter un cours
- **Voir les utilisateurs** : Admin → Utilisateurs
- **Voir les statistiques** : Admin → Statistiques

## URL de l'application

- App utilisateur : `/`
- Admin : `/admin` (rôle admin requis)
- Login : `/login`
- Inscription : `/register`
