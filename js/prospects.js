(function initializeProspects(global) {
  const RELANCE_ENDPOINT_KEY = "redacImrad.prospects.relanceEndpoint";
  const RELANCE_TOKEN_KEY = "redacImrad.prospects.relanceToken";
  const RESPONSES_ENDPOINT_KEY = "redacImrad.prospects.questionnaireResponses.endpoint";
  const RESPONSES_TOKEN_KEY = "redacImrad.prospects.questionnaireResponses.token";

  const DEFAULT_TEMPLATES = Object.freeze({
    questionnaire: {
      objet: "Ton questionnaire avant notre échange",
      corps: `Bonjour {prenom},

Avant notre premier échange, peux-tu remplir ce court questionnaire ?

Il m’aide à mieux comprendre ta situation, ton niveau d’avancement et le type d’aide qui pourrait être le plus adapté.

Voici le lien :
{lienForms}

Merci, à bientôt.

Audrey`,
    },
    relance: {
      objet: "Petit rappel pour ton questionnaire",
      corps: `Bonjour {prenom},

Je me permets de revenir vers toi au sujet du questionnaire de première prise de contact.

Si tu souhaites que je puisse mieux comprendre ta situation et préparer au mieux notre échange, tu peux le remplir ici :

{lienForms}

Merci, à bientôt.

Audrey`,
    },
  });

  const elements = {
    totalCount: document.querySelector("#prospect-total-count"),
    createForm: document.querySelector("#prospect-create-form"),
    createStatus: document.querySelector("#prospect-create-status"),
    list: document.querySelector("#prospect-list"),
    actionStatus: document.querySelector("#prospect-action-status"),
    prepareAll: document.querySelector("#prepare-all-prospect-questionnaires"),
    bulkStatus: document.querySelector("#prospect-bulk-status"),
    formUrl: document.querySelector("#prospects-form-url"),
    saveFormUrl: document.querySelector("#save-prospects-form-url"),
    formUrlStatus: document.querySelector("#prospects-form-url-status"),
    mailEndpoint: document.querySelector("#prospect-questionnaire-send-endpoint"),
    mailToken: document.querySelector("#prospect-questionnaire-send-token"),
    saveMailConnection: document.querySelector("#save-prospect-questionnaire-send"),
    mailConnectionStatus: document.querySelector("#prospect-questionnaire-send-status"),
    responsesEndpoint: document.querySelector("#prospect-questionnaire-responses-endpoint"),
    responsesToken: document.querySelector("#prospect-questionnaire-responses-token"),
    saveResponsesConnection: document.querySelector("#save-prospect-questionnaire-responses"),
    responsesConnectionStatus: document.querySelector("#prospect-questionnaire-responses-status"),
    checkResponses: document.querySelector("#check-prospect-responses"),
    responsesSyncStatus: document.querySelector("#prospect-responses-sync-status"),
    relanceEndpoint: document.querySelector("#prospect-relance-endpoint"),
    relanceToken: document.querySelector("#prospect-relance-token"),
    saveRelanceConnection: document.querySelector("#save-prospect-relance-config"),
    relanceConnectionStatus: document.querySelector("#prospect-relance-config-status"),
    createRelances: document.querySelector("#create-prospect-relance-drafts"),
    relanceStatus: document.querySelector("#prospect-relance-status"),
    relanceCount: document.querySelector("#prospect-relance-count"),
  };

  if (!global.RedacStorage || !elements.list) return;

  const storage = global.RedacStorage;
  let convertingProspectId = null;
  const expandedResponseProspectIds = new Set();

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

  function setMessage(element, message, type = "success") {
    if (!element) return;
    element.textContent = message;
    element.dataset.statusType = type;
    element.hidden = false;
  }

  function validateAppsScriptUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !url.pathname.includes("/macros/") || !url.pathname.endsWith("/exec")) return "";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function validateHttpsUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
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

  function getProspectDisplayName(prospect) {
    return `${prospect.prenom || ""} ${prospect.nom || ""}`.trim()
      || getProspectResponse(prospect).nomComplet
      || prospect.pseudo
      || "Prospect sans nom";
  }

  function getProspectParcoursPressenti(prospect) {
    return prospect.parcoursPressenti
      || prospect.parcoursVise
      || (prospect.parcoursInteresse !== "non défini" ? prospect.parcoursInteresse : "");
  }

  function normalizeProspectParcours(value) {
    const normalized = String(value || "").trim().toLocaleLowerCase("fr-FR");
    if (["point-memoire", "point mémoire", "point memoire"].includes(normalized)) return "point-memoire";
    if (["k4", "k5", "rattrapage"].includes(normalized)) return normalized;
    return "";
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLocaleLowerCase("fr-FR");
  }

  function normalizeBoolean(value) {
    if (value === true || value === 1) return true;
    return ["true", "oui", "yes", "1"].includes(String(value || "").trim().toLocaleLowerCase("fr-FR"));
  }

  function hasQuestionnaireResponse(prospect) {
    const response = getProspectResponse(prospect);
    return Boolean(response.responseId || response.receivedAt || response.email);
  }

  function isQuestionnairePreparationCandidate(prospect) {
    const status = prospect.statutProspect || "nouveau";
    return (prospect.questionnaireStatut === "a-envoyer" || prospect.questionnaireEnvoye !== true)
      && prospect.questionnaireRepondu !== true
      && status !== "archive"
      && status !== "transforme";
  }

  function isProspectToRelance(prospect) {
    const status = prospect.statutProspect || "nouveau";
    return prospect.questionnaireEnvoye === true
      && prospect.questionnaireRepondu !== true
      && status !== "transforme"
      && status !== "archive";
  }

  function getTemplates() {
    const stored = storage.getProspectsMailTemplates();
    return {
      questionnaire: { ...DEFAULT_TEMPLATES.questionnaire, ...(stored.questionnaire || {}) },
      relance: { ...DEFAULT_TEMPLATES.relance, ...(stored.relance || {}) },
    };
  }

  function remplaceVariables(texte, prospect, lienForms) {
    const values = {
      prenom: prospect.prenom || prospect.pseudo || "Bonjour",
      nom: prospect.nom || "",
      email: getProspectEmail(prospect),
      niveau: getProspectNiveau(prospect),
      lienForms: lienForms || "",
    };
    return String(texte || "").replace(/\{(prenom|nom|email|niveau|lienForms)\}/g, (_, key) => values[key]);
  }

  function buildQuestionnaireMessage(prospect) {
    const formUrl = storage.getProspectsFormUrl();
    const template = getTemplates().questionnaire;
    return {
      objet: remplaceVariables(template.objet, prospect, formUrl),
      corps: remplaceVariables(template.corps, prospect, formUrl),
    };
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

  function createActionButton(text, action, className, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.prospectAction = action;
    button.textContent = text;
    button.disabled = disabled;
    return button;
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
    const suggested = normalizeProspectParcours(prospect.parcoursValide)
      || normalizeProspectParcours(getProspectParcoursPressenti(prospect));
    if (parcoursLabels[suggested]) select.value = suggested;
    label.append(title, select);
    const actions = document.createElement("div");
    actions.className = "prospect-conversion-actions";
    actions.append(
      createActionButton("Créer la fiche étudiant", "confirm-convert", "primary-action"),
      createActionButton("Annuler", "cancel-convert", "secondary-action"),
    );
    panel.append(label, actions);
    return panel;
  }

  function appendResponseField(container, label, value, options = {}) {
    const item = document.createElement("div");
    item.className = "prospect-response-item";
    if (options.wide) item.classList.add("prospect-response-item-wide");
    const title = document.createElement("dt");
    const content = document.createElement("dd");
    title.textContent = label;
    content.textContent = value === "" || value === null || value === undefined ? "Non renseigné" : String(value);
    item.append(title, content);
    container.append(item);
  }

  function createQuestionnaireResponsePanel(prospect) {
    const response = getProspectResponse(prospect);
    const panel = document.createElement("section");
    panel.className = "prospect-response-panel";
    panel.setAttribute("aria-label", `Réponse questionnaire de ${getProspectDisplayName(prospect)}`);
    const heading = document.createElement("div");
    heading.className = "prospect-response-heading";
    const title = document.createElement("h4");
    title.textContent = "Réponse au questionnaire prospect";
    const date = document.createElement("p");
    const receivedDate = response.receivedAt ? new Date(response.receivedAt) : null;
    date.textContent = receivedDate && !Number.isNaN(receivedDate.getTime())
      ? `Reçue le ${receivedDate.toLocaleString("fr-FR")}`
      : "Date de réponse non renseignée";
    heading.append(title, date);

    const fields = document.createElement("dl");
    fields.className = "prospect-response-grid";
    appendResponseField(fields, "IFMK", response.ifmk);
    appendResponseField(fields, "Niveau", response.niveau);
    appendResponseField(fields, "Téléphone", response.telephone);
    appendResponseField(fields, "Avancement mémoire", response.avancementMemoire, { wide: true });
    appendResponseField(fields, "Difficulté principale", response.difficultePrincipale, { wide: true });
    appendResponseField(fields, "Prochaine échéance", response.prochaineEcheance);
    appendResponseField(fields, "Niveau de blocage", response.niveauBlocage);
    appendResponseField(fields, "Urgence", response.niveauUrgence);
    appendResponseField(fields, "Aide souhaitée", response.aideSouhaitee, { wide: true });
    appendResponseField(fields, "Situation libre", response.situationLibre, { wide: true });
    appendResponseField(fields, "Question pour Audrey", response.questionAudrey, { wide: true });
    appendResponseField(fields, "Cadre accepté", response.cadreAccepte ? "Oui" : "Non");
    appendResponseField(fields, "Mémoire non rédigé à sa place", response.redactionNonRemplacee ? "Oui" : "Non");

    const hideButton = createActionButton("Masquer la réponse", "toggle-response", "secondary-action");
    panel.append(heading, fields, hideButton);
    return panel;
  }

  function renderProspectCards() {
    const prospects = storage.getProspects();
    elements.list.textContent = "";
    if (!prospects.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucun prospect enregistré pour le moment.";
      elements.list.append(empty);
      return;
    }

    prospects.forEach((prospect) => {
      const status = prospect.statutProspect || "nouveau";
      const email = getProspectEmail(prospect);
      const inactive = status === "transforme" || status === "archive";
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
      appendIdentityDetail(details, "Email", email || "Email à renseigner");
      appendIdentityDetail(details, "Niveau", getProspectNiveau(prospect));
      appendIdentityDetail(details, "Provenance", prospect.source);
      const parcours = getProspectParcoursPressenti(prospect);
      appendIdentityDetail(details, "Parcours pressenti", parcoursLabels[parcours] || parcours);
      identity.append(title, details);

      const pills = document.createElement("div");
      pills.className = "prospect-followup-pills";
      pills.append(
        createFollowupPill(prospectStatusLabels[status] || "Nouveau", `prospect-${status}`),
        createFollowupPill(questionnaireStatusLabels[prospect.questionnaireStatut] || "Questionnaire à envoyer", `questionnaire-${prospect.questionnaireStatut || "a-envoyer"}`),
        createFollowupPill(`Réponse : ${prospect.questionnaireRepondu ? "oui" : "non"}`, prospect.questionnaireRepondu ? "response-yes" : "response-no"),
      );
      if (!email) pills.append(createFollowupPill("Email manquant", "email-missing"));
      main.append(identity, pills);

      const actions = document.createElement("div");
      actions.className = "prospect-actions";
      if (hasQuestionnaireResponse(prospect)) {
        actions.append(createActionButton(
          expandedResponseProspectIds.has(prospect.id) ? "Masquer la réponse" : "Voir réponse",
          "toggle-response",
          "secondary-action",
        ));
      }
      actions.append(
        createActionButton("Préparer brouillon questionnaire", "prepare-questionnaire-draft", "primary-action", !email || prospect.questionnaireEnvoye || inactive),
        createActionButton("Copier message questionnaire", "copy-questionnaire-message", "secondary-action", inactive),
        createActionButton("Marquer comme envoyé", "mark-questionnaire-sent", "secondary-action", prospect.questionnaireEnvoye || inactive),
        createActionButton("Marquer comme répondu", "mark-answered", "secondary-action", prospect.questionnaireRepondu || inactive),
        createActionButton("Transformer en étudiant", "convert", "primary-action", inactive),
      );

      card.append(main);
      if (expandedResponseProspectIds.has(prospect.id) && hasQuestionnaireResponse(prospect)) {
        card.append(createQuestionnaireResponsePanel(prospect));
      }
      if (convertingProspectId === prospect.id) card.append(createConversionChoice(prospect));
      card.append(actions);
      elements.list.append(card);
    });
  }

  function renderCounts() {
    const prospects = storage.getProspects();
    const relances = prospects.filter(isProspectToRelance);
    elements.totalCount.textContent = String(prospects.length);
    elements.relanceCount.textContent = `${relances.length} prospect(s) à relancer`;
    elements.createRelances.disabled = relances.length === 0;
    elements.prepareAll.disabled = !prospects.some(isQuestionnairePreparationCandidate);
  }

  function renderProspects() {
    renderCounts();
    renderProspectCards();
  }

  function markQuestionnaireSent(prospect, draftId = "") {
    return storage.updateProspect(prospect.id, {
      email: prospect.email || getProspectEmail(prospect),
      statut: "à relancer",
      statutProspect: "a-relancer",
      questionnaireStatut: "envoye",
      questionnaireEnvoye: true,
      questionnaireEnvoyeLe: new Date().toISOString(),
      questionnaireRepondu: false,
      questionnaireReponduLe: "",
      questionnaireDraftId: draftId,
    });
  }

  function getQuestionnaireDraftConfiguration() {
    const formUrl = validateHttpsUrl(storage.getProspectsFormUrl());
    const endpoint = validateAppsScriptUrl(storage.getProspectsMailEndpoint());
    const token = storage.getProspectsMailToken().trim();
    if (!formUrl) throw new Error("Enregistrez d’abord l’URL Google Forms prospects.");
    if (!endpoint || !token) throw new Error("Renseignez une URL Apps Script valide et son token.");
    return { formUrl, endpoint, token };
  }

  async function createQuestionnaireDraft(prospect) {
    const email = getProspectEmail(prospect);
    if (!email) throw new Error("L’email du prospect est manquant.");
    const { endpoint, token } = getQuestionnaireDraftConfiguration();
    const message = buildQuestionnaireMessage(prospect);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" },
      body: JSON.stringify({ token, email, objet: message.objet, corps: message.corps }),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("La réponse Apps Script n’est pas lisible.");
    }
    if (!response.ok || data.success !== true) throw new Error(data.error || data.message || "Le brouillon n’a pas pu être préparé.");
    return { draftId: data.draftId || "", message: data.message || "" };
  }

  async function copyQuestionnaireMessage(prospect) {
    if (!validateHttpsUrl(storage.getProspectsFormUrl())) throw new Error("Enregistrez d’abord l’URL Google Forms prospects.");
    const message = buildQuestionnaireMessage(prospect);
    const text = `Objet : ${message.objet}\n\nCorps :\n${message.corps}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const temporaryField = document.createElement("textarea");
    temporaryField.value = text;
    temporaryField.setAttribute("readonly", "");
    temporaryField.style.position = "fixed";
    temporaryField.style.opacity = "0";
    document.body.append(temporaryField);
    temporaryField.select();
    const copied = document.execCommand("copy");
    temporaryField.remove();
    if (!copied) throw new Error("La copie n’est pas autorisée par le navigateur.");
  }

  async function handleProspectAction(event) {
    const button = event.target.closest("[data-prospect-action]");
    if (!button) return;
    const card = button.closest("[data-prospect-id]");
    const prospect = storage.getProspectById(card?.dataset.prospectId);
    if (!prospect) return;
    const action = button.dataset.prospectAction;

    if (action === "toggle-response") {
      if (expandedResponseProspectIds.has(prospect.id)) expandedResponseProspectIds.delete(prospect.id);
      else expandedResponseProspectIds.add(prospect.id);
    } else if (action === "prepare-questionnaire-draft") {
      button.disabled = true;
      setMessage(elements.actionStatus, "Préparation du brouillon questionnaire en cours.", "loading");
      try {
        const result = await createQuestionnaireDraft(prospect);
        markQuestionnaireSent(prospect, result.draftId);
        setMessage(elements.actionStatus, "Brouillon questionnaire préparé. À vérifier et envoyer par Audrey.", "success");
      } catch (error) {
        setMessage(elements.actionStatus, `La préparation du brouillon a échoué : ${error.message}`, "error");
      }
    } else if (action === "copy-questionnaire-message") {
      try {
        await copyQuestionnaireMessage(prospect);
        setMessage(elements.actionStatus, "Message copié. Colle-le dans ton mail, vérifie et envoie.", "success");
      } catch (error) {
        setMessage(elements.actionStatus, `La copie du message a échoué : ${error.message}`, "error");
      }
    } else if (action === "mark-questionnaire-sent") {
      markQuestionnaireSent(prospect);
      setMessage(elements.actionStatus, "Questionnaire marqué comme envoyé.", "success");
    } else if (action === "mark-answered") {
      storage.updateProspect(prospect.id, {
        statut: "intéressé",
        statutProspect: "interesse",
        questionnaireStatut: "repondu",
        questionnaireEnvoye: true,
        questionnaireRepondu: true,
        questionnaireReponduLe: new Date().toISOString(),
      });
      setMessage(elements.actionStatus, "Réponse questionnaire enregistrée.", "success");
    } else if (action === "convert") {
      const parcours = normalizeProspectParcours(prospect.parcoursValide)
        || normalizeProspectParcours(getProspectParcoursPressenti(prospect));
      if (parcoursLabels[parcours]) {
        storage.convertProspectToStudent(prospect.id, { parcours });
        setMessage(elements.actionStatus, "Prospect transformé en étudiant. Les informations du questionnaire ont été reprises dans la fiche.", "success");
      } else {
        convertingProspectId = prospect.id;
        setMessage(elements.actionStatus, "Choisissez le parcours étudiant avant la conversion.", "warning");
      }
    } else if (action === "confirm-convert") {
      const parcours = card.querySelector("[data-conversion-parcours]")?.value || "";
      if (!parcoursLabels[parcours]) {
        setMessage(elements.actionStatus, "Choisissez un parcours étudiant.", "error");
        return;
      }
      storage.updateProspect(prospect.id, { parcoursValide: parcours });
      storage.convertProspectToStudent(prospect.id, { parcours });
      convertingProspectId = null;
      setMessage(elements.actionStatus, "Prospect transformé en étudiant. Les informations du questionnaire ont été reprises dans la fiche.", "success");
    } else if (action === "cancel-convert") {
      convertingProspectId = null;
    }
    renderProspects();
  }

  async function prepareAllQuestionnaireDrafts() {
    const candidates = storage.getProspects().filter(isQuestionnairePreparationCandidate);
    const eligible = candidates.filter((prospect) => Boolean(getProspectEmail(prospect)));
    const ignored = candidates.length - eligible.length;
    if (!eligible.length) {
      setMessage(elements.bulkStatus, `0 brouillon(s) préparé(s). ${ignored} prospect(s) ignoré(s) car email manquant. 0 erreur(s). À vérifier et envoyer par Audrey.`, "warning");
      return;
    }
    try {
      getQuestionnaireDraftConfiguration();
    } catch (error) {
      setMessage(elements.bulkStatus, error.message, "error");
      return;
    }

    elements.prepareAll.disabled = true;
    setMessage(elements.bulkStatus, "Préparation des brouillons questionnaire en cours.", "loading");
    let created = 0;
    let errors = 0;
    for (const prospect of eligible) {
      try {
        const result = await createQuestionnaireDraft(prospect);
        markQuestionnaireSent(prospect, result.draftId);
        created += 1;
      } catch {
        errors += 1;
      }
    }
    const type = errors ? "warning" : "success";
    setMessage(elements.bulkStatus, `${created} brouillon(s) préparé(s). ${ignored} prospect(s) ignoré(s) car email manquant. ${errors} erreur(s). À vérifier et envoyer par Audrey.`, type);
    renderProspects();
  }

  function createProspect(event) {
    event.preventDefault();
    const data = new FormData(elements.createForm);
    const prospect = {
      pseudo: String(data.get("pseudo") || "").trim(),
      prenom: String(data.get("prenom") || "").trim(),
      nom: String(data.get("nom") || "").trim(),
      email: String(data.get("email") || "").trim(),
      niveau: String(data.get("niveau") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
    };
    if (!prospect.pseudo && !prospect.prenom && !prospect.nom && !prospect.email) {
      setMessage(elements.createStatus, "Renseignez au moins un pseudo, un prénom, un nom ou un email.", "error");
      return;
    }
    storage.createProspect({
      ...prospect,
      statut: "nouveau",
      statutProspect: "nouveau",
      questionnaireStatut: "a-envoyer",
      questionnaireEnvoye: false,
      questionnaireRepondu: false,
    });
    elements.createForm.reset();
    setMessage(elements.createStatus, "Prospect ajouté.", "success");
    renderProspects();
  }

  function saveFormsUrl() {
    const url = validateHttpsUrl(elements.formUrl.value);
    if (!url) {
      setMessage(elements.formUrlStatus, "Renseignez une URL HTTPS valide.", "error");
      return;
    }
    storage.saveProspectsFormUrl(url);
    elements.formUrl.value = url;
    const isGoogleForms = new URL(url).hostname === "docs.google.com" && new URL(url).pathname.startsWith("/forms/");
    setMessage(
      elements.formUrlStatus,
      isGoogleForms ? "Lien Google Forms enregistré." : "Lien enregistré. Vérifiez qu’il s’agit bien du Google Forms prospects.",
      isGoogleForms ? "success" : "warning",
    );
  }

  function saveMailConnection() {
    const endpoint = validateAppsScriptUrl(elements.mailEndpoint.value);
    const token = elements.mailToken.value.trim();
    if (!endpoint || !token) {
      setMessage(elements.mailConnectionStatus, "Renseignez une URL Apps Script valide et son token.", "error");
      return;
    }
    storage.saveProspectsMailEndpoint(endpoint);
    storage.saveProspectsMailToken(token);
    elements.mailEndpoint.value = endpoint;
    setMessage(elements.mailConnectionStatus, "Connexion questionnaire prospect enregistrée.", "success");
  }

  function saveResponsesConnection() {
    const endpoint = validateAppsScriptUrl(elements.responsesEndpoint.value);
    const token = elements.responsesToken.value.trim();
    if (!endpoint || !token) {
      setMessage(elements.responsesConnectionStatus, "Renseignez une URL Apps Script valide et son token.", "error");
      return;
    }
    storage.saveProspectsResponsesEndpoint(endpoint);
    storage.saveProspectsResponsesToken(token);
    elements.responsesEndpoint.value = endpoint;
    setMessage(elements.responsesConnectionStatus, "Connexion réponses questionnaire prospect enregistrée.", "success");
  }

  function normalizeQuestionnaireResponse(response) {
    const value = response && typeof response === "object" ? response : {};
    return {
      responseId: String(value.responseId || ""),
      receivedAt: String(value.receivedAt || ""),
      email: String(value.email || "").trim(),
      nomComplet: String(value.nomComplet || ""),
      prenom: String(value.prenom || ""),
      nom: String(value.nom || ""),
      telephone: String(value.telephone || ""),
      ifmk: String(value.ifmk || ""),
      niveau: String(value.niveau || ""),
      avancementMemoire: String(value.avancementMemoire || ""),
      difficultePrincipale: String(value.difficultePrincipale || ""),
      prochaineEcheance: String(value.prochaineEcheance || ""),
      niveauBlocage: String(value.niveauBlocage || ""),
      niveauUrgence: String(value.niveauUrgence || ""),
      aideSouhaitee: String(value.aideSouhaitee || ""),
      situationLibre: String(value.situationLibre || ""),
      questionAudrey: String(value.questionAudrey || ""),
      cadreAccepte: normalizeBoolean(value.cadreAccepte),
      redactionNonRemplacee: normalizeBoolean(value.redactionNonRemplacee),
      rawResponse: value.rawResponse && typeof value.rawResponse === "object" ? value.rawResponse : {},
    };
  }

  function getResponseTimestamp(response) {
    const timestamp = Date.parse(response.receivedAt || "");
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function keepLatestResponsesByEmail(responses) {
    const latestByEmail = new Map();
    responses.forEach((rawResponse) => {
      const response = normalizeQuestionnaireResponse(rawResponse);
      const email = normalizeEmail(response.email);
      if (!email) {
        latestByEmail.set(`__sans_email_${latestByEmail.size}`, response);
        return;
      }
      const current = latestByEmail.get(email);
      if (!current || getResponseTimestamp(response) >= getResponseTimestamp(current)) latestByEmail.set(email, response);
    });
    return [...latestByEmail.values()];
  }

  function isKnownResponse(prospect, response) {
    const current = getProspectResponse(prospect);
    if (response.responseId && current.responseId === response.responseId) return true;
    if (current.receivedAt && response.receivedAt && getResponseTimestamp(current) >= getResponseTimestamp(response)) return true;
    return JSON.stringify(normalizeQuestionnaireResponse(current)) === JSON.stringify(response);
  }

  async function checkProspectResponses() {
    const endpoint = validateAppsScriptUrl(storage.getProspectsResponsesEndpoint());
    const token = storage.getProspectsResponsesToken().trim();
    if (!endpoint || !token) {
      setMessage(elements.responsesSyncStatus, "Renseignez une URL Apps Script valide et son token pour les réponses.", "error");
      return;
    }

    elements.checkResponses.disabled = true;
    setMessage(elements.responsesSyncStatus, "Vérification des réponses prospects en cours.", "loading");
    try {
      const url = `${endpoint}?action=getResponses&token=${encodeURIComponent(token)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("La réponse Apps Script n’est pas lisible.");
      }
      if (!response.ok || data.success !== true || !Array.isArray(data.responses)) {
        throw new Error(data.error || data.message || "Apps Script n’a pas renvoyé la liste des réponses attendue.");
      }

      const prospectsByEmail = new Map();
      storage.getProspects().forEach((prospect) => {
        const email = normalizeEmail(getProspectEmail(prospect));
        if (email && !prospectsByEmail.has(email)) prospectsByEmail.set(email, prospect);
      });

      let updated = 0;
      let known = 0;
      let unmatched = 0;
      keepLatestResponsesByEmail(data.responses).forEach((questionnaireResponse) => {
        const prospect = prospectsByEmail.get(normalizeEmail(questionnaireResponse.email));
        if (!prospect) {
          unmatched += 1;
          return;
        }
        if (isKnownResponse(prospect, questionnaireResponse)) {
          known += 1;
          return;
        }
        storage.updateProspect(prospect.id, {
          statut: "intéressé",
          statutProspect: "interesse",
          questionnaireRepondu: true,
          questionnaireReponduLe: questionnaireResponse.receivedAt || new Date().toISOString(),
          questionnaireStatut: "repondu",
          telephone: String(prospect.telephone || "").trim() || questionnaireResponse.telephone || "",
          niveau: String(prospect.niveau || "").trim() || questionnaireResponse.niveau || "",
          reponseQuestionnaireProspect: questionnaireResponse,
        });
        updated += 1;
      });

      setMessage(
        elements.responsesSyncStatus,
        `${updated} prospect(s) mis à jour. ${known} réponse(s) déjà connue(s). ${unmatched} réponse(s) sans prospect correspondant.`,
        "success",
      );
      renderProspects();
    } catch (error) {
      setMessage(elements.responsesSyncStatus, `La vérification a échoué : ${error.message}`, "error");
    } finally {
      elements.checkResponses.disabled = false;
    }
  }

  function saveRelanceConnection() {
    const endpoint = validateAppsScriptUrl(elements.relanceEndpoint.value);
    const token = elements.relanceToken.value.trim();
    if (!endpoint || !token) {
      setMessage(elements.relanceConnectionStatus, "Renseignez une URL Apps Script valide et son token.", "error");
      return;
    }
    localStorage.setItem(RELANCE_ENDPOINT_KEY, endpoint);
    localStorage.setItem(RELANCE_TOKEN_KEY, token);
    elements.relanceEndpoint.value = endpoint;
    setMessage(elements.relanceConnectionStatus, "La connexion Apps Script de relance a été enregistrée.", "success");
  }

  function getTemplateInputs(type) {
    return {
      subject: document.querySelector(`#prospect-${type}-template-subject`),
      body: document.querySelector(`#prospect-${type}-template-body`),
      status: document.querySelector(`#prospect-${type}-template-status`),
    };
  }

  function populateTemplateEditors() {
    const templates = getTemplates();
    Object.keys(DEFAULT_TEMPLATES).forEach((type) => {
      const inputs = getTemplateInputs(type);
      inputs.subject.value = templates[type].objet;
      inputs.body.value = templates[type].corps;
    });
  }

  function saveTemplate(type) {
    const inputs = getTemplateInputs(type);
    const objet = inputs.subject.value.trim();
    const corps = inputs.body.value.trim();
    if (!objet || !corps) {
      setMessage(inputs.status, "Renseignez l’objet et le corps du mail.", "error");
      return;
    }
    storage.saveProspectsMailTemplate(type, { objet, corps });
    setMessage(inputs.status, "Modèle de mail enregistré.", "success");
  }

  function resetTemplate(type) {
    const inputs = getTemplateInputs(type);
    const template = DEFAULT_TEMPLATES[type];
    inputs.subject.value = template.objet;
    inputs.body.value = template.corps;
    storage.saveProspectsMailTemplate(type, template);
    setMessage(inputs.status, "Modèle par défaut rétabli.", "success");
  }

  function toggleTemplateEditor(button) {
    const type = button.dataset.mailEditorToggle;
    const editor = document.querySelector(`[data-mail-editor="${type}"]`);
    const willOpen = editor.hidden;
    editor.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    button.textContent = willOpen ? "Masquer l’édition" : "Éditer le mail";
  }

  function buildRelancePayload(prospects, token) {
    const template = getTemplates().relance;
    const formUrl = storage.getProspectsFormUrl();
    return {
      action: "createRelanceDrafts",
      token,
      prospects: prospects.map((prospect) => ({
        prospectId: prospect.id,
        prenom: prospect.prenom || prospect.pseudo || "",
        nom: prospect.nom || "",
        email: getProspectEmail(prospect),
        questionnaireUrl: formUrl,
        subject: remplaceVariables(template.objet, prospect, formUrl),
        message: remplaceVariables(template.corps, prospect, formUrl),
      })),
    };
  }

  function getRelanceDraftResults(data, prospects) {
    const returned = Array.isArray(data.drafts) ? data.drafts : (Array.isArray(data.results) ? data.results : null);
    if (!returned) return prospects.map((prospect) => ({ prospectId: prospect.id, draftId: prospects.length === 1 ? data.draftId || "" : "" }));
    return returned.map((result, index) => ({
      success: result.success,
      prospectId: result.prospectId || result.id || prospects[index]?.id || "",
      draftId: result.relanceDraftId || result.draftId || "",
    })).filter((result) => result.success !== false);
  }

  async function createRelanceDrafts() {
    const prospects = storage.getProspects().filter(isProspectToRelance);
    if (!prospects.length) return;
    const endpoint = validateAppsScriptUrl(localStorage.getItem(RELANCE_ENDPOINT_KEY));
    const token = (localStorage.getItem(RELANCE_TOKEN_KEY) || "").trim();
    if (!endpoint || !token) {
      setMessage(elements.relanceStatus, "Connexion Apps Script de relance à configurer.", "warning");
      return;
    }
    if (!validateHttpsUrl(storage.getProspectsFormUrl())) {
      setMessage(elements.relanceStatus, "Enregistrez d’abord l’URL Google Forms prospects.", "warning");
      return;
    }

    elements.createRelances.disabled = true;
    setMessage(elements.relanceStatus, "Création des brouillons de relance en cours.", "loading");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" },
        body: JSON.stringify(buildRelancePayload(prospects, token)),
      });
      const data = await response.json();
      if (!response.ok || data.success !== true) throw new Error(data.error || "Apps Script n’a pas confirmé la création des brouillons.");
      const now = new Date().toISOString();
      let created = 0;
      getRelanceDraftResults(data, prospects).forEach((result) => {
        const prospect = storage.getProspectById(result.prospectId);
        if (!prospect || !isProspectToRelance(prospect)) return;
        storage.updateProspect(prospect.id, {
          relanceDraftId: result.draftId,
          relanceCreatedAt: now,
          lastRelanceAt: now,
          relanceCount: (Number(prospect.relanceCount) || 0) + 1,
          relanceStatus: "brouillon créé",
          statut: "à relancer",
          statutProspect: "a-relancer",
        });
        created += 1;
      });
      setMessage(elements.relanceStatus, `${created} brouillon(s) de relance créé(s). À vérifier et envoyer par Audrey.`, "success");
    } catch (error) {
      setMessage(elements.relanceStatus, `La création des brouillons a échoué : ${error.message}`, "error");
    }
    renderProspects();
  }

  function initializeConfiguration() {
    elements.formUrl.value = storage.getProspectsFormUrl();
    const storedMailEndpoint = storage.getProspectsMailEndpoint();
    const storedMailToken = storage.getProspectsMailToken();
    const legacyMailEndpoint = localStorage.getItem("redacImrad.prospects.questionnaireSend.endpoint") || "";
    const legacyMailToken = localStorage.getItem("redacImrad.prospects.questionnaireSend.token") || "";
    elements.mailEndpoint.value = storedMailEndpoint || legacyMailEndpoint;
    elements.mailToken.value = storedMailToken || legacyMailToken;
    if (!storedMailEndpoint && validateAppsScriptUrl(legacyMailEndpoint)) storage.saveProspectsMailEndpoint(validateAppsScriptUrl(legacyMailEndpoint));
    if (!storedMailToken && legacyMailToken.trim()) storage.saveProspectsMailToken(legacyMailToken.trim());
    const storedResponsesEndpoint = storage.getProspectsResponsesEndpoint();
    const storedResponsesToken = storage.getProspectsResponsesToken();
    const legacyResponsesEndpoint = localStorage.getItem(RESPONSES_ENDPOINT_KEY) || "";
    const legacyResponsesToken = localStorage.getItem(RESPONSES_TOKEN_KEY) || "";
    elements.responsesEndpoint.value = storedResponsesEndpoint || legacyResponsesEndpoint;
    elements.responsesToken.value = storedResponsesToken || legacyResponsesToken;
    if (!storedResponsesEndpoint && validateAppsScriptUrl(legacyResponsesEndpoint)) {
      storage.saveProspectsResponsesEndpoint(validateAppsScriptUrl(legacyResponsesEndpoint));
    }
    if (!storedResponsesToken && legacyResponsesToken.trim()) storage.saveProspectsResponsesToken(legacyResponsesToken.trim());
    elements.relanceEndpoint.value = localStorage.getItem(RELANCE_ENDPOINT_KEY) || "";
    elements.relanceToken.value = localStorage.getItem(RELANCE_TOKEN_KEY) || "";
    populateTemplateEditors();
  }

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-mail-editor-toggle]");
    if (toggle) toggleTemplateEditor(toggle);
    const save = event.target.closest("[data-save-mail-template]");
    if (save) saveTemplate(save.dataset.saveMailTemplate);
    const reset = event.target.closest("[data-reset-mail-template]");
    if (reset) resetTemplate(reset.dataset.resetMailTemplate);
  });
  elements.createForm.addEventListener("submit", createProspect);
  elements.list.addEventListener("click", handleProspectAction);
  elements.prepareAll.addEventListener("click", prepareAllQuestionnaireDrafts);
  elements.createRelances.addEventListener("click", createRelanceDrafts);
  elements.saveFormUrl.addEventListener("click", saveFormsUrl);
  elements.saveMailConnection.addEventListener("click", saveMailConnection);
  elements.saveResponsesConnection.addEventListener("click", saveResponsesConnection);
  elements.checkResponses.addEventListener("click", checkProspectResponses);
  elements.saveRelanceConnection.addEventListener("click", saveRelanceConnection);

  initializeConfiguration();
  renderProspects();

  global.ProspectRelances = Object.freeze({
    isProspectToRelance,
    remplaceVariables,
    buildRelancePayload,
  });
})(window);
