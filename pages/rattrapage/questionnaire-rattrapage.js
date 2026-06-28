(function initializeRattrapageQuestionnaire(global) {
  const services = global.RedacServices?.appData;
  if (!services) return;

  const UI_MESSAGES = Object.freeze({
    missingStudentEmail: "Aucune adresse e-mail pour cet étudiant. Renseigne-la dans la fiche avant de continuer.",
    missingAppsScriptUrl: "L'URL Apps Script n'est pas configurée. Renseigne-la dans les paramètres Rattrapage.",
    missingToken: "Le token de connexion est manquant. Vérifie la configuration Rattrapage.",
    missingFormsLink: "Le lien du questionnaire d’entrée Rattrapage est manquant.",
    missingSheetId: "L'ID Google Sheets des réponses est manquant.",
    noResponses: "Aucune réponse exploitable trouvée pour le questionnaire d’entrée Rattrapage.",
    noStudentSelected: "Aucun étudiant sélectionné. Choisis un étudiant Rattrapage avant de continuer.",
    draftPrepared: "Brouillon du questionnaire d’entrée préparé. À vérifier et envoyer par Audrey.",
    unmatched: "Aucune fiche Rattrapage correspondante trouvée pour cette réponse.",
  });
  const EMPTY_QUESTIONNAIRE = Object.freeze({
    lienForms: "",
    envoye: false,
    envoyeLe: "",
    reponduLe: "",
    typeRattrapage: "",
    echeanceRattrapage: "",
    noteInitiale: "",
    motifsRefus: [],
    retourEcrit: "",
    retoursDirecteur: "",
    correctionsDirecteur: "",
    correctionsDirecteurDetail: "",
    correctionsCommencees: "",
    semainesRestantes: "",
    etatEmotionnel: "",
    blocages: [],
    tempsDispo: "",
    provenance: "",
    attentes: "",
    reponsesBrutes: null,
    updatedAt: "",
  });
  const SUMMARY_FIELDS = [
    ["typeRattrapage", "Type de rattrapage"],
    ["echeanceRattrapage", "Échéance rattrapage"],
    ["noteInitiale", "Note initiale"],
    ["motifsRefus", "Motifs du refus"],
    ["retourEcrit", "Retour écrit du jury"],
    ["retoursDirecteur", "Retours du directeur"],
    ["correctionsDirecteur", "Corrections demandées par le directeur"],
    ["correctionsCommencees", "Corrections déjà commencées"],
    ["semainesRestantes", "Semaines restantes"],
    ["etatEmotionnel", "État émotionnel"],
    ["blocages", "Blocages"],
    ["tempsDispo", "Temps disponible"],
    ["attentes", "Attentes"],
  ];
  const MOTIFS_AXES = [
    { pattern: "methode insuffisante", axis: "methode" },
    { pattern: "bibliographie insuffisante", axis: "bibliographie" },
    { pattern: "probleme de structure", axis: "structure" },
    { pattern: "probleme de question de recherche", axis: "questionRecherche" },
    { pattern: "analyse insuffisante", axis: "analyse" },
    { pattern: "presentation orale", axis: "soutenance" },
    { pattern: "soutenance", axis: "soutenance" },
  ];

  const elements = {
    endpoint: document.querySelector("#rattrapage-questionnaire-endpoint"),
    token: document.querySelector("#rattrapage-questionnaire-token"),
    formUrl: document.querySelector("#rattrapage-questionnaire-form-url"),
    sheetId: document.querySelector("#rattrapage-questionnaire-sheet-id"),
    saveConfig: document.querySelector("#save-rattrapage-questionnaire-config"),
    configStatus: document.querySelector("#rattrapage-questionnaire-config-status"),
    studentSelect: document.querySelector("#rattrapage-questionnaire-student"),
    prepareDraft: document.querySelector("#prepare-rattrapage-questionnaire-draft"),
    fetchResponses: document.querySelector("#fetch-rattrapage-questionnaire-responses"),
    status: document.querySelector("#rattrapage-questionnaire-status"),
    summary: document.querySelector("#rattrapage-questionnaire-summary"),
  };
  if (!elements.studentSelect || !elements.summary) return;

  function normalizeSearchValue(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim();
  }

  function normalizeEmail(value) {
    return normalizeSearchValue(value);
  }

  function normalizeKey(value) {
    return normalizeSearchValue(value).replace(/[^a-z0-9]+/g, "");
  }

  function setMessage(element, message, type = "neutral") {
    if (!element) return;
    element.textContent = message;
    element.dataset.statusType = type;
    element.hidden = !message;
  }

  function validateUrl(value, label, appsScriptOnly = false) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    const url = new URL(trimmed);
    if (url.protocol !== "https:") throw new Error(`${label} doit utiliser HTTPS.`);
    if (appsScriptOnly && (url.hostname !== "script.google.com" || !url.pathname.includes("/macros/"))) {
      throw new Error(`${label} doit être une URL de déploiement Apps Script.`);
    }
    return url.toString();
  }

  function getRattrapageSettings() {
    const settings = services.getRattrapageSettings?.() || services.getEffectiveSettings?.().rattrapage || {};
    return {
      endpointRattrapage: settings.endpointRattrapage || settings.responsesAppsScriptUrl || "",
      tokenRattrapage: settings.tokenRattrapage || settings.token || "",
      lienFormsEntreeRattrapage: settings.lienFormsEntreeRattrapage || "",
      sheetIdEntreeRattrapage: settings.sheetIdEntreeRattrapage || "",
    };
  }

  function hydrateQuestionnaireConfig() {
    const settings = getRattrapageSettings();
    elements.endpoint.value = settings.endpointRattrapage;
    elements.token.value = settings.tokenRattrapage;
    elements.formUrl.value = settings.lienFormsEntreeRattrapage;
    elements.sheetId.value = settings.sheetIdEntreeRattrapage;
  }

  function saveQuestionnaireConfig() {
    const settings = {
      endpointRattrapage: elements.endpoint.value.trim() ? validateUrl(elements.endpoint.value, "L’URL Apps Script Rattrapage", true) : "",
      tokenRattrapage: elements.token.value.trim(),
      lienFormsEntreeRattrapage: elements.formUrl.value.trim() ? validateUrl(elements.formUrl.value, "Le lien Google Forms") : "",
      sheetIdEntreeRattrapage: elements.sheetId.value.trim(),
    };
    services.saveRattrapageSettings?.(settings);
    setMessage(elements.configStatus, "Configuration du questionnaire d’entrée Rattrapage enregistrée.", "success");
    return settings;
  }

  function getSelectedRattrapageStudent() {
    const student = services.getStudentById(elements.studentSelect.value);
    return student?.parcours === "rattrapage" ? student : null;
  }

  function getQuestionnaireEntree(student) {
    const existing = student?.donneesParcours?.questionnaireEntreeRattrapage;
    const questionnaire = existing && typeof existing === "object" ? existing : {};
    return {
      ...EMPTY_QUESTIONNAIRE,
      ...questionnaire,
      motifsRefus: Array.isArray(questionnaire.motifsRefus) ? questionnaire.motifsRefus : splitList(questionnaire.motifsRefus),
      blocages: Array.isArray(questionnaire.blocages) ? questionnaire.blocages : splitList(questionnaire.blocages),
      reponsesBrutes: questionnaire.reponsesBrutes || null,
    };
  }

  function updateQuestionnaireEntree(student, questionnaire) {
    return services.updateStudent(student.id, {
      donneesParcours: {
        questionnaireEntreeRattrapage: {
          ...getQuestionnaireEntree(student),
          ...questionnaire,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

  function buildRequestUrl(endpoint, action, token, payload) {
    const url = new URL(endpoint);
    url.search = "";
    return `${url.toString()}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token)}&payload=${encodeURIComponent(JSON.stringify(payload))}`;
  }

  async function prepareQuestionnaireEntreeDraft(student) {
    if (!student) {
      setMessage(elements.status, UI_MESSAGES.noStudentSelected, "warning");
      return;
    }
    const config = getRattrapageSettings();
    if (!config.endpointRattrapage) return setMessage(elements.status, UI_MESSAGES.missingAppsScriptUrl, "warning");
    if (!config.tokenRattrapage) return setMessage(elements.status, UI_MESSAGES.missingToken, "warning");
    if (!config.lienFormsEntreeRattrapage) return setMessage(elements.status, UI_MESSAGES.missingFormsLink, "warning");
    if (!normalizeEmail(student.email)) return setMessage(elements.status, UI_MESSAGES.missingStudentEmail, "warning");

    const payload = {
      action: "envoyer_questionnaire",
      email: student.email,
      prenom: student.prenom || "",
      nom: student.nom || "",
      lienForms: config.lienFormsEntreeRattrapage,
      parcours: "rattrapage",
      typeQuestionnaire: "entree_rattrapage",
      token: config.tokenRattrapage,
    };
    const url = buildRequestUrl(config.endpointRattrapage, "envoyer_questionnaire", config.tokenRattrapage, payload);
    elements.prepareDraft.disabled = true;
    setMessage(elements.status, "Préparation du brouillon du questionnaire d’entrée en cours.", "loading");
    try {
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || "Apps Script a signalé une erreur.");
      if (!response.ok || data.success !== true) throw new Error("Apps Script n’a pas confirmé la préparation du brouillon.");
      const updated = updateQuestionnaireEntree(student, {
        lienForms: config.lienFormsEntreeRattrapage,
        envoye: true,
        envoyeLe: data.envoyeLe || data.sendDraftCreatedAt || new Date().toISOString(),
      });
      renderRattrapageStudentSelector(updated.id);
      renderQuestionnaireEntreeSummary(updated);
      setMessage(elements.status, UI_MESSAGES.draftPrepared, "success");
    } catch (error) {
      setMessage(elements.status, `La préparation du brouillon a échoué : ${error.message}`, "error");
    } finally {
      elements.prepareDraft.disabled = false;
    }
  }

  function pickByLabel(rawResponse, labels) {
    const entries = Object.entries(rawResponse || {});
    const normalizedLabels = labels.map(normalizeKey);
    const found = entries.find(([key]) => normalizedLabels.some((label) => normalizeKey(key).includes(label) || label.includes(normalizeKey(key))));
    return found ? found[1] : "";
  }

  function splitList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    return String(value || "").split(/[,;\n]| \u2022 /).map((item) => item.trim()).filter(Boolean);
  }

  function normalizeRattrapageResponse(rawResponse) {
    const raw = rawResponse && typeof rawResponse === "object" ? rawResponse : {};
    return {
      prenom: pickByLabel(raw, ["prenom", "prénom"]),
      nom: pickByLabel(raw, ["nom", "nom de famille"]),
      email: String(pickByLabel(raw, ["email", "adresse mail", "adresse e-mail", "mail"]) || "").trim(),
      reponduLe: pickByLabel(raw, ["timestamp", "horodateur", "date de réponse", "receivedAt"]) || new Date().toISOString(),
      typeRattrapage: pickByLabel(raw, ["type de rattrapage", "rattrapage"]),
      echeanceRattrapage: pickByLabel(raw, ["echeance rattrapage", "échéance rattrapage", "date limite", "prochaine echeance"]),
      noteInitiale: pickByLabel(raw, ["note initiale", "note obtenue"]),
      motifsRefus: splitList(pickByLabel(raw, ["motifs du refus", "motif du refus", "raison du refus", "raisons du refus"])),
      retourEcrit: pickByLabel(raw, ["retour ecrit", "retour écrit", "retours jury", "commentaires jury"]),
      retoursDirecteur: pickByLabel(raw, ["retours du directeur", "avis directeur", "directeur de memoire"]),
      correctionsDirecteur: pickByLabel(raw, ["corrections demandees par le directeur", "corrections directeur"]),
      correctionsDirecteurDetail: pickByLabel(raw, ["detail corrections directeur", "détail corrections directeur", "precisions corrections"]),
      correctionsCommencees: pickByLabel(raw, ["corrections deja commencees", "corrections déjà commencées"]),
      semainesRestantes: pickByLabel(raw, ["semaines restantes", "temps restant"]),
      etatEmotionnel: pickByLabel(raw, ["etat emotionnel", "état émotionnel", "ressenti"]),
      blocages: splitList(pickByLabel(raw, ["blocages", "difficultes", "difficultés"])),
      tempsDispo: pickByLabel(raw, ["temps disponible", "disponibilite", "disponibilité"]),
      provenance: pickByLabel(raw, ["provenance", "comment as-tu connu", "source"]),
      attentes: pickByLabel(raw, ["attentes", "besoins", "aide souhaitee"]),
      reponsesBrutes: raw,
    };
  }

  function getNameKey(student) {
    return normalizeSearchValue(`${student?.prenom || ""} ${student?.nom || ""}`);
  }

  function associateRattrapageResponseToStudent(response) {
    const students = services.getStudentsByParcours("rattrapage");
    const email = normalizeEmail(response.email);
    let student = email ? students.find((item) => normalizeEmail(item.email) === email) : null;
    if (!student) {
      const responseName = normalizeSearchValue(`${response.prenom || ""} ${response.nom || ""}`);
      if (responseName) student = students.find((item) => getNameKey(item) === responseName);
    }
    if (!student) return { student: null, message: UI_MESSAGES.unmatched };
    const updated = updateQuestionnaireEntree(student, response);
    applyMotifsRefusSuggestion(updated, getQuestionnaireEntree(updated));
    return { student: updated, message: "" };
  }

  async function fetchQuestionnaireEntreeResponses() {
    const config = getRattrapageSettings();
    if (!config.endpointRattrapage) return setMessage(elements.status, UI_MESSAGES.missingAppsScriptUrl, "warning");
    if (!config.tokenRattrapage) return setMessage(elements.status, UI_MESSAGES.missingToken, "warning");
    if (!config.sheetIdEntreeRattrapage) return setMessage(elements.status, UI_MESSAGES.missingSheetId, "warning");

    const payload = {
      action: "recuperer_reponses",
      sheetId: config.sheetIdEntreeRattrapage,
      token: config.tokenRattrapage,
      typeQuestionnaire: "entree_rattrapage",
    };
    const url = buildRequestUrl(config.endpointRattrapage, "recuperer_reponses", config.tokenRattrapage, payload);
    elements.fetchResponses.disabled = true;
    setMessage(elements.status, "Récupération des réponses Rattrapage en cours.", "loading");
    try {
      const fetchResponse = await fetch(url, { cache: "no-store" });
      const data = await fetchResponse.json();
      if (data.success === false) throw new Error(data.error || "Apps Script a signalé une erreur.");
      const responses = data.responses || data.reponses || data.data || [];
      if (!fetchResponse.ok || !Array.isArray(responses) || responses.length === 0) throw new Error(UI_MESSAGES.noResponses);
      const results = responses.map((response) => associateRattrapageResponseToStudent(normalizeRattrapageResponse(response)));
      const associated = results.filter((result) => result.student).length;
      const unmatched = results.length - associated;
      const selected = getSelectedRattrapageStudent();
      if (selected) renderQuestionnaireEntreeSummary(services.getStudentById(selected.id));
      setMessage(elements.status, `${associated} réponse(s) associée(s). ${unmatched} réponse(s) non associée(s).`, associated ? "success" : "warning");
    } catch (error) {
      setMessage(elements.status, error.message, "error");
    } finally {
      elements.fetchResponses.disabled = false;
    }
  }

  function formatValue(value) {
    if (Array.isArray(value)) return value.length ? value.join("\n") : "Non renseigné";
    return String(value || "").trim() || "Non renseigné";
  }

  function renderQuestionnaireEntreeSummary(student) {
    elements.summary.textContent = "";
    if (!student) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = UI_MESSAGES.noStudentSelected;
      elements.summary.append(empty);
      return;
    }
    const questionnaire = getQuestionnaireEntree(student);
    const hasResponse = Boolean(questionnaire.reponduLe || questionnaire.reponsesBrutes);
    if (!hasResponse) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucune réponse au questionnaire d’entrée Rattrapage n’est encore associée à cet étudiant.";
      elements.summary.append(empty);
      return;
    }
    const list = document.createElement("dl");
    list.className = "rattrapage-questionnaire-summary-grid";
    SUMMARY_FIELDS.forEach(([key, label]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = formatValue(questionnaire[key]);
      item.append(term, detail);
      list.append(item);
    });
    elements.summary.append(list);
  }

  function renderRattrapageStudentSelector(selectedId = elements.studentSelect.value) {
    const students = services.getStudentsByParcours("rattrapage")
      .slice()
      .sort((left, right) => `${left.nom || ""} ${left.prenom || ""}`.localeCompare(`${right.nom || ""} ${right.prenom || ""}`, "fr"));
    elements.studentSelect.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = students.length ? "Sélectionner un étudiant Rattrapage" : "Aucun étudiant Rattrapage actif";
    elements.studentSelect.append(placeholder);
    students.forEach((student) => {
      const option = document.createElement("option");
      option.value = student.id;
      option.textContent = `${student.prenom || ""} ${student.nom || ""}`.trim() || student.email || "Étudiant sans nom";
      elements.studentSelect.append(option);
    });
    if (students.some((student) => student.id === selectedId)) elements.studentSelect.value = selectedId;
    elements.studentSelect.disabled = students.length === 0;
    const selected = getSelectedRattrapageStudent();
    renderQuestionnaireEntreeSummary(selected);
    setMessage(elements.status, selected ? "" : UI_MESSAGES.noStudentSelected, selected ? "neutral" : "warning");
  }

  function applyMotifsRefusSuggestion(student, questionnaireData) {
    const motifs = questionnaireData.motifsRefus || [];
    const matchedAxes = [...new Set(motifs.flatMap((motif) => {
      const normalized = normalizeSearchValue(motif);
      return MOTIFS_AXES.filter(({ pattern }) => normalized.includes(pattern)).map(({ axis }) => axis);
    }))];
    if (!matchedAxes.length) return student;
    const confirmed = global.confirm("Des motifs du refus peuvent alimenter les remarques jury. Pré-remplir les axes correspondants sans écraser les données existantes ?");
    if (!confirmed) return student;

    const data = student.donneesParcours || {};
    const remarks = data.remarquesJury && typeof data.remarquesJury === "object" ? { ...data.remarquesJury } : {};
    const note = "Pré-rempli depuis le questionnaire d’entrée Rattrapage — à vérifier par Audrey.";
    matchedAxes.forEach((axis) => {
      const current = remarks[axis] && typeof remarks[axis] === "object" ? { ...remarks[axis] } : {};
      const suggestions = Array.isArray(current.suggestions) ? [...current.suggestions] : [];
      if (!current.note && !current.texte && !current.commentaire) current.note = note;
      else if (!suggestions.includes(note)) suggestions.push(note);
      if (!current.gravite) current.gravite = "bloquant";
      if (suggestions.length) current.suggestions = suggestions;
      remarks[axis] = current;
    });
    return services.updateStudent(student.id, { donneesParcours: { remarquesJury: remarks } });
  }

  hydrateQuestionnaireConfig();
  renderRattrapageStudentSelector();
  elements.saveConfig.addEventListener("click", () => {
    try { saveQuestionnaireConfig(); } catch (error) { setMessage(elements.configStatus, error.message, "error"); }
  });
  elements.studentSelect.addEventListener("change", () => {
    const student = getSelectedRattrapageStudent();
    renderQuestionnaireEntreeSummary(student);
    setMessage(elements.status, student ? "" : UI_MESSAGES.noStudentSelected, student ? "neutral" : "warning");
  });
  elements.prepareDraft.addEventListener("click", () => prepareQuestionnaireEntreeDraft(getSelectedRattrapageStudent()));
  elements.fetchResponses.addEventListener("click", fetchQuestionnaireEntreeResponses);
  global.addEventListener("redac:parcours-rendered", (event) => {
    if (event.detail?.parcours === "rattrapage") renderRattrapageStudentSelector();
  });

  global.QuestionnaireEntreeRattrapage = Object.freeze({
    getSelectedRattrapageStudent,
    getQuestionnaireEntree,
    saveQuestionnaireConfig,
    prepareQuestionnaireEntreeDraft,
    fetchQuestionnaireEntreeResponses,
    normalizeRattrapageResponse,
    associateRattrapageResponseToStudent,
    renderQuestionnaireEntreeSummary,
    renderRattrapageStudentSelector,
    applyMotifsRefusSuggestion,
  });
})(window);
