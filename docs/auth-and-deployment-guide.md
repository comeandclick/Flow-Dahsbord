# Guide complet auth, comptes et déploiement Flow

## 1. Vue d'ensemble

Flow repose sur un noyau simple:

- frontend Next.js App Router
- routes API Next.js côté serveur
- stockage distant JSONBlob
- chiffrement avant écriture du store
- cookies de session signés
- auth email/mot de passe
- auth Google optionnelle
- reset de mot de passe
- dashboard admin séparé
- déploiement Vercel

L'idée générale est la suivante:

1. l'utilisateur agit depuis l'interface Flow
2. le frontend appelle une route `/api/...`
3. la route lit ou modifie le store utilisateur distant
4. les données sensibles sont signées ou chiffrées côté serveur
5. la session est stockée dans un cookie `httpOnly`

---

## 2. Architecture des fichiers importants

### Front principal

- `/Users/aymen/Documents/Flow Dashbord/app/FlowApp.jsx`
- `/Users/aymen/Documents/Flow Dashbord/app/page.jsx`
- `/Users/aymen/Documents/Flow Dashbord/app/layout.jsx`

### Auth et session

- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/register/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/login/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/logout/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/providers/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/forgot-password/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/reset-password/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/google/start/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/google/callback/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/session/route.js`

### Logique serveur

- `/Users/aymen/Documents/Flow Dashbord/lib/auth.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/admin.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/google-auth.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/email.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/remote-store.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/crypto.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/schema.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/server-config.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/rate-limit.js`

### Déploiement et publication

- `/Users/aymen/Documents/Flow Dashbord/package.json`
- `/Users/aymen/Documents/Flow Dashbord/.nvmrc`
- `/Users/aymen/Documents/Flow Dashbord/scripts/ensure-build.mjs`
- `/Users/aymen/Documents/Flow Dashbord/scripts/publish-release.mjs`
- `/Users/aymen/Documents/Flow Dashbord/.vercel/project.json`

---

## 3. Système de création de compte

### Route utilisée

- `POST /api/auth/register`

### Fichier

- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/register/route.js`

### Ce que fait la route

1. lit le JSON envoyé par le formulaire
2. normalise:
   - `name`
   - `email`
   - `password`
3. applique un rate limit basé sur IP + email
4. valide:
   - nom requis
   - email valide
   - mot de passe min 8 caractères
5. charge le store distant
6. refuse si le compte existe déjà
7. hash le mot de passe
8. crée l'objet user
9. crée la base vide utilisateur avec `createEmptyDb()`
10. ajoute l'utilisateur au store
11. écrit le store distant
12. crée la session
13. renvoie:
   - `user`
   - `db`
   - `admin`

### Format utilisateur créé

Le user contient notamment:

- `uid`
- `name`
- `email`
- `hash`
- `salt`
- `passwordVersion`
- `status`
- `loginCount`
- `createdAt`
- `lastLoginAt`
- `lastSeenAt`
- `db`

### Point important

La création de compte ne dépend pas d'une base SQL. Elle dépend du store JSONBlob distant, chiffré côté serveur.

---

## 4. Système de mot de passe

### Fichier

- `/Users/aymen/Documents/Flow Dashbord/lib/auth.js`

### Mécanisme

Flow utilise:

- `scryptSync` pour les mots de passe natifs Flow
- compatibilité `bcryptjs` si un ancien hash bcrypt existe

### Détails

- version courante de mot de passe: `CURRENT_PASSWORD_VERSION = 2`
- si version 2:
  - le mot de passe est combiné avec `FLOW_PASSWORD_PEPPER`
  - puis hashé via `scrypt`

### Fonctions clés

- `hashPassword(password, salt, version)`
- `verifyPassword(password, salt, expectedHash, version)`

### Pourquoi il y a un pepper

`FLOW_PASSWORD_PEPPER` ajoute un secret serveur en plus du mot de passe utilisateur. Même si le store fuit, un attaquant n’a pas seulement le hash à casser, il lui manque aussi le pepper serveur.

---

## 5. Système de connexion email / mot de passe

