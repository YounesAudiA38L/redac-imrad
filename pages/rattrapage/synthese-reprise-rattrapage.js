(function initializeSyntheseRepriseRattrapage(global) {
  const services = global.RedacServices?.appData;
  if (!services) return;

  const UI_MESSAGES = Object.freeze({
    noStudentSelected: "Aucun étudiant sélectionné. Choisis un étudiant Rattrapage avant de continuer.",
    missingAppsScriptUrl: "L’URL Apps Script n’est pas configurée. Vérifie la configuration Rattrapage.",
    missingToken: "Le token de connexion est manquant. Vérifie la configuration Rattrapage.",
    missingTemplateId: "L’ID du template Synthèse de reprise Rattrapage est manquant.",
    missingFolderId: "L’ID du dossier Drive Étudiants est manquant.",
    documentNotGenerated: "Le document n’a pas pu être généré. Vérifie la configuration Apps Script.",
    documentGenerated: "Document généré dans Drive. Tu peux le modifier avant d’envoyer le brouillon.",
  });
  const EMPTY_SYNTHESIS_DATA = Object.freeze({
    correctionsFaites: "",
    correctionsRestantes: "",
    messageJury: "",
    pointsForts: "",
    pointsVigilance: "",
    priorite1: "",
    priorite2: "",
    priorite3: "",
    notesGlobales: "",
  });
  const EMPTY_SYNTHESIS = Object.freeze({
    templateId: "",
    documentId: "",
    documentUrl: "",
    folderUrl: "",
    genereLe: "",
    statut: "",
    dernierErreur: "",
    donnees: EMPTY_SYNTHESIS_DATA,
    updatedAt: "",
  });

  const elements = {
    templateId: document.querySelector("#rattrapage-synthese-template-id"),
    folderId: document.querySelector("#rattrapage-synthese-folder-id"),
    saveConfig: document.querySelector("#save-rattrapage-synthese-config"),
    configStatus: document.querySelector("#rattrapage-synthese-config-status"),
    studentSelect: document.querySelector("[data-rattrapage-synthese-student-select]"),
    fields: Array.from(document.querySelectorAll("[data-synthese-field]")),
    saveData: document.querySelector("#save-rattrapage-synthese-data"),
    generate: document.querySelector("#generate-rattrapage-synthese-drive"),
    status: document.querySelector("[data-rattrapage-synthese-status]"),
    message: document.querySelector("[data-rattrapage-synthese-message]"),
    documentLink: document.querySelector("[data-rattrapage-synthese-document-link]"),
  };
  if (!elements.studentSelect || !elements.templateId || !elements.folderId) return;

  function setMessage(element, message, type = "neutral") {
    if (!element) return;
    element.textContent = message;
    element.dataset.statusType = type;
    element.hidden = !message;
  }

  function setResultMessage(message, type = "neutral") {
    setMessage(elements.message, message, type);
  }

  function isSafeDocumentUrl(url) {
    if (!url) return false;
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }

  function isValidIsoDate(dateIso) {
    const match = String(dateIso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function formatDateFr(dateIso) {
    const trimmed = String(dateIso || "").trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return isValidIsoDate(trimmed) ? `${match[3]}/${match[2]}/${match[1]}` : "";
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function sanitizeMarkerValue(value) {
    if (Array.isArray(value)) return value.map(sanitizeMarkerValue).filter(Boolean).join("\n");
    return String(value || "").replace(/\r\n/g, "\n").trim();
  }

  function getRattrapageSettings() {
    const settings = services.getRattrapageSettings?.() || services.getEffectiveSettings?.().rattrapage || {};
    return {
      ...settings,
      endpointRattrapage: settings.endpointRattrapage || settings.responsesAppsScriptUrl || "",
      tokenRattrapage: settings.tokenRattrapage || settings.token || "",
      templateSyntheseRepriseId: settings.templateSyntheseRepriseId || "",
      dossierEtudiantsDriveId: settings.dossierEtudiantsDriveId || "",
    };
  }

  function hydrateSyntheseRepriseConfig() {
    const settings = getRattrapageSettings();
    elements.templateId.value = settings.templateSyntheseRepriseId;
    elements.folderId.value = settings.dossierEtudiantsDriveId;
  }

  function saveSyntheseRepriseConfig() {
    const settings = {
      templateSyntheseRepriseId: elements.templateId.value.trim(),
      dossierEtudiantsDriveId: elements.folderId.value.trim(),
    };
    services.saveRattrapageSettings?.(settings);
    setMessage(elements.configStatus, "Configuration de la synthèse de reprise enregistrée.", "success");
    return getRattrapageSettings();
  }

  function getSelectedSyntheseStudent() {
    const student = services.getStudentById(elements.studentSelect.value);
    return student?.parcours === "rattrapage" ? student : null;
  }

  function getSyntheseReprise(student) {
    const existing = student?.donneesParcours?.syntheseRepriseRattrapage;
    const synthese = existing && typeof existing === "object" ? existing : {};
    const data = synthese.donnees && typeof synthese.donnees === "object" ? synthese.donnees : {};
    return {
      ...EMPTY_SYNTHESIS,
      ...synthese,
      donnees: {
        ...EMPTY_SYNTHESIS_DATA,
        ...data,
      },
    };
  }

  function updateSyntheseReprise(student, nextSynthese) {
    return services.updateStudent(student.id, {
      donneesParcours: {
        syntheseRepriseRattrapage: {
          ...getSyntheseReprise(student),
          ...nextSynthese,
          donnees: {
            ...getSyntheseReprise(student).donnees,
            ...(nextSynthese.donnees || {}),
          },
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

  function readSyntheseDataFromForm() {
    return elements.fields.reduce((data, field) => {
      data[field.dataset.syntheseField] = field.value.trim();
      return data;
    }, {});
  }

  function renderSyntheseForm(student) {
    const synthese = getSyntheseReprise(student);
    elements.fields.forEach((field) => {
      field.value = student ? synthese.donnees[field.dataset.syntheseField] || "" : "";
      field.disabled = !student;
    });
    elements.saveData.disabled = !student;
    elements.generate.disabled = !student;
    renderSyntheseRepriseResult(student);
  }

  function saveSyntheseRepriseData(student) {
    if (!student) {
      renderSyntheseRepriseResult(null, UI_MESSAGES.noStudentSelected, "warning");
      return null;
    }
    const updated = updateSyntheseReprise(student, { donnees: readSyntheseDataFromForm() });
    renderSyntheseRepriseResult(updated, "Synthèse enregistrée localement.", "success");
    return updated;
  }

  function buildSyntheseRepriseMarkers(student) {
    const data = student.donneesParcours || {};
    const synthese = getSyntheseReprise(student);
    const questionnaire = data.questionnaireEntreeRattrapage || {};
    const suivi = data.suiviRattrapage || {};
    const today = new Date().toISOString().slice(0, 10);
    const fullName = `${student.prenom || ""} ${student.nom || ""}`.trim();
    return {
      NOM_PRENOM: sanitizeMarkerValue(fullName),
      IFMK: sanitizeMarkerValue(student.ifmk || data.ifmk),
      DATE: formatDateFr(today),
      DATE_RATTRAPAGE: formatDateFr(suivi.dateSession),
      NOTE_INITIALE: sanitizeMarkerValue(questionnaire.noteInitiale),
      CORRECTIONS_FAITES: sanitizeMarkerValue(synthese.donnees.correctionsFaites),
      CORRECTIONS_RESTANTES: sanitizeMarkerValue(synthese.donnees.correctionsRestantes),
      MESSAGE_JURY: sanitizeMarkerValue(synthese.donnees.messageJury),
      POINTS_FORTS: sanitizeMarkerValue(synthese.donnees.pointsForts),
      POINTS_VIGILANCE: sanitizeMarkerValue(synthese.donnees.pointsVigilance),
      PRIORITE_1: sanitizeMarkerValue(synthese.donnees.priorite1),
      PRIORITE_2: sanitizeMarkerValue(synthese.donnees.priorite2),
      PRIORITE_3: sanitizeMarkerValue(synthese.donnees.priorite3),
      NOTES_GLOBALES: sanitizeMarkerValue(synthese.donnees.notesGlobales),
    };
  }

  function buildRequestUrl(endpoint, action, token, payload) {
    const url = new URL(endpoint);
    url.search = "";
    return `${url.toString()}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token)}&payload=${encodeURIComponent(JSON.stringify(payload))}`;
  }

  async function generateSyntheseRepriseDrive(student) {
    if (!student) {
      renderSyntheseRepriseResult(null, UI_MESSAGES.noStudentSelected, "warning");
      return null;
    }
    const settings = getRattrapageSettings();
    if (!settings.endpointRattrapage) return renderSyntheseRepriseResult(student, UI_MESSAGES.missingAppsScriptUrl, "warning");
    if (!settings.tokenRattrapage) return renderSyntheseRepriseResult(student, UI_MESSAGES.missingToken, "warning");
    if (!settings.templateSyntheseRepriseId) return renderSyntheseRepriseResult(student, UI_MESSAGES.missingTemplateId, "warning");
    if (!settings.dossierEtudiantsDriveId) return renderSyntheseRepriseResult(student, UI_MESSAGES.missingFolderId, "warning");

    const savedStudent = saveSyntheseRepriseData(student);
    const freshStudent = savedStudent || services.getStudentById(student.id) || student;
    const payload = {
      action: "generer_synthese_reprise_rattrapage",
      token: settings.tokenRattrapage,
      studentId: freshStudent.id,
      templateId: settings.templateSyntheseRepriseId,
      dossierEtudiantsDriveId: settings.dossierEtudiantsDriveId,
      parcours: "rattrapage",
      typeDocument: "synthese_reprise_rattrapage",
      marqueurs: buildSyntheseRepriseMarkers(freshStudent),
    };
    const requestUrl = buildRequestUrl(settings.endpointRattrapage, "generer_synthese_reprise_rattrapage", settings.tokenRattrapage, payload);
    elements.generate.disabled = true;
    renderSyntheseRepriseResult(freshStudent, "Génération de la synthèse dans Drive en cours.", "loading");

    try {
      const response = await fetch(requestUrl, { cache: "no-store" });
      const result = await response.json();
      if (result.success === false) throw new Error(result.error || UI_MESSAGES.documentNotGenerated);
      if (!response.ok || result.success !== true || !result.documentUrl) throw new Error(UI_MESSAGES.documentNotGenerated);
      const updated = updateSyntheseReprise(freshStudent, {
        templateId: settings.templateSyntheseRepriseId,
        documentId: result.documentId || "",
        documentUrl: result.documentUrl || "",
        folderUrl: result.folderUrl || "",
        genereLe: new Date().toISOString(),
        statut: "genere",
        dernierErreur: "",
      });
      renderSyntheseRepriseResult(updated, UI_MESSAGES.documentGenerated, "success");
      return result;
    } catch (error) {
      const currentStudent = services.getStudentById(freshStudent.id) || freshStudent;
      const updated = updateSyntheseReprise(currentStudent, {
        statut: "erreur",
        dernierErreur: error.message,
      });
      renderSyntheseRepriseResult(updated, error.message, "error");
      return null;
    } finally {
      elements.generate.disabled = !getSelectedSyntheseStudent();
    }
  }

  function renderSyntheseRepriseResult(student, message = "", type = "neutral") {
    if (!student) {
      elements.status.textContent = UI_MESSAGES.noStudentSelected;
      elements.documentLink.hidden = true;
      elements.documentLink.removeAttribute("href");
      setResultMessage(message || "", type);
      return;
    }
    const synthese = getSyntheseReprise(student);
    elements.status.textContent = synthese.statut || "Synthèse à préparer";
    const hasDocument = isSafeDocumentUrl(synthese.documentUrl);
    elements.documentLink.hidden = !hasDocument;
    if (hasDocument) elements.documentLink.href = synthese.documentUrl;
    else elements.documentLink.removeAttribute("href");
    setResultMessage(message || synthese.dernierErreur || "", synthese.dernierErreur ? "error" : type);
  }

  function renderSyntheseStudentSelector(selectedId = elements.studentSelect.value) {
    const students = services.getStudentsByParcours("rattrapage")
      .slice()
      .sort((left, right) => `${left.nom || ""} ${left.prenom || ""}`.localeCompare(`${right.nom || ""} ${right.prenom || ""}`, "fr"));
    elements.studentSelect.replaceChildren(new Option(students.length ? "Choisir un étudiant Rattrapage" : "Aucun étudiant Rattrapage disponible", ""));
    students.forEach((student) => {
      const label = `${student.prenom || ""} ${student.nom || ""}`.trim() || student.email || "Étudiant sans nom";
      elements.studentSelect.append(new Option(label, student.id));
    });
    if (students.some((student) => student.id === selectedId)) elements.studentSelect.value = selectedId;
    elements.studentSelect.disabled = students.length === 0;
    renderSyntheseForm(getSelectedSyntheseStudent());
  }

  hydrateSyntheseRepriseConfig();
  renderSyntheseStudentSelector();
  elements.saveConfig.addEventListener("click", saveSyntheseRepriseConfig);
  elements.studentSelect.addEventListener("change", () => renderSyntheseForm(getSelectedSyntheseStudent()));
  elements.saveData.addEventListener("click", () => saveSyntheseRepriseData(getSelectedSyntheseStudent()));
  elements.generate.addEventListener("click", () => generateSyntheseRepriseDrive(getSelectedSyntheseStudent()));
  global.addEventListener("redac:parcours-rendered", (event) => {
    if (event.detail?.parcours === "rattrapage") renderSyntheseStudentSelector();
  });

  global.SyntheseRepriseRattrapage = Object.freeze({
    getSelectedSyntheseStudent,
    getSyntheseReprise,
    renderSyntheseStudentSelector,
    renderSyntheseForm,
    saveSyntheseRepriseConfig,
    saveSyntheseRepriseData,
    buildSyntheseRepriseMarkers,
    generateSyntheseRepriseDrive,
    renderSyntheseRepriseResult,
    formatDateFr,
    sanitizeMarkerValue,
  });
})(window);
