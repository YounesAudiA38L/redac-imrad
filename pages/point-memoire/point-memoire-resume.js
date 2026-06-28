(function initializePointMemoireResume(global) {
  const browserStorage = global.RedacServices.browserStorage;
  const ENDPOINT_KEY = "redacImrad.pointMemoireResume.endpoint";
  const TOKEN_KEY = "redacImrad.pointMemoireResume.token";
  const UI_MESSAGES = Object.freeze({
    documentGenerated: "Document généré dans Drive. Tu peux le modifier avant d'envoyer le brouillon.",
    draftPrepared: "Brouillon préparé dans Gmail. À vérifier et envoyer par Audrey.",
    missingAppsScriptUrl: "L'URL Apps Script n'est pas configurée. Rends-toi dans les paramètres pour la renseigner.",
    missingToken: "Le token de connexion est manquant. Vérifie la configuration dans les paramètres.",
  });
  const EMPTY_RESUME = Object.freeze({
    dateVisio: "",
    annee: "",
    sujet: "",
    questionRecherche: "",
    methode: "",
    niveauAvancement: "",
    pointsSolides: "",
    pointsATravailler: "",
    pointsVigilance: "",
    priorite1: "",
    priorite2: "",
    priorite3: "",
    pourAllerPlusLoin: "",
    docUrl: "",
    folderUrl: "",
    draftId: "",
    draftCreatedAt: "",
    statut: "",
  });

  const studentSelect = document.querySelector("#point-resume-student");
  const endpointInput = document.querySelector("#point-resume-endpoint");
  const tokenInput = document.querySelector("#point-resume-token");
  const saveEndpointButton = document.querySelector("#save-point-resume-endpoint");
  const configStatus = document.querySelector("#point-resume-config-status");
  const form = document.querySelector("#point-resume-form");
  const fieldset = form?.querySelector("fieldset");
  const saveButton = document.querySelector("#save-point-resume");
  const generateButton = document.querySelector("#generate-point-resume-doc");
  const draftButton = document.querySelector("#create-point-resume-draft");
  const resultPanel = document.querySelector("#point-resume-result");
  const statusElement = document.querySelector("#point-resume-status");
  const messageElement = document.querySelector("#point-resume-message");
  const documentLink = document.querySelector("#open-point-resume-document");

  if (!studentSelect || !form || !global.RedacServices.appData) return;

  function normalizeResume(resume) {
    return { ...EMPTY_RESUME, ...(resume && typeof resume === "object" ? resume : {}) };
  }

  function getEndpoint() {
    return global.RedacServices.appData.getEffectiveSettings?.().pointMemoire.appsScriptUrl || browserStorage.getItem(ENDPOINT_KEY) || "";
  }

  function getToken() {
    const savedToken = global.RedacServices.appData.getEffectiveSettings?.().pointMemoire.token || browserStorage.getItem(TOKEN_KEY);
    if (savedToken) return savedToken;
    try {
      return new URL(getEndpoint()).searchParams.get("token") || "";
    } catch {
      return "";
    }
  }

  function saveEndpoint(url) {
    const trimmedUrl = String(url || "").trim();
    if (!trimmedUrl) {
      browserStorage.removeItem(ENDPOINT_KEY);
      return "";
    }

    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "script.google.com" || !parsedUrl.pathname.includes("/macros/")) {
      throw new Error("Utilisez l’URL HTTPS du déploiement Apps Script.");
    }
    const tokenFromUrl = parsedUrl.searchParams.get("token");
    if (tokenFromUrl) browserStorage.setItem(TOKEN_KEY, tokenFromUrl);
    parsedUrl.search = "";
    browserStorage.setItem(ENDPOINT_KEY, parsedUrl.toString());
    return parsedUrl.toString();
  }

  function saveToken(token) {
    const trimmedToken = String(token || "").trim();
    if (!trimmedToken) {
      browserStorage.removeItem(TOKEN_KEY);
      return "";
    }
    browserStorage.setItem(TOKEN_KEY, trimmedToken);
    return trimmedToken;
  }

  function getSelectedStudent() {
    return global.RedacServices.appData.getStudentById(studentSelect.value);
  }

  function readForm() {
    const values = new FormData(form);
    const current = normalizeResume(getSelectedStudent()?.pointMemoireResume);
    const resume = { ...current };
    Object.keys(EMPTY_RESUME).forEach((key) => {
      if (values.has(key)) resume[key] = String(values.get(key) || "").trim();
    });
    return resume;
  }

  function fillForm(resume) {
    const normalized = normalizeResume(resume);
    Object.entries(normalized).forEach(([key, value]) => {
      const control = form.elements.namedItem(key);
      if (control) control.value = value;
    });
  }

  function isSafeDocumentUrl(url) {
    if (!url) return false;
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }

  function renderResult(resume, message = "") {
    const normalized = normalizeResume(resume);
    const hasResult = Boolean(normalized.statut || normalized.docUrl || message);
    resultPanel.hidden = !hasResult;
    statusElement.textContent = normalized.statut || "Fiche résumé";
    messageElement.textContent = message || (normalized.draftCreatedAt ? UI_MESSAGES.draftPrepared : "");
    messageElement.hidden = !messageElement.textContent;
    documentLink.hidden = !isSafeDocumentUrl(normalized.docUrl);
    if (!documentLink.hidden) documentLink.href = normalized.docUrl;
  }

  function setControlsEnabled(enabled) {
    fieldset.disabled = !enabled;
    saveButton.disabled = !enabled;
    generateButton.disabled = !enabled;
    draftButton.disabled = !enabled;
  }

  function setConfigStatus(message, type) {
    configStatus.textContent = message;
    configStatus.dataset.statusType = type;
    configStatus.hidden = false;
  }

  function populateStudents() {
    const selectedId = studentSelect.value;
    const students = global.RedacServices.appData.getStudentsByParcours("point-memoire");
    studentSelect.replaceChildren(new Option("Sélectionner un étudiant", ""));
    students.forEach((student) => {
      const name = `${student.prenom} ${student.nom}`.trim() || "Étudiant sans nom";
      studentSelect.append(new Option(name, student.id));
    });
    if (students.some((student) => student.id === selectedId)) studentSelect.value = selectedId;
  }

  function loadSelectedStudent() {
    const student = getSelectedStudent();
    setControlsEnabled(Boolean(student));
    fillForm(student?.pointMemoireResume);
    renderResult(student?.pointMemoireResume);
  }

  function saveResume(options = {}) {
    const student = getSelectedStudent();
    if (!student) return null;
    const resume = { ...readForm(), ...options };
    global.RedacServices.appData.updateStudent(student.id, { pointMemoireResume: resume });
    fillForm(resume);
    renderResult(resume, options.message || "Fiche résumé enregistrée localement.");
    return resume;
  }

  function buildPayload(student, resume, token) {
    return {
      token,
      studentId: student.id,
      prenom: student.prenom,
      nom: student.nom,
      email: student.email,
      ifmk: student.ifmk,
      dateVisio: resume.dateVisio,
      annee: resume.annee,
      sujet: resume.sujet,
      questionRecherche: resume.questionRecherche,
      methode: resume.methode,
      niveauAvancement: resume.niveauAvancement,
      pointsSolides: resume.pointsSolides,
      pointsATravailler: resume.pointsATravailler,
      pointsVigilance: resume.pointsVigilance,
      priorite1: resume.priorite1,
      priorite2: resume.priorite2,
      priorite3: resume.priorite3,
      pourAllerPlusLoin: resume.pourAllerPlusLoin,
    };
  }

  function buildRequestUrl(appsScriptUrl, token, payload) {
    const endpoint = new URL(appsScriptUrl);
    endpoint.search = "";
    return `${endpoint.toString()}?action=generatePointMemoire&token=${encodeURIComponent(token)}&payload=${encodeURIComponent(JSON.stringify(payload))}`;
  }

  function setLoading(loading, message = "") {
    [saveButton, generateButton, draftButton].forEach((button) => { button.disabled = loading; });
    if (message) renderResult(readForm(), message);
  }

  async function sendToAppsScript() {
    const student = getSelectedStudent();
    if (!student) return;

    const endpoint = getEndpoint();
    if (!endpoint) {
      renderResult(readForm(), UI_MESSAGES.missingAppsScriptUrl);
      return;
    }

    const token = getToken();
    if (!token) {
      renderResult(readForm(), UI_MESSAGES.missingToken);
      return;
    }

    const resume = saveResume();
    const payload = buildPayload(student, resume, token);
    const url = buildRequestUrl(endpoint, token, payload);
    setLoading(true, "Génération de la fiche résumé et création du brouillon mail en cours.");

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.success === false) {
        renderResult(resume, data.error || "Le script Apps Script a signalé une erreur.");
        return;
      }
      if (!response.ok) throw new Error(`La connexion a répondu avec le statut ${response.status}.`);
      if (data.success !== true || !data.docUrl || data.draftCreated !== true) {
        throw new Error("La réponse Apps Script ne respecte pas le format attendu.");
      }

      const updatedResume = saveResume({
        docUrl: data.docUrl,
        folderUrl: data.folderUrl || "",
        draftId: data.draftId || "",
        draftCreatedAt: new Date().toISOString(),
        statut: data.statut || "brouillon mail créé",
      });
      renderResult(updatedResume, UI_MESSAGES.documentGenerated);
    } catch (error) {
      renderResult(resume, `La préparation a échoué : ${error.message}`);
    } finally {
      setControlsEnabled(true);
    }
  }

  endpointInput.value = getEndpoint();
  tokenInput.value = getToken();
  populateStudents();
  loadSelectedStudent();

  studentSelect.addEventListener("change", loadSelectedStudent);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveResume();
  });
  saveEndpointButton.addEventListener("click", () => {
    try {
      endpointInput.value = saveEndpoint(endpointInput.value);
      tokenInput.value = saveToken(tokenInput.value || getToken());
      setConfigStatus("L’URL Apps Script a été enregistrée.", "success");
    } catch (error) {
      setConfigStatus(error.message, "error");
    }
  });
  generateButton.addEventListener("click", sendToAppsScript);
  draftButton.addEventListener("click", sendToAppsScript);
  global.addEventListener("redac:students-changed", () => {
    populateStudents();
    loadSelectedStudent();
  });
})(window);
