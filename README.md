# Backstage Écurie

Interface de production publiée sur `backstage.damiensiri.com` et sur Firebase Hosting (`ecurie-paddock.web.app`).

- Paddocks utilise Firebase en lecture et écriture.
- Espaces, notifications, horaires et alertes utilisent le Worker Cloudflare et la base D1 de production.
- Les fonctions Firebase envoient les notifications liées aux réservations.

Vérification locale : `npm test`.
