# Shopify - Setup Flow

## Variables Vercel à définir

- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ACCESS_TOKEN`

## Ce qui est déjà branché dans le projet

- callback OAuth:
  - `/api/shopify-callback`
- proxy sécurisé:
  - `/api/shopify`
- module client:
  - entrée `Shopify` dans Flow
- widget dashboard:
  - carte Shopify sur l'accueil

## App URL Shopify à configurer

Dans `dev.shopify.com` pour l'app concernée :

- `App URL`
  - `https://flow-core-public-04291307.vercel.app`
- `Allowed redirection URL(s)`
  - `https://flow-core-public-04291307.vercel.app/api/shopify-callback`

## Flow OAuth attendu

1. Ouvrir l'URL d'installation Shopify avec les scopes adaptés.
2. Shopify renvoie sur `/api/shopify-callback`.
3. La page retourne le `access_token` en texte brut.
4. Copier ce token.
5. Le renseigner dans Vercel comme `SHOPIFY_ACCESS_TOKEN`.
6. Redéployer.

## Scopes minimum conseillés

- `read_orders`
- `read_products`

## Commandes Vercel utiles

```bash
vercel env add SHOPIFY_ACCESS_TOKEN production
vercel --prod --yes
```
