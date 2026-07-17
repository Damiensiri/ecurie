# Backstage bêta

Interface unifiée en cours de construction pour l’Écurie Damien Siri.

## Sécurité des environnements

- Les modules Espaces, Notifications, Horaires et Alertes utilisent exclusivement le Worker Cloudflare et la base D1 bêta.
- Il n’existe pas de projet Firebase bêta. Le module Paddocks peut lire les données Firebase existantes pour valider son rendu, mais toutes ses écritures sont bloquées dans cette branche.
- Ne jamais lancer un déploiement Firebase de production depuis ce dépôt sans validation explicite.
- La publication GitHub Pages n’entraîne aucun déploiement Firebase.

## Vérification

```sh
npm test
```
