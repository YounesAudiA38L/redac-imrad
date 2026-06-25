(function initializeQuestionnaireSync(global) {
  const ENDPOINT_KEY = "redacImrad.questionnaires.endpoint";
  const TREATED_KEY = "redacImrad.questionnaires.treated";
  const CACHE_KEY = "redacImrad.questionnaires.responses";
  const CHECK_INTERVAL = 5 * 60 * 1000;

  const endpointInput = document.querySelector("#questionnaire-endpoint");
  const saveAndCheckButton = document.querySelector("#save-and-check-questionnaires");
  const checkNowButton = document.querySelector("#check-questionnaires-now");
  const statusElement = document.querySelector("#questionnaire-sync-status");
  const responseList = document.querySelector("#questionnaire-response-list");

  let autoCheckId = null;
  let latestResponses = loadCachedResponses();

  function getQuestionnaireEndpoint() {
    return global.RedacStorage?.getEffectiveSettings?.().pointMemoire.appsScriptUrl || localStorage.getItem(ENDPOINT_KEY) || "";
  }

  function saveQuestionnaireEndpoint(url) {
    const trimmedUrl = String(url || "").trim();

    if (!trimmedUrl) {
      localStorage.removeItem(ENDPOINT_KEY);
      return "";
    }

    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("L’URL de connexion doit utiliser HTTPS.");
    }

    if (parsedUrl.hostname !== "script.google.com" || !parsedUrl.pathname.includes("/macros/")) {
      throw new Error("Utilisez l’URL HTTPS du déploiement Apps Script, et non l’URL directe du Google Sheet.");
    }

    localStorage.setItem(ENDPOINT_KEY, parsedUrl.toString());
    return parsedUrl.toString();
  }

  function getTreatedIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(TREATED_KEY)) || []);
    } catch {
      return new Set();
    }
  }

  function saveTreatedIds(ids) {
    localStorage.setItem(TREATED_KEY, JSON.stringify([...ids]));
  }

  function loadCachedResponses() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  }

  function normalizeResponse(response, index) {
    const normalized = {
      id: response.id || `response-${response.email || "sans-email"}-${response.createdAt || index}`,
      createdAt: response.createdAt || "",
      nom: response.nom || "",
      email: response.email || "",
      ifmk: response.ifmk || "",
      niveau: response.niveau || "",
      themeSujet: response.themeSujet || "",
      questionRecherche: response.questionRecherche || "",
      typeMemoire: response.typeMemoire || "",
      methode: response.methode || "",
      avancement: response.avancement || "",
      stress: response.stress || "",
      blocages: response.blocages || "",
      questionsVisio: response.questionsVisio || "",
      documents: response.documents || "",
    };

    return normalized;
  }

  function findNewResponses(responses = latestResponses) {
    const treatedIds = getTreatedIds();
    return responses.map((response) => ({
      ...response,
      isNew: !treatedIds.has(response.id),
    }));
  }

  function setLoading(loading) {
    if (saveAndCheckButton) saveAndCheckButton.disabled = loading;
    if (checkNowButton) checkNowButton.disabled = loading;
  }

  function setStatus(message, type = "neutral") {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.dataset.statusType = type;
  }

  async function fetchQuestionnaireResponses() {
    const endpoint = getQuestionnaireEndpoint();

    if (!endpoint) {
      setStatus("Renseignez et enregistrez l’URL Apps Script avant de lancer la vérification.", "warning");
      return [];
    }

    setLoading(true);
    setStatus("Vérification des nouveaux questionnaires en cours.", "loading");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const result = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!result.ok) {
        throw new Error(`La connexion a répondu avec le statut ${result.status}.`);
      }

      const payload = await result.json();
      if (payload.success !== true || !Array.isArray(payload.responses)) {
        throw new Error("La réponse Apps Script ne respecte pas le format attendu.");
      }

      latestResponses = payload.responses.map(normalizeResponse);
      localStorage.setItem(CACHE_KEY, JSON.stringify(latestResponses));
      renderQuestionnaireResponses(latestResponses);

      const newCount = findNewResponses(latestResponses).filter((response) => response.isNew).length;
      setStatus(`${latestResponses.length} réponse${latestResponses.length > 1 ? "s" : ""} récupérée${latestResponses.length > 1 ? "s" : ""}, dont ${newCount} nouvelle${newCount > 1 ? "s" : ""}.`, "success");
      return latestResponses;
    } catch (error) {
      const message = error.name === "AbortError"
        ? "La vérification a pris trop de temps. Vérifiez l’URL Apps Script et réessayez."
        : `La vérification a échoué : ${error.message}`;
      setStatus(message, "error");
      return [];
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  function createSummaryFromResponse(response) {
    return {
      sujet: {
        nom: "Sujet",
        synthese: response.themeSujet || "Thème ou sujet non renseigné.",
        vigilance: response.themeSujet ? "Vérifier que le sujet est suffisamment délimité." : "Le sujet doit être précisé.",
        priorite: "Clarifier le périmètre et l’intérêt kinésithérapique du sujet.",
      },
      "question-recherche": {
        nom: "Question de recherche",
        synthese: response.questionRecherche || "Question de recherche non renseignée.",
        vigilance: response.questionRecherche ? "Vérifier la cohérence avec le sujet et l’objectif." : "Une question de recherche doit être formulée.",
        priorite: "Obtenir une formulation claire, précise et exploitable.",
      },
      methode: {
        nom: "Méthode",
        synthese: [response.typeMemoire, response.methode].filter(Boolean).join(" — ") || "Méthode non renseignée.",
        vigilance: "Vérifier la faisabilité et la cohérence de la méthode avec la question.",
        priorite: "Identifier les prochaines décisions méthodologiques nécessaires.",
      },
      "recherche-bibliographique": {
        nom: "Bibliographie",
        synthese: response.documents ? `Documents signalés : ${response.documents}` : "Informations bibliographiques à compléter.",
        vigilance: "Vérifier les bases utilisées, les mots-clés et la qualité des sources.",
        priorite: "Structurer une recherche documentaire traçable.",
      },
      organisation: {
        nom: "Organisation",
        synthese: `Avancement : ${response.avancement || "non renseigné"}. Stress : ${response.stress || "non renseigné"}.`,
        vigilance: response.blocages || "Blocages non renseignés.",
        priorite: "Définir les prochaines actions et leur ordre de priorité.",
      },
      "soutenance-jury": {
        nom: "Soutenance",
        synthese: response.questionsVisio || "Questions pour la visio non renseignées.",
        vigilance: "Repérer les choix et raisonnements que l’étudiant devra pouvoir expliquer.",
        priorite: "Préparer une réponse claire aux questions principales de l’étudiant.",
      },
    };
  }

  function renderSummary(container, summary) {
    container.textContent = "";
    const heading = document.createElement("h4");
    heading.textContent = "Synthèse questionnaire";
    container.append(heading);

    const grid = document.createElement("div");
    grid.className = "questionnaire-summary-grid";

    Object.values(summary).forEach((axis) => {
      const article = document.createElement("article");
      article.className = "questionnaire-summary-axis";
      const title = document.createElement("h5"); title.textContent = axis.nom;
      const synthesis = document.createElement("p"); synthesis.textContent = axis.synthese;
      const vigilance = document.createElement("p");
      const vigilanceLabel = document.createElement("strong"); vigilanceLabel.textContent = "Points de vigilance :";
      vigilance.append(vigilanceLabel, ` ${axis.vigilance}`);
      const priority = document.createElement("p");
      const priorityLabel = document.createElement("strong"); priorityLabel.textContent = "Priorités de correction :";
      priority.append(priorityLabel, ` ${axis.priorite}`);
      article.append(title, synthesis, vigilance, priority);
      grid.append(article);
    });

    container.append(grid);
  }

  function createStudentFromResponse(response) {
    const database = window.RedacStorage.getDatabase();
    const existing = database.students.find((student) => student.donneesParcours?.questionnaireId === response.id);

    if (existing) {
      setStatus("Une fiche étudiant existe déjà pour cette réponse.", "warning");
      return existing;
    }

    const summary = createSummaryFromResponse(response);
    const axes = {};
    Object.entries(summary).forEach(([id, axis]) => {
      axes[id] = {
        pointsSolides: axis.synthese,
        pointsVigilance: axis.vigilance,
        prioritesCorrection: axis.priorite,
        notesLibres: "",
      };
    });

    const student = window.RedacStorage.createStudent({
      prenom: "",
      nom: response.nom,
      email: response.email,
      ifmk: response.ifmk,
      telephone: "",
      dateDebut: response.createdAt ? String(response.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
      parcours: "point-memoire",
      thematiqueMemoire: response.themeSujet,
      statut: "En cours",
      notesInitiales: `Niveau : ${response.niveau || "non renseigné"}. Blocages : ${response.blocages || "non renseignés"}.`,
      donneesParcours: {
        questionnaireId: response.id,
        syntheseQuestionnaire: `${response.nom || "Étudiant"} — avancement : ${response.avancement || "non renseigné"}, stress : ${response.stress || "non renseigné"}.`,
        questions: response.questionsVisio ? [response.questionsVisio] : [],
        notesVisio: "",
        axes,
        questionnaire: response,
      },
      memoireImporte: null,
    });

    markResponseAsTreated(response.id);
    global.dispatchEvent(new CustomEvent("redac:students-changed"));
    setStatus("La fiche étudiant a été créée dans le parcours Point Mémoire.", "success");
    return student;
  }

  function markResponseAsTreated(responseOrId) {
    const id = typeof responseOrId === "string" ? responseOrId : responseOrId.id;
    const treatedIds = getTreatedIds();
    treatedIds.add(id);
    saveTreatedIds(treatedIds);
    renderQuestionnaireResponses(latestResponses);
  }

  function formatDate(value) {
    if (!value) return "Date non renseignée";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR", { dateStyle: "medium" });
  }

  function addDetail(list, label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt"); term.textContent = label;
    const description = document.createElement("dd"); description.textContent = value || "Non renseigné";
    row.append(term, description);
    list.append(row);
  }

  function renderQuestionnaireResponses(responses = latestResponses) {
    if (!responseList) return;
    responseList.textContent = "";
    const preparedResponses = findNewResponses(responses).sort((a, b) => Number(b.isNew) - Number(a.isNew));

    if (preparedResponses.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucune réponse récupérée pour le moment.";
      responseList.append(empty);
      return;
    }

    preparedResponses.forEach((response) => {
      const card = document.createElement("article");
      card.className = "questionnaire-card";

      const header = document.createElement("div");
      header.className = "questionnaire-card-header";
      const title = document.createElement("h3"); title.textContent = response.nom || "Réponse sans nom";
      header.append(title);
      if (response.isNew) {
        const badge = document.createElement("span"); badge.className = "new-response-badge"; badge.textContent = "Nouveau"; header.append(badge);
      }

      const details = document.createElement("dl");
      details.className = "questionnaire-details";
      addDetail(details, "Email", response.email);
      addDetail(details, "IFMK", response.ifmk);
      addDetail(details, "Niveau", response.niveau);
      addDetail(details, "Date de réponse", formatDate(response.createdAt));
      addDetail(details, "Thème ou sujet", response.themeSujet);
      addDetail(details, "Question de recherche", response.questionRecherche);
      addDetail(details, "Avancement", response.avancement);
      addDetail(details, "Stress", response.stress);
      addDetail(details, "Blocages", response.blocages);

      const actions = document.createElement("div");
      actions.className = "questionnaire-actions";
      const summaryButton = document.createElement("button"); summaryButton.className = "secondary-action"; summaryButton.type = "button"; summaryButton.textContent = "Créer une synthèse";
      const studentButton = document.createElement("button"); studentButton.className = "primary-action"; studentButton.type = "button"; studentButton.textContent = "Créer une fiche étudiant";
      const treatedButton = document.createElement("button"); treatedButton.className = "secondary-action"; treatedButton.type = "button"; treatedButton.textContent = response.isNew ? "Marquer comme traité" : "Traité"; treatedButton.disabled = !response.isNew;
      const summaryContainer = document.createElement("div"); summaryContainer.className = "questionnaire-summary"; summaryContainer.hidden = true;

      summaryButton.addEventListener("click", () => {
        renderSummary(summaryContainer, createSummaryFromResponse(response));
        summaryContainer.hidden = false;
      });
      studentButton.addEventListener("click", () => createStudentFromResponse(response));
      treatedButton.addEventListener("click", () => markResponseAsTreated(response.id));

      actions.append(summaryButton, studentButton, treatedButton);
      card.append(header, details, actions, summaryContainer);
      responseList.append(card);
    });
  }

  function stopQuestionnaireAutoCheck() {
    if (autoCheckId !== null) {
      clearInterval(autoCheckId);
      autoCheckId = null;
    }
  }

  function startQuestionnaireAutoCheck() {
    stopQuestionnaireAutoCheck();
    if (!getQuestionnaireEndpoint()) return;
    fetchQuestionnaireResponses();
    autoCheckId = setInterval(fetchQuestionnaireResponses, CHECK_INTERVAL);
  }

  function saveInputEndpoint() {
    try {
      const endpoint = saveQuestionnaireEndpoint(endpointInput?.value || "");
      if (endpointInput) endpointInput.value = endpoint;
      return true;
    } catch (error) {
      setStatus(error.message, "error");
      return false;
    }
  }

  if (endpointInput) endpointInput.value = getQuestionnaireEndpoint();
  renderQuestionnaireResponses(latestResponses);

  saveAndCheckButton?.addEventListener("click", () => {
    if (saveInputEndpoint()) startQuestionnaireAutoCheck();
  });
  checkNowButton?.addEventListener("click", () => {
    if (endpointInput?.value !== getQuestionnaireEndpoint() && !saveInputEndpoint()) return;
    if (autoCheckId === null) {
      startQuestionnaireAutoCheck();
    } else {
      fetchQuestionnaireResponses();
    }
  });

  global.addEventListener("pagehide", stopQuestionnaireAutoCheck);
  global.addEventListener("beforeunload", stopQuestionnaireAutoCheck);

  if (getQuestionnaireEndpoint()) {
    startQuestionnaireAutoCheck();
  }

  global.QuestionnaireSync = Object.freeze({
    getQuestionnaireEndpoint,
    saveQuestionnaireEndpoint,
    fetchQuestionnaireResponses,
    findNewResponses,
    renderQuestionnaireResponses,
    createSummaryFromResponse,
    createStudentFromResponse,
    markResponseAsTreated,
    startQuestionnaireAutoCheck,
    stopQuestionnaireAutoCheck,
  });
})(window);
