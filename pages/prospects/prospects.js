(function initializeProspects(global) {
  const browserStorage = global.RedacServices.browserStorage;
  const RELANCE_ENDPOINT_KEY = "redacImrad.prospects.relanceEndpoint";
  const RELANCE_TOKEN_KEY = "redacImrad.prospects.relanceToken";
  const RESPONSES_ENDPOINT_KEY = "redacImrad.prospects.questionnaireResponses.endpoint";
  const RESPONSES_TOKEN_KEY = "redacImrad.prospects.questionnaireResponses.token";
  const UI_MESSAGES = Object.freeze({
    prospectEmpty: "Aucun prospect pour le moment. Commence par ajouter une personne intéressée.",
    questionnaireNotSent: "Questionnaire pas encore envoyé. Prépare un brouillon depuis la fiche.",
    prospectConverted: "Prospect transformé en étudiant. La fiche a été créée dans l'onglet correspondant.",
    modelSaved: "Modèle enregistré. Il sera utilisé pour les prochains envois.",
    modelRestored: "Modèle restauré. Le texte par défaut a été rétabli.",
    missingAppsScriptUrl: "L'URL Apps Script n'est pas configurée. Rends-toi dans les paramètres pour la renseigner.",
    missingToken: "Le token de connexion est manquant. Vérifie la configuration dans les paramètres.",
    googleNotConfigured: "La connexion à Google n'est pas encore configurée. Renseigne l'URL et le token dans les paramètres.",
  });

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
      objet: "Petit rappel — ton questionnaire",
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
    archivesToggle: document.querySelector("#toggle-prospect-archives"),
    archivesSection: document.querySelector("#prospect-archives-section"),
    archivesList: document.querySelector("#prospect-archives-list"),
    archivesStatus: document.querySelector("#prospect-archives-status"),
    relanceEndpoint: document.querySelector("#prospect-relance-endpoint"),
    relanceToken: document.querySelector("#prospect-relance-token"),
    saveRelanceConnection: document.querySelector("#save-prospect-relance-config"),
    relanceConnectionStatus: document.querySelector("#prospect-relance-config-status"),
    createRelances: document.querySelector("#send-prospect-relances"),
    relanceStatus: document.querySelector("#prospect-relance-status"),
    relanceCount: document.querySelector("#prospect-relance-count"),
    relanceConfirmation: document.querySelector("#prospect-relance-confirmation"),
    relanceConfirmationSummary: document.querySelector("#prospect-relance-confirmation-summary"),
    relanceConfirmationList: document.querySelector("#prospect-relance-confirmation-list"),
    confirmRelances: document.querySelector("#confirm-prospect-relances"),
    cancelRelances: document.querySelector("#cancel-prospect-relances"),
  };

  if (!global.RedacServices.appData || !elements.list) return;

  const storage = global.RedacServices.appData;
  let convertingProspectId = null;
  let pendingRelancePlan = null;
  let archivesVisible = false;
  const expandedResponseProspectIds = new Set();

  const prospectStatusLabels = {
    nouveau: "Nouveau",
    "a-relancer": "À relancer",
    interesse: "Intéressé",
    "non-interesse": "Pas intéressé",
    "en-reflexion": "En réflexion",
    transforme: "Transformé",
    archive: "Archivé",
  };
  const questionnaireStatusLabels = {
    "a-envoyer": UI_MESSAGES.questionnaireNotSent,
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

  function normalizeMatchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("fr-FR");
  }

  function getProspectNameMatchKey(prospect) {
    const directName = `${prospect.prenom || ""} ${prospect.nom || ""}`.trim();
    return normalizeMatchText(directName || prospect.pseudo || getProspectResponse(prospect).nomComplet);
  }

  function getResponseNameMatchKey(response) {
    return normalizeMatchText(response.nomComplet || `${response.prenom || ""} ${response.nom || ""}`.trim());
  }

  function normalizeBoolean(value) {
    if (value === true || value === 1) return true;
    return ["true", "oui", "yes", "1"].includes(String(value || "").trim().toLocaleLowerCase("fr-FR"));
  }

  function hasQuestionnaireResponse(prospect) {
    const response = getProspectResponse(prospect);
    return Boolean(response.responseId || response.receivedAt || response.email);
  }

  function hasUsefulResponseData(response) {
    if (!response || typeof response !== "object") return false;
    return Object.entries(response).some(([key, value]) => {
      if (key === "rawResponse") return value && typeof value === "object" && Object.keys(value).length > 0;
      return value !== "" && value !== null && value !== undefined && value !== false;
    });
  }

  function collectProspectResponses(prospect) {
    const responses = [];
    const primaryResponse = getProspectResponse(prospect);
    if (hasUsefulResponseData(primaryResponse)) responses.push(primaryResponse);
    if (Array.isArray(prospect.reponsesBrutes)) {
      prospect.reponsesBrutes.forEach((response) => {
        if (hasUsefulResponseData(response)) responses.push(response);
      });
    }
    if (Array.isArray(prospect.conflitsReponsesProspect)) {
      prospect.conflitsReponsesProspect.forEach((response) => {
        if (hasUsefulResponseData(response)) responses.push(response);
      });
    }
    if (prospect.rawResponse && typeof prospect.rawResponse === "object" && hasUsefulResponseData(prospect.rawResponse)) {
      responses.push({ rawResponse: prospect.rawResponse });
    }
    return responses.sort((first, second) => getResponseTimestamp(first) - getResponseTimestamp(second));
  }

  function isQuestionnairePreparationCandidate(prospect) {
    const status = prospect.statutProspect || "nouveau";
    return (prospect.questionnaireStatut === "a-envoyer" || prospect.questionnaireEnvoye !== true)
      && prospect.questionnaireRepondu !== true
      && status !== "archive"
      && status !== "transforme";
  }

  function isActiveProspect(prospect) {
    const status = prospect.statutProspect || "nouveau";
    return status !== "archive" && status !== "transforme";
  }

  function getActiveProspects() {
    if (typeof storage.getActiveProspects === "function") return storage.getActiveProspects();
    return storage.getProspects().filter(isActiveProspect);
  }

  function getArchivedProspects() {
    if (typeof storage.getArchivedProspects === "function") return storage.getArchivedProspects();
    return storage.getProspects().filter((prospect) => !isActiveProspect(prospect));
  }

  function formatDate(value) {
    if (!value) return "Non renseigné";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-FR");
  }

  function isProspectAwaitingRelance(prospect) {
    const status = prospect.statutProspect || "nouveau";
    return prospect.questionnaireEnvoye === true
      && prospect.questionnaireRepondu !== true
      && prospect.relanceEnvoyee !== true
      && status !== "transforme"
      && status !== "archive";
  }

  function getQuestionnaireSentTimestamp(prospect) {
    const timestamp = Date.parse(prospect.questionnaireEnvoyeLe || "");
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function isProspectToRelance(prospect) {
    const sentTimestamp = getQuestionnaireSentTimestamp(prospect);
    return isProspectAwaitingRelance(prospect)
      && Boolean(getProspectEmail(prospect))
      && sentTimestamp !== null
      && Date.now() - sentTimestamp > 7 * 24 * 60 * 60 * 1000;
  }

  function getRelancePlan() {
    const plan = { eligible: [], ignoredEmail: 0, ignoredDate: 0 };
    storage.getProspects().filter(isProspectAwaitingRelance).forEach((prospect) => {
      if (!getProspectEmail(prospect)) {
        plan.ignoredEmail += 1;
        return;
      }
      if (getQuestionnaireSentTimestamp(prospect) === null) {
        plan.ignoredDate += 1;
        return;
      }
      if (isProspectToRelance(prospect)) plan.eligible.push(prospect);
    });
    return plan;
  }

  function getTemplates() {
    const stored = storage.getProspectsMailTemplates();
    const normalizeTemplate = (type) => {
      const template = stored[type] || {};
      return {
        objet: template.objet || template.subject || DEFAULT_TEMPLATES[type].objet,
        corps: template.corps || template.body || DEFAULT_TEMPLATES[type].corps,
      };
    };
    return {
      questionnaire: normalizeTemplate("questionnaire"),
      relance: normalizeTemplate("relance"),
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

  function getRelancePillLabel(prospect) {
    if (!prospect.relanceEnvoyeeLe) return "Relance envoyée";
    const date = new Date(prospect.relanceEnvoyeeLe);
    return Number.isNaN(date.getTime()) ? "Relance envoyée" : `Relance envoyée le ${date.toLocaleDateString("fr-FR")}`;
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

  function hasDisplayValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function normalizeQuestionKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  }

  function normalizeInterestValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  }

  function getRawResponseValue(rawResponse, rawKeys = []) {
    if (!rawResponse || typeof rawResponse !== "object") return "";
    const rawEntries = Object.entries(rawResponse).map(([key, value]) => [normalizeQuestionKey(key), value]);
    const normalizedRawKeys = rawKeys.map(normalizeQuestionKey);
    const match = rawEntries.find(([key, value]) => normalizedRawKeys.includes(key) && hasDisplayValue(value));
    return match ? match[1] : "";
  }

  function getResponseValue(response, directKeys = [], rawKeys = []) {
    const directKey = directKeys.find((key) => hasDisplayValue(response?.[key]));
    if (directKey) return response[directKey];
    return getRawResponseValue(response?.rawResponse, rawKeys);
  }

  function getProspectInterestStatusFromResponse(response) {
    const value = normalizeInterestValue(getResponseValue(
      response,
      ["accompagnementSouhaite", "accompagnementRecherche", "typeAccompagnement", "aideSouhaitee"],
      [
        "quel type d'accompagnement penses-tu rechercher ?",
        "quel type d’accompagnement penses-tu rechercher ?",
        "accompagnement",
        "type d'accompagnement",
      ],
    ));
    if (!value) return "";
    if (value.includes("pas interesse")) return "non-interesse";
    if (value.includes("je ne sais pas encore")) return "en-reflexion";
    return "interesse";
  }

  function getProspectStatusAfterResponse(prospect, response) {
    const currentStatus = prospect.statutProspect || "nouveau";
    if (currentStatus === "archive" || currentStatus === "transforme") return currentStatus;
    return getProspectInterestStatusFromResponse(response)
      || getProspectInterestStatusFromResponse(getProspectResponse(prospect))
      || currentStatus;
  }

  function getLegacyProspectStatusLabel(status) {
    if (status === "interesse") return "intéressé";
    if (status === "non-interesse") return "pas intéressé";
    if (status === "en-reflexion") return "en réflexion";
    return status || "nouveau";
  }

  function getProspectStatusAfterRestore(prospect) {
    const responseStatus = getProspectInterestStatusFromResponse(getProspectResponse(prospect));
    if (responseStatus) return responseStatus;
    if (prospect.questionnaireEnvoye === true || prospect.questionnaireStatut === "envoye") return "a-relancer";
    return "nouveau";
  }

  function splitFullName(value) {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    return {
      prenom: parts[0] || "",
      nom: parts.slice(1).join(" "),
    };
  }

  function getResponseFirstName(response) {
    return getResponseValue(response, ["prenom", "firstName"], ["prenom", "prénom"])
      || splitFullName(getRawResponseValue(response?.rawResponse, ["prenom et nom", "prénom et nom"])).prenom;
  }

  function getResponseLastName(response) {
    return getResponseValue(response, ["nom", "lastName"], ["nom"])
      || splitFullName(getRawResponseValue(response?.rawResponse, ["prenom et nom", "prénom et nom"])).nom;
  }

  function inferParcoursFromResponse(response) {
    const directValue = getResponseValue(response, ["parcoursVise", "parcoursPressenti"], []);
    if (hasDisplayValue(directValue)) return directValue;
    const accompagnement = String(getResponseValue(
      response,
      ["accompagnementSouhaite", "accompagnementRecherche", "aideSouhaitee"],
      [
        "quel type d'accompagnement penses-tu rechercher ?",
        "quel type d’accompagnement penses-tu rechercher ?",
        "type d'accompagnement",
        "accompagnement",
      ],
    ) || "").toLocaleLowerCase("fr-FR");
    if (accompagnement.includes("point")) return "Point Mémoire";
    if (accompagnement.includes("k4")) return "K4";
    if (accompagnement.includes("k5")) return "K5";
    if (accompagnement.includes("rattrapage")) return "Rattrapage";
    return "";
  }

  function formatResponseDate(value) {
    if (!hasDisplayValue(value)) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(",", " à");
  }

  function createQuestionnaireResponseDetails(response) {
    const fields = document.createElement("dl");
    fields.className = "prospect-response-grid";
    appendResponseField(fields, "Prénom", getResponseFirstName(response));
    appendResponseField(fields, "Nom", getResponseLastName(response));
    appendResponseField(fields, "Email", getResponseValue(response, ["email"], ["adresse mail", "email", "adresse e-mail"]));
    appendResponseField(fields, "Année / niveau d’étude", getResponseValue(
      response,
      ["anneeEtudeLibelle", "anneeEtude", "niveau", "annee"],
      ["en quelle annee es-tu ?", "en quelle année es-tu ?", "année", "annee", "niveau"],
    ));
    appendResponseField(fields, "Situation dans le mémoire", getResponseValue(
      response,
      ["situationMemoire", "situationLibre", "avancementMemoire"],
      ["ou en es-tu dans ton memoire ?", "où en es-tu dans ton mémoire ?", "situation memoire", "situation mémoire", "avancement"],
    ), { wide: true });
    appendResponseField(fields, "Prochaine échéance", getResponseValue(
      response,
      ["echeance", "prochaineEcheance"],
      ["quelle est ta prochaine echeance ?", "quelle est ta prochaine échéance ?", "echeance", "échéance"],
    ));
    appendResponseField(fields, "Blocage principal", getResponseValue(
      response,
      ["blocagePrincipal", "difficultePrincipale", "niveauBlocage"],
      ["qu'est-ce qui te bloque le plus aujourd'hui ?", "qu’est-ce qui te bloque le plus aujourd’hui ?", "blocage principal", "blocage"],
    ), { wide: true });
    appendResponseField(fields, "Accompagnement recherché", getResponseValue(
      response,
      ["accompagnementSouhaite", "accompagnementRecherche", "aideSouhaitee"],
      ["quel type d'accompagnement penses-tu rechercher ?", "quel type d’accompagnement penses-tu rechercher ?", "type d'accompagnement", "accompagnement"],
    ), { wide: true });
    appendResponseField(fields, "Parcours visé", inferParcoursFromResponse(response));
    appendResponseField(fields, "Provenance", getResponseValue(
      response,
      ["provenanceLibelle", "provenance"],
      ["comment as-tu connu audrey / sois fiere de ton memoire ?", "comment as-tu connu audrey / sois fière de ton mémoire ?", "provenance", "source"],
    ));
    appendResponseField(fields, "Niveau de stress", getResponseValue(
      response,
      ["niveauStress", "niveauUrgence"],
      ["sur une echelle de 0 a 10, a quel point te sens-tu stresse(e) par ton memoire ?", "sur une échelle de 0 à 10, à quel point te sens-tu stressé(e) par ton mémoire ?", "stress", "niveau stress"],
    ));
    appendResponseField(fields, "Date de réponse", formatResponseDate(getResponseValue(response, ["receivedAt", "timestamp"], ["timestamp", "horodateur"])));
    return fields;
  }

  function createQuestionnaireResponsePanel(prospect) {
    const responses = collectProspectResponses(prospect);
    const panel = document.createElement("section");
    panel.className = "prospect-response-panel";
    panel.setAttribute("aria-label", `Réponses questionnaire de ${getProspectDisplayName(prospect)}`);
    const heading = document.createElement("div");
    heading.className = "prospect-response-heading";
    const title = document.createElement("h4");
    title.textContent = "Réponses questionnaire";
    const count = document.createElement("p");
    count.textContent = responses.length ? `${responses.length} réponse(s) liée(s)` : "Aucune réponse liée";
    heading.append(title, count);
    panel.append(heading);

    if (!responses.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucune réponse questionnaire liée à ce prospect pour le moment.";
      panel.append(empty);
    } else {
      responses.forEach((response, index) => {
        const responseBlock = document.createElement("article");
        responseBlock.className = "prospect-response-block";
        const responseTitle = document.createElement("h5");
        responseTitle.textContent = responses.length > 1 ? `Réponse ${index + 1}` : "Réponse liée";
        responseBlock.append(responseTitle, createQuestionnaireResponseDetails(response));
        panel.append(responseBlock);
      });
    }

    const hideButton = createActionButton("Masquer la réponse", "toggle-response", "secondary-action");
    panel.append(hideButton);
    return panel;
  }

  function renderProspectCards() {
    const prospects = getActiveProspects();
    elements.list.textContent = "";
    if (!prospects.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = storage.getProspects().length
        ? "Aucun prospect actif pour le moment."
        : UI_MESSAGES.prospectEmpty;
      elements.list.append(empty);
      return;
    }

    prospects.forEach((prospect) => {
      const status = prospect.statutProspect || "nouveau";
      const email = getProspectEmail(prospect);
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
        createFollowupPill(questionnaireStatusLabels[prospect.questionnaireStatut] || UI_MESSAGES.questionnaireNotSent, `questionnaire-${prospect.questionnaireStatut || "a-envoyer"}`),
        createFollowupPill(`Réponse : ${prospect.questionnaireRepondu ? "oui" : "non"}`, prospect.questionnaireRepondu ? "response-yes" : "response-no"),
      );
      if (!email) pills.append(createFollowupPill("Email manquant", "email-missing"));
      if (prospect.relanceEnvoyee === true) pills.append(createFollowupPill(getRelancePillLabel(prospect), "relance-prepared"));
      main.append(identity, pills);

      const actions = document.createElement("div");
      actions.className = "prospect-actions";
      actions.append(createActionButton(
        expandedResponseProspectIds.has(prospect.id) ? "Masquer les réponses" : "Voir réponses",
        "toggle-response",
        "secondary-action",
      ));
      actions.append(
        createActionButton("Préparer le questionnaire", "send-questionnaire", "primary-action", !email || prospect.questionnaireRepondu === true),
        createActionButton("Préparer la relance", "send-relance", "secondary-action", !isProspectToRelance(prospect)),
        createActionButton("Transformer en étudiant", "convert", "primary-action"),
        createActionButton("Archiver", "archive", "destructive-action"),
      );

      card.append(main);
      if (expandedResponseProspectIds.has(prospect.id)) {
        card.append(createQuestionnaireResponsePanel(prospect));
      }
      if (convertingProspectId === prospect.id) card.append(createConversionChoice(prospect));
      card.append(actions);
      elements.list.append(card);
    });
  }

  function createArchivedProspectCard(prospect) {
    const status = prospect.statutProspect || "archive";
    const card = document.createElement("article");
    card.className = "prospect-archive-card";
    card.dataset.prospectId = prospect.id;

    const content = document.createElement("div");
    content.className = "prospect-archive-content";
    const heading = document.createElement("div");
    heading.className = "prospect-archive-heading";
    const name = document.createElement("h3");
    name.textContent = getProspectDisplayName(prospect);
    const statusPill = createFollowupPill(status === "transforme" ? "Transformé" : "Archivé", `prospect-${status}`);
    heading.append(name, statusPill);

    const details = document.createElement("dl");
    details.className = "prospect-archive-details";
    appendIdentityDetail(details, "Email", getProspectEmail(prospect));
    appendIdentityDetail(details, "Niveau", getProspectNiveau(prospect));
    appendIdentityDetail(details, "Date de contact", prospect.dateContact ? formatDate(prospect.dateContact) : "");
    appendIdentityDetail(details, "Date de modification", prospect.dateModification ? formatDate(prospect.dateModification) : "");

    const linkedStudentId = prospect.studentId || prospect.convertedStudentId || "";
    if (status === "transforme") {
      const transformedNote = document.createElement("p");
      transformedNote.className = "prospect-archive-note";
      transformedNote.textContent = UI_MESSAGES.prospectConverted;
      content.append(heading, details, transformedNote);
    } else {
      content.append(heading, details);
    }

    const actions = document.createElement("div");
    actions.className = "prospect-archive-actions";
    if (hasQuestionnaireResponse(prospect)) {
      actions.append(createActionButton(
        expandedResponseProspectIds.has(prospect.id) ? "Masquer les réponses" : "Voir réponses",
        "toggle-response",
        "secondary-action",
      ));
    }
    const restore = createActionButton(
      status === "transforme" ? "Restaurer dans Prospects" : "Restaurer",
      "restore-archive",
      "secondary-action",
    );
    actions.append(restore);

    if (linkedStudentId) {
      const linkedStudent = document.createElement("a");
      linkedStudent.className = "secondary-action";
      linkedStudent.href = `index.html?student=${encodeURIComponent(linkedStudentId)}`;
      linkedStudent.textContent = "Voir étudiant lié";
      actions.append(linkedStudent);
    }

    actions.append(createActionButton("Supprimer définitivement", "delete-archive", "destructive-action archive-delete-action"));
    card.append(content, actions);
    if (expandedResponseProspectIds.has(prospect.id)) {
      card.append(createQuestionnaireResponsePanel(prospect));
    }
    return card;
  }

  function renderProspectArchives() {
    if (!elements.archivesSection || !elements.archivesList || !elements.archivesToggle) return;
    const archivedProspects = getArchivedProspects();
    elements.archivesSection.hidden = !archivesVisible;
    elements.archivesToggle.textContent = archivesVisible ? "Masquer les prospects archivés" : "Voir les prospects archivés";
    elements.archivesToggle.setAttribute("aria-expanded", String(archivesVisible));
    elements.archivesList.textContent = "";

    if (!archivedProspects.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucun prospect archivé ou transformé pour le moment.";
      elements.archivesList.append(empty);
      return;
    }

    archivedProspects.forEach((prospect) => elements.archivesList.append(createArchivedProspectCard(prospect)));
  }

  function renderCounts() {
    const prospects = getActiveProspects();
    const relancePlan = getRelancePlan();
    elements.totalCount.textContent = String(prospects.length);
    elements.relanceCount.textContent = `${relancePlan.eligible.length} prospect(s) à relancer`;
    elements.createRelances.disabled = !prospects.some(isProspectAwaitingRelance);
    elements.prepareAll.disabled = !prospects.some(isQuestionnairePreparationCandidate);
  }

  function renderProspects() {
    renderCounts();
    renderProspectCards();
    renderProspectArchives();
  }

  function markQuestionnaireSent(prospect) {
    return storage.updateProspect(prospect.id, {
      email: prospect.email || getProspectEmail(prospect),
      statut: "à relancer",
      statutProspect: prospect.statutProspect === "nouveau" ? "a-relancer" : prospect.statutProspect,
      questionnaireStatut: "envoye",
      questionnaireEnvoye: true,
      questionnaireEnvoyeLe: new Date().toISOString(),
      questionnaireRepondu: false,
      questionnaireReponduLe: "",
    });
  }

  function getQuestionnaireSendConfiguration() {
    const formUrl = validateHttpsUrl(storage.getProspectsFormUrl());
    const endpoint = validateAppsScriptUrl(storage.getProspectsMailEndpoint());
    const token = storage.getProspectsMailToken().trim();
    if (!formUrl) throw new Error("Enregistrez d’abord l’URL Google Forms prospects.");
    if (!endpoint) throw new Error(UI_MESSAGES.missingAppsScriptUrl);
    if (!token) throw new Error(UI_MESSAGES.missingToken);
    return { formUrl, endpoint, token };
  }

  async function sendProspectMail(endpoint, token, action, email, message) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" },
      body: JSON.stringify({ token, action, email, objet: message.objet, corps: message.corps }),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("La réponse Apps Script n’est pas lisible.");
    }
    if (!response.ok || data.success !== true) {
      throw new Error(data.error || data.message || "L’envoi n’a pas pu être confirmé.");
    }
    return data;
  }

  async function sendQuestionnaire(prospect) {
    const email = getProspectEmail(prospect);
    if (!email) throw new Error("L’email du prospect est manquant.");
    const { endpoint, token } = getQuestionnaireSendConfiguration();
    const message = buildQuestionnaireMessage(prospect);
    return sendProspectMail(endpoint, token, "sendQuestionnaire", email, message);
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
    } else if (action === "send-questionnaire") {
      button.disabled = true;
      setMessage(elements.actionStatus, "Envoi du questionnaire en cours.", "loading");
      try {
        await sendQuestionnaire(prospect);
        markQuestionnaireSent(prospect);
        setMessage(elements.actionStatus, `Questionnaire envoyé à ${getProspectEmail(prospect)}.`, "success");
      } catch (error) {
        setMessage(elements.actionStatus, `L’envoi du questionnaire a échoué : ${error.message}`, "error");
      }
    } else if (action === "send-relance") {
      const email = getProspectEmail(prospect);
      if (!global.confirm(`Envoyer une relance à ${email} ?`)) return;
      button.disabled = true;
      setMessage(elements.actionStatus, `Envoi de la relance à ${email}.`, "loading");
      try {
        await sendRelance(prospect);
        markRelanceSent(prospect);
        setMessage(elements.actionStatus, `Relance envoyée à ${email}.`, "success");
      } catch (error) {
        setMessage(elements.actionStatus, `L’envoi de la relance a échoué : ${error.message}`, "error");
      }
    } else if (action === "archive") {
      const confirmed = window.confirm("Confirmer l’archivage de ce dossier ?");
      if (!confirmed) return;
      storage.archiveProspect(prospect.id);
      setMessage(elements.actionStatus, "Prospect archivé.", "success");
    } else if (action === "restore-archive") {
      const statutProspect = getProspectStatusAfterRestore(prospect);
      storage.updateProspect(prospect.id, {
        statutProspect,
        statut: getLegacyProspectStatusLabel(statutProspect),
      });
      setMessage(elements.archivesStatus || elements.actionStatus, "Prospect restauré.", "success");
    } else if (action === "delete-archive") {
      const confirmed = window.confirm("Supprimer définitivement cette fiche prospect ? Cette action est irréversible. Les données locales associées seront supprimées de Redac-IMRaD.");
      if (!confirmed) return;
      const typedConfirmation = window.prompt("Pour confirmer la suppression définitive, tape SUPPRIMER.");
      if (typedConfirmation !== "SUPPRIMER") {
        setMessage(elements.archivesStatus || elements.actionStatus, "Suppression annulée.", "warning");
        return;
      }
      const hadLinkedStudent = Boolean(prospect.studentId || prospect.convertedStudentId);
      storage.deleteProspect(prospect.id);
      setMessage(
        elements.archivesStatus || elements.actionStatus,
        hadLinkedStudent
          ? "Le prospect a été supprimé. L’étudiant lié est conservé."
          : "Prospect supprimé définitivement.",
        "success",
      );
    } else if (action === "convert") {
      const parcours = normalizeProspectParcours(prospect.parcoursValide)
        || normalizeProspectParcours(getProspectParcoursPressenti(prospect));
      if (parcoursLabels[parcours]) {
        storage.convertProspectToStudent(prospect.id, { parcours });
        setMessage(elements.actionStatus, UI_MESSAGES.prospectConverted, "success");
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
      setMessage(elements.actionStatus, UI_MESSAGES.prospectConverted, "success");
    } else if (action === "cancel-convert") {
      convertingProspectId = null;
    }
    renderProspects();
  }

  async function sendAllQuestionnaires() {
    const candidates = storage.getProspects().filter(isQuestionnairePreparationCandidate);
    const eligible = candidates.filter((prospect) => Boolean(getProspectEmail(prospect)));
    const ignored = candidates.length - eligible.length;
    if (!eligible.length) {
      setMessage(elements.bulkStatus, `0 questionnaire(s) envoyé(s). ${ignored} prospect(s) ignoré(s) car email manquant. 0 erreur(s).`, "warning");
      return;
    }
    try {
      getQuestionnaireSendConfiguration();
    } catch (error) {
      setMessage(elements.bulkStatus, error.message, "error");
      return;
    }
    if (!global.confirm(`Vous allez envoyer ${eligible.length} questionnaire(s). Confirmer l’envoi ?`)) return;

    elements.prepareAll.disabled = true;
    setMessage(elements.bulkStatus, "Envoi des questionnaires en cours.", "loading");
    let sent = 0;
    let errors = 0;
    for (const prospect of eligible) {
      try {
        await sendQuestionnaire(prospect);
        markQuestionnaireSent(prospect);
        sent += 1;
      } catch {
        errors += 1;
      }
    }
    const type = errors ? "warning" : "success";
    setMessage(elements.bulkStatus, `${sent} questionnaire(s) envoyé(s). ${ignored} prospect(s) ignoré(s) car email manquant. ${errors} erreur(s).`, type);
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
      setMessage(elements.mailConnectionStatus, !endpoint ? UI_MESSAGES.missingAppsScriptUrl : UI_MESSAGES.missingToken, "error");
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
      setMessage(elements.responsesConnectionStatus, !endpoint ? UI_MESSAGES.missingAppsScriptUrl : UI_MESSAGES.missingToken, "error");
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
      accompagnementSouhaite: String(value.accompagnementSouhaite || ""),
      accompagnementRecherche: String(value.accompagnementRecherche || ""),
      typeAccompagnement: String(value.typeAccompagnement || ""),
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

  function needsKnownResponseStatusRepair(prospect, response) {
    return prospect.questionnaireRepondu !== true
      || prospect.questionnaireStatut !== "repondu"
      || getProspectStatusAfterResponse(prospect, response) !== (prospect.statutProspect || "nouveau");
  }

  function repairKnownResponseStatus(prospect, response) {
    const statutProspect = getProspectStatusAfterResponse(prospect, response);
    return storage.updateProspect(prospect.id, {
      questionnaireRepondu: true,
      questionnaireReponduLe: prospect.questionnaireReponduLe || response.receivedAt || new Date().toISOString(),
      questionnaireStatut: "repondu",
      statut: getLegacyProspectStatusLabel(statutProspect),
      statutProspect,
    });
  }

  async function checkProspectResponses() {
    const endpoint = validateAppsScriptUrl(storage.getProspectsResponsesEndpoint());
    const token = storage.getProspectsResponsesToken().trim();
    if (!endpoint || !token) {
      setMessage(elements.responsesSyncStatus, !endpoint ? UI_MESSAGES.missingAppsScriptUrl : UI_MESSAGES.missingToken, "error");
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
      const prospectsByName = new Map();
      storage.getProspects().forEach((prospect) => {
        const email = normalizeEmail(getProspectEmail(prospect));
        if (email && !prospectsByEmail.has(email)) prospectsByEmail.set(email, prospect);
        const nameKey = getProspectNameMatchKey(prospect);
        if (nameKey && nameKey !== "prospect sans nom" && !prospectsByName.has(nameKey)) prospectsByName.set(nameKey, prospect);
      });

      let updated = 0;
      let known = 0;
      let unmatched = 0;
      keepLatestResponsesByEmail(data.responses).forEach((questionnaireResponse) => {
        const prospect = prospectsByEmail.get(normalizeEmail(questionnaireResponse.email))
          || prospectsByName.get(getResponseNameMatchKey(questionnaireResponse));
        if (!prospect) {
          unmatched += 1;
          return;
        }
        const responseAlreadyKnown = isKnownResponse(prospect, questionnaireResponse);
        if (responseAlreadyKnown && needsKnownResponseStatusRepair(prospect, questionnaireResponse)) {
          repairKnownResponseStatus(prospect, questionnaireResponse);
          updated += 1;
          return;
        }
        if (responseAlreadyKnown) {
          known += 1;
          return;
        }
        const statutProspect = getProspectStatusAfterResponse(prospect, questionnaireResponse);
        storage.updateProspect(prospect.id, {
          statut: getLegacyProspectStatusLabel(statutProspect),
          statutProspect,
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
      setMessage(elements.relanceConnectionStatus, !endpoint ? UI_MESSAGES.missingAppsScriptUrl : UI_MESSAGES.missingToken, "error");
      return;
    }
    browserStorage.setItem(RELANCE_ENDPOINT_KEY, endpoint);
    browserStorage.setItem(RELANCE_TOKEN_KEY, token);
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
    storage.saveProspectsMailTemplate(type, { objet, corps, subject: objet, body: corps });
    setMessage(inputs.status, UI_MESSAGES.modelSaved, "success");
  }

  function resetTemplate(type) {
    const inputs = getTemplateInputs(type);
    const template = DEFAULT_TEMPLATES[type];
    inputs.subject.value = template.objet;
    inputs.body.value = template.corps;
    storage.saveProspectsMailTemplate(type, {
      objet: template.objet,
      corps: template.corps,
      subject: template.objet,
      body: template.corps,
    });
    setMessage(inputs.status, UI_MESSAGES.modelRestored, "success");
  }

  function toggleTemplateEditor(button) {
    const type = button.dataset.mailEditorToggle;
    const editor = document.querySelector(`[data-mail-editor="${type}"]`);
    const willOpen = editor.hidden;
    editor.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    button.textContent = willOpen ? "Masquer l’édition" : "Éditer le mail";
  }

  function buildRelanceMessage(prospect) {
    const template = getTemplates().relance;
    const formUrl = storage.getProspectsFormUrl();
    return {
      objet: remplaceVariables(template.objet, prospect, formUrl),
      corps: remplaceVariables(template.corps, prospect, formUrl),
    };
  }

  function getRelanceConfiguration() {
    const endpoint = validateAppsScriptUrl(
      browserStorage.getItem(RELANCE_ENDPOINT_KEY)
      || storage.getProspectsMailEndpoint(),
    );
    const token = String(
      browserStorage.getItem(RELANCE_TOKEN_KEY)
      || storage.getProspectsMailToken(),
    ).trim();
    const formUrl = validateHttpsUrl(storage.getProspectsFormUrl());
    if (!formUrl) throw new Error("Enregistrez d’abord l’URL Google Forms prospects.");
    if (!endpoint) throw new Error(UI_MESSAGES.missingAppsScriptUrl);
    if (!token) throw new Error(UI_MESSAGES.missingToken);
    return { endpoint, token };
  }

  async function sendRelance(prospect) {
    const email = getProspectEmail(prospect);
    if (!email) throw new Error("L’email du prospect est manquant.");
    if (prospect.questionnaireEnvoye !== true) throw new Error("Le questionnaire n’a pas encore été envoyé à ce prospect.");
    if (prospect.questionnaireRepondu === true) throw new Error("Ce prospect a déjà répondu au questionnaire.");
    if (!isProspectToRelance(prospect)) throw new Error("Ce prospect n’est pas encore éligible à une relance.");
    const { endpoint, token } = getRelanceConfiguration();
    const message = buildRelanceMessage(prospect);
    return sendProspectMail(endpoint, token, "sendRelance", email, message);
  }

  function markRelanceSent(prospect) {
    const now = new Date().toISOString();
    return storage.updateProspect(prospect.id, {
      relanceEnvoyee: true,
      relanceEnvoyeeLe: now,
      lastRelanceAt: now,
      relanceCount: (Number(prospect.relanceCount) || 0) + 1,
      relanceStatus: "envoyée",
      statut: "à relancer",
      statutProspect: "a-relancer",
    });
  }

  function hideRelanceConfirmation() {
    pendingRelancePlan = null;
    elements.relanceConfirmation.hidden = true;
    elements.relanceConfirmationList.textContent = "";
  }

  function previewRelanceSend() {
    const plan = getRelancePlan();
    pendingRelancePlan = {
      prospectIds: plan.eligible.map((prospect) => prospect.id),
      ignoredEmail: plan.ignoredEmail,
      ignoredDate: plan.ignoredDate,
    };
    elements.relanceConfirmationList.textContent = "";
    plan.eligible.forEach((prospect) => {
      const item = document.createElement("li");
      item.textContent = `${getProspectDisplayName(prospect)} / ${getProspectEmail(prospect)}`;
      elements.relanceConfirmationList.append(item);
    });

    if (!plan.eligible.length) {
      hideRelanceConfirmation();
      setMessage(
        elements.relanceStatus,
        `Aucun prospect ne peut être relancé pour le moment. ${plan.ignoredEmail} prospect(s) ignoré(s) car email manquant. ${plan.ignoredDate} prospect(s) ignoré(s) car date d’envoi absente.`,
        "warning",
      );
      return;
    }
    elements.relanceConfirmationSummary.textContent = `Vous allez envoyer ${plan.eligible.length} relance(s) :`;
    elements.confirmRelances.textContent = `Préparer ${plan.eligible.length} relance(s) ?`;
    elements.relanceConfirmation.hidden = false;
    setMessage(elements.relanceStatus, "Vérifiez la liste avant de confirmer l’envoi des relances.", "warning");
  }

  async function sendRelances() {
    if (!pendingRelancePlan?.prospectIds.length) return;
    const plan = pendingRelancePlan;
    hideRelanceConfirmation();
    try {
      getRelanceConfiguration();
    } catch (error) {
      setMessage(elements.relanceStatus, error.message, "warning");
      return;
    }

    elements.createRelances.disabled = true;
    elements.confirmRelances.disabled = true;
    let sent = 0;
    const errors = [];
    const total = plan.prospectIds.length;
    for (let index = 0; index < plan.prospectIds.length; index += 1) {
      const prospect = storage.getProspectById(plan.prospectIds[index]);
      if (!prospect || !isProspectToRelance(prospect)) {
        errors.push("Prospect devenu inéligible avant l’envoi");
        continue;
      }
      try {
        await sendRelance(prospect);
        markRelanceSent(prospect);
        sent += 1;
        setMessage(elements.relanceStatus, `Relance envoyée à ${getProspectEmail(prospect)} (${index + 1}/${total})`, "loading");
      } catch (error) {
        errors.push(`${getProspectDisplayName(prospect)} : ${error.message}`);
      }
    }

    const details = [
      `${sent} relance(s) envoyée(s).`,
      `${plan.ignoredEmail} prospect(s) ignoré(s) car email manquant.`,
      `${plan.ignoredDate} prospect(s) ignoré(s) car date d’envoi absente.`,
      `${errors.length} erreur(s).`,
    ];
    if (errors.length) details.push(`Détails : ${errors.join(" | ")}`);
    setMessage(elements.relanceStatus, details.join(" "), errors.length ? "warning" : "success");
    elements.confirmRelances.disabled = false;
    renderProspects();
  }

  function initializeConfiguration() {
    elements.formUrl.value = storage.getProspectsFormUrl();
    const storedMailEndpoint = storage.getProspectsMailEndpoint();
    const storedMailToken = storage.getProspectsMailToken();
    const legacyMailEndpoint = browserStorage.getItem("redacImrad.prospects.questionnaireSend.endpoint") || "";
    const legacyMailToken = browserStorage.getItem("redacImrad.prospects.questionnaireSend.token") || "";
    elements.mailEndpoint.value = storedMailEndpoint || legacyMailEndpoint;
    elements.mailToken.value = storedMailToken || legacyMailToken;
    if (!storedMailEndpoint && validateAppsScriptUrl(legacyMailEndpoint)) storage.saveProspectsMailEndpoint(validateAppsScriptUrl(legacyMailEndpoint));
    if (!storedMailToken && legacyMailToken.trim()) storage.saveProspectsMailToken(legacyMailToken.trim());
    const storedResponsesEndpoint = storage.getProspectsResponsesEndpoint();
    const storedResponsesToken = storage.getProspectsResponsesToken();
    const legacyResponsesEndpoint = browserStorage.getItem(RESPONSES_ENDPOINT_KEY) || "";
    const legacyResponsesToken = browserStorage.getItem(RESPONSES_TOKEN_KEY) || "";
    elements.responsesEndpoint.value = storedResponsesEndpoint || legacyResponsesEndpoint;
    elements.responsesToken.value = storedResponsesToken || legacyResponsesToken;
    if (!storedResponsesEndpoint && validateAppsScriptUrl(legacyResponsesEndpoint)) {
      storage.saveProspectsResponsesEndpoint(validateAppsScriptUrl(legacyResponsesEndpoint));
    }
    if (!storedResponsesToken && legacyResponsesToken.trim()) storage.saveProspectsResponsesToken(legacyResponsesToken.trim());
    elements.relanceEndpoint.value = browserStorage.getItem(RELANCE_ENDPOINT_KEY) || storedMailEndpoint || "";
    elements.relanceToken.value = browserStorage.getItem(RELANCE_TOKEN_KEY) || storedMailToken || "";
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
  elements.archivesList?.addEventListener("click", handleProspectAction);
  elements.archivesToggle?.addEventListener("click", () => {
    archivesVisible = !archivesVisible;
    renderProspectArchives();
  });
  elements.prepareAll.addEventListener("click", sendAllQuestionnaires);
  elements.createRelances.addEventListener("click", previewRelanceSend);
  elements.confirmRelances.addEventListener("click", sendRelances);
  elements.cancelRelances.addEventListener("click", () => {
    hideRelanceConfirmation();
    setMessage(elements.relanceStatus, "Envoi des relances annulé.", "warning");
  });
  elements.saveFormUrl.addEventListener("click", saveFormsUrl);
  elements.saveMailConnection.addEventListener("click", saveMailConnection);
  elements.saveResponsesConnection.addEventListener("click", saveResponsesConnection);
  elements.checkResponses.addEventListener("click", checkProspectResponses);
  elements.saveRelanceConnection.addEventListener("click", saveRelanceConnection);

  initializeConfiguration();
  renderProspects();

  global.ProspectRelances = Object.freeze({
    isProspectToRelance,
    getRelancePlan,
    remplaceVariables,
    buildRelanceMessage,
    sendRelance,
  });
})(window);
