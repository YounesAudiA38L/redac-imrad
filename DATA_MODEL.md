# Modele de donnees Redac-IMRaD

Ce document decrit les principales structures de donnees utilisees dans le projet et les regles de stabilisation a respecter.

## student

`student` represente une personne accompagnee.

Les donnees communes restent a la racine de l'objet :

- `id`
- `prenom`
- `nom`
- `email`
- `parcours`
- `statut`
- `statutSuivi`
- `echeance`
- informations generales de contact ou de suivi

Les donnees communes doivent rester accessibles sans connaitre le parcours exact de l'etudiant.

## prospect

`prospect` represente une personne interessee, pas encore accompagnee.

Il contient notamment :

- identite et contact ;
- parcours interesse, pressenti ou valide ;
- statut prospect ;
- statut de questionnaire ;
- reponse au questionnaire prospect ;
- notes et informations de relance ;
- lien eventuel vers un etudiant apres transformation.

La transformation d'un prospect en etudiant doit conserver les informations utiles et ne pas detruire les donnees d'origine brutalement.

## settings

`settings` regroupe les parametres de configuration internes au logiciel :

- liens de questionnaires ;
- connexions Apps Script ;
- liens de statistiques ;
- parametres d'agenda ;
- modeles ou preferences sauvegardees.

Les secrets et configurations privees ne doivent pas etre stockes dans un fichier suivi par Git.

## donneesParcours

`student.donneesParcours` regroupe les donnees specifiques au parcours de l'etudiant.

Les donnees specifiques au parcours ne doivent pas etre melangees avec les donnees communes quand elles concernent uniquement Point Memoire, K4, K5 ou Rattrapage.

Regles :

- les donnees communes restent a la racine de `student` ;
- les donnees specifiques au parcours vont dans `student.donneesParcours` ;
- lors d'une mise a jour, les donnees existantes de `donneesParcours` doivent etre preservees si elles ne sont pas presentes dans le formulaire ;
- les anciennes donnees doivent etre migrees progressivement, jamais supprimees brutalement.

## visios

Les visios representent les rendez-vous ou points de suivi.

Regle cible :

```text
student.donneesParcours.visios
```

Les visios doivent etre stockees dans `student.donneesParcours.visios`, afin de rester rattachees au contexte du parcours.

Chaque visio peut contenir :

- date ;
- type ;
- notes ;
- statut ;
- rappels ou actions de suivi.

## questionnaires

Les questionnaires regroupent les reponses recues avant ou pendant un accompagnement.

Ils peuvent concerner :

- prospects ;
- Point Memoire ;
- K4 ;
- K5 ;
- Rattrapage.

Regles :

- les reponses questionnaires doivent etre conservees sans ecraser les donnees existantes ;
- une nouvelle reponse doit completer ou enrichir la fiche ;
- les champs deja renseignes doivent etre preserves sauf action explicite ;
- les donnees brutes utiles doivent rester disponibles pour verification.

## notifications

Les notifications representent les rappels et relances a verifier avant action.

Elles peuvent contenir :

- type de notification ;
- etudiant ou prospect concerne ;
- date de declenchement ;
- message propose ;
- statut de traitement.

Les notifications doivent rester validables par Audrey avant envoi quand elles impliquent une action externe.

## livrables

Les livrables representent les documents, brouillons, feuilles de route ou supports generes ou prepares.

Ils peuvent contenir :

- nom du livrable ;
- statut ;
- selection ;
- lien Drive ;
- lien PDF ;
- date de generation ;
- date de brouillon mail.

Les livrables doivent etre rattaches au parcours concerne et ne pas ecraser les autres donnees de suivi.

## Regles de migration

- Les anciennes donnees doivent etre migrees progressivement.
- Aucune suppression brutale de champ historique ne doit etre faite sans strategie de migration.
- Les nouvelles structures doivent cohabiter avec les anciennes tant que toutes les pages ne sont pas adaptees.
- Toute migration doit preserver les informations saisies par Audrey.