### Route utilisée

- `POST /api/auth/login`

### Fichier

- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/login/route.js`

### Ce que fait la route

1. lit `email` et `password`
2. applique rate limit
3. charge le store
4. retrouve le compte par email
5. refuse si:
   - compte introuvable
   - compte bloqué
   - compte sans hash local
6. vérifie le mot de passe
7. met à jour:
   - `lastLoginAt`
   - `lastSeenAt`
   - `loginCount`
8. upgrade le hash si version ancienne
9. sauvegarde le store
10. crée le cookie de session
11. renvoie:
   - `user`
   - `db`
   - `admin`

### Cas géré

Si le compte a été créé via Google et n’a pas de hash local, le message renvoyé explique qu’il faut se connecter avec Google ou redéfinir un mot de passe.

---

## 6. Système de session

### Route utilisée

- `GET /api/session`

### Fichiers

- `/Users/aymen/Documents/Flow Dashbord/app/api/session/route.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/auth.js`

### Comment marche la session

Le cookie `flow_session` contient:

- uid
- name
- email
- iat
- exp

Le cookie est:

- signé avec HMAC SHA-256
- protégé par `FLOW_SESSION_SECRET`
- `httpOnly`
- `sameSite=lax`
- `secure` en production

### Fonctions impliquées

- `createSessionCookieValue(user)`
- `readSessionCookieValue(value)`

### Validation

Quand `/api/session` est appelée:

1. le cookie est lu
2. sa signature est vérifiée
3. son expiration est vérifiée
4. le compte est relu dans le store
5. si le compte est bloqué, la session est refusée
6. sinon la route renvoie le `db` normalisé

---

## 7. Système de déconnexion

### Route utilisée

- `POST /api/auth/logout`

### Principe

La route supprime le cookie de session en le réécrivant vide / expiré. Ensuite `/api/session` renvoie `user: null`.

---

## 8. Système Google Login

### Routes utilisées

- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`

### Fichier de support

- `/Users/aymen/Documents/Flow Dashbord/lib/google-auth.js`

### Variables nécessaires

- `FLOW_GOOGLE_CLIENT_ID`
- `FLOW_GOOGLE_CLIENT_SECRET`

### Fonctionnement

1. l’utilisateur clique sur “Continuer avec Google”
2. Flow construit une URL OAuth Google
3. un token d’état signé est généré
4. l’utilisateur est redirigé vers Google
5. Google renvoie un `code`
6. Flow échange ce `code` contre un token OAuth
7. Flow lit les infos utilisateur Google
8. Flow retrouve ou crée un compte local
9. Flow pose le cookie de session

### Sécurité

Le paramètre `state` est signé via `createOAuthStateToken()` pour éviter les retours OAuth falsifiés.

---

## 9. Système “mot de passe oublié”

### Routes utilisées

- `POST /api/auth/forgot-password`
- `PUT /api/auth/reset-password`
- `POST /api/auth/reset-password`

### Fichiers

- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/forgot-password/route.js`
- `/Users/aymen/Documents/Flow Dashbord/app/api/auth/reset-password/route.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/auth.js`
- `/Users/aymen/Documents/Flow Dashbord/lib/email.js`

### Fonctionnement

#### Étape 1: demande

`POST /api/auth/forgot-password`

1. valide l’email
2. applique rate limit
3. vérifie que l’email SMTP est configuré
4. retrouve le compte
5. génère un code à 6 chiffres
6. stocke une version hashée du code
7. envoie le code par email

#### Étape 2: vérification

`PUT /api/auth/reset-password`

1. lit email + code
2. retrouve le compte
3. vérifie le code hashé
4. répond `ok: true` si valide

#### Étape 3: changement final

`POST /api/auth/reset-password`

1. lit email + code + nouveau mot de passe
2. vérifie le code
3. rehash le nouveau mot de passe
4. efface `passwordReset`
5. sauvegarde le store

### Cas actuel si SMTP absent

La route ne plante pas: elle répond proprement:

- `Réinitialisation par email indisponible pour le moment`

Donc pas de 500 inutile côté utilisateur.

---

## 10. Système de rate limit

### Fichier

- `/Users/aymen/Documents/Flow Dashbord/lib/rate-limit.js`

### Principe

Les routes sensibles utilisent des clés de rate limiting du type:

- `register:IP:email`
- `login:IP:email`
- `forgot-password:IP:email`
- `reset-password:IP:email`

### But

- ralentir les attaques bruteforce
- éviter le spam de reset
- éviter les floods d’inscription

---

## 11. Système admin séparé

### Routes principales

- `/admin/login`
- `/admin`

### APIs admin

- `/api/admin/auth/login`
- `/api/admin/auth/logout`
- `/api/admin/session`
- `/api/admin/overview`
- `/api/admin/actions`
- `/api/admin/export`
- `/api/admin/conversations`

### Différence avec l’auth user

Le dashboard admin a sa propre logique de session et ses permissions. Il ne faut pas le confondre avec l’auth utilisateur publique.

---

## 12. Système de stockage distant

### Fichier central

- `/Users/aymen/Documents/Flow Dashbord/lib/remote-store.js`

### Variable utilisée

- `FLOW_STORE_URL`

### Principe

Le store contient:

- `users`
- `conversations`
- `reports`

### Lecture

`readStore()`

1. lit `FLOW_STORE_URL`
2. fait un `fetch`
3. parse le JSON
4. déchiffre si nécessaire
5. renvoie un objet store standardisé

### Écriture

`writeStore(store)`

1. chiffre le store
2. fait un `PUT` vers JSONBlob
3. vérifie le statut HTTP

### Verrou d’écriture

`withStoreLock(task)`

Empêche que plusieurs écritures concurrentes corrompent le store.

---

## 13. Chiffrement du store

### Fichier

- `/Users/aymen/Documents/Flow Dashbord/lib/crypto.js`

### Secret utilisé

- `FLOW_DATA_SECRET`

### Algorithme

- `aes-256-gcm`

### Fonctions

- `encryptJson(value)`
- `decryptJson(value)`

### Pourquoi

Le store distant n’est pas écrit en clair. Même si quelqu’un voit le blob, les données métiers ne sont pas lisibles sans `FLOW_DATA_SECRET`.

---

## 14. Auto-réparation du store manquant

### Ce qui cassait

Si le blob JSONBlob configuré était supprimé, l’inscription échouait avec:

- `Store write failed (404)`

### Ce qui a été mis en place

Dans `lib/remote-store.js`, si `PUT` répond `404`:

1. Flow détecte que le blob n’existe plus
2. crée un nouveau blob JSONBlob via `POST /api/jsonBlob`
3. récupère la nouvelle URL
4. réessaie l’écriture
5. en local, met aussi à jour `.env.local`

### Effet

L’inscription ne casse plus si l’ancien store a disparu.

---

## 15. Variables d’environnement importantes

### Obligatoires

- `FLOW_STORE_URL`
- `FLOW_SESSION_SECRET`
- `FLOW_PASSWORD_PEPPER`
- `FLOW_DATA_SECRET`

### Optionnelles / intégrations

- `FLOW_APP_URL`
- `FLOW_GOOGLE_CLIENT_ID`
- `FLOW_GOOGLE_CLIENT_SECRET`
- `FLOW_SMTP_HOST`
- `FLOW_SMTP_PORT`
- `FLOW_SMTP_SECURE`
- `FLOW_SMTP_USER`
- `FLOW_SMTP_PASS`
- `FLOW_SMTP_FROM`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FLOW_PUSH_PUBLIC_KEY`
- `FLOW_PUSH_PRIVATE_KEY`

### Fichier local typique

- `/Users/aymen/Documents/Flow Dashbord/.env.local`

---

## 16. Système Stripe

### Fichier

- `/Users/aymen/Documents/Flow Dashbord/lib/stripe.js`

### Routes

- `/api/billing/checkout`
- `/api/billing/portal`
- `/api/billing/cancel`
- `/api/stripe/webhook`

### Ce qui a été fait

