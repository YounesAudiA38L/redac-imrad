(function initializeProspectRelances(global) {
  const ENDPOINT_KEY = "redacImrad.prospects.relanceEndpoint";
  const TOKEN_KEY = "redacImrad.prospects.relanceToken";
  const endpointInput = document.querySelector("#prospect-relance-endpoint");
  const tokenInput = document.querySelector("#prospect-relance-token");
  const saveConfigButton = document.querySelector("#save-prospect-relance-config");
  const configStatus = document.querySelector("#prospect-relance-config-status");
  const form = document.querySelector("#prospect-relance-form");
  const createButton = document.querySelector("#create-prospect-relance-drafts");
  const relanceStatus = document.querySelector("#prospect-relance-status");
  const relanceCount = document.querySelector("#prospect-relance-count");
  const totalCount = document.querySelector("#prospect-total-count");
  if (!form || !global.RedacStorage) return;

  function isProspectToRelance(prospect) {
    const status = String(prospect.statut || "").trim().toLocaleLowerCase("fr-FR");
    return prospect.questionnaireEnvoye === true
      && prospect.questionnaireRepondu !== true
      && status !== "converti en étudiant"
      && status !== "archivé";
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
    return eligible;
  }

  function setMessage(element, message, type) {
    element.textContent = message;
    element.dataset.statusType = type;
    element.hidden = false;
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
        });
        createdCount += 1;
      });
      renderCounts();
      setMessage(relanceStatus, `${createdCount} brouillon(s) de relance créé(s). À vérifier par Audrey avant envoi.`, "success");
    } catch (error) {
      setMessage(relanceStatus, `La création des brouillons a échoué : ${error.message}`, "error");
    } finally {
      renderCounts();
    }
  }

  endpointInput.value = localStorage.getItem(ENDPOINT_KEY) || "";
  tokenInput.value = localStorage.getItem(TOKEN_KEY) || "";
  saveConfigButton.addEventListener("click", () => {
    try { saveConfiguration(); } catch (error) { setMessage(configStatus, error.message, "error"); }
  });
  form.addEventListener("submit", createRelanceDrafts);
  renderCounts();

  global.ProspectRelances = Object.freeze({
    isProspectToRelance,
    getProspectsToRelance,
    replaceVariables,
    buildPayload,
  });
})(window);
