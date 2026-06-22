(function initializeImradGrids(global) {
  const DEFAULT_STATUS = "à vérifier";

  function criterion(section, id, name, description, importance, aideEvaluation, exempleRemarque) {
    return {
      id,
      section,
      nom: name,
      description,
      importance,
      statut: DEFAULT_STATUS,
      aideEvaluation,
      exempleRemarque,
    };
  }

  const sections = [
    {
      key: "introduction",
      nom: "Introduction",
      criteres: [
        criterion("Introduction", "intro-contexte", "Contexte du sujet", "Le contexte scientifique et clinique du sujet est présenté.", "essentiel", "Repérer les éléments qui situent le problème et son importance.", "Le contexte clinique est présent mais gagnerait à être mieux délimité."),
        criterion("Introduction", "intro-justification", "Justification du sujet", "Le choix du sujet est expliqué et appuyé par des éléments pertinents.", "essentiel", "Vérifier pourquoi ce sujet mérite d’être étudié.", "La justification est évoquée sans être suffisamment étayée."),
        criterion("Introduction", "intro-interet-kine", "Intérêt kinésithérapique", "Le lien avec la pratique ou les connaissances en kinésithérapie est explicite.", "important", "Rechercher une application clinique, professionnelle ou scientifique en kinésithérapie.", "L’intérêt pour la pratique kinésithérapique pourrait être davantage explicité."),
        criterion("Introduction", "intro-problematique", "Problématique", "La problématique est formulée clairement et découle du contexte.", "essentiel", "Vérifier la présence d’un problème précis, argumenté et délimité.", "La problématique reste large et nécessite une formulation plus précise."),
        criterion("Introduction", "intro-question", "Question de recherche", "La question de recherche est identifiable et suffisamment précise.", "essentiel", "Repérer une question explicite et vérifier qu’elle peut être traitée par le mémoire.", "La question de recherche est présente mais certains termes restent ambigus."),
        criterion("Introduction", "intro-objectif", "Objectif principal", "L’objectif principal est formulé de manière claire et opérationnelle.", "essentiel", "Comparer l’objectif avec la question de recherche et le contenu annoncé.", "L’objectif principal devrait être formulé avec un verbe plus précis."),
        criterion("Introduction", "intro-hypothese", "Hypothèse éventuelle", "Une hypothèse est formulée lorsque le type d’étude le justifie.", "complémentaire", "Vérifier si une hypothèse est attendue au regard du type d’étude.", "Aucune hypothèse n’est formulée ; vérifier si elle est nécessaire ici."),
        criterion("Introduction", "intro-coherence", "Cohérence titre / problématique / objectif", "Le titre, la problématique et l’objectif décrivent un même axe de travail.", "essentiel", "Comparer les concepts, la population et l’intervention mentionnés dans ces éléments.", "Un décalage semble possible entre le titre et l’objectif principal."),
      ],
    },
    {
      key: "methode",
      nom: "Méthode",
      criteres: [
        criterion("Méthode", "methode-type-etude", "Type d’étude", "Le type d’étude ou de revue est clairement indiqué.", "essentiel", "Repérer le plan d’étude et vérifier qu’il correspond à l’objectif.", "Le type d’étude doit être nommé plus explicitement."),
        criterion("Méthode", "methode-population", "Population ou corpus étudié", "La population, les documents ou le corpus sont décrits avec précision.", "essentiel", "Vérifier qui ou quoi est étudié, ainsi que le cadre de sélection.", "La population étudiée manque de précision."),
        criterion("Méthode", "methode-inclusion", "Critères d’inclusion", "Les critères d’inclusion sont énoncés et cohérents avec l’objectif.", "essentiel", "Repérer les conditions nécessaires pour intégrer l’étude ou le corpus.", "Les critères d’inclusion sont présents mais incomplets."),
        criterion("Méthode", "methode-exclusion", "Critères d’exclusion", "Les critères d’exclusion sont présentés et justifiés si nécessaire.", "important", "Vérifier les situations exclues et leur cohérence avec le protocole.", "Les critères d’exclusion nécessitent une justification plus claire."),
        criterion("Méthode", "methode-outils", "Outils de mesure", "Les outils, tests ou instruments de mesure sont décrits.", "essentiel", "Vérifier le nom, l’usage et, si pertinent, les qualités métrologiques des outils.", "Les outils de mesure sont cités sans description suffisante."),
        criterion("Méthode", "methode-protocole", "Protocole ou stratégie de recherche", "Le déroulement de l’étude ou la stratégie documentaire est détaillé.", "essentiel", "Vérifier les étapes, bases consultées, mots-clés, interventions ou conditions de recueil.", "Le protocole ne permet pas encore de comprendre toutes les étapes."),
        criterion("Méthode", "methode-analyse", "Méthode d’analyse", "La méthode utilisée pour traiter les données ou les sources est explicitée.", "essentiel", "Repérer les analyses statistiques, thématiques ou méthodologiques prévues.", "La méthode d’analyse doit être détaillée davantage."),
        criterion("Méthode", "methode-reproductibilite", "Reproductibilité", "Les informations fournies permettent de comprendre et reproduire la démarche.", "important", "Vérifier si une autre personne pourrait suivre les mêmes étapes.", "Certaines informations nécessaires à la reproductibilité sont absentes."),
        criterion("Méthode", "methode-ethique", "Aspects éthiques si nécessaires", "Les autorisations, consentements ou précautions éthiques sont mentionnés lorsque requis.", "important", "Adapter la vérification au type d’étude et aux données recueillies.", "Les aspects éthiques doivent être confirmés au regard du protocole."),
      ],
    },
    {
      key: "resultats",
      nom: "Résultats",
      criteres: [
        criterion("Résultats", "resultats-clarte", "Présentation claire des résultats", "Les résultats sont organisés et compréhensibles.", "essentiel", "Vérifier la progression, les sous-titres et la lisibilité des données.", "La présentation des résultats gagnerait à être mieux structurée."),
        criterion("Résultats", "resultats-sans-interpretation", "Résultats séparés de l’interprétation", "Les faits observés sont distingués de leur discussion.", "important", "Repérer les formulations interprétatives qui relèvent plutôt de la discussion.", "Une partie de l’interprétation apparaît dans les résultats."),
        criterion("Résultats", "resultats-coherence-methode", "Cohérence avec la méthode", "Les résultats correspondent aux mesures et analyses annoncées.", "essentiel", "Comparer les variables, outils et analyses entre méthode et résultats.", "Certains résultats ne semblent pas reliés à la méthode décrite."),
        criterion("Résultats", "resultats-tableaux", "Tableaux ou figures utiles", "Les tableaux et figures facilitent la lecture sans répéter inutilement le texte.", "important", "Vérifier leur titre, lisibilité, numérotation et apport réel.", "Un tableau pourrait synthétiser plus clairement ces données."),
        criterion("Résultats", "resultats-donnees-suffisantes", "Données suffisantes pour répondre à l’objectif", "Les données présentées permettent d’examiner l’objectif principal.", "essentiel", "Comparer les résultats disponibles avec la question et l’objectif annoncés.", "Les données présentées ne permettent pas encore de répondre complètement à l’objectif."),
        criterion("Résultats", "resultats-surinterpretation", "Absence de surinterprétation", "Les résultats restent décrits avec prudence et sans généralisation excessive.", "important", "Repérer les conclusions qui dépassent les données observées.", "Certaines formulations paraissent plus affirmatives que les données disponibles."),
      ],
    },
    {
      key: "discussion",
      nom: "Discussion",
      criteres: [
        criterion("Discussion", "discussion-reponse", "Réponse à la problématique", "La discussion revient explicitement à la problématique ou à la question de recherche.", "essentiel", "Vérifier que la réponse s’appuie sur les résultats obtenus.", "Le lien avec la problématique doit être rendu plus explicite."),
        criterion("Discussion", "discussion-interpretation", "Interprétation des résultats", "Les résultats sont interprétés de manière argumentée et prudente.", "essentiel", "Repérer les explications proposées et leur appui sur les données.", "L’interprétation nécessite davantage d’arguments."),
        criterion("Discussion", "discussion-litterature", "Comparaison avec la littérature", "Les résultats sont confrontés à des travaux scientifiques pertinents.", "essentiel", "Vérifier les convergences, divergences et explications proposées.", "La comparaison avec la littérature reste limitée."),
        criterion("Discussion", "discussion-limites", "Limites du travail", "Les principales limites sont reconnues et discutées.", "essentiel", "Rechercher les limites de méthode, d’échantillon, de mesure ou de généralisation.", "Certaines limites importantes ne semblent pas discutées."),
        criterion("Discussion", "discussion-biais", "Biais possibles", "Les biais susceptibles d’influencer les résultats sont identifiés.", "important", "Vérifier les biais de sélection, mesure, publication ou interprétation selon l’étude.", "Les biais possibles devraient être précisés."),
        criterion("Discussion", "discussion-implications", "Implications cliniques en kinésithérapie", "Les conséquences possibles pour la pratique sont présentées avec prudence.", "important", "Rechercher une traduction clinique proportionnée au niveau de preuve.", "Les implications cliniques sont évoquées sans préciser leurs limites."),
        criterion("Discussion", "discussion-perspectives", "Perspectives", "Des pistes de recherche ou d’amélioration cohérentes sont proposées.", "complémentaire", "Vérifier que les perspectives découlent des résultats et des limites.", "Les perspectives pourraient être davantage reliées aux limites identifiées."),
      ],
    },
    {
      key: "conclusion",
      nom: "Conclusion",
      criteres: [
        criterion("Conclusion", "conclusion-reponse", "Réponse claire à la question de recherche", "La conclusion apporte une réponse identifiable à la question de recherche.", "essentiel", "Comparer directement la conclusion à la question formulée en introduction.", "La réponse à la question de recherche reste implicite."),
        criterion("Conclusion", "conclusion-coherence", "Cohérence avec les résultats", "La conclusion reste conforme aux résultats présentés.", "essentiel", "Repérer toute affirmation qui ne serait pas soutenue par les résultats.", "Une affirmation de la conclusion dépasse les résultats présentés."),
        criterion("Conclusion", "conclusion-surpromesse", "Absence de surpromesse", "La portée des conclusions reste prudente et proportionnée.", "important", "Vérifier les généralisations, certitudes et recommandations trop larges.", "La formulation finale paraît trop affirmative au regard des données."),
        criterion("Conclusion", "conclusion-synthese", "Message final synthétique", "Les principaux enseignements sont résumés clairement et sans répétition excessive.", "important", "Vérifier la brièveté, la hiérarchie des idées et la clarté du message.", "Le message final pourrait être davantage synthétisé."),
        criterion("Conclusion", "conclusion-ouverture", "Ouverture pertinente", "L’ouverture proposée reste liée au travail et à ses limites.", "complémentaire", "Vérifier que l’ouverture apporte une perspective utile sans introduire un nouveau sujet.", "L’ouverture semble éloignée de la problématique étudiée."),
      ],
    },
    {
      key: "bibliographie",
      nom: "Bibliographie",
      criteres: [
        criterion("Bibliographie", "biblio-presence", "Références présentes", "Une bibliographie ou une liste de références est présente.", "essentiel", "Vérifier la présence de références correspondant aux citations du texte.", "La présence et la correspondance des références doivent être vérifiées."),
        criterion("Bibliographie", "biblio-recence", "Références suffisamment récentes", "Les références récentes sont représentées lorsque le sujet le nécessite.", "important", "Apprécier la récence selon le domaine et conserver les références fondatrices utiles.", "La bibliographie semble comporter peu de références récentes."),
        criterion("Bibliographie", "biblio-coherence", "Références cohérentes avec le sujet", "Les sources citées sont pertinentes pour la problématique et la méthode.", "essentiel", "Vérifier le lien entre chaque groupe de références et les concepts étudiés.", "Certaines références paraissent périphériques au sujet principal."),
        criterion("Bibliographie", "biblio-format", "Format bibliographique homogène", "Les références suivent un format cohérent et régulier.", "important", "Comparer auteurs, dates, titres, revues, pagination et ponctuation.", "Le format bibliographique varie d’une référence à l’autre."),
        criterion("Bibliographie", "biblio-sources", "Sources scientifiques identifiables", "Les sources scientifiques sont identifiables et traçables.", "essentiel", "Rechercher les informations permettant de retrouver les articles, ouvrages ou recommandations.", "Plusieurs sources manquent d’informations permettant leur identification."),
      ],
    },
    {
      key: "syntheseGlobale",
      nom: "Synthèse globale",
      criteres: [
        criterion("Synthèse globale", "synthese-coherence", "Cohérence globale du mémoire", "Les différentes parties suivent un fil directeur cohérent.", "essentiel", "Comparer le titre, la question, la méthode, les résultats et la conclusion.", "La cohérence entre certaines parties reste à vérifier."),
        criterion("Synthèse globale", "synthese-objectif", "Réponse à l’objectif principal", "Le mémoire apporte des éléments permettant d’examiner l’objectif annoncé.", "essentiel", "Vérifier la continuité entre l’objectif, les résultats et la conclusion.", "La réponse à l’objectif principal doit être clarifiée."),
        criterion("Synthèse globale", "synthese-vigilance", "Points de vigilance identifiés", "Les principaux éléments nécessitant une relecture sont recensés.", "important", "Regrouper les limites, incohérences et informations manquantes sans conclure automatiquement.", "Plusieurs points de vigilance nécessitent une validation humaine."),
        criterion("Synthèse globale", "synthese-priorites", "Priorités de correction hiérarchisées", "Les corrections prioritaires peuvent être distinguées des améliorations complémentaires.", "important", "Commencer par les incohérences qui affectent la compréhension ou la méthode.", "Les priorités de correction restent à hiérarchiser lors de la relecture."),
      ],
    },
  ];

  function getSection(key) {
    return sections.find((section) => section.key === key) || null;
  }

  function getCriteria(key) {
    const section = getSection(key);
    return section ? section.criteres.map((item) => ({ ...item })) : [];
  }

  global.GRILLES_IMRAD = Object.freeze({
    statutParDefaut: DEFAULT_STATUS,
    sections,
    getSection,
    getCriteria,
  });
})(window);
