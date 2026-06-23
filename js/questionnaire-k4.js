(function initializeK4Questionnaire(global) {
  const CONFIG_KEYS = Object.freeze({
    formUrl: "redacImrad.k4Questionnaire.formUrl",
    sendUrl: "redacImrad.k4Questionnaire.sendUrl",
    sendToken: "redacImrad.k4Questionnaire.sendToken",
    responsesUrl: "redacImrad.k4Questionnaire.responsesUrl",
    responsesToken: "redacImrad.k4Questionnaire.responsesToken",
  });
  const UNMATCHED_KEY = "redacImrad.k4Questionnaire.unmatchedResponses";
  const SEND_STATUSES = new Set(["non envoyé", "brouillon créé"]);
  const RESPONSE_STATUSES = new Set(["aucune réponse", "réponse reçue"]);
  const EMPTY_QUESTIONNAIRE = Object.freeze({
    formUrl: "",
    sendDraftId: "",
    sendDraftCreatedAt: "",
    sendStatus: "non envoyé",
    responseStatus: "aucune réponse",
    responseId: "",
    receivedAt: "",
    email: "",
    ifmk: "",
    pointDepart: "",
    objectifs: "",
    sujetEnvisage: "",
    questionRecherche: "",
    methodeEnvisagee: "",
    blocages: "",
    documentsDisponibles: "",
    questionsVisio: "",
    attentes: "",
    rawResponse: {},
  });
  const QUESTIONNAIRE_GROUPS = [
    {
      title: "Informations générales",
      fields: [
        { key: "receivedAt", label: "Date de réponse" },
        { key: "email", label: "Email" },
        { key: "ifmk", label: "IFMK" },
        { key: "niveau", label: "Niveau" },
        { key: "disponibilites", label: "Disponibilités habituelles pour les visios collectives", wide: true },
      ],
    },
    {
      title: "État des lieux du mémoire",
      fields: [
        { key: "pointDepart", label: "Point de départ", wide: true },
        { key: "sujetEnvisage", label: "Sujet envisagé", wide: true },
        { key: "questionRecherche", label: "Question de recherche actuelle", wide: true },
        { key: "niveauClarte", label: "Niveau de clarté sur le mémoire" },
        { key: "objectifs", label: "Objectifs à 3 mois", wide: true },
        { key: "echeance", label: "Prochaine échéance" },
      ],
    },
    {
      title: "Organisation et blocages",
      fields: [
        { key: "tempsMemoire", label: "Temps disponible chaque semaine" },
        { key: "organisation", label: "Organisation habituelle", wide: true },
        { key: "blocages", label: "Blocages actuels", wide: true },
        { key: "ressentiVisios", label: "Ressenti visios collectives", wide: true },
      ],
    },
    {
      title: "Attentes et précisions",
      fields: [
        { key: "attentes", label: "Attentes vis-à-vis de l’accompagnement", wide: true },
        { keys: ["precisions", "questionsVisio"], label: "Questions / précisions pour la visio", wide: true },
        { key: "cadre", label: "Cadre validé" },
      ],
    },
  ];
  const DISPLAY_FIELD_KEYS = QUESTIONNAIRE_GROUPS.flatMap((group) => group.fields.flatMap((field) => field.keys || [field.key]));

  const elements = {
    container: document.querySelector('[data-parcours-students="k4"]'),
    formUrl: document.querySelector("#k4-questionnaire-form-url"),
    sendUrl: document.querySelector("#k4-questionnaire-send-url"),
    sendToken: document.querySelector("#k4-questionnaire-send-token"),
    responsesUrl: document.querySelector("#k4-questionnaire-responses-url"),
    responsesToken: document.querySelector("#k4-questionnaire-responses-token"),
    saveConfig: document.querySelector("#save-k4-questionnaire-config"),
    checkResponses: document.querySelector("#check-k4-questionnaire-responses"),
    globalStatus: document.querySelector("#k4-questionnaire-global-status"),
    unmatchedSection: document.querySelector("#k4-unmatched-responses"),
    unmatchedList: document.querySelector("#k4-unmatched-response-list"),
  };
  if (!elements.container || !global.RedacStorage) return;

  function normalizeEmail(value) {
    return String(value || "").trim().toLocaleLowerCase("fr-FR");
  }

  function normalizeQuestionnaire(questionnaire) {
    const existing = questionnaire && typeof questionnaire === "object" ? questionnaire : {};
    const normalized = { ...EMPTY_QUESTIONNAIRE, ...existing };
    normalized.sendStatus = SEND_STATUSES.has(normalized.sendStatus) ? normalized.sendStatus : "non envoyé";
    normalized.responseStatus = RESPONSE_STATUSES.has(normalized.responseStatus) ? normalized.responseStatus : "aucune réponse";
    normalized.rawResponse = normalized.rawResponse && typeof normalized.rawResponse === "object" ? normalized.rawResponse : {};
    if (!existing.sendStatus && (normalized.sendDraftId || normalized.sendDraftCreatedAt)) normalized.sendStatus = "brouillon créé";
    const hasPreviousResponse = normalized.responseId || normalized.receivedAt || DISPLAY_FIELD_KEYS.some((key) => Boolean(normalized[key])) || Object.keys(normalized.rawResponse).length;
    if (!existing.responseStatus && hasPreviousResponse) normalized.responseStatus = "réponse reçue";
    return normalized;
  }

  function ensureStudentQuestionnaire(student) {
    const questionnairePreVisioK4 = normalizeQuestionnaire(student.questionnairePreVisioK4);
    if (!student.questionnairePreVisioK4 || JSON.stringify(student.questionnairePreVisioK4) !== JSON.stringify(questionnairePreVisioK4)) {
      return global.RedacStorage.updateStudent(student.id, { questionnairePreVisioK4 });
    }
    return student;
  }

  function getConfiguration() {
    return Object.fromEntries(Object.entries(CONFIG_KEYS).map(([name, key]) => [name, localStorage.getItem(key) || ""]));
  }

  function validateHttpsUrl(value, label, appsScriptOnly = false) {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol !== "https:") throw new Error(`${label} doit utiliser HTTPS.`);
    if (appsScriptOnly && (parsed.hostname !== "script.google.com" || !parsed.pathname.includes("/macros/"))) {
      throw new Error(`${label} doit être une URL de déploiement Apps Script.`);
    }
    return parsed.toString();
  }

  function saveConfiguration() {
    const config = {
      formUrl: elements.formUrl.value.trim() ? validateHttpsUrl(elements.formUrl.value, "L’URL Google Forms") : "",
      sendUrl: elements.sendUrl.value.trim() ? validateHttpsUrl(elements.sendUrl.value, "L’URL Apps Script d’envoi", true) : "",
      sendToken: elements.sendToken.value.trim(),
      responsesUrl: elements.responsesUrl.value.trim() ? validateHttpsUrl(elements.responsesUrl.value, "L’URL Apps Script des réponses", true) : "",
      responsesToken: elements.responsesToken.value.trim(),
    };
    Object.entries(CONFIG_KEYS).forEach(([name, key]) => {
      if (config[name]) localStorage.setItem(key, config[name]);
      else localStorage.removeItem(key);
    });
    setGlobalStatus("La configuration du questionnaire K4 a été enregistrée.", "success");
    return config;
  }

  function hydrateConfiguration() {
    const config = getConfiguration();
    Object.keys(CONFIG_KEYS).forEach((name) => { elements[name].value = config[name]; });
  }

  function setGlobalStatus(message, type = "neutral") {
    elements.globalStatus.textContent = message;
    elements.globalStatus.dataset.statusType = type;
    elements.globalStatus.hidden = false;
  }

  function findStudentCard(studentId) {
    return Array.from(elements.container.querySelectorAll("[data-student-id]")).find((card) => card.dataset.studentId === studentId) || null;
  }

  function setCardStatus(studentId, message, type = "neutral") {
    const status = findStudentCard(studentId)?.querySelector("[data-k4-questionnaire-card-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.statusType = type;
    status.hidden = false;
  }

  function buildRequestUrl(endpoint, action, token, payload) {
    const url = new URL(endpoint);
    url.search = "";
    return `${url.toString()}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token)}&payload=${encodeURIComponent(JSON.stringify(payload))}`;
  }

  function buildResponsesRequestUrl(endpoint, token) {
    const url = new URL(endpoint);
    url.search = "";
    return `${url.toString()}?action=getResponses&token=${encodeURIComponent(token)}`;
  }

  function buildDraftPayload(student, config) {
    const prenom = student.prenom || "";
    const nom = student.nom || "";
    return {
      token: config.sendToken,
      studentId: student.id,
      prenom,
      nom,
      nomComplet: `${prenom} ${nom}`.trim(),
      email: student.email || "",
      formUrl: config.formUrl || "",
    };
  }

  async function createQuestionnaireDraft(studentId) {
    const student = global.RedacStorage.getStudentById(studentId);
    if (!student || student.parcours !== "k4") return;
    const config = getConfiguration();
    if (!config.formUrl || !config.sendUrl || !config.sendToken) {
      setCardStatus(studentId, "Complétez et enregistrez la configuration d’envoi du questionnaire K4.", "warning");
      return;
    }
    if (!normalizeEmail(student.email)) {
      setCardStatus(studentId, "Ajoutez l’adresse email de l’étudiant avant de créer le brouillon.", "warning");
      return;
    }

    const payload = buildDraftPayload(student, config);
    const url = buildRequestUrl(config.sendUrl, "createDraft", config.sendToken, payload);
    setCardStatus(studentId, "Création du brouillon d’envoi du questionnaire en cours.", "loading");
    const button = findStudentCard(studentId)?.querySelector("[data-create-k4-questionnaire-draft]");
    if (button) button.disabled = true;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || "Apps Script a signalé une erreur.");
      if (!response.ok || data.success !== true || data.draftCreated !== true) {
        throw new Error("La réponse Apps Script ne confirme pas la création du brouillon.");
      }
      const questionnairePreVisioK4 = {
        ...normalizeQuestionnaire(student.questionnairePreVisioK4),
        formUrl: config.formUrl,
        sendDraftId: data.draftId || "",
        sendDraftCreatedAt: data.sendDraftCreatedAt || new Date().toISOString(),
        sendStatus: data.sendStatus || "brouillon créé",
      };
      const updated = global.RedacStorage.updateStudent(studentId, { questionnairePreVisioK4 });
      renderQuestionnairePanel(updated);
      setCardStatus(studentId, "Brouillon créé. À vérifier par Audrey dans Gmail avant envoi.", "success");
    } catch (error) {
      setCardStatus(studentId, `La création du brouillon a échoué : ${error.message}`, "error");
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  }

  function pick(response, ...keys) {
    const key = keys.find((candidate) => response?.[candidate] !== undefined && response[candidate] !== null);
    return key ? response[key] : "";
  }

  function normalizeResponse(response, index) {
    return {
      responseId: String(pick(response, "responseId", "id") || `k4-response-${index}`),
      receivedAt: pick(response, "receivedAt", "createdAt", "timestamp"),
      email: String(pick(response, "email", "adresseMail") || "").trim(),
      ifmk: pick(response, "ifmk", "IFMK"),
      pointDepart: pick(response, "pointDepart"),
      objectifs: pick(response, "objectifs"),
      sujetEnvisage: pick(response, "sujetEnvisage", "sujet"),
      questionRecherche: pick(response, "questionRecherche"),
      methodeEnvisagee: pick(response, "methodeEnvisagee", "methode"),
      blocages: pick(response, "blocages", "blocagesActuels"),
      documentsDisponibles: pick(response, "documentsDisponibles", "documents"),
      questionsVisio: pick(response, "questionsVisio"),
      attentes: pick(response, "attentes"),
      rawResponse: response && typeof response === "object" ? response : {},
    };
  }

  function responseTime(response) {
    const value = new Date(response.receivedAt).getTime();
    return Number.isNaN(value) ? 0 : value;
  }

  function renderUnmatchedResponses(responses) {
    elements.unmatchedList.textContent = "";
    elements.unmatchedSection.hidden = responses.length === 0;
    responses.forEach((response) => {
      const article = document.createElement("article");
      article.className = "k4-unmatched-response";
      const name = document.createElement("strong");
      name.textContent = response.email || "Email non renseigné";
      const date = document.createElement("span");
      date.textContent = response.receivedAt ? `Réponse reçue le ${formatValue("receivedAt", response.receivedAt)}` : "Date non renseignée";
      const subject = document.createElement("p");
      subject.textContent = response.sujetEnvisage || response.questionRecherche || "Sujet non renseigné";
      article.append(name, date, subject);
      elements.unmatchedList.append(article);
    });
  }

  function associateResponses(responses) {
    const students = global.RedacStorage.getStudentsByParcours("k4");
    const studentsByEmail = new Map(students.filter((student) => normalizeEmail(student.email)).map((student) => [normalizeEmail(student.email), student]));
    const grouped = new Map();
    const unmatched = [];

    responses.forEach((response) => {
      const student = studentsByEmail.get(normalizeEmail(response.email));
      if (!student) {
        unmatched.push(response);
        return;
      }
      const matches = grouped.get(student.id) || [];
      matches.push(response);
      grouped.set(student.id, matches);
    });

    let associatedCount = 0;
    grouped.forEach((matches, studentId) => {
      associatedCount += matches.length;
      const latest = [...matches].sort((a, b) => responseTime(b) - responseTime(a))[0];
      const student = global.RedacStorage.getStudentById(studentId);
      const questionnairePreVisioK4 = {
        ...normalizeQuestionnaire(student.questionnairePreVisioK4),
        ...latest,
        responseStatus: "réponse reçue",
      };
      global.RedacStorage.updateStudent(studentId, { questionnairePreVisioK4 });
    });

    localStorage.setItem(UNMATCHED_KEY, JSON.stringify(unmatched));
    renderUnmatchedResponses(unmatched);
    renderAllQuestionnaires();
    return { associatedCount, unmatchedCount: unmatched.length };
  }

  async function checkNewResponses() {
    const config = getConfiguration();
    if (!config.responsesUrl || !config.responsesToken) {
      setGlobalStatus("Complétez et enregistrez la configuration des réponses questionnaire K4.", "warning");
      return;
    }
    const url = buildResponsesRequestUrl(config.responsesUrl, config.responsesToken);
    elements.checkResponses.disabled = true;
    setGlobalStatus("Vérification des nouvelles réponses K4 en cours.", "loading");

    try {
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || "Apps Script a signalé une erreur.");
      if (!response.ok || data.success !== true || !Array.isArray(data.responses)) {
        throw new Error("La réponse Apps Script ne contient pas une liste de réponses exploitable.");
      }
      const normalized = data.responses.map(normalizeResponse);
      const result = associateResponses(normalized);
      setGlobalStatus(`${result.associatedCount} réponse(s) associée(s). ${result.unmatchedCount} réponse(s) non associée(s).`, "success");
    } catch (error) {
      setGlobalStatus(`La vérification a échoué : ${error.message}`, "error");
    } finally {
      elements.checkResponses.disabled = false;
    }
  }

  function formatValue(key, value) {
    if (key === "receivedAt" && value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
    }
    if (Array.isArray(value)) return value.filter(Boolean).join("\n");
    return String(value || "").trim();
  }

  function getQuestionnaireGroups(questionnaire) {
    return QUESTIONNAIRE_GROUPS.map((group) => ({
      title: group.title,
      fields: group.fields.map((field) => {
        const keys = field.keys || [field.key];
        const values = keys
          .map((key) => formatValue(key, questionnaire[key] || questionnaire.rawResponse?.[key]))
          .filter(Boolean);
        return { label: field.label, value: values.join("\n") || "Non renseigné", wide: Boolean(field.wide) };
      }),
    }));
  }

  function setPanelOpen(toggle, panel, open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Masquer le questionnaire" : "Questionnaire pré-visio K4";
  }

  function appendStatus(container, label, value, type) {
    const row = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label} : `;
    const status = document.createElement("span");
    status.className = "k4-questionnaire-status";
    status.dataset.status = type;
    status.textContent = value;
    row.append(strong, status);
    container.append(row);
  }

  function renderQuestionnairePanel(student) {
    if (!student || student.parcours !== "k4") return;
    student = ensureStudentQuestionnaire(student);
    const card = findStudentCard(student.id);
    const summaryPanel = card?.querySelector(".student-summary-panel");
    if (!card || !summaryPanel) return;

    const previousPanel = card.querySelector(".k4-questionnaire-panel");
    const wasOpen = previousPanel ? !previousPanel.hidden : false;
    card.querySelector(".k4-questionnaire-card-zone")?.remove();
    previousPanel?.remove();

    const questionnaire = student.questionnairePreVisioK4;
    const zone = document.createElement("section");
    zone.className = "k4-questionnaire-card-zone";
    const zoneTitle = document.createElement("h4");
    zoneTitle.textContent = "Questionnaire pré-visio K4";
    zone.append(zoneTitle);
    appendStatus(zone, "Statut d’envoi", questionnaire.sendStatus, questionnaire.sendStatus);
    const responseLabel = questionnaire.responseStatus === "réponse reçue" ? "Réponse reçue" : "Aucune réponse reçue pour le moment";
    appendStatus(zone, "Réponses", responseLabel, questionnaire.responseStatus);

    const draftButton = document.createElement("button");
    draftButton.className = "secondary-action";
    draftButton.type = "button";
    draftButton.dataset.createK4QuestionnaireDraft = "";
    draftButton.textContent = "Créer le brouillon d’envoi du questionnaire";
    draftButton.addEventListener("click", () => createQuestionnaireDraft(student.id));

    const panelId = `k4-questionnaire-${student.id}`;
    const toggle = document.createElement("button");
    toggle.className = "secondary-action k4-questionnaire-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-controls", panelId);
    const cardMessage = document.createElement("p");
    cardMessage.className = "form-message k4-questionnaire-card-status";
    cardMessage.dataset.k4QuestionnaireCardStatus = "";
    cardMessage.hidden = true;
    zone.append(draftButton, toggle, cardMessage);

    const panel = document.createElement("section");
    panel.className = "k4-questionnaire-panel";
    panel.id = panelId;
    const heading = document.createElement("div");
    heading.className = "k4-questionnaire-heading";
    const title = document.createElement("h4");
    title.textContent = "Questionnaire pré-visio K4";
    const description = document.createElement("p");
    description.textContent = "Réponses associées à cet étudiant.";
    heading.append(title, description);
    panel.append(heading);

    if (questionnaire.responseStatus !== "réponse reçue") {
      const empty = document.createElement("p");
      empty.className = "k4-questionnaire-empty";
      empty.textContent = "Aucune réponse au questionnaire pré-visio K4 n’est encore associée à cet étudiant.";
      panel.append(empty);
    } else {
      getQuestionnaireGroups(questionnaire).forEach((group) => {
        const groupSection = document.createElement("section");
        groupSection.className = "k4-questionnaire-group";
        const groupTitle = document.createElement("h5");
        groupTitle.textContent = group.title;
        const list = document.createElement("dl");
        list.className = "k4-questionnaire-grid";
        group.fields.forEach((answer) => {
          const block = document.createElement("div");
          block.className = `k4-questionnaire-answer${answer.wide ? " k4-questionnaire-answer-wide" : ""}`;
          const term = document.createElement("dt"); term.textContent = answer.label;
          const detail = document.createElement("dd"); detail.textContent = answer.value;
          block.append(term, detail); list.append(block);
        });
        groupSection.append(groupTitle, list);
        panel.append(groupSection);
      });
    }

    const footer = document.createElement("div");
    footer.className = "k4-questionnaire-footer";
    const closeButton = document.createElement("button");
    closeButton.className = "secondary-action";
    closeButton.type = "button";
    closeButton.textContent = "Masquer le questionnaire";
    closeButton.addEventListener("click", () => setPanelOpen(toggle, panel, false));
    footer.append(closeButton); panel.append(footer);

    toggle.addEventListener("click", () => setPanelOpen(toggle, panel, panel.hidden));
    summaryPanel.append(zone);
    card.insertBefore(panel, card.querySelector(".student-k4-deliverable-actions") || null);
    setPanelOpen(toggle, panel, wasOpen);
  }

  function renderAllQuestionnaires() {
    global.RedacStorage.getStudentsByParcours("k4").forEach(renderQuestionnairePanel);
  }

  hydrateConfiguration();
  try {
    const cachedUnmatched = JSON.parse(localStorage.getItem(UNMATCHED_KEY)) || [];
    renderUnmatchedResponses(Array.isArray(cachedUnmatched) ? cachedUnmatched : []);
  } catch {
    renderUnmatchedResponses([]);
  }
  elements.saveConfig.addEventListener("click", () => {
    try { saveConfiguration(); } catch (error) { setGlobalStatus(error.message, "error"); }
  });
  elements.checkResponses.addEventListener("click", checkNewResponses);
  renderAllQuestionnaires();
  global.addEventListener("redac:parcours-rendered", (event) => {
    if (event.detail?.parcours === "k4") renderAllQuestionnaires();
  });

  global.QuestionnairePreVisioK4 = Object.freeze({ normalizeQuestionnaire, renderQuestionnairePanel, createQuestionnaireDraft, checkNewResponses, associateResponses });
})(window);
