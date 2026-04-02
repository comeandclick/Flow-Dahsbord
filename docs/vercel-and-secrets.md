# Vercel et secrets

## URL publique a garder

- `https://flow-online-aymen.vercel.app`

## Projet Vercel

- project name: `flow-online-aymen`
- project id: `prj_z4k3Nb7QHzrU4od2gv7fBh5GOmxl`
- org id: `team_RB423RZ6qpL1OWnpWdM7TVxw`

## Variables de production

```env
FLOW_STORE_URL=https://jsonblob.com/api/jsonBlob/019d3fec-0c9e-7bc0-a65a-d111a1635df0
FLOW_SESSION_SECRET=24e38db7b7d4accccd157577a39efafe5ffe496164f2e78add12f3ffc9e24b24
FLOW_PASSWORD_PEPPER=f45efd28a88457f9d1707d06ddc676c8156f2d6b9c782bccd3cb8efbc633e4c9
FLOW_DATA_SECRET=cdbdf55e8ee43f03f56caa68a11179b96a7adb8a8f511bef63a34677c1714b7f
FLOW_PUSH_PUBLIC_KEY=BJ72sox8g7yNMR3N-a_DvVlrGfj4WK690GLOXQRnDCKuyUSWal-pfLTs3tBQltF0nrJLEOugqNnSe40P2h6udoo
FLOW_PUSH_PRIVATE_KEY=EBrnLmlkNKEf9VgAocyDKLEgLisVFp_rkAJYpP-TtcI
FLOW_APP_URL=https://flow-online-aymen.vercel.app
FLOW_GOOGLE_CLIENT_ID=
FLOW_GOOGLE_CLIENT_SECRET=
FLOW_SMTP_HOST=
FLOW_SMTP_PORT=587
FLOW_SMTP_SECURE=false
FLOW_SMTP_USER=
FLOW_SMTP_PASS=
FLOW_SMTP_FROM=
```

## Important

- ne jamais changer `FLOW_DATA_SECRET` sans migration
- ne jamais changer `FLOW_STORE_URL` sans recopier les donnees
- ne jamais supprimer le projet Vercel si on veut garder le meme lien
- les cles `FLOW_PUSH_*` doivent etre identiques en local et sur Vercel pour garder les abonnements push valides
- pour activer Google OAuth reellement il faut definir:
  - `FLOW_GOOGLE_CLIENT_ID`
  - `FLOW_GOOGLE_CLIENT_SECRET`
- pour envoyer le lien de reset par email au lieu du mode lien direct interne, il faut definir:
  - `FLOW_SMTP_HOST`
  - `FLOW_SMTP_PORT`
  - `FLOW_SMTP_SECURE`
  - `FLOW_SMTP_USER`
  - `FLOW_SMTP_PASS`
  - `FLOW_SMTP_FROM`
