# Regles Codex pour Redac-IMRaD

Ce document sert de garde-fou pour les prochaines interventions Codex. Il indique ou chercher les fichiers apres la reorganisation et quelles regles respecter pour eviter les regressions.

## Correspondance ancienne architecture -> nouvelle architecture

| Ancien chemin | Nouveau chemin |
| --- | --- |
| `js/storage.js` | `database/local-storage-database.js` |
| `parcours.js` | `components/parcours/parcours-page.js` |
| `accueil.js` | `pages/accueil/accueil.js` |
| `js/prospects.js` | `pages/prospects/prospects.js` |
| `js/questionnaire-k4.js` | `pages/k4/questionnaire-k4.js` |
| `js/livrables-k4.js` | `pages/k4/livrables-k4.js` |
| `js/questionnaire-sync.js` | `forms/questionnaire-sync.js` |
| `js/point-memoire-synthese.js` | `pages/point-memoire/point-memoire-synthese.js` |
| `js/point-memoire-resume.js` | `pages/point-memoire/point-memoire-resume.js` |

## Regles de placement

- Ne jamais recreer un dossier `js/` pour les nouveaux modules.
- Les nouveaux modules K5 doivent aller dans `pages/k5/`.
- Les nouveaux modules Rattrapage doivent aller dans `pages/rattrapage/`.
- Les nouveaux services transversaux doivent aller dans `services/`.
- Les nouveaux composants reutilisables doivent aller dans `components/`.
- Les constantes partagees doivent aller dans `constants/`.
- Les scripts lies aux questionnaires Google Forms doivent aller dans `forms/`.

## Regles d'acces aux donnees

- Les acces aux etudiants doivent passer par `services/` et `repositories/` si possible.
- Les pages ne doivent pas acceder directement au stockage si une couche de service existe.
- Les repositories isolent l'acces aux collections de donnees.
- `database/` contient l'adaptateur technique de persistance.
- Les donnees specifiques a un parcours doivent etre stockees dans `student.donneesParcours`.
- Ne jamais ecraser silencieusement une donnee existante.
- Les anciennes donnees doivent etre conservees et migrees progressivement.

## Regles fonctionnelles

- Les actions mail et Drive doivent toujours preparer, jamais envoyer automatiquement.
- Le logiciel structure et assiste Audrey, mais ne juge jamais automatiquement le memoire.
- Les messages, brouillons et documents generes doivent rester validables par Audrey.
- Aucune decision pedagogique ou qualitative ne doit etre automatisee sans validation humaine.

## Regles de securite

- `config.private.js` ne doit jamais etre suivi par Git.
- Aucun token ne doit etre code en dur.
- Aucune URL Apps Script reelle ne doit etre codee en dur.
- Avant commit, verifier l'absence de secret de type `AKfycb` dans les fichiers suivis.
