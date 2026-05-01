# Guide de configuration Shopify pour Flow

Ce guide explique comment connecter votre boutique Shopify à votre compte Flow pour accéder aux données de vente, commandes, etc.

## Prérequis

- Un compte Shopify actif avec une boutique
- Accès administrateur à la boutique Shopify
- Un compte Flow avec session active

## Étape 1 : Créer une application privée sur Shopify

1. Connectez-vous à votre [admin Shopify](https://admin.shopify.com/)
2. Dans le menu de gauche, cliquez sur **Apps**
3. Cliquez sur **Develop apps** (en bas de la page)
4. Cliquez sur **Create an app**
5. Nommez votre app (ex: "Flow Integration")
6. Cliquez sur **Create app**

## Étape 2 : Configurer les permissions API

1. Dans l'app que vous venez de créer, allez dans l'onglet **Configuration**
2. Cliquez sur **Admin API integration**
3. Cliquez sur **Configure** dans la section "Admin API access scopes"
4. Cochez les permissions suivantes (nécessaires pour Flow) :
   - `read_orders` (lire les commandes)
   - `read_products` (lire les produits)
   - `read_customers` (lire les clients)
   - `read_content` (lire le contenu)
   - `read_analytics` (lire les analyses)
   - `read_inventory` (lire l'inventaire)
   - `read_reports` (lire les rapports)
5. Cliquez sur **Save**

## Étape 3 : Installer l'application

1. Dans l'onglet **API credentials**, cliquez sur **Install app**
2. Confirmez l'installation

## Étape 4 : Récupérer le token d'accès

1. Après l'installation, vous verrez une section **Admin API access token**
2. Cliquez sur **Reveal token once** (attention : il n'apparaîtra qu'une fois)
3. **Copiez immédiatement le token** (il commence par `shpat_`)

⚠️ **Important** : Le token ne sera affiché qu'une seule fois. Si vous le perdez, vous devrez régénérer un nouveau token.

## Étape 5 : Configurer sur Flow

1. Connectez-vous à votre compte Flow
2. Allez dans la section **Shopify** du dashboard
3. Cliquez sur **Connecter une boutique**
4. Renseignez :
   - **Domaine de la boutique** : votre-store.myshopify.com (sans https://)
   - **Token d'accès** : collez le token copié (shpat_...)
5. Cliquez sur **Connecter**

## Étape 6 : Vérifier la connexion

Après connexion, vous devriez voir vos données Shopify dans le dashboard :
- Chiffre d'affaires du mois
- Commandes récentes
- Produits populaires
- Etc.

## Dépannage

### Erreur "Token invalide"
- Vérifiez que le token est correct (commence par `shpat_`)
- Assurez-vous que l'app est installée et active
- Régénérez un nouveau token si nécessaire

### Erreur "Domaine invalide"
- Utilisez le format : `votre-store.myshopify.com`
- Ne mettez pas `https://` au début

### Permissions insuffisantes
- Revérifiez que toutes les permissions listées sont cochées
- Réinstallez l'app après modification des permissions

### Boutique non trouvée
- Vérifiez l'orthographe du domaine
- Assurez-vous que la boutique existe et est active

## Sécurité

- Le token d'accès est chiffré et stocké de manière sécurisée
- Ne partagez jamais votre token avec des tiers
- Vous pouvez révoquer l'accès à tout moment en supprimant l'app de Shopify

## Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs de votre boutique Shopify
2. Les permissions de l'app
3. La validité du token

Pour plus d'aide, consultez la [documentation développeur Shopify](https://shopify.dev/docs/apps).

---

## Variables Vercel (pour les développeurs)

Si vous déployez vous-même :

- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ACCESS_TOKEN`

## App URL Shopify à configurer

Dans `dev.shopify.com` pour l'app concernée :

- `App URL`
  - `https://votre-domaine.vercel.app`
- `Allowed redirection URL(s)`
  - `https://votre-domaine.vercel.app/api/shopify-callback`

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
