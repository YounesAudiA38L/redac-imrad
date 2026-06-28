# Architecture du projet Redac-IMRaD

Ce document decrit l'organisation actuelle du projet et les regles a respecter pour garder une architecture lisible, stable et preparable a une future migration SQLite.

## Organisation par couches

### pages/

Le dossier `pages/` contient les controleurs propres a chaque onglet principal :

- `pages/accueil/`
- `pages/prospects/`
- `pages/point-memoire/`
- `pages/k4/`
- `pages/k5/`
- `pages/rattrapage/`

Une page orchestre l'interface visible de son onglet : lecture du DOM, reactions aux clics, appels aux services, affichage des messages.

Une page ne doit pas contenir de logique de stockage si un service ou un repository existe deja.

### components/

Le dossier `components/` contient les composants reutilisables entre plusieurs pages.

Exemple actuel : `components/parcours/`, qui porte le rendu commun des listes et cartes etudiants pour les onglets parcours.

Les composants doivent rester centres sur le rendu, les interactions locales et la composition d'interface. Ils ne doivent pas gerer directement le stockage.

### services/

Le dossier `services/` contient la logique metier utilisee par les pages et les composants.

Les services portent les decisions fonctionnelles : creer, modifier, archiver, filtrer, transformer, preparer ou synchroniser des donnees.

Les pages doivent passer par les services quand elles ont besoin d'acceder aux donnees ou de lancer une action metier.

### repositories/

Le dossier `repositories/` isole l'acces aux donnees.

Un repository fournit un contrat stable entre les services et la couche de persistance. Les services ne devraient pas avoir besoin de savoir si les donnees viennent de `localStorage`, de SQLite ou d'une autre source.

### database/

Le dossier `database/` contient les adaptateurs de persistance.

L'adaptateur actuel s'appuie sur `localStorage`. A terme, ce dossier preparera la migration vers SQLite, sans imposer de modification directe dans les pages.

### constants/

Le dossier `constants/` contient les valeurs partagees : parcours autorises, libelles communs, statuts ou autres constantes transverses.

Les constantes reutilisees ne doivent pas etre redefinies dans plusieurs fichiers si elles peuvent etre centralisees proprement.

### forms/

Le dossier `forms/` contient les scripts lies aux questionnaires, imports ou synchronisations de formulaires externes.

Ces scripts peuvent appeler les services, mais ne doivent pas contourner la couche de donnees quand une fonction existe deja.

### utils/

Le dossier `utils/` est reserve aux fonctions utilitaires transverses, sans dependance metier forte.

Un utilitaire doit rester generique : formatage, normalisation, verification simple, aide technique reutilisable.

## Sens attendu des dependances

Le sens attendu est :

```text
Page -> Component -> Service -> Repository -> Database
```

En pratique :

- une page peut utiliser un composant et appeler un service ;
- un composant peut appeler un service si une interaction utilisateur le necessite ;
- un service appelle un repository ;
- un repository appelle la couche `database/` ;
- `database/` gere les details techniques de persistance.

Les dependances ne doivent pas remonter dans l'autre sens : `database/` ne connait pas les pages, les repositories ne manipulent pas le DOM, les services ne doivent pas dependre de la structure HTML.

## Regles d'architecture

- Une page ne doit pas acceder directement au `localStorage` si un service ou repository existe.
- Les composants ne doivent pas gerer le stockage.
- Les services portent la logique metier.
- Les repositories isolent l'acces aux donnees.
- `database/` contient l'adaptateur `localStorage` actuel et preparera SQLite plus tard.
- `config.private.js` ne doit jamais etre suivi par Git.
- Les changements de structure doivent rester progressifs et verifier les pages principales apres chaque etape.
