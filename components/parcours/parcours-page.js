(function renderParcoursStudents() {
  const storage = window.RedacServices.appData;
  const container = document.querySelector("[data-parcours-students]");

  if (!container) return;

  const parcours = container.dataset.parcoursStudents;
  const count = document.querySelector("[data-parcours-count]");
  const parcoursLabels = window.RedacConstants?.parcoursLabels || { "point-memoire": "Point Mémoire", k4: "K4", k5: "K5", rattrapage: "Rattrapage" };
  const UI_MESSAGES = Object.freeze({
    studentArchived: "Dossier archivé. Tu peux le retrouver dans les filtres.",
  });
  const FUTURE_HELP_TEXTS = Object.freeze({
    rattrapageMemoireAnalysis: "Repérage automatique indicatif. Ces signaux complètent l'analyse d'Audrey, ne la remplacent pas.",
  });
  const FUTURE_BUTTON_TODOS = Object.freeze({
    k4: [
      "Analyser le sujet",
      "Enregistrer la fiche de cadrage",
      "Enregistrer la trame de question",
      "Ajouter une visio",
      "Supprimer cette visio",
      "Générer la feuille de route dans Drive",
    ],
    k5: [
      "Importer le mémoire",
      "Extraire les éléments IMRaD",
      "Enregistrer la grille IMRaD",
      "Enregistrer la checklist",
      "Ajouter un compte-rendu",
      "Générer le CR dans Drive",
      "Préparer le brouillon mail",
      "Enregistrer le planning",
      "Ajouter une visio",
      "Marquer la visio comme faite",
      "Supprimer cette visio",
      "Enregistrer la préparation soutenance",
      "Récupérer les réponses du questionnaire",
      "Préparer les livrables dans Drive",
      "Générer le retour final dans Drive",
      "Enregistrer la configuration",
    ],
    rattrapage: [
      "Importer le mémoire",
      "Analyser le mémoire",
      "Enregistrer les remarques jury",
      "Importer les corrections depuis les remarques",
      "Ajouter une correction",
      "Convertir les signaux en corrections",
      "Enregistrer le plan de reprise",
      "Ajouter une visio",
      "Marquer la visio comme faite",
      "Supprimer cette visio",
      "Enregistrer la préparation orale",
      "Générer le plan de correction dans Drive",
      "Générer la synthèse de reprise dans Drive",
      "Préparer le brouillon mail",
    ],
  });
  // TODO: afficher FUTURE_HELP_TEXTS.rattrapageMemoireAnalysis quand la zone d'analyse mémoire rattrapage existera.
  // TODO: créer les boutons listés dans FUTURE_BUTTON_TODOS uniquement lorsque les fonctionnalités correspondantes existent.
  const statusValues = ["nouveau", "questionnaire-envoye", "questionnaire-recu", "memoire-importe", "analyse-en-cours", "retour-envoye", "a-relancer", "termine"];
  const parcoursTransferOptions = [
    { value: "point-memoire", label: "Point Mémoire" },
    { value: "k4", label: "K4" },
    { value: "k5", label: "K5" },
    { value: "rattrapage", label: "Rattrapage" },
  ];
  const aiMemoireFields = [
    { key: "titreMemoire", label: "Titre du mémoire" },
    { key: "typeDocument", label: "Type de document" },
    { key: "typeMemoire", label: "Type de mémoire" },
    { key: "questionRecherche", label: "Question de recherche" },
    { key: "population", label: "Population étudiée" },
    { key: "interventionExposition", label: "Intervention ou exposition" },
    { key: "comparateur", label: "Comparateur" },
    { key: "criteresJugement", label: "Critères de jugement" },
    { key: "indicateurs", label: "Indicateurs" },
    { key: "pico", label: "PICO" },
    { key: "criteresInclusion", label: "Critères d’inclusion" },
    { key: "criteresExclusion", label: "Critères d’exclusion" },
    { key: "methode", label: "Méthode" },
    { key: "basesDonnees", label: "Bases de données" },
    { key: "motsCles", label: "Mots-clés" },
    { key: "resultatsPrincipaux", label: "Résultats principaux" },
    { key: "limites", label: "Limites" },
    { key: "pointsAVerifier", label: "Points à vérifier par Audrey" },
  ];
  const aiFinalStatuses = new Set(["valide", "corrige", "non_retrouve", "refuse"]);
  let termeRechercheParcours = "";
  let statutFiltreParcours = "tous";
  let urgenceFiltre = "";
  let triFiltre = "";
  let archivesVisible = false;
  let archivesSection = null;
  let archivesButton = null;
  let parcoursStatus = null;
  let openTransferDropdown = null;
  const historyOpenStudentIds = new Set();
  let aiMemoireOpenStudentId = "";

  function normalizeSearchValue(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
  }

  function isStudentArchived(student) {
    return (
      student?.statutSuivi === "archive" ||
      student?.statut === "Archivé" ||
      student?.statut === "archive" ||
      student?.archive === true ||
      Boolean(student?.dateArchivage)
    );
  }

  function getAllStudentsForParcours() {
    const databaseStudents = storage.getDatabase?.().students;
    if (Array.isArray(databaseStudents)) return databaseStudents.filter((student) => student.parcours === parcours);

    const studentsById = new Map();
    storage.getStudentsByParcours(parcours).forEach((student) => studentsById.set(student.id, student));
    storage.getArchivedStudentsByParcours(parcours).forEach((student) => studentsById.set(student.id, student));
    return Array.from(studentsById.values());
  }

  function createFilterBar() {
    const controls = document.createElement("div");
    controls.className = "filter-bar parcours-filter-bar";
    controls.setAttribute("role", "search");

    const searchField = document.createElement("label");
    searchField.className = "field parcours-search-field";
    const searchLabel = document.createElement("span");
    searchLabel.textContent = "Rechercher un étudiant";
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Rechercher (nom, email…)";
    searchInput.autocomplete = "off";
    searchField.append(searchLabel, searchInput);

    const statusField = document.createElement("label");
    statusField.className = "field parcours-status-field";
    const statusLabel = document.createElement("span");
    statusLabel.textContent = "Statut de suivi";
    const statusSelect = document.createElement("select");
    const allStatuses = document.createElement("option");
    allStatuses.value = "tous";
    allStatuses.textContent = "Tous les statuts";
    statusSelect.append(allStatuses);
    statusValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = storage.getStatutSuiviLabel(value);
      statusSelect.append(option);
    });
    statusField.append(statusLabel, statusSelect);

    const urgencyField = document.createElement("label");
    urgencyField.className = "field parcours-urgency-field";
    const urgencyLabel = document.createElement("span");
    urgencyLabel.textContent = "Urgence";
    const urgencySelect = document.createElement("select");
    [
      { value: "", label: "Toutes les urgences" },
      { value: "urgent", label: "Urgent (< 7 jours)" },
      { value: "bientot", label: "Bientôt (< 15 jours)" },
      { value: "depassee", label: "Échéance dépassée" },
    ].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      urgencySelect.append(option);
    });
    urgencyField.append(urgencyLabel, urgencySelect);

    const sortField = document.createElement("label");
    sortField.className = "field parcours-sort-field";
    const sortLabel = document.createElement("span");
    sortLabel.textContent = "Trier par";
    const sortSelect = document.createElement("select");
    [
      { value: "", label: "Ordre par défaut" },
      { value: "echeance_asc", label: "Échéance : la plus proche en premier" },
      { value: "echeance_desc", label: "Échéance : la plus lointaine en premier" },
      { value: "nom_asc", label: "Nom A → Z" },
    ].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      sortSelect.append(option);
    });
    sortField.append(sortLabel, sortSelect);

    controls.append(searchField, statusField, urgencyField, sortField);
    container.before(controls);

    searchInput.addEventListener("input", () => {
      termeRechercheParcours = searchInput.value;
      render();
    });
    statusSelect.addEventListener("change", () => {
      statutFiltreParcours = statusSelect.value;
      render();
    });
    urgencySelect.addEventListener("change", () => {
      urgenceFiltre = urgencySelect.value;
      render();
    });
    sortSelect.addEventListener("change", () => {
      triFiltre = sortSelect.value;
      render();
    });
  }

  function matchesUrgenceFilter(student) {
    if (urgenceFiltre === "urgent") return storage.isUrgent(student) === true;
    const deadlineLevel = storage.getNiveauEcheance(student);
    if (urgenceFiltre === "bientot") return deadlineLevel === "bientot" || deadlineLevel === "urgent";
    if (urgenceFiltre === "depassee") return deadlineLevel === "depassee";
    return true;
  }

  function getDeadlineTimestamp(student) {
    const date = new Date(student?.echeance || "");
    return Number.isNaN(date.getTime()) ? Infinity : date.getTime();
  }

  function compareByDeadlineAsc(left, right) {
    return getDeadlineTimestamp(left) - getDeadlineTimestamp(right);
  }

  function compareByDeadlineDesc(left, right) {
    const leftTime = getDeadlineTimestamp(left);
    const rightTime = getDeadlineTimestamp(right);
    if (leftTime === Infinity && rightTime === Infinity) return 0;
    if (leftTime === Infinity) return 1;
    if (rightTime === Infinity) return -1;
    return rightTime - leftTime;
  }

  function compareByName(left, right) {
    const leftName = `${left.nom || ""} ${left.prenom || ""}`.trim();
    const rightName = `${right.nom || ""} ${right.prenom || ""}`.trim();
    return leftName.localeCompare(rightName, "fr", { sensitivity: "base" });
  }

  function sortStudents(students) {
    if (triFiltre === "echeance_asc") return [...students].sort(compareByDeadlineAsc);
    if (triFiltre === "echeance_desc") return [...students].sort(compareByDeadlineDesc);
    if (triFiltre === "nom_asc") return [...students].sort(compareByName);
    return students;
  }

  function addDetail(list, label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value || "À renseigner";
    row.append(term, description);
    list.append(row);
  }

  function hasStudentHistory(student) {
    const parcoursData = student?.donneesParcours || {};
    return Boolean(
      student?.sourceProspectId
      || parcoursData.origineProspect
      || parcoursData.questionnaireProspect
      || (Array.isArray(parcoursData.historiqueDossier) && parcoursData.historiqueDossier.length)
      || parcoursData.transfertParcours,
    );
  }

  function addHistoryDetail(list, label, value) {
    const normalized = typeof value === "number" ? String(value) : String(value || "").trim();
    if (!normalized) return;
    addDetail(list, label, normalized);
  }

  function formatHistoryDate(value) {
    return value ? formatDate(value) : "";
  }

  function createDefaultMemoireFile(student) {
    return {
      nom: student?.memoireImporte?.nom || "",
      type: student?.memoireImporte?.type || "",
      taille: student?.memoireImporte?.taille || "",
      importeLe: student?.memoireImporte?.importeLe || student?.dateModification || "",
      texteStockage: "",
      texteId: "",
    };
  }

  function createDefaultAiField() {
    return {
      propositionIA: "",
      valeurValidee: "",
      statutValidation: "propose",
      correctionAudrey: "",
      enseignementIA: "",
      updatedAt: "",
    };
  }

  function normalizeAiField(field) {
    const source = field && typeof field === "object" ? field : {};
    return {
      propositionIA: source.propositionIA || "",
      valeurValidee: source.valeurValidee || "",
      statutValidation: source.statutValidation || "propose",
      correctionAudrey: source.correctionAudrey || source.commentaireAudrey || "",
      enseignementIA: source.enseignementIA || source.raisonRefus || "",
      updatedAt: source.updatedAt || "",
    };
  }

  function normalizeMemoireAnalysis(student) {
    const donneesMemoire = student?.donneesMemoire && typeof student.donneesMemoire === "object" ? student.donneesMemoire : {};
    const analyseIA = donneesMemoire.analyseIA && typeof donneesMemoire.analyseIA === "object" ? donneesMemoire.analyseIA : {};
    const propositions = analyseIA.propositions && typeof analyseIA.propositions === "object" ? analyseIA.propositions : {};
    const normalizedPropositions = {};
    aiMemoireFields.forEach((field) => {
      normalizedPropositions[field.key] = normalizeAiField(propositions[field.key]);
    });

    return {
      fichier: {
        ...createDefaultMemoireFile(student),
        ...(donneesMemoire.fichier && typeof donneesMemoire.fichier === "object" ? donneesMemoire.fichier : {}),
      },
      analyseIA: {
        statut: analyseIA.statut || "non_lancee",
        modele: analyseIA.modele || "",
        genereLe: analyseIA.genereLe || "",
        propositions: normalizedPropositions,
        apprentissagesIA: Array.isArray(analyseIA.apprentissagesIA) ? [...analyseIA.apprentissagesIA] : [],
      },
    };
  }

  function calculateAiGlobalStatus(analyseIA) {
    const fieldsWithProposal = aiMemoireFields
      .map((field) => analyseIA.propositions[field.key])
      .filter((field) => String(field?.propositionIA || "").trim());
    if (!fieldsWithProposal.length) return "non_lancee";
    const finalCount = fieldsWithProposal.filter((field) => aiFinalStatuses.has(field.statutValidation)).length;
    if (finalCount === 0) return "proposee";
    if (finalCount === fieldsWithProposal.length) return "validee";
    return "partiellement_validee";
  }

  function ensureMemoireAnalysis(student) {
    if (student?.donneesMemoire?.analyseIA) return student;
    const normalized = normalizeMemoireAnalysis(student);
    return storage.updateStudent(student.id, {
      donneesMemoire: {
        ...(student.donneesMemoire || {}),
        fichier: normalized.fichier,
        analyseIA: {
          ...normalized.analyseIA,
          statut: "non_lancee",
        },
      },
    });
  }

  function updateMemoireAnalysis(student, updater) {
    const normalized = normalizeMemoireAnalysis(student);
    const nextAnalyse = {
      ...normalized.analyseIA,
      propositions: { ...normalized.analyseIA.propositions },
      apprentissagesIA: [...normalized.analyseIA.apprentissagesIA],
    };
    updater(nextAnalyse);
    nextAnalyse.statut = calculateAiGlobalStatus(nextAnalyse);
    storage.updateStudent(student.id, {
      donneesMemoire: {
        ...(student.donneesMemoire || {}),
        fichier: normalized.fichier,
        analyseIA: nextAnalyse,
      },
    });
    render();
  }

  function upsertAiLearning(analyseIA, fieldKey, enseignementIA) {
    const text = String(enseignementIA || "").trim();
    const existingIndex = analyseIA.apprentissagesIA.findIndex((item) => item?.champ === fieldKey);
    if (!text) {
      if (existingIndex >= 0) analyseIA.apprentissagesIA.splice(existingIndex, 1);
      return;
    }
    const nextLearning = {
      champ: fieldKey,
      enseignementIA: text,
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      analyseIA.apprentissagesIA[existingIndex] = {
        ...analyseIA.apprentissagesIA[existingIndex],
        ...nextLearning,
      };
    } else {
      analyseIA.apprentissagesIA.push(nextLearning);
    }
  }

  function getMemoireTitleForAiLearning(student, analyseIA) {
    const titleField = normalizeAiField(analyseIA?.propositions?.titreMemoire);
    return titleField.valeurValidee || titleField.propositionIA || student?.memoireImporte?.nom || "";
  }

  function saveGlobalAiLearningRule(student, analyseIA, fieldDefinition, fieldState) {
    const ruleText = String(fieldState.enseignementIA || "").trim();
    if (!ruleText || typeof storage.upsertAiLearningRule !== "function") return;
    storage.upsertAiLearningRule({
      champ: fieldDefinition.key,
      erreurIA: fieldState.propositionIA || "",
      correctionAudrey: fieldState.correctionAudrey || fieldState.valeurValidee || "",
      regle: ruleText,
      sourceStudentId: student.id,
      sourceMemoireTitre: getMemoireTitleForAiLearning(student, analyseIA),
    });
  }

  function createAiLearningRulesPanel() {
    const wrapper = document.createElement("details");
    wrapper.className = "memoire-ai-rules-panel";

    const summary = document.createElement("summary");
    summary.textContent = "Règles IA apprises";
    wrapper.append(summary);

    const rules = typeof storage.getActiveAiLearningRules === "function" ? storage.getActiveAiLearningRules() : [];
    if (!rules.length) {
      const empty = document.createElement("p");
      empty.className = "helper-text";
      empty.textContent = "Aucune règle IA globale active pour le moment.";
      wrapper.append(empty);
      return wrapper;
    }

    const list = document.createElement("div");
    list.className = "memoire-ai-rules-list";
    rules.forEach((rule) => {
      const item = document.createElement("article");
      item.className = "memoire-ai-rule";
      const title = document.createElement("h5");
      title.textContent = aiMemoireFields.find((field) => field.key === rule.champ)?.label || rule.champ || "Champ IA";
      const text = document.createElement("p");
      text.textContent = rule.regle;
      item.append(title, text);
      if (rule.correctionAudrey) {
        const correction = document.createElement("p");
        correction.className = "helper-text";
        correction.textContent = `Correction d’origine : ${rule.correctionAudrey}`;
        item.append(correction);
      }
      const disable = document.createElement("button");
      disable.type = "button";
      disable.className = "secondary-action";
      disable.textContent = "Désactiver la règle";
      disable.addEventListener("click", () => {
        if (typeof storage.deactivateAiLearningRule === "function") storage.deactivateAiLearningRule(rule.id);
        render();
      });
      item.append(disable);
      list.append(item);
    });
    wrapper.append(list);
    return wrapper;
  }

  function createAiTextArea(labelText, value) {
    const label = document.createElement("label");
    label.className = "field";
    const labelTitle = document.createElement("span");
    labelTitle.textContent = labelText;
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.value = value || "";
    label.append(labelTitle, textarea);
    return { label, textarea };
  }

  function createAiTextHelp(text) {
    const help = document.createElement("span");
    help.className = "helper-text";
    help.textContent = text;
    return help;
  }

  function getAiFieldStatusLabel(status) {
    const labels = {
      propose: "À relire",
      valide: "Validé",
      corrige: "Corrigé",
      non_retrouve: "Non retrouvé",
      refuse: "Refusé",
    };
    return labels[status] || "À relire";
  }

  function createAiFieldCard(student, fieldDefinition, fieldValue) {
    const card = document.createElement("details");
    card.className = "memoire-ai-field";
    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.className = "memoire-ai-field-title";
    title.textContent = fieldDefinition.label;
    const statusBadge = document.createElement("span");
    statusBadge.className = "memoire-ai-status";
    statusBadge.textContent = getAiFieldStatusLabel(fieldValue.statutValidation);
    summary.append(title, statusBadge);

    const body = document.createElement("div");
    body.className = "memoire-ai-field-body";

    const proposal = createAiTextArea("Proposition IA", fieldValue.propositionIA);
    const correction = createAiTextArea("Valeur corrigée / validée par Audrey", fieldValue.correctionAudrey || fieldValue.valeurValidee);
    const aiRule = createAiTextArea("Règle IA pour les prochains mémoires, optionnelle", fieldValue.enseignementIA);
    aiRule.label.append(createAiTextHelp("Exemple : Ne pas inventer de comparateur si aucun comparateur n’est mentionné."));
    const refusalReason = createAiTextArea("Pourquoi cette proposition est refusée ?", fieldValue.statutValidation === "refuse" ? fieldValue.enseignementIA : "");
    refusalReason.label.append(createAiTextHelp("Optionnel. Une raison courte suffit."));

    const details = document.createElement("dl");
    addDetail(details, "Valeur validée", fieldValue.valeurValidee);
    addDetail(details, "Statut", fieldValue.statutValidation);
    if (fieldValue.enseignementIA) addDetail(details, "Enseignement IA", fieldValue.enseignementIA);

    const actions = document.createElement("div");
    actions.className = "student-card-actions";
    const status = document.createElement("p");
    status.className = "form-message memoire-ai-field-status";
    status.setAttribute("role", "status");
    status.hidden = true;

    const setFieldStatus = (message) => {
      status.textContent = message;
      status.hidden = !message;
    };

    const saveProposal = document.createElement("button");
    saveProposal.type = "button";
    saveProposal.className = "secondary-action";
    saveProposal.textContent = "Enregistrer la proposition";
    saveProposal.addEventListener("click", () => {
      updateMemoireAnalysis(student, (analyseIA) => {
        const current = normalizeAiField(analyseIA.propositions[fieldDefinition.key]);
        const nextProposal = proposal.textarea.value.trim();
        current.propositionIA = nextProposal;
        current.correctionAudrey = correction.textarea.value.trim();
        current.enseignementIA = aiRule.textarea.value.trim();
        current.updatedAt = new Date().toISOString();
        analyseIA.propositions[fieldDefinition.key] = current;
      });
    });

    const validate = document.createElement("button");
    validate.type = "button";
    validate.className = "secondary-action";
    validate.textContent = "Valider";
    validate.addEventListener("click", () => {
      updateMemoireAnalysis(student, (analyseIA) => {
        const current = normalizeAiField(analyseIA.propositions[fieldDefinition.key]);
        current.correctionAudrey = correction.textarea.value.trim();
        current.enseignementIA = aiRule.textarea.value.trim();
        if (!String(current.valeurValidee || "").trim()) current.valeurValidee = current.propositionIA || "";
        current.statutValidation = "valide";
        current.updatedAt = new Date().toISOString();
        analyseIA.propositions[fieldDefinition.key] = current;
      });
    });

    const correct = document.createElement("button");
    correct.type = "button";
    correct.className = "secondary-action";
    correct.textContent = "Corriger";
    correct.addEventListener("click", () => {
      const correctedValue = correction.textarea.value.trim();
      if (!correctedValue) {
        setFieldStatus("Renseigne d’abord la valeur corrigée dans le champ prévu.");
        return;
      }
      setFieldStatus("");
      updateMemoireAnalysis(student, (analyseIA) => {
        const current = normalizeAiField(analyseIA.propositions[fieldDefinition.key]);
        current.valeurValidee = correctedValue;
        current.correctionAudrey = correctedValue;
        current.enseignementIA = aiRule.textarea.value.trim();
        current.statutValidation = "corrige";
        current.updatedAt = new Date().toISOString();
        analyseIA.propositions[fieldDefinition.key] = current;
        upsertAiLearning(analyseIA, fieldDefinition.key, current.enseignementIA);
        saveGlobalAiLearningRule(student, analyseIA, fieldDefinition, current);
      });
    });

    const notFound = document.createElement("button");
    notFound.type = "button";
    notFound.className = "secondary-action";
    notFound.textContent = "Non retrouvé";
    notFound.addEventListener("click", () => {
      updateMemoireAnalysis(student, (analyseIA) => {
        const current = normalizeAiField(analyseIA.propositions[fieldDefinition.key]);
        current.valeurValidee = "";
        current.correctionAudrey = correction.textarea.value.trim();
        current.enseignementIA = aiRule.textarea.value.trim();
        current.statutValidation = "non_retrouve";
        current.updatedAt = new Date().toISOString();
        analyseIA.propositions[fieldDefinition.key] = current;
      });
    });

    const refuse = document.createElement("button");
    refuse.type = "button";
    refuse.className = "destructive-action";
    refuse.textContent = "Refuser";
    refuse.addEventListener("click", () => {
      updateMemoireAnalysis(student, (analyseIA) => {
        const current = normalizeAiField(analyseIA.propositions[fieldDefinition.key]);
        current.correctionAudrey = correction.textarea.value.trim();
        current.enseignementIA = aiRule.textarea.value.trim() || refusalReason.textarea.value.trim();
        current.statutValidation = "refuse";
        current.updatedAt = new Date().toISOString();
        analyseIA.propositions[fieldDefinition.key] = current;
        upsertAiLearning(analyseIA, fieldDefinition.key, current.enseignementIA);
        saveGlobalAiLearningRule(student, analyseIA, fieldDefinition, current);
      });
    });

    actions.append(saveProposal, validate, correct, notFound, refuse);
    body.append(proposal.label, details, correction.label, aiRule.label, refusalReason.label, status, actions);
    card.append(summary, body);
    return card;
  }

  function createMemoireAiPanel(student) {
    const normalized = normalizeMemoireAnalysis(student);
    const section = document.createElement("section");
    section.className = "memoire-ai-workspace memoire-ai-panel";

    const title = document.createElement("h4");
    title.textContent = `Analyse IA du mémoire — ${`${student.prenom || ""} ${student.nom || ""}`.trim() || "Étudiant sans nom"}`;
    const help = document.createElement("p");
    help.className = "helper-text";
    help.textContent = "Les corrections Audrey serviront plus tard à améliorer les consignes données à l’IA locale. Elles ne réentraînent pas automatiquement le modèle.";
    const close = document.createElement("button");
    close.className = "secondary-action";
    close.type = "button";
    close.textContent = "Fermer l’analyse";
    close.addEventListener("click", () => {
      aiMemoireOpenStudentId = "";
      render();
    });

    const status = document.createElement("dl");
    addDetail(status, "Statut global", calculateAiGlobalStatus(normalized.analyseIA));
    addDetail(status, "Modèle", normalized.analyseIA.modele || "Aucun modèle connecté");

    const grid = document.createElement("div");
    grid.className = "analysis-grid";
    aiMemoireFields.forEach((field) => {
      grid.append(createAiFieldCard(student, field, normalized.analyseIA.propositions[field.key]));
    });

    section.append(title, help, createAiLearningRulesPanel(), close, status, grid);
    return section;
  }

  function createStudentHistoryPanel(student) {
    const parcoursData = student.donneesParcours || {};
    const origine = parcoursData.origineProspect || {};
    const questionnaire = parcoursData.questionnaireProspect || {};
    const section = document.createElement("section");
    section.className = "student-history-panel";

    const title = document.createElement("h4");
    title.textContent = "Historique du dossier";
    const subtitle = document.createElement("p");
    subtitle.className = "helper-text";
    subtitle.textContent = "Entrée initiale";

    const details = document.createElement("dl");
    addHistoryDetail(details, "Source", origine.prospectId || student.sourceProspectId ? "Prospect" : "");
    addHistoryDetail(details, "Provenance", origine.source);
    addHistoryDetail(details, "Date de contact initiale", formatHistoryDate(origine.dateContact));
    addHistoryDetail(details, "Date de transformation", formatHistoryDate(origine.convertedAt));
    addHistoryDetail(details, "Parcours pressenti", parcoursLabels[origine.parcoursPressenti] || origine.parcoursPressenti);
    addHistoryDetail(details, "Parcours validé", parcoursLabels[origine.parcoursValide] || origine.parcoursValide);
    addHistoryDetail(details, "Parcours choisi", parcoursLabels[student.parcours] || student.parcours);
    addHistoryDetail(details, "Questionnaire envoyé le", formatHistoryDate(origine.questionnaireEnvoyeLe));
    addHistoryDetail(details, "Questionnaire répondu le", formatHistoryDate(origine.questionnaireReponduLe || questionnaire.receivedAt));
    addHistoryDetail(details, "Relance envoyée le", formatHistoryDate(origine.relanceEnvoyeeLe));
    addHistoryDetail(details, "Nombre de relances", origine.relanceCount);
    addHistoryDetail(details, "IFMK", questionnaire.ifmk);
    addHistoryDetail(details, "Niveau", questionnaire.niveau || questionnaire.annee);
    addHistoryDetail(details, "Avancement mémoire", questionnaire.avancementMemoire);
    addHistoryDetail(details, "Difficulté principale", questionnaire.difficultePrincipale);
    addHistoryDetail(details, "Aide souhaitée", questionnaire.aideSouhaitee);
    addHistoryDetail(details, "Notes disponibles", student.notesInitiales);

    const changes = Array.isArray(parcoursData.historiqueDossier)
      ? parcoursData.historiqueDossier.filter((item) => item?.type === "changement_parcours")
      : [];
    if (!changes.length && parcoursData.transfertParcours) {
      changes.push({
        type: "changement_parcours",
        ancienParcours: parcoursData.transfertParcours.depuis,
        nouveauParcours: parcoursData.transfertParcours.vers,
        date: parcoursData.transfertParcours.date,
        note: parcoursData.transfertParcours.note || "",
      });
    }
    section.append(title, subtitle, details);

    if (changes.length) {
      const changesTitle = document.createElement("p");
      changesTitle.className = "helper-text";
      changesTitle.textContent = "Changements de parcours";
      const changesList = document.createElement("dl");
      changes.forEach((change) => {
        const oldLabel = parcoursLabels[change.ancienParcours] || change.ancienParcours || "Parcours non renseigné";
        const newLabel = parcoursLabels[change.nouveauParcours] || change.nouveauParcours || "Parcours non renseigné";
        addHistoryDetail(changesList, "Changement", `${oldLabel} → ${newLabel}`);
        addHistoryDetail(changesList, "Date du changement", formatHistoryDate(change.date));
        addHistoryDetail(changesList, "Note", change.note);
      });
      section.append(changesTitle, changesList);
    }
    return section;
  }

  function isValidIsoDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function formatDateFr(value) {
    const trimmed = String(value || "").trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return isValidIsoDate(trimmed) ? `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}` : "";
    if (!trimmed) return "";
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function ensureParcoursStatus() {
    if (parcoursStatus) return parcoursStatus;
    parcoursStatus = document.createElement("p");
    parcoursStatus.className = "form-message parcours-status-message";
    parcoursStatus.setAttribute("role", "status");
    parcoursStatus.setAttribute("aria-live", "polite");
    parcoursStatus.hidden = true;
    container.before(parcoursStatus);
    return parcoursStatus;
  }

  function setParcoursStatus(message) {
    const status = ensureParcoursStatus();
    status.textContent = message;
    status.hidden = !message;
  }

  function closeTransferDropdown() {
    if (!openTransferDropdown) return;
    const toggle = openTransferDropdown.querySelector(".parcours-transfer-toggle");
    const menu = openTransferDropdown.querySelector(".parcours-transfer-menu");
    openTransferDropdown.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
    openTransferDropdown = null;
  }

  function createStatusBadges(student) {
    const badges = document.createElement("div");
    badges.className = "statut-pastilles";

    const followUpStatus = document.createElement("span");
    followUpStatus.className = "statut-pastille";
    followUpStatus.dataset.statut = student.statutSuivi;
    followUpStatus.textContent = storage.getStatutSuiviLabel(student.statutSuivi);
    badges.append(followUpStatus);

    const deadlineLevel = storage.getNiveauEcheance(student);
    const deadlineBadge = document.createElement("span");
    if (deadlineLevel === "depassee") {
      deadlineBadge.className = "statut-pastille statut-pastille-depassee";
      deadlineBadge.textContent = "Échéance dépassée";
      badges.append(deadlineBadge);
    } else if (storage.isUrgent(student)) {
      deadlineBadge.className = "statut-pastille statut-pastille-urgent";
      deadlineBadge.textContent = "Urgent";
      badges.append(deadlineBadge);
    } else if (deadlineLevel === "bientot") {
      deadlineBadge.className = "statut-pastille statut-pastille-bientot";
      deadlineBadge.textContent = "Bientôt";
      badges.append(deadlineBadge);
    }
    return badges;
  }

  function changeStudentParcours(student, targetParcours) {
    const targetLabel = parcoursLabels[targetParcours] || targetParcours;
    const currentLabel = parcoursLabels[student.parcours] || student.parcours || "Parcours non renseigné";
    const confirmed = window.confirm(`Changer le parcours de cet étudiant de ${currentLabel} vers ${targetLabel} ?`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const donneesParcours = student.donneesParcours && typeof student.donneesParcours === "object"
      ? student.donneesParcours
      : {};
    const historiqueDossier = Array.isArray(donneesParcours.historiqueDossier)
      ? [...donneesParcours.historiqueDossier]
      : [];
    historiqueDossier.push({
      type: "changement_parcours",
      ancienParcours: student.parcours || "",
      nouveauParcours: targetParcours,
      date: now,
      note: "",
    });

    storage.updateStudent(student.id, {
      parcours: targetParcours,
      dateModification: now,
      donneesParcours: {
        ...donneesParcours,
        historiqueDossier,
      },
    });
    setParcoursStatus(`L’étudiant a été déplacé vers ${targetLabel}.`);
    render();
  }

  function createParcoursTransferControl(student) {
    const wrapper = document.createElement("div");
    wrapper.className = "parcours-transfer-control change-path-dropdown";

    const toggle = document.createElement("button");
    toggle.className = "secondary-action parcours-transfer-toggle dropdown-toggle";
    toggle.type = "button";
    toggle.textContent = "Changer de parcours ▼";
    toggle.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "parcours-transfer-menu dropdown-menu";
    menu.hidden = true;

    parcoursTransferOptions.filter((option) => option.value !== student.parcours).forEach((option) => {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.textContent = option.label;
      choice.dataset.targetPath = option.value;
      choice.addEventListener("click", () => {
        closeTransferDropdown();
        changeStudentParcours(student, option.value);
      });
      menu.append(choice);
    });

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const shouldOpen = !wrapper.classList.contains("is-open");
      closeTransferDropdown();
      if (!shouldOpen) return;
      wrapper.classList.add("is-open");
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      openTransferDropdown = wrapper;
    });

    wrapper.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    wrapper.append(toggle, menu);
    return wrapper;
  }

  function createCard(student) {
    const card = document.createElement("article");
    card.className = "student-card";
    card.dataset.studentId = student.id;

    const header = document.createElement("div");
    const category = document.createElement("span"); category.className = "category-label"; category.textContent = parcoursLabels[student.parcours];
    const name = document.createElement("h3"); name.textContent = `${student.prenom} ${student.nom}`.trim() || "Étudiant sans nom";
    header.append(category, name, createStatusBadges(student));

    const details = document.createElement("dl");
    addDetail(details, "Début d’accompagnement", formatDateFr(student.dateDebut));
    addDetail(details, "Statut", student.statut);
    addDetail(details, "IFMK", student.ifmk);
    addDetail(details, "Thématique", student.thematiqueMemoire);
    if (student.parcours === "rattrapage") {
      addDetail(details, "Session rattrapage", formatDateFr(student.donneesParcours?.suiviRattrapage?.dateSession));
    }
    addDetail(details, "Mémoire importé", student.memoireImporte?.nom || "Aucun fichier");

    const actions = document.createElement("div");
    actions.className = "student-card-actions";
    const open = document.createElement("a"); open.className = "secondary-action"; open.href = `index.html?student=${encodeURIComponent(student.id)}`; open.textContent = "Voir le dossier";
    const edit = document.createElement("a"); edit.className = "secondary-action"; edit.href = `index.html?student=${encodeURIComponent(student.id)}&edit=1`; edit.textContent = "Modifier la fiche";
    const archived = isStudentArchived(student);
    const archive = document.createElement("button"); archive.className = "destructive-action"; archive.type = "button"; archive.textContent = archived ? "Archivé" : "Archiver le dossier"; archive.disabled = archived;
    archive.addEventListener("click", () => {
      const confirmed = window.confirm("Confirmer l’archivage de ce dossier ?");
      if (!confirmed) return;
      storage.archiveStudent(student.id);
      setParcoursStatus(UI_MESSAGES.studentArchived);
      render();
    });
    actions.append(open, edit, archive);
    if (hasStudentHistory(student)) {
      const history = document.createElement("button");
      history.className = "secondary-action";
      history.type = "button";
      history.textContent = historyOpenStudentIds.has(student.id) ? "Masquer l’historique" : "Historique du dossier";
      history.addEventListener("click", () => {
        if (historyOpenStudentIds.has(student.id)) {
          historyOpenStudentIds.delete(student.id);
        } else {
          historyOpenStudentIds.add(student.id);
        }
        render();
      });
      actions.append(history);
    }

    if (!isStudentArchived(student)) {
      const aiMemoire = document.createElement("button");
      aiMemoire.className = "secondary-action";
      aiMemoire.type = "button";
      aiMemoire.textContent = aiMemoireOpenStudentId === student.id ? "Masquer l’analyse IA" : "Analyse IA du mémoire";
      aiMemoire.addEventListener("click", () => {
        if (aiMemoireOpenStudentId === student.id) {
          aiMemoireOpenStudentId = "";
        } else {
          ensureMemoireAnalysis(student);
          aiMemoireOpenStudentId = student.id;
        }
        render();
      });
      actions.append(aiMemoire);
      actions.append(createParcoursTransferControl(student));
    }

    if (student.parcours === "k4") {
      card.classList.add("student-card-k4");
      const grid = document.createElement("div");
      grid.className = "student-card-grid";
      const summaryPanel = document.createElement("section");
      summaryPanel.className = "student-summary-panel";
      summaryPanel.append(header, details, actions);
      grid.append(summaryPanel);
      card.append(grid);
    } else {
      card.append(header, details, actions);
    }
    if (historyOpenStudentIds.has(student.id) && hasStudentHistory(student)) {
      card.append(createStudentHistoryPanel(student));
    }
    return card;
  }

  function formatDate(value) {
    if (!value) return "À renseigner";
    return formatDateFr(value) || value;
  }

  function createArchivedCard(student) {
    const card = document.createElement("article");
    card.className = "archive-student-card";
    card.dataset.studentId = student.id;

    const content = document.createElement("div");
    const category = document.createElement("span");
    category.className = "category-label";
    category.textContent = parcoursLabels[student.parcours] || student.parcours || "Parcours";
    const name = document.createElement("h3");
    name.textContent = `${student.prenom || ""} ${student.nom || ""}`.trim() || "Étudiant sans nom";
    const details = document.createElement("p");
    details.className = "archive-student-details";
    details.textContent = [
      student.email || "Email à renseigner",
      `Début : ${formatDate(student.dateDebut)}`,
      `Archivé : ${formatDate(student.dateArchivage || student.dateModification)}`,
    ].join(" · ");
    content.append(category, name, details);

    const actions = document.createElement("div");
    actions.className = "archive-student-actions";
    const restore = document.createElement("button");
    restore.className = "secondary-action archive-restore-action";
    restore.type = "button";
    restore.textContent = "Restaurer le dossier";
    restore.addEventListener("click", () => {
      const restoredStudent = storage.restoreStudent(student.id);
      if (restoredStudent?.dateArchivage) storage.updateStudent(student.id, { dateArchivage: "" });
      render();
      setArchiveStatus("Étudiant restauré.");
    });

    const remove = document.createElement("button");
    remove.className = "destructive-action archive-delete-action";
    remove.type = "button";
    remove.textContent = "Supprimer définitivement";
    remove.addEventListener("click", () => {
      const confirmed = window.confirm("Supprimer définitivement cette fiche ? Cette action est irréversible. Les données locales associées seront supprimées de Redac-IMRaD.");
      if (!confirmed) return;
      const typedConfirmation = window.prompt("Pour confirmer la suppression définitive, tape SUPPRIMER.");
      if (typedConfirmation !== "SUPPRIMER") {
        setArchiveStatus("Suppression annulée.");
        return;
      }
      storage.deleteStudent(student.id);
      render();
      setArchiveStatus("Étudiant supprimé définitivement.");
    });

    actions.append(restore, remove);
    card.append(content, actions);
    return card;
  }

  function setArchiveStatus(message) {
    const status = archivesSection?.querySelector("[data-archive-status]");
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function ensureArchivesSection() {
    if (archivesSection) return;
    const parcoursWorkspace = container.closest(".workspace");
    archivesSection = document.createElement("section");
    archivesSection.className = "workspace archives-students-section";
    archivesSection.hidden = true;
    archivesSection.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">Archives</p>
          <h2>Étudiants archivés</h2>
        </div>
      </div>
      <p class="sync-note">Les étudiants archivés restent consultables ici. La suppression définitive demande toujours confirmation.</p>
      <p class="form-message archives-status" data-archive-status role="status" aria-live="polite" hidden></p>
      <div class="archives-students-list" data-archive-list aria-live="polite"></div>
    `;

    archivesButton = document.createElement("button");
    archivesButton.className = "secondary-action archives-toggle-action";
    archivesButton.type = "button";
    archivesButton.textContent = "Voir les étudiants archivés";
    archivesButton.addEventListener("click", () => {
      archivesVisible = !archivesVisible;
      renderArchives();
    });

    const toggleWrap = document.createElement("div");
    toggleWrap.className = "archives-toggle-wrap";
    toggleWrap.append(archivesButton);
    parcoursWorkspace.after(toggleWrap, archivesSection);
  }

  function renderArchives() {
    ensureArchivesSection();
    const archivedStudents = getAllStudentsForParcours().filter(isStudentArchived);
    archivesSection.hidden = !archivesVisible;
    archivesButton.textContent = archivesVisible ? "Masquer les étudiants archivés" : "Voir les étudiants archivés";

    const list = archivesSection.querySelector("[data-archive-list]");
    list.textContent = "";
    if (archivedStudents.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucun étudiant archivé dans ce parcours.";
      list.append(empty);
      return;
    }

    archivedStudents.forEach((student) => list.append(createArchivedCard(student)));
  }

  function render() {
    const allStudents = getAllStudentsForParcours();
    const activeStudents = allStudents.filter((student) => !isStudentArchived(student));
    if (count) count.textContent = String(activeStudents.length);
    const searchTerm = normalizeSearchValue(termeRechercheParcours.trim());
    const students = sortStudents(activeStudents.filter((student) => {
      const matchesSearch = !searchTerm || [student.prenom, student.nom, student.email]
        .some((value) => normalizeSearchValue(value).includes(searchTerm));
      const matchesStatus = statutFiltreParcours === "tous" || student.statutSuivi === statutFiltreParcours;
      const matchesUrgence = matchesUrgenceFilter(student);
      return matchesSearch && matchesStatus && matchesUrgence;
    }));
    container.textContent = "";

    if (activeStudents.length === 0) {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Aucun étudiant accompagné dans ce parcours."; container.append(empty);
    } else if (students.length === 0) {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = urgenceFiltre ? "Aucun étudiant urgent dans ce parcours pour le moment." : "Aucun étudiant ne correspond à ta recherche."; container.append(empty);
    } else {
      students.forEach((student) => {
        container.append(createCard(student));
        if (aiMemoireOpenStudentId === student.id && !isStudentArchived(student)) {
          container.append(createMemoireAiPanel(student));
        }
      });
    }

    window.dispatchEvent(new CustomEvent("redac:parcours-rendered", { detail: { parcours } }));
    renderArchives();
  }

  createFilterBar();
  ensureArchivesSection();
  render();
  window.addEventListener("redac:students-changed", render);
  document.addEventListener("click", closeTransferDropdown);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTransferDropdown();
  });
})();
