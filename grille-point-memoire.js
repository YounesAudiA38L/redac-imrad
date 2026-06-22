(function initializePointMemoireGrid(global) {
  const axes = [
    {
      id: "sujet",
      nom: "Sujet",
      description: "Clarifier le thème, le périmètre et la faisabilité du sujet dans le temps disponible.",
      criteresAVerifier: [
        "Le sujet est formulé de manière claire et compréhensible.",
        "Le sujet est suffisamment délimité pour un mémoire de kinésithérapie.",
        "L’intérêt professionnel ou clinique est identifiable.",
        "Le sujet est compatible avec les consignes de l’IFMK et l’échéance.",
      ],
      pointsVigilance: [
        "Sujet trop large ou associant trop de concepts.",
        "Population, intervention ou contexte insuffisamment précisés.",
        "Sujet choisi sans accès réaliste aux données ou à la littérature.",
      ],
      exempleRecommandation: "Resserrer le sujet autour d’une population, d’un contexte clinique et d’un objectif principal clairement définis.",
    },
    {
      id: "question-recherche",
      nom: "Question de recherche",
      description: "Vérifier que la question de recherche est précise, exploitable et cohérente avec le sujet.",
      criteresAVerifier: [
        "La question est formulée explicitement.",
        "Les concepts principaux sont définis ou identifiables.",
        "La question peut recevoir une réponse dans le cadre du mémoire.",
        "La question est cohérente avec l’objectif principal annoncé.",
      ],
      pointsVigilance: [
        "Question descriptive alors que l’objectif annoncé est comparatif.",
        "Formulation trop générale ou comportant plusieurs questions distinctes.",
        "Décalage entre la question, le titre et la méthode envisagée.",
      ],
      exempleRecommandation: "Reformuler la question en une phrase unique en précisant la population, le phénomène étudié et le résultat attendu.",
    },
    {
      id: "methode",
      nom: "Méthode",
      description: "Apprécier la cohérence et la faisabilité de la méthode envisagée par rapport à la question.",
      criteresAVerifier: [
        "Le type de mémoire ou d’étude est identifié.",
        "La population, le corpus ou les sources sont définis.",
        "Les critères de sélection sont envisagés.",
        "Les outils, étapes et méthodes d’analyse sont compréhensibles.",
        "Les contraintes éthiques et pratiques sont prises en compte si nécessaire.",
      ],
      pointsVigilance: [
        "Méthode trop ambitieuse pour le calendrier disponible.",
        "Choix méthodologique ne permettant pas de répondre à la question.",
        "Manque d’informations pour reproduire la démarche.",
      ],
      exempleRecommandation: "Décrire la méthode sous forme d’étapes successives et vérifier que chacune contribue directement à l’objectif principal.",
    },
    {
      id: "recherche-bibliographique",
      nom: "Recherche bibliographique",
      description: "Structurer la recherche documentaire et vérifier la pertinence des sources sélectionnées.",
      criteresAVerifier: [
        "Les bases de données adaptées au sujet sont utilisées.",
        "Les mots-clés français et anglais sont identifiés.",
        "Les équations de recherche sont traçables.",
        "Les critères de sélection des articles sont définis.",
        "Les références sont suffisamment récentes et scientifiques.",
      ],
      pointsVigilance: [
        "Recherche limitée à un moteur généraliste.",
        "Mots-clés trop peu nombreux ou trop génériques.",
        "Sélection d’articles sans critères explicites.",
      ],
      exempleRecommandation: "Formaliser une première équation de recherche avec les synonymes principaux, puis noter les bases consultées et le nombre de résultats.",
    },
    {
      id: "organisation",
      nom: "Organisation",
      description: "Aider à hiérarchiser les tâches, les priorités de correction et le calendrier de travail.",
      criteresAVerifier: [
        "L’échéance principale et les étapes intermédiaires sont connues.",
        "Le niveau d’avancement réel est identifié.",
        "Le blocage principal peut être formulé.",
        "Les prochaines actions sont concrètes et réalistes.",
        "Les documents et versions sont organisés de manière claire.",
      ],
      pointsVigilance: [
        "Multiplication des tâches sans ordre de priorité.",
        "Temps important consacré à la forme avant de stabiliser le fond.",
        "Absence d’étapes intermédiaires avant l’échéance finale.",
      ],
      exempleRecommandation: "Choisir trois actions prioritaires pour la prochaine semaine et leur attribuer une échéance réaliste.",
    },
    {
      id: "soutenance-jury",
      nom: "Soutenance / jury",
      description: "Anticiper la présentation orale, les attentes du jury et les questions possibles.",
      criteresAVerifier: [
        "Le message principal du mémoire peut être résumé clairement.",
        "Les choix méthodologiques peuvent être expliqués et justifiés.",
        "Les limites du travail sont connues.",
        "Les implications en kinésithérapie sont présentées avec prudence.",
        "Les réponses aux questions probables peuvent être préparées.",
      ],
      pointsVigilance: [
        "Présentation trop descriptive sans fil directeur.",
        "Difficulté à expliquer les limites ou les choix méthodologiques.",
        "Conclusions orales plus affirmatives que les résultats du mémoire.",
      ],
      exempleRecommandation: "Préparer une réponse courte sur l’objectif, la méthode, le résultat principal, les limites et l’intérêt kinésithérapique du travail.",
    },
  ];

  function getAxis(id) {
    return axes.find((axis) => axis.id === id) || null;
  }

  global.GRILLE_POINT_MEMOIRE = Object.freeze({
    nom: "Point Mémoire 60 minutes",
    axes,
    getAxis,
  });
})(window);
