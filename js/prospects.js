(function initializeProspectRelances(global) {
  const ENDPOINT_KEY = "redacImrad.prospects.relanceEndpoint";
  const TOKEN_KEY = "redacImrad.prospects.relanceToken";
  const QUESTIONNAIRE_SEND_ENDPOINT_KEY = "redacImrad.prospects.questionnaireSend.endpoint";
  const QUESTIONNAIRE_SEND_TOKEN_KEY = "redacImrad.prospects.questionnaireSend.token";
  const QUESTIONNAIRE_RESPONSES_ENDPOINT_KEY = "redacImrad.prospects.questionnaireResponses.endpoint";
  const QUESTIONNAIRE_RESPONSES_TOKEN_KEY = "redacImrad.prospects.questionnaireResponses.token";
  const endpointInput = document.querySelector("#prospect-relance-endpoint");
  const tokenInput = document.querySelector("#prospect-relance-token");
  const saveConfigButton = document.querySelector("#save-prospect-relance-config");
  const configStatus = document.querySelector("#prospect-relance-config-status");
  const form = document.querySelector("#prospect-relance-form");
  const createButton = document.querySelector("#create-prospect-relance-drafts");
  const relanceStatus = document.querySelector("#prospect-relance-status");
  const relanceCount = document.querySelector("#prospect-relance-count");
  const totalCount = document.querySelector("#prospect-total-count");
  const prospectCreateForm = document.querySelector("#prospect-create-form");
  const prospectCreateStatus = document.querySelector("#prospect-create-status");
  const prospectList = document.querySelector("#prospect-list");
  const prospectActionStatus = document.querySelector("#prospect-action-status");
  const prepareAllQuestionnairesButton = document.querySelector("#prepare-all-prospect-questionnaires");
  const prospectBulkStatus = document.querySelector("#prospect-bulk-status");
  const questionnaireConnections = [
    {
      endpointInput: document.querySelector("#prospect-questionnaire-send-endpoint"),
      tokenInput: document.querySelector("#prospect-questionnaire-send-token"),
      saveButton: document.querySelector("#save-prospect-questionnaire-send"),
      status: document.querySelector("#prospect-questionnaire-send-status"),
      endpointKey: QUESTIONNAIRE_SEND_ENDPOINT_KEY,
      tokenKey: QUESTIONNAIRE_SEND_TOKEN_KEY,
    },
    {
      endpointInput: document.querySelector("#prospect-questionnaire-responses-endpoint"),
      tokenInput: document.querySelector("#prospect-questionnaire-responses-token"),
      saveButton: document.querySelector("#save-prospect-questionnaire-responses"),
      status: document.querySelector("#prospect-questionnaire-responses-status"),
      endpointKey: QUESTIONNAIRE_RESPONSES_ENDPOINT_KEY,
      tokenKey: QUESTIONNAIRE_RESPONSES_TOKEN_KEY,
    },
  ];
  if (!form || !global.RedacStorage) return;
  let convertingProspectId = null;

  const prospectStatusLabels = {
    nouveau: "Nouveau",
    "a-relancer": "À relancer",
    interesse: "Intéressé",
    "non-interesse": "Non intéressé",
    transforme: "Transformé",
    archive: "Archivé",
  };

  const questionnaireStatusLabels = {
    "a-envoyer": "Questionnaire à envoyer",
    envoye: "Questionnaire envoyé",
    repondu: "Questionnaire répondu",
  };

  const parcoursLabels = {
    "point-memoire": "Point Mémoire",
    k4: "K4",
    k5: "K5",
    rattrapage: "Rattrapage",
  };

  function isProspectToRelance(prospect) {
    const status = prospect.statutProspect || "nouveau";
    return prospect.questionnaireEnvoye === true
      && prospect.questionnaireRepondu !== true
      && status !== "transforme"
      && status !== "archive";
  }

  function isQuestionnairePreparationCandidate(prospect) {
    return prospect.questionnaireStatut === "a-envoyer"
      && prospect.questionnaireEnvoye !== true
      && prospect.questionnaireRepondu !== true
      && prospect.statutProspect !== "archive"
      && prospect.statutProspect !== "transforme";
  }

  function getProspectsToRelance() {
    return global.RedacStorage.getProspects().filter(isProspectToRelance);
  }

  function renderCounts() {
    const prospects = global.RedacStorage.getProspects();
    const eligible = prospects.filter(isProspectToRelance);
    totalCount.textContent = String(prospects.length);
    relanceCount.textContent = `${eligible.length} prospect(s) à relancer`;
    createButton.disabled = eligible.length === 0;
    prepareAllQuestionnairesButton.disabled = !prospects.some(isQuestionnairePreparationCandidate);
    return eligible;
  }

  function setMessage(element, message, type) {
    element.textContent = message;
    element.dataset.statusType = type;
    element.hidden = false;
  }

  function validateQuestionnaireEndpoint(value) {
    try {
      const endpoint = new URL(String(value || "").trim());
      if (endpoint.protocol !== "https:" || endpoint.hostname !== "script.google.com" || !endpoint.pathname.includes("/macros/s/") || !endpoint.pathname.endsWith("/exec")) return "";
      endpoint.search = "";
      endpoint.hash = "";
      return endpoint.toString();
    } catch {
      return "";
    }
  }

  function saveQuestionnaireConnection(connection) {
    const endpoint = validateQuestionnaireEndpoint(connection.endpointInput.value);
    const token = connection.tokenInput.value.trim();
    if (!endpoint || !token) {
      setMessage(connection.status, "Renseignez une URL Apps Script valide et son token.", "error");
      return;
    }
    localStorage.setItem(connection.endpointKey, endpoint);
    localStorage.setItem(connection.tokenKey, token);
    connection.endpointInput.value = endpoint;
    setMessage(connection.status, "Connexion questionnaire prospect enregistrée.", "success");
  }

  function initializeQuestionnaireConnections() {
    questionnaireConnections.forEach((connection) => {
      connection.endpointInput.value = localStorage.getItem(connection.endpointKey) || "";
      connection.tokenInput.value = localStorage.getItem(connection.tokenKey) || "";
      connection.saveButton.addEventListener("click", () => saveQuestionnaireConnection(connection));
    });
  }

  function createFollowupPill(text, tone) {
    const pill = document.createElement("span");
    pill.className = "prospect-pill";
    pill.dataset.tone = tone;
    pill.textContent = text;
    return pill;
  }

  function appendIdentityDetail(container, label, value) {
    if (!value) return;
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    container.append(row);
  }

  function getProspectDisplayName(prospect) {
    return `${prospect.prenom || ""} ${prospect.nom || ""}`.trim()
      || getProspectResponse(prospect).nomComplet
      || prospect.pseudo
      || "Prospect sans nom";
  }

  function getProspectResponse(prospect) {
    return prospect.reponseQuestionnaireProspect || {};
  }

  function getProspectEmail(prospect) {
    return String(prospect.email || getProspectResponse(prospect).email || "").trim();
  }

  function getProspectNiveau(prospect) {
    const response = getProspectResponse(prospect);
    return prospect.niveau || response.niveau || response.annee || "";
  }

  function getProspectParcoursPressenti(prospect) {
    return prospect.parcoursPressenti || (prospect.parcoursInteresse !== "non défini" ? prospect.parcoursInteresse : "");
  }

  function createConversionChoice(prospect) {
    const panel = document.createElement("div");
    panel.className = "prospect-conversion-choice";
    const label = document.createElement("label");
    label.className = "field";
    const title = document.createElement("span");
    title.textContent = "Choisir le parcours étudiant";
    const select = document.createElement("select");
    select.dataset.conversionParcours = "";
    [{ value: "", label: "Sélectionner" }, { value: "point-memoire", label: "Point Mémoire" }, { value: "k4", label: "K4" }, { value: "k5", label: "K5" }, { value: "rattrapage", label: "Rattrapage" }]
      .forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        select.append(option);
      });
    const suggestedParcours = getProspectParcoursPressenti(prospect);
    if (parcoursLabels[suggestedParcours]) select.value = suggestedParcours;
    label.append(title, select);
    const actions = document.createElement("div");
    actions.className = "prospect-conversion-actions";
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "primary-action";
    confirm.dataset.prospectAction = "confirm-convert";
    confirm.textContent = "Créer la fiche étudiant";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "secondary-action";
    cancel.dataset.prospectAction = "cancel-convert";
    cancel.textContent = "Annuler";
    actions.append(confirm, cancel);
    panel.append(label, actions);
    return panel;
  }

  function renderProspectCards() {
    const prospects = global.RedacStorage.getProspects();
    prospectList.textContent = "";

    if (!prospects.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucun prospect enregistré pour le moment.";
      prospectList.append(empty);
      return;
    }

    prospects.forEach((prospect) => {
      const card = document.createElement("article");
      card.className = "prospect-card";
      card.dataset.prospectId = prospect.id;

      const main = document.createElement("div");
      main.className = "prospect-card-main";
      const identity = document.createElement("div");
      identity.className = "prospect-identity";
      const title = document.createElement("h3");
      title.textContent = getProspectDisplayName(prospect);
      const details = document.createElement("dl");
      details.className = "prospect-identity-details";
      const email = getProspectEmail(prospect);
      appendIdentityDetail(details, "Email", email || "Email à renseigner");
      appendIdentityDetail(details, "Niveau", getProspectNiveau(prospect));
      appendIdentityDetail(details, "Provenance", prospect.source);
      const parcoursPressenti = getProspectParcoursPressenti(prospect);
      appendIdentityDetail(details, "Parcours pressenti", parcoursLabels[parcoursPressenti] || parcoursPressenti);
      identity.append(title, details);

      const pills = document.createElement("div");
      pills.className = "prospect-followup-pills";
      pills.append(
        createFollowupPill(prospectStatusLabels[prospect.statutProspect] || "Nouveau", `prospect-${prospect.statutProspect || "nouveau"}`),
        createFollowupPill(questionnaireStatusLabels[prospect.questionnaireStatut] || "Questionnaire à envoyer", `questionnaire-${prospect.questionnaireStatut || "a-envoyer"}`),
        createFollowupPill(`Réponse : ${prospect.questionnaireRepondu ? "oui" : "non"}`, prospect.questionnaireRepondu ? "response-yes" : "response-no"),
      );
      if (!email) pills.append(createFollowupPill("Email manquant", "email-missing"));
      main.append(identity, pills);

      const actions = document.createElement("div");
      actions.className = "prospect-actions";
      const prepareButton = document.createElement("button");
      prepareButton.className = "secondary-action";
      prepareButton.type = "button";
      prepareButton.dataset.prospectAction = "prepare-questionnaire";
      prepareButton.textContent = "Préparer questionnaire";
      prepareButton.disabled = !email || prospect.questionnaireEnvoye || prospect.statutProspect === "transforme" || prospect.statutProspect === "archive";
      const answeredButton = document.createElement("button");
      answeredButton.className = "secondary-action";
      answeredButton.type = "button";
      answeredButton.dataset.prospectAction = "mark-answered";
      answeredButton.textContent = "Marquer comme répondu";
      answeredButton.disabled = prospect.questionnaireRepondu || prospect.statutProspect === "transforme" || prospect.statutProspect === "archive";
      const convertButton = document.createElement("button");
      convertButton.className = "primary-action";
      convertButton.type = "button";
      convertButton.dataset.prospectAction = "convert";
      convertButton.textContent = "Transformer en étudiant";
      convertButton.disabled = prospect.statutProspect === "transforme" || prospect.statutProspect === "archive";
      actions.append(prepareButton, answeredButton, convertButton);

      card.append(main);
      if (convertingProspectId === prospect.id) card.append(createConversionChoice(prospect));
      card.append(actions);
      prospectList.append(card);
    });
  }

  function renderProspects() {
    renderCounts();
    renderProspectCards();
  }

  function handleProspectAction(event) {
    const button = event.target.closest("[data-prospect-action]");
    if (!button) return;
    const card = button.closest("[data-prospect-id]");
    const prospectId = card?.dataset.prospectId;
    const prospect = global.RedacStorage.getProspectById(prospectId);
    if (!prospect) return;
    const now = new Date().toISOString();

    if (button.dataset.prospectAction === "prepare-questionnaire") {
      if (!getProspectEmail(prospect)) return;
      global.RedacStorage.updateProspect(prospect.id, {
        email: prospect.email || getProspectEmail(prospect),
        statut: "à relancer",
        statutProspect: "a-relancer",
        questionnaireStatut: "envoye",
        questionnaireEnvoye: true,
        questionnaireEnvoyeLe: now,
        questionnaireRepondu: false,
        questionnaireReponduLe: "",
      });
      setMessage(prospectActionStatus, "Questionnaire marqué comme envoyé.", "success");
    } else if (button.dataset.prospectAction === "mark-answered") {
      global.RedacStorage.updateProspect(prospect.id, {
        statut: "intéressé",
        statutProspect: "interesse",
        questionnaireStatut: "repondu",
        questionnaireEnvoye: true,
        questionnaireRepondu: true,
        questionnaireReponduLe: now,
      });
      setMessage(prospectActionStatus, "Réponse questionnaire enregistrée.", "success");
    } else if (button.dataset.prospectAction === "convert") {
      if (parcoursLabels[prospect.parcoursValide]) {
        global.RedacStorage.convertProspectToStudent(prospect.id, { parcours: prospect.parcoursValide });
        setMessage(prospectActionStatus, "Le prospect a été transformé en étudiant et reste conservé dans les prospects.", "success");
      } else {
        convertingProspectId = prospect.id;
        setMessage(prospectActionStatus, "Choisissez le parcours étudiant avant la conversion.", "warning");
      }
    } else if (button.dataset.prospectAction === "confirm-convert") {
      const parcours = card.querySelector("[data-conversion-parcours]")?.value || "";
      if (!parcoursLabels[parcours]) {
        setMessage(prospectActionStatus, "Choisissez un parcours étudiant.", "error");
        return;
      }
      global.RedacStorage.updateProspect(prospect.id, { parcoursValide: parcours });
      global.RedacStorage.convertProspectToStudent(prospect.id, { parcours });
      convertingProspectId = null;
      setMessage(prospectActionStatus, "Le prospect a été transformé en étudiant et reste conservé dans les prospects.", "success");
    } else if (button.dataset.prospectAction === "cancel-convert") {
      convertingProspectId = null;
    }
    renderProspects();
  }

  function prepareAllQuestionnaires() {
    const prospects = global.RedacStorage.getProspects().filter(isQuestionnairePreparationCandidate);
    const eligible = prospects.filter((prospect) => Boolean(getProspectEmail(prospect)));
    const ignored = prospects.length - eligible.length;
    const now = new Date().toISOString();
    eligible.forEach((prospect) => {
      global.RedacStorage.updateProspect(prospect.id, {
        email: prospect.email || getProspectEmail(prospect),
        statut: "à relancer",
        statutProspect: "a-relancer",
        questionnaireStatut: "envoye",
        questionnaireEnvoye: true,
        questionnaireEnvoyeLe: now,
        questionnaireRepondu: false,
        questionnaireReponduLe: "",
      });
    });
    setMessage(prospectBulkStatus, `${eligible.length} questionnaire(s) marqué(s) comme envoyé(s). ${ignored} prospect(s) ignoré(s) car email manquant.`, "success");
    renderProspects();
  }

  function createProspect(event) {
    event.preventDefault();
    const data = new FormData(prospectCreateForm);
    const prenom = String(data.get("prenom") || "").trim();
    const nom = String(data.get("nom") || "").trim();
    const pseudo = String(data.get("pseudo") || "").trim();
    const email = String(data.get("email") || "").trim();
    if (!pseudo && !prenom && !nom && !email) {
      setMessage(prospectCreateStatus, "Renseignez au moins un pseudo, un prénom, un nom ou un email.", "error");
      return;
    }

    global.RedacStorage.createProspect({
      prenom,
      nom,
      pseudo,
      email,
      niveau: String(data.get("niveau") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      statut: "nouveau",
      statutProspect: "nouveau",
      questionnaireStatut: "a-envoyer",
      questionnaireEnvoye: false,
      questionnaireRepondu: false,
    });
    prospectCreateForm.reset();
    setMessage(prospectCreateStatus, "Prospect ajouté.", "success");
    renderProspects();
  }

  function saveConfiguration() {
    const endpoint = new URL(String(endpointInput.value || "").trim());
    if (endpoint.protocol !== "https:" || endpoint.hostname !== "script.google.com" || !endpoint.pathname.includes("/macros/")) {
      throw new Error("Utilisez l’URL HTTPS du déploiement Apps Script de relance.");
    }
    const token = tokenInput.value.trim();
    if (!token) throw new Error("Renseignez le token Apps Script de relance.");
    endpoint.search = "";
    localStorage.setItem(ENDPOINT_KEY, endpoint.toString());
    localStorage.setItem(TOKEN_KEY, token);
    endpointInput.value = endpoint.toString();
    setMessage(configStatus, "La connexion Apps Script de relance a été enregistrée.", "success");
  }

  function replaceVariables(template, prospect) {
    const values = {
      prenom: prospect.prenom || "",
      nom: prospect.nom || "",
      email: prospect.email || "",
      questionnaireUrl: prospect.questionnaireUrl || "",
    };
    return String(template || "").replace(/{{(prenom|nom|email|questionnaireUrl)}}/g, (_, key) => values[key]);
  }

  function buildPayload(prospects, subjectTemplate, messageTemplate, token) {
    return {
      action: "createRelanceDrafts",
      token,
      prospects: prospects.map((prospect) => ({
        prospectId: prospect.id,
        prenom: prospect.prenom || "",
        nom: prospect.nom || "",
        email: prospect.email || "",
        questionnaireUrl: prospect.questionnaireUrl || "",
        subject: replaceVariables(subjectTemplate, prospect),
        message: replaceVariables(messageTemplate, prospect),
      })),
    };
  }

  function getDraftResults(data, prospects) {
    const returned = Array.isArray(data.drafts) ? data.drafts : (Array.isArray(data.results) ? data.results : null);
    if (!returned) return prospects.map((prospect) => ({ prospectId: prospect.id, draftId: prospects.length === 1 ? data.draftId || "" : "" }));
    return returned.map((result, index) => ({
      success: result.success,
      prospectId: result.prospectId || result.id || prospects[index]?.id || "",
      draftId: result.relanceDraftId || result.draftId || "",
    })).filter((result) => result.success !== false);
  }

  async function createRelanceDrafts(event) {
    event.preventDefault();
    const prospects = getProspectsToRelance();
    if (!prospects.length) return;
    const endpoint = localStorage.getItem(ENDPOINT_KEY) || "";
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!endpoint || !token) {
      setMessage(relanceStatus, "Connexion Apps Script de relance à configurer.", "warning");
      return;
    }

    const formData = new FormData(form);
    const payload = buildPayload(prospects, formData.get("subject"), formData.get("message"), token);
    createButton.disabled = true;
    setMessage(relanceStatus, "Création des brouillons de relance en cours.", "loading");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || "Apps Script a signalé une erreur.");
      if (!response.ok || data.success !== true) throw new Error("La réponse Apps Script ne confirme pas la création des brouillons.");

      const now = new Date().toISOString();
      const results = getDraftResults(data, prospects);
      let createdCount = 0;
      results.forEach((result) => {
        const prospect = global.RedacStorage.getProspectById(result.prospectId);
        if (!prospect || !isProspectToRelance(prospect)) return;
        global.RedacStorage.updateProspect(prospect.id, {
          relanceDraftId: result.draftId,
          relanceCreatedAt: now,
          lastRelanceAt: now,
          relanceCount: (Number(prospect.relanceCount) || 0) + 1,
          relanceStatus: "brouillon créé",
          statut: "à relancer",
          statutProspect: "a-relancer",
        });
        createdCount += 1;
      });
      setMessage(relanceStatus, `${createdCount} brouillon(s) de relance créé(s). À vérifier par Audrey avant envoi.`, "success");
    } catch (error) {
      setMessage(relanceStatus, `La création des brouillons a échoué : ${error.message}`, "error");
    } finally {
      renderProspects();
    }
  }

  endpointInput.value = localStorage.getItem(ENDPOINT_KEY) || "";
  tokenInput.value = localStorage.getItem(TOKEN_KEY) || "";
  initializeQuestionnaireConnections();
  saveConfigButton.addEventListener("click", () => {
    try { saveConfiguration(); } catch (error) { setMessage(configStatus, error.message, "error"); }
  });
  form.addEventListener("submit", createRelanceDrafts);
  prospectCreateForm.addEventListener("submit", createProspect);
  prospectList.addEventListener("click", handleProspectAction);
  prepareAllQuestionnairesButton.addEventListener("click", prepareAllQuestionnaires);
  renderProspects();

  global.ProspectRelances = Object.freeze({
    isProspectToRelance,
    getProspectsToRelance,
    replaceVariables,
    buildPayload,
  });
})(window);
