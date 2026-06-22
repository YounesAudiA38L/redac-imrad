(function initializeK4Deliverables(global) {
  const ENDPOINT_KEY = "redacImrad.k4Deliverables.endpoint";
  const VALID_STATUSES = new Set(["à générer", "généré", "brouillon créé", "envoyé", "erreur"]);
  const DEFINITIONS = {
    fiche_cadrage_sujet: "Fiche de cadrage du sujet",
    trame_question_recherche: "Trame de question de recherche",
    liste_mots_cles: "Liste de mots-clés prête à utiliser",
    planning_k4: "Planning K4 personnalisé",
    feuille_route_k5: "Mini-feuille de route pour entrer en K5",
  };

  const endpointInput = document.querySelector("#k4-livrables-endpoint");
  const saveEndpointButton = document.querySelector("#save-k4-livrables-endpoint");
  const globalStatus = document.querySelector("#k4-livrables-global-status");
  const k4PageContainer = document.querySelector('[data-parcours-students="k4"]');

  function createDefaultLivrable(name) {
    return {
      nom: name,
      statut: "à générer",
      selected: false,
      docUrl: "",
      pdfUrl: "",
      lastGeneratedAt: "",
      lastDraftCreatedAt: "",
    };
  }

  function getLivrablesK4() {
    return Object.fromEntries(
      Object.entries(DEFINITIONS).map(([id, name]) => [id, createDefaultLivrable(name)]),
    );
  }

  function normalizeLivrables(existing) {
    const defaults = getLivrablesK4();
    Object.keys(defaults).forEach((id) => {
      defaults[id] = {
        ...defaults[id],
        ...(existing?.[id] || {}),
        nom: DEFINITIONS[id],
        statut: VALID_STATUSES.has(existing?.[id]?.statut) ? existing[id].statut : "à générer",
        selected: Boolean(existing?.[id]?.selected),
      };
    });
    return defaults;
  }

  function getEndpoint() {
    return localStorage.getItem(ENDPOINT_KEY) || "";
  }

  function saveEndpoint(url) {
    const parsed = new URL(String(url || "").trim());
    if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" || !parsed.pathname.includes("/macros/")) {
      throw new Error("Utilisez l’URL HTTPS du déploiement Apps Script des livrables K4.");
    }
    localStorage.setItem(ENDPOINT_KEY, parsed.toString());
    return parsed.toString();
  }

  function setGlobalStatus(message, type = "neutral") {
    if (!globalStatus) return;
    globalStatus.textContent = message;
    globalStatus.dataset.statusType = type;
    globalStatus.hidden = false;
  }

  function getStudent(studentId) {
    const student = global.RedacStorage.getStudentById(studentId);
    return student?.parcours === "k4" ? student : null;
  }

  function ensureStudentLivrables(student) {
    const normalized = normalizeLivrables(student.livrablesK4);
    if (!student.livrablesK4 || JSON.stringify(student.livrablesK4) !== JSON.stringify(normalized)) {
      return global.RedacStorage.updateStudent(student.id, { livrablesK4: normalized });
    }
    return student;
  }

  function findStudentCard(studentId) {
    return Array.from(document.querySelectorAll("[data-student-id]")).find((card) => card.dataset.studentId === studentId) || null;
  }

  function getCardStatus(studentId) {
    return findStudentCard(studentId)?.querySelector("[data-k4-livrables-status]") || null;
  }

  function setCardStatus(studentId, message, type = "neutral") {
    const status = getCardStatus(studentId);
    if (!status) return;
    status.textContent = message;
    status.dataset.statusType = type;
    status.hidden = false;
  }

  function getSelectedLivrablesK4(studentId) {
    const student = getStudent(studentId);
    if (!student) return [];
    const livrables = normalizeLivrables(student.livrablesK4);
    return Object.entries(livrables).filter(([, item]) => item.selected).map(([id]) => id);
  }

  function updateStudentLivrables(studentId, updater) {
    const student = getStudent(studentId);
    if (!student) return null;
    const livrablesK4 = normalizeLivrables(student.livrablesK4);
    updater(livrablesK4);
    return global.RedacStorage.updateStudent(studentId, { livrablesK4 });
  }

  function updateLivrableK4Status(studentId, livrableId, status) {
    if (!VALID_STATUSES.has(status) || !DEFINITIONS[livrableId]) return null;
    const updated = updateStudentLivrables(studentId, (livrables) => {
      livrables[livrableId].statut = status;
    });
    if (updated) renderLivrablesK4Selector(updated);
    return updated?.livrablesK4?.[livrableId] || null;
  }

  function saveGeneratedK4LivrableLinks(studentId, result) {
    const now = new Date().toISOString();
    const updated = updateStudentLivrables(studentId, (livrables) => {
      (result.documents || []).forEach((documentResult) => {
        const id = documentResult.livrableId;
        if (!livrables[id]) return;
        const returnedStatus = VALID_STATUSES.has(documentResult.statut) ? documentResult.statut : null;
        livrables[id].statut = returnedStatus || (result.draftCreated ? "brouillon créé" : "généré");
        livrables[id].docUrl = documentResult.docUrl || livrables[id].docUrl;
        livrables[id].pdfUrl = documentResult.pdfUrl || livrables[id].pdfUrl;
        livrables[id].lastGeneratedAt = now;
        if (result.draftCreated) livrables[id].lastDraftCreatedAt = now;
      });
    });

    if (updated) {
      global.RedacStorage.updateStudent(studentId, { livrablesK4FolderUrl: result.folderUrl || "" });
      renderLivrablesK4Selector(global.RedacStorage.getStudentById(studentId));
    }
    return updated;
  }

  function buildPayload(student, selectedLivrables) {
    const data = student.donneesParcours || {};
    return {
      studentId: student.id,
      prenom: student.prenom,
      nom: student.nom,
      email: student.email,
      ifmk: student.ifmk,
      date: new Date().toISOString().slice(0, 10),
      dateDebut: student.dateDebut,
      parcours: student.parcours,
      thematiqueMemoire: student.thematiqueMemoire,
      sujetActuel: data.sujetActuel || "",
      questionRecherche: data.questionRecherche || "",
      methodeEnvisagee: data.choixMethode || "",
      selectedLivrables,
    };
  }

  async function createK4DraftWithSelectedLivrables(studentId) {
    const student = getStudent(studentId);
    const selectedLivrables = getSelectedLivrablesK4(studentId);
    if (!student) return null;
    if (selectedLivrables.length === 0) {
      setCardStatus(studentId, "Sélectionnez au moins un document à envoyer.", "warning");
      return null;
    }

    const endpoint = getEndpoint();
    if (!endpoint) {
      setCardStatus(studentId, "Enregistrez d’abord l’URL Apps Script livrables K4.", "warning");
      return null;
    }

    setCardStatus(studentId, "Création du brouillon mail en cours. Aucun envoi n’est effectué automatiquement.", "loading");
    const buttons = findStudentCard(studentId)?.querySelectorAll(".student-k4-deliverable-actions button") || [];
    buttons.forEach((button) => { button.disabled = true; });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" },
        body: JSON.stringify(buildPayload(student, selectedLivrables)),
      });
      if (!response.ok) throw new Error(`La connexion a répondu avec le statut ${response.status}.`);
      const result = await response.json();
      if (result.success !== true || result.studentId !== studentId || !Array.isArray(result.documents)) {
        throw new Error("La réponse Apps Script ne respecte pas le format attendu.");
      }
      saveGeneratedK4LivrableLinks(studentId, result);
      setCardStatus(studentId, `${result.message || "Brouillon mail créé."} À vérifier par Audrey.`, "success");
      return result;
    } catch (error) {
      updateStudentLivrables(studentId, (livrables) => {
        selectedLivrables.forEach((id) => { livrables[id].statut = "erreur"; });
      });
      renderLivrablesK4Selector(global.RedacStorage.getStudentById(studentId));
      setCardStatus(studentId, `La création du brouillon a échoué : ${error.message}`, "error");
      return null;
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  function isSafeDocumentUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }

  function createDocumentLink(label, url) {
    const link = document.createElement("a");
    link.className = "k4-document-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
  }

  function setLivrableSelected(studentId, livrableId, selected) {
    return updateStudentLivrables(studentId, (livrables) => {
      livrables[livrableId].selected = selected;
    });
  }

  function markSelectedAsSent(studentId) {
    const selected = getSelectedLivrablesK4(studentId);
    if (selected.length === 0) {
      setCardStatus(studentId, "Sélectionnez au moins un document avant de le marquer comme envoyé.", "warning");
      return;
    }
    const updated = updateStudentLivrables(studentId, (livrables) => {
      selected.forEach((id) => { livrables[id].statut = "envoyé"; });
    });
    renderLivrablesK4Selector(updated);
    setCardStatus(studentId, "Les documents sélectionnés sont marqués comme envoyés.", "success");
  }

  function renderLivrablesK4Selector(student) {
    if (!student || student.parcours !== "k4") return;
    student = ensureStudentLivrables(student);
    const card = findStudentCard(student.id);
    if (!card) return;
    const grid = card.querySelector(".student-card-grid");
    if (!grid) return;
    card.querySelector(".student-livrables-panel")?.remove();
    card.querySelector(".student-k4-deliverable-actions")?.remove();
    card.querySelector(".k4-livrables-status")?.remove();

    const section = document.createElement("section");
    section.className = "student-livrables-panel";
    const title = document.createElement("h4"); title.textContent = "Livrables K4";
    const subtitle = document.createElement("p"); subtitle.textContent = "Sélectionner les documents à préparer pour cet étudiant.";
    const list = document.createElement("div"); list.className = "livrables-list";

    Object.entries(student.livrablesK4).forEach(([id, livrable]) => {
      const row = document.createElement("div"); row.className = "livrable-row";
      const selection = document.createElement("label"); selection.className = "livrable-k4-selection";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = livrable.selected;
      const name = document.createElement("span"); name.textContent = livrable.nom;
      checkbox.addEventListener("change", () => {
        setLivrableSelected(student.id, id, checkbox.checked);
        draftButton.disabled = getSelectedLivrablesK4(student.id).length === 0;
      });
      selection.append(checkbox, name);

      const metadata = document.createElement("div"); metadata.className = "livrable-k4-metadata";
      const status = document.createElement("span"); status.className = "livrable-status"; status.dataset.livrableStatus = livrable.statut; status.textContent = livrable.statut;
      metadata.append(status);
      if (isSafeDocumentUrl(livrable.docUrl)) metadata.append(createDocumentLink("Google Doc", livrable.docUrl));
      if (isSafeDocumentUrl(livrable.pdfUrl)) metadata.append(createDocumentLink("PDF", livrable.pdfUrl));
      if (livrable.lastGeneratedAt) {
        const date = document.createElement("small"); date.textContent = `Dernière génération : ${formatDate(livrable.lastGeneratedAt)}`; metadata.append(date);
      }
      row.append(selection, metadata);
      list.append(row);
    });

    const actions = document.createElement("div"); actions.className = "student-k4-deliverable-actions";
    const draftButton = document.createElement("button"); draftButton.className = "primary-action"; draftButton.type = "button"; draftButton.textContent = "Créer le brouillon mail avec les documents sélectionnés"; draftButton.disabled = getSelectedLivrablesK4(student.id).length === 0; draftButton.addEventListener("click", () => createK4DraftWithSelectedLivrables(student.id));
    const sentButton = document.createElement("button"); sentButton.className = "secondary-action"; sentButton.type = "button"; sentButton.textContent = "Marquer comme envoyé"; sentButton.addEventListener("click", () => markSelectedAsSent(student.id));
    actions.append(draftButton, sentButton);
    const message = document.createElement("p"); message.className = "form-message k4-livrables-status"; message.dataset.k4LivrablesStatus = ""; message.hidden = true;
    section.append(title, subtitle, list);
    grid.append(section);
    card.append(actions, message);
  }

  function renderAllK4Selectors() {
    if (!k4PageContainer) return;
    global.RedacStorage.getStudentsByParcours("k4").forEach(renderLivrablesK4Selector);
  }

  if (endpointInput) endpointInput.value = getEndpoint();
  saveEndpointButton?.addEventListener("click", () => {
    try {
      endpointInput.value = saveEndpoint(endpointInput.value);
      setGlobalStatus("L’URL Apps Script livrables K4 a été enregistrée.", "success");
    } catch (error) {
      setGlobalStatus(error.message, "error");
    }
  });

  if (k4PageContainer) {
    renderAllK4Selectors();
    global.addEventListener("redac:parcours-rendered", (event) => {
      if (event.detail?.parcours === "k4") renderAllK4Selectors();
    });
  }

  global.LivrablesK4 = Object.freeze({
    getLivrablesK4,
    renderLivrablesK4Selector,
    getSelectedLivrablesK4,
    createK4DraftWithSelectedLivrables,
    updateLivrableK4Status,
    saveGeneratedK4LivrableLinks,
  });
})(window);
