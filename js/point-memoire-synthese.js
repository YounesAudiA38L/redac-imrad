(function initializePointMemoireSynthese(global) {
  const storage = global.RedacStorage;
  const studentSelect = document.querySelector("#point-synthese-student");
  const output = document.querySelector("#point-synthese-output");
  const adjustedTextarea = document.querySelector("#point-synthese-adjusted");
  const copyButton = document.querySelector("#copy-point-synthese");
  const saveButton = document.querySelector("#save-point-synthese");
  const statusElement = document.querySelector("#point-synthese-status");
  const pagesTextarea = document.querySelector("#point-documents-pages");
  const linkInput = document.querySelector("#point-documents-link");
  const saveDocumentsButton = document.querySelector("#save-point-documents");
  const documentsStatus = document.querySelector("#point-documents-status");

  if (!storage || !studentSelect || !output) return;

  let currentStudentId = "";
  let currentSyntheseText = "";

  const BLOCKS = [
    {
      title: "Identité",
      items: [
        { label: "Prénom", direct: ["prenom"] },
        { label: "Nom", direct: ["nom", "nomComplet"] },
        { label: "Email", direct: ["email", "adresseMail"], raw: ["email", "adresse mail", "adresse e-mail"] },
        { label: "IFMK", direct: ["ifmk"], raw: ["ifmk", "institut", "ecole", "école"] },
        { label: "Année / niveau", direct: ["niveau", "annee", "anneeEtude", "anneeEtudeLibelle"], raw: ["niveau", "annee", "année", "en quelle annee es-tu ?", "en quelle année es-tu ?"] },
        { label: "Prochaine échéance", direct: ["echeance", "prochaineEcheance"], raw: ["echeance", "échéance", "prochaine echeance", "prochaine échéance"] },
      ],
    },
    {
      title: "Situation actuelle",
      items: [
        { label: "Où l’étudiant en est", direct: ["situationMemoire", "situationActuelle", "pointDepart", "avancementMemoire"], raw: ["ou en es-tu", "où en es-tu", "situation actuelle", "point de depart", "point de départ"] },
        { label: "Niveau d’avancement déclaré", direct: ["avancement", "niveauAvancement"], raw: ["avancement", "niveau d'avancement", "niveau d’avancement"] },
        { label: "Niveau de stress déclaré", direct: ["stress", "niveauStress"], raw: ["stress", "niveau de stress"] },
        { label: "Explication libre de la situation", direct: ["situationLibre", "precisions", "descriptionSituation", "syntheseQuestionnaire"], raw: ["situation libre", "precisions", "précisions", "explique ta situation"] },
      ],
    },
    {
      title: "Sujet",
      items: [
        { label: "Thème général", direct: ["themeSujet", "themeGeneral", "thematiqueMemoire"], raw: ["theme", "thème", "theme general", "thème général"] },
        { label: "Sujet actuel", direct: ["sujetActuel", "sujet", "sujetEnvisage"], raw: ["sujet actuel", "sujet envisage", "sujet envisagé"] },
        { label: "Statut déclaré du sujet", direct: ["statutSujet", "cadreSujet"], raw: ["statut du sujet"] },
        { label: "Perception du sujet par l’étudiant", direct: ["perceptionSujet", "clarteSujet"], raw: ["perception du sujet", "sujet clair", "trop large", "flou", "ambitieux"] },
        { label: "Pourquoi l’étudiant a choisi ce sujet", direct: ["raisonSujet", "choixSujet", "justificationSujet"], raw: ["pourquoi as-tu choisi ce sujet", "choix du sujet", "justification du sujet"] },
      ],
    },
    {
      title: "Question de recherche",
      items: [
        { label: "Question de recherche existante", direct: ["questionRechercheExiste", "questionRechercheActuelle"], raw: ["as-tu une question de recherche", "question de recherche actuelle"] },
        { label: "Formulation actuelle", direct: ["questionRecherche"], raw: ["question de recherche", "formulation actuelle"] },
        { label: "Le mémoire cherche à", direct: ["memoireChercheA", "objectifMemoire", "objectif"], raw: ["mon memoire cherche a", "mon mémoire cherche à", "objectif"] },
        { label: "Éléments identifiés par l’étudiant", direct: ["elementsRecherche", "populationObjectif"], raw: ["population", "situation clinique", "objectif", "interet kine", "intérêt kiné"] },
        { label: "Point à clarifier avec l’étudiant", direct: ["moinsClair", "pointAClarifier"], raw: ["moins clair", "point a clarifier", "point à clarifier"] },
      ],
    },
    {
      title: "Méthode",
      items: [
        { label: "Type de mémoire envisagé", direct: ["typeMemoire"], raw: ["type de memoire", "type de mémoire"] },
        { label: "Méthode envisagée", direct: ["methode", "methodeEnvisagee"], raw: ["methode envisagee", "méthode envisagée", "methode"] },
        { label: "Statut déclaré de la méthode", direct: ["statutMethode"], raw: ["statut methode"] },
        { label: "Cohérence méthode / question déclarée", direct: ["coherenceMethodeQuestion"], raw: ["coherence methode", "cohérence méthode"] },
        { label: "Difficultés signalées autour de la méthode", direct: ["difficultesMethode", "blocageMethode"], raw: ["difficulte methode", "difficulté méthode", "blocage methode"] },
      ],
    },
    {
      title: "Bibliographie",
      items: [
        { label: "Recherche bibliographique commencée", direct: ["rechercheBibliographiqueCommencee", "biblioCommencee"], raw: ["recherche bibliographique commencee", "recherche bibliographique commencée"] },
        { label: "Bases utilisées", direct: ["basesDonnees", "basesUtilisees"], raw: ["pubmed", "pedro", "cochrane", "sciencedirect", "google scholar", "bases de donnees", "bases de données"] },
        { label: "Mots-clés définis", direct: ["motsClesDefinis"], raw: ["mots-cles definis", "mots-clés définis"] },
        { label: "Mots-clés indiqués", direct: ["motsCles", "keywords"], raw: ["mots-cles", "mots-clés", "keywords"] },
        { label: "Nombre d’articles sélectionnés", direct: ["nombreArticles", "articlesSelectionnes"], raw: ["nombre d'articles", "nombre d’articles", "articles selectionnes"] },
        { label: "Aisance déclarée avec la recherche d’articles", direct: ["aisanceRechercheArticles"], raw: ["aisance", "recherche d'articles", "recherche d’articles"] },
      ],
    },
    {
      title: "Organisation",
      items: [
        { label: "Planning de travail", direct: ["planningTravail", "planning"], raw: ["planning", "calendrier"] },
        { label: "Parties déjà commencées ou rédigées", direct: ["partiesCommencees", "partiesRedigees"], raw: ["parties commencees", "parties commencées", "parties redigees", "parties rédigées"] },
        { label: "Temps disponible par semaine", direct: ["tempsMemoire", "tempsDisponible"], raw: ["temps disponible", "temps par semaine"] },
        { label: "Difficulté principale d’organisation", direct: ["difficulteOrganisation", "organisation"], raw: ["organisation", "difficulte d'organisation", "difficulté d’organisation"] },
      ],
    },
    {
      title: "Blocages",
      items: [
        { label: "Blocages cochés", direct: ["blocages", "blocagesCoches"], raw: ["blocages", "peur de mal faire", "manque de temps", "redaction", "rédaction", "soutenance"] },
        { label: "Blocage principal décrit", direct: ["blocagePrincipal", "difficultePrincipale"], raw: ["blocage principal", "difficulte principale", "difficulté principale"] },
        { label: "Éléments sensibles indiqués", direct: ["peurs", "difficultesDeclarees"], raw: ["peur de mal faire", "manque de temps", "redaction", "rédaction", "methode", "méthode", "bibliographie", "soutenance"] },
      ],
    },
    {
      title: "Attentes pour la visio",
      items: [
        { label: "Priorité pour la visio", direct: ["prioriteVisio", "priorite"], raw: ["priorite pour la visio", "priorité pour la visio"] },
        { label: "Les 3 questions principales à aborder", direct: ["questionsVisio", "questionsPrincipales"], raw: ["3 questions", "questions pour la visio", "questions principales"] },
        { label: "Ce que l’étudiant veut obtenir à la fin de la visio", direct: ["objectifFinVisio", "attentesVisio", "attentes"], raw: ["obtenir a la fin", "obtenir à la fin", "attentes"] },
      ],
    },
    {
      title: "Documents transmis",
      items: [
        { label: "Documents que l’étudiant peut transmettre", direct: ["documents", "documentsTransmis", "documentsDisponibles"], raw: ["documents", "fichiers", "pieces", "pièces"] },
        { label: "Lien de dépôt ou précision sur l’envoi", direct: ["lienDepot", "lienDocuments", "precisionEnvoi"], raw: ["lien", "drive", "depot", "dépôt", "mail"] },
      ],
      footer: "Pour un Point Mémoire, 2 à 5 pages suffisent. L’analyse complète du mémoire relève plutôt de l’accompagnement K5.",
    },
  ];

  function setMessage(element, message, type = "success") {
    if (!element) return;
    element.textContent = message;
    element.dataset.statusType = type;
    element.hidden = !message;
  }

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("fr-FR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  }

  function hasValue(value) {
    if (Array.isArray(value)) return value.some(hasValue);
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function formatValue(value) {
    if (Array.isArray(value)) return value.filter(hasValue).join(", ");
    if (typeof value === "boolean") return value ? "Oui" : "Non";
    return String(value ?? "").trim();
  }

  function getStudentSources(student) {
    const parcours = student?.donneesParcours || {};
    return [
      student,
      parcours,
      parcours.questionnaire,
      parcours.questionnairePreVisio,
      parcours.syntheseQuestionnaire,
      student?.questionnairePreVisio,
      student?.questionnairePreVisioPointMemoire,
    ].filter((source) => source && typeof source === "object");
  }

  function getRawSources(student) {
    const sources = [];
    getStudentSources(student).forEach((source) => {
      if (source.rawResponse && typeof source.rawResponse === "object") sources.push(source.rawResponse);
      if (source.reponseBrute && typeof source.reponseBrute === "object") sources.push(source.reponseBrute);
    });
    return sources;
  }

  function readStructuredValue(student, keys) {
    const normalizedKeys = keys.map(normalizeKey);
    for (const source of getStudentSources(student)) {
      for (const [key, value] of Object.entries(source)) {
        if (normalizedKeys.includes(normalizeKey(key)) && hasValue(value)) return formatValue(value);
      }
    }
    return "";
  }

  function readRawValue(student, keys) {
    const normalizedKeys = keys.map(normalizeKey);
    for (const source of getRawSources(student)) {
      for (const [key, value] of Object.entries(source)) {
        const normalizedKey = normalizeKey(key);
        const isMatch = normalizedKeys.some((candidate) => normalizedKey === candidate || normalizedKey.includes(candidate));
        if (isMatch && hasValue(value)) return formatValue(value);
      }
    }
    return "";
  }

  function getPointMemoireResponseValue(student, directKeys = [], rawKeys = []) {
    return readStructuredValue(student, directKeys) || readRawValue(student, rawKeys);
  }

  function hasQuestionnaireData(student) {
    const parcours = student?.donneesParcours || {};
    return Boolean(
      parcours.questionnaireId
      || parcours.syntheseQuestionnaire
      || parcours.questionnaire
      || parcours.questionnairePreVisio
      || student?.questionnairePreVisio
      || student?.questionnairePreVisioPointMemoire
    );
  }

  function getBlockRows(student, block) {
    return block.items
      .map((item) => ({
        label: item.label,
        value: getPointMemoireResponseValue(student, item.direct || [], item.raw || []),
      }))
      .filter((item) => hasValue(item.value));
  }

  function getCadreText(student) {
    const cadre = getPointMemoireResponseValue(
      student,
      ["cadreConfirme", "cadreAccepte", "redactionNonRemplacee", "cadre"],
      ["cadre confirme", "cadre confirmé", "cadre accepte", "cadre accepté", "redaction non remplacee", "rédaction non remplacée"],
    );
    if (!cadre) return "Cadre à vérifier";
    const normalizedCadre = normalizeKey(cadre);
    return ["oui", "confirme", "confirme par l'etudiant", "accepte"].some((value) => normalizedCadre.includes(value))
      ? "Cadre confirmé"
      : "Cadre à vérifier";
  }

  function createBlock(title, rows, footer = "") {
    const article = document.createElement("article");
    article.className = "point-synthese-block";
    const heading = document.createElement("h3");
    heading.textContent = title;
    article.append(heading);

    const list = document.createElement("dl");
    rows.forEach(({ label, value }) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      list.append(row);
    });
    article.append(list);

    if (footer) {
      const note = document.createElement("p");
      note.className = "point-synthese-note";
      note.textContent = footer;
      article.append(note);
    }
    return article;
  }

  function buildSyntheseData(student) {
    const blocks = BLOCKS
      .map((block) => ({ ...block, rows: getBlockRows(student, block) }))
      .filter((block) => block.rows.length || block.footer);
    blocks.push({
      title: "Cadre confirmé",
      rows: [{ label: "Cadre", value: getCadreText(student) }],
    });
    return blocks;
  }

  function buildPlainText(blocks) {
    return blocks.map((block) => {
      const lines = [block.title];
      block.rows.forEach((row) => lines.push(`${row.label} : ${row.value}`));
      if (block.footer) lines.push(block.footer);
      return lines.join("\n");
    }).join("\n\n");
  }

  function renderEmptyState() {
    output.textContent = "";
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune réponse de questionnaire liée à cet étudiant pour le moment. Audrey peut saisir des informations manuellement dans les notes pré-visio ci-dessous.";
    output.append(empty);
    currentSyntheseText = "";
  }

  function renderSynthese(student) {
    output.textContent = "";
    if (!student) {
      renderEmptyState();
      return;
    }

    if (!hasQuestionnaireData(student)) {
      renderEmptyState();
    } else {
      const blocks = buildSyntheseData(student);
      blocks.forEach((block) => output.append(createBlock(block.title, block.rows, block.footer)));
      currentSyntheseText = buildPlainText(blocks);
    }

    const data = student.donneesParcours || {};
    adjustedTextarea.value = data.syntheseQuestionnaireAjustee || currentSyntheseText;
    const documents = data.documentsPreVisio || {};
    pagesTextarea.value = documents.pagesNotes || "";
    linkInput.value = documents.lienDocuments || "";
  }

  function populateStudents(selectedId = "") {
    const students = storage.getStudentsByParcours("point-memoire");
    studentSelect.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = students.length ? "Sélectionner un étudiant" : "Aucun étudiant Point Mémoire actif";
    studentSelect.append(placeholder);
    students.forEach((student) => {
      const option = document.createElement("option");
      option.value = student.id;
      option.textContent = `${student.prenom || ""} ${student.nom || ""}`.trim() || student.email || "Étudiant sans nom";
      studentSelect.append(option);
    });
    if (students.some((student) => student.id === selectedId)) studentSelect.value = selectedId;
    studentSelect.disabled = students.length === 0;
  }

  function getSelectedStudent() {
    return storage.getStudentById(currentStudentId);
  }

  function updateButtons() {
    const hasStudent = Boolean(getSelectedStudent());
    copyButton.disabled = !hasStudent;
    saveButton.disabled = !hasStudent;
    saveDocumentsButton.disabled = !hasStudent;
  }

  async function copySynthese() {
    const text = adjustedTextarea.value.trim() || currentSyntheseText;
    if (!text) {
      setMessage(statusElement, "Aucune synthèse à copier pour le moment.", "warning");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = text;
      document.body.append(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    }
    setMessage(statusElement, "Synthèse copiée.", "success");
  }

  function saveAdjustedSynthese() {
    const student = getSelectedStudent();
    if (!student) return;
    storage.updateStudent(student.id, {
      donneesParcours: {
        ...(student.donneesParcours || {}),
        syntheseQuestionnaireAjustee: adjustedTextarea.value.trim(),
      },
    });
    setMessage(statusElement, "Synthèse enregistrée.", "success");
  }

  function saveDocuments() {
    const student = getSelectedStudent();
    if (!student) return;
    storage.updateStudent(student.id, {
      donneesParcours: {
        ...(student.donneesParcours || {}),
        documentsPreVisio: {
          pagesNotes: pagesTextarea.value.trim(),
          lienDocuments: linkInput.value.trim(),
          modifieLe: new Date().toISOString(),
        },
      },
    });
    setMessage(documentsStatus, "Documents / notes enregistrés.", "success");
  }

  function selectStudent(studentId) {
    currentStudentId = studentId || "";
    const student = getSelectedStudent();
    renderSynthese(student);
    updateButtons();
    setMessage(statusElement, "");
    setMessage(documentsStatus, "");
  }

  studentSelect.addEventListener("change", () => selectStudent(studentSelect.value));
  copyButton.addEventListener("click", copySynthese);
  saveButton.addEventListener("click", saveAdjustedSynthese);
  saveDocumentsButton.addEventListener("click", saveDocuments);
  global.addEventListener("redac:students-changed", () => {
    populateStudents(currentStudentId);
    selectStudent(studentSelect.value || currentStudentId);
  });

  populateStudents();
  selectStudent("");

  global.PointMemoireSynthese = Object.freeze({
    getPointMemoireResponseValue,
    buildSyntheseData,
  });
})(window);
