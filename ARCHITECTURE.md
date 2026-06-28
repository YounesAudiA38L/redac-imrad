# Architecture Redac-IMRaD

Ce document fixe l'architecture actuelle du projet apres la reorganisation par couches metier. Il sert de reference pour eviter les regressions lors des prochaines interventions.

## Couches actuelles

### pages/

`pages/` contient la logique specifique a chaque page ou onglet principal.

Exemples :

- `pages/accueil/`
- `pages/prospects/`
- `pages/point-memoire/`
- `pages/k4/`
- `pages/k5/`
- `pages/rattrapage/`

Une page gere l'orchestration de son ecran : lecture du DOM, evenements utilisateur, appels aux services, affichage des messages.

### components/

`components/` contient les composants reutilisables entre plusieurs pages.

Les composants doivent rester centres sur le rendu, les interactions locales et la composition d'interface.

### components/parcours/parcours-page.js

`components/parcours/parcours-page.js` est l'ancien `parcours.js`.

Il contient le rendu commun des onglets parcours : Point Memoire, K4, K5 et Rattrapage.

### services/

`services/` contient la logique metier.

Les services portent les decisions fonctionnelles : creer, modifier, archiver, transformer, filtrer, preparer ou synchroniser des donnees.

Les pages et composants doivent appeler les services quand une action depasse le simple rendu.

### repositories/

`repositories/` contient l'acces aux collections de donnees.

Les repositories isolent les services du detail de persistance. Ils fournissent un contrat stable pour lire ou modifier les collections.

### database/

`database/` contient l'adaptateur de persistance.

L'adaptateur actuel est base sur `localStorage`. Ce dossier preparera plus tard une migration vers SQLite.

### database/local-storage-database.js

`database/local-storage-database.js` est l'ancien `js/storage.js`.

Il conserve l'adaptateur `localStorage` actuel et expose la base de donnees locale existante.

### constants/

`constants/` contient les constantes partagees : parcours, libelles, statuts ou valeurs transversales reutilisees.

### forms/

`forms/` contient la logique liee aux questionnaires Google Forms et a leur synchronisation.

### utils/

`utils/` contient les outils transversaux sans dependance metier forte.

## Sens attendu des dependances

Le sens attendu des dependances est :

```text
Page -> Component -> Service -> Repository -> Database
```

Regle generale :

- une page peut appeler un composant ou un service ;
- un composant peut appeler un service si necessaire ;
- un service appelle un repository ;
- un repository appelle `database/` ;
- `database/` ne depend jamais des pages, composants ou services.

## Regles obligatoires

- Une page ne doit pas acceder directement au `localStorage` si un service ou repository existe.
- Les composants ne doivent pas gerer directement la persistance.
- Les services portent la logique metier.
- Les repositories isolent l'acces aux donnees.
- `database/` contient l'adaptateur `localStorage` actuel.
- `config.private.js` ne doit jamais etre suivi par Git.
- Aucun token ni URL Apps Script reelle ne doit etre code en dur.
- Toute evolution de structure doit respecter les couches existantes.
- Toute modification doit verifier que les pages principales s'ouvrent encore.