Le chargement Stripe serveur est forcé via `createRequire()` pour utiliser le paquet compatible Node côté runtime, ce qui évite les erreurs de build ESM rencontrées précédemment.

---

## 17. Système de build Next.js

### Commandes

- `npm run build`
- `npm start`
- `npm run dev`

### Node cible

- `.nvmrc` contient `22`
- `package.json` impose `node: 22.x`

### Pourquoi

Le projet est plus stable sur Node 22 que sur Node 24 dans l’état actuel de la stack.

---

## 18. Protection contre le build `.next` cassé

### Fichier

- `/Users/aymen/Documents/Flow Dashbord/scripts/ensure-build.mjs`

### Branche du problème

Parfois `.next` peut être présent mais incomplet, par exemple sans:

- `.next/server/app-paths-manifest.json`
- `.next/server/pages-manifest.json`

Dans ce cas `next start` plante avec un `ENOENT`.

### Correctif

Le script `prestart`:

1. vérifie que les manifests essentiels existent
2. si non, supprime `.next`
3. relance un build complet
4. seulement ensuite démarre `next start`

### Effet

Même si `.next` est corrompu, `npm start` reconstruit au lieu de crasher.

---

## 19. Système de déploiement Vercel

### Fichiers

- `/Users/aymen/Documents/Flow Dashbord/.vercel/project.json`
- `/Users/aymen/Documents/Flow Dashbord/scripts/publish-release.mjs`

### Principe

Le repo est lié à un projet Vercel:

- project name: `flow-online-aymen`

### Déploiement standard

1. push Git sur la branche de déploiement
2. Vercel build
3. publication sur l’alias public

### Déploiement CLI

Le script `publish-release.mjs` fait:

1. sync du README
2. `vercel --prod --yes`
3. appel de `/api/release/announce`

### Point de vigilance

Le code peut être sain alors que Vercel reste collé sur une vieille build si le pipeline ou l’auth CLI côté Vercel est cassé. C’est indépendant de la logique applicative elle-même.

---

## 20. Système de mise en ligne temporaire

Quand Vercel ne suit pas, une alternative temporaire a été utilisée:

- tunnel HTTPS via `localhost.run`

Exemple:

```bash
ssh -R 80:localhost:3000 nokey@localhost.run
```

Cela permet de:

- tester le vrai site depuis Internet
- valider le lien
- vérifier auth et routes publiques

---

## 21. Système de tests utilisés

### Smoke test client

Fichier:

- `/Users/aymen/Documents/Flow Dashbord/scripts/check-client.mjs`

### Ce qu’il vérifie

- chargement HTTP
- absence de crash client brut
- absence d’écran de récupération
- présence minimale de Flow

### Tests manuels réalisés

- inscription
- login
- session
- logout
- route `/admin/login`
- route `/api/auth/providers`
- route `/api/release/current`

---

## 22. Ce qui a été réparé récemment

### Inscription

- correction du crash quand le store JSONBlob configuré n’existait plus

### Login / session

- vérification complète OK

### Build / start

- correction des erreurs liées à `.next` incomplet
- reconstruction automatique avant `start`

### Runtime Stripe

- correction du chargement serveur Stripe pour éviter les erreurs de build

---

## 23. Résumé ultra court

### Auth

- session par cookie signé
- mots de passe hashés
- Google OAuth optionnel
- reset password avec code

### Data

- store JSONBlob distant
- données chiffrées avant écriture
- verrou d’écriture
- auto-réparation si le blob a disparu

### Déploiement

- Next.js + Vercel
- Node 22
- garde-fou `prestart` pour rebuild `.next` si incomplet

### Admin

- auth séparée
- dashboard admin dédié

---

## 24. Si quelqu’un doit reprendre le projet

Les premières choses à contrôler sont:

1. `.env.local` ou les variables Vercel
2. validité de `FLOW_STORE_URL`
3. validité de `FLOW_SESSION_SECRET`
4. validité de `FLOW_DATA_SECRET`
5. Node 22
6. build Next complet
7. état du déploiement Vercel réel

Si ces 7 points sont bons, le reste suit généralement correctement.
