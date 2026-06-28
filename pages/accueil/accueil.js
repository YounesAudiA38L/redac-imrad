const storage = window.RedacServices.appData;
const browserStorage = window.RedacServices.browserStorage;
const formWorkspace = document.querySelector("#student-form-workspace");
const studentForm = document.querySelector("#student-form");
const formTitle = document.querySelector("#student-form-title");
const formMessage = document.querySelector("#student-form-message");
const saveButton = document.querySelector("#save-student-button");
const addButton = document.querySelector("#add-student-trigger");
const closeButton = document.querySelector("#close-student-form");
const cancelButton = document.querySelector("#cancel-student-form");
const parcoursSelect = document.querySelector("#student-parcours");
const parcoursSections = document.querySelectorAll("[data-parcours-fields]");
const studentList = document.querySelector("#student-list");
const activeCount = document.querySelector("#active-student-count");
const fileInput = document.querySelector("#student-memoire-file");
const fileStatus = document.querySelector("#student-file-status");
const pointAxes = document.querySelector("#student-point-axes");
const filterButtons = document.querySelectorAll("[data-student-filter]");
const statusFilter = document.querySelector("#student-status-filter");
const studentSearchInput = document.querySelector("#student-search");
const quickProspectForm = document.querySelector("#quick-prospect-form");
const quickProspectMessage = document.querySelector("#quick-prospect-message");
const urgentCount = document.querySelector("#urgent-count");
const todoList = document.querySelector("#todo-list");
const deadlinesList = document.querySelector("#deadlines-list");
const notificationsList = document.querySelector("#notifications-list");
const showAllDeadlinesButton = document.querySelector("#show-all-deadlines");
const agendaEmbedInput = document.querySelector("#google-agenda-embed-input");
const saveAgendaButton = document.querySelector("#save-google-agenda");
const agendaMessage = document.querySelector("#google-agenda-message");
const agendaPreview = document.querySelector("#google-agenda-preview");
const appointmentForm = document.querySelector("#google-appointment-form");
const appointmentContactTypeSelect = document.querySelector("#agenda-contact-type");
const appointmentContactSelect = document.querySelector("#agenda-contact");
const appointmentContactLabel = document.querySelector("#agenda-contact-label");
const appointmentTimeSelect = document.querySelector("#agenda-heure-debut");
const appointmentButton = document.querySelector("#prepare-google-appointment");
const appointmentMessage = document.querySelector("#appointment-message");
const calendarEndpointInput = document.querySelector("#calendar-apps-script-endpoint");
const calendarTokenInput = document.querySelector("#calendar-apps-script-token");
const saveCalendarConnectionButton = document.querySelector("#save-calendar-connection");
const calendarConfigMessage = document.querySelector("#calendar-config-message");
const questionnaireStatsList = document.querySelector("#questionnaire-stats-list");
const refreshQuestionnaireStatsButton = document.querySelector("#refresh-questionnaire-stats");
const saveQuestionnaireStatsLinksButton = document.querySelector("#save-questionnaire-stats-links");
const questionnaireStatsMessage = document.querySelector("#questionnaire-stats-message");
const questionnaireStatsInputs = {
  prospects: document.querySelector("#stats-link-prospects"),
  pointMemoire: document.querySelector("#stats-link-point-memoire"),
  k4: document.querySelector("#stats-link-k4"),
  k5: document.querySelector("#stats-link-k5"),
  rattrapage: document.querySelector("#stats-link-rattrapage"),
};
const exportPrivateConfigButton = document.querySelector("#export-private-config");
const importPrivateConfigButton = document.querySelector("#import-private-config");
const privateConfigFileInput = document.querySelector("#private-config-file");
const privateConfigMessage = document.querySelector("#private-config-message");

let currentFilter = "tous";
let currentStatusFilter = "tous";
let currentSearchTerm = "";
let deadlineFilterActive = false;
let editingStudentId = null;
let convertingProspectId = null;

const parcoursLabels = {
  "point-memoire": "Point Mémoire",
  k4: "K4",
  k5: "K5",
  rattrapage: "Rattrapage",
};

const validParcours = new Set(["point-memoire", "k4", "k5", "rattrapage"]);

function normalizeParcours(parcours) {
  const normalized = String(parcours || "").trim().toLocaleLowerCase("fr-FR");
  if (["point-memoire", "point mémoire", "point memoire"].includes(normalized)) return "point-memoire";
  if (validParcours.has(normalized)) return normalized;
  return "";
}

function isValidParcours(parcours) {
  return validParcours.has(normalizeParcours(parcours));
}

const statusValues = ["nouveau", "questionnaire-envoye", "questionnaire-recu", "memoire-importe", "analyse-en-cours", "retour-envoye", "a-relancer", "termine", "archive"];

const pointAxisLabels = {
  "recherche-bibliographique": "Bibliographie",
  "soutenance-jury": "Soutenance",
};

const allowedAgendaPaths = new Set([
  "/calendar/embed",
  "/calendar/u/0/embed",
  "/calendar/u/1/embed",
]);
const CALENDAR_ID = "redac.imrad@gmail.com";
const CALENDAR_ENDPOINT_KEY = "redacImrad.calendar.endpoint";
const CALENDAR_TOKEN_KEY = "redacImrad.calendar.token";
const K4_RESPONSES_ENDPOINT_KEY = "redacImrad.k4Questionnaire.responsesUrl";
const K4_RESPONSES_TOKEN_KEY = "redacImrad.k4Questionnaire.responsesToken";
const POINT_MEMOIRE_RESPONSES_ENDPOINT_KEY = "redacImrad.questionnaires.endpoint";
const UI_MESSAGES = Object.freeze({
  appsScriptNotConfigured: "La connexion à Google n'est pas encore configurée. Renseigne l'URL et le token dans les paramètres.",
  missingToken: "Le token de connexion est manquant. Vérifie la configuration dans les paramètres.",
  noStudentSelected: "Aucun étudiant sélectionné. Choisis un étudiant dans la liste avant de continuer.",
  studentCreated: "Fiche créée. Tu peux maintenant compléter le suivi depuis l'onglet correspondant.",
  studentArchived: "Dossier archivé. Tu peux le retrouver dans les filtres.",
  prospectConverted: "Prospect transformé en étudiant. La fiche a été créée dans l'onglet correspondant.",
  appointmentCreated: "Visio planifiée ajoutée. Le rappel J+5 se déclenchera après la visio.",
  fileImportFailed: "Impossible de lire ce fichier. Vérifie qu'il s'agit bien d'un fichier .docx ou .pdf valide.",
});
const NOTIFICATION_MESSAGE_TEMPLATES = Object.freeze({
  questionnairePending7Days: "[Prénom Nom] n'a pas encore répondu au questionnaire (envoyé le [date]). Penser à relancer ?",
  k4FollowupJ5: "Suivi K4 — [Prénom Nom] — visio du [date]. J+5 : un mail de suivi ?",
  k5FollowupJ5: "Suivi K5 — [Prénom Nom] — visio du [date]. J+5 : un mail de suivi ?",
  rattrapageJ2: "[Prénom Nom] — 2 jours après la première visio rattrapage. Un mail de soutien ?",
  soutenanceJ10: "[Prénom Nom] — soutenance dans 10 jours. Envoyer le mail de préparation ?",
  pointMemoireJ30: "[Prénom Nom] — Point Mémoire du [date]. J+30 : envoyer le questionnaire de suivi ?",
  rattrapageJ15: "[Prénom Nom] — session rattrapage du [date]. J+15 : envoyer le questionnaire de suivi ?",
});
const FUTURE_BUTTON_TODOS = Object.freeze({
  notifications: ["Préparer le brouillon", "Ignorer"],
  deadlines: ["Voir la fiche", "Préparer le brouillon"],
  mailTemplates: ["Préparer le brouillon Gmail", "Enregistrer l’URL Apps Script"],
  deleteStudentPermanently: ["Supprimer définitivement"],
});
// TODO: utiliser NOTIFICATION_MESSAGE_TEMPLATES quand les relances calendaires correspondantes seront implémentées.
// TODO: créer les boutons listés dans FUTURE_BUTTON_TODOS uniquement lorsque les fonctionnalités correspondantes existent.
const CONFIG_EXPORT_LOCAL_STORAGE_KEYS = [
  "redacImrad.calendar.endpoint",
  "redacImrad.calendar.token",
  "redacImrad.pointMemoireResume.endpoint",
  "redacImrad.pointMemoireResume.token",
  "redacImrad.questionnaires.endpoint",
  "redacImrad.k4Questionnaire.formUrl",
  "redacImrad.k4Questionnaire.sendUrl",
  "redacImrad.k4Questionnaire.sendToken",
  "redacImrad.k4Questionnaire.responsesUrl",
  "redacImrad.k4Questionnaire.responsesToken",
  "redacImrad.k4Deliverables.endpoint",
  "redacImrad.prospects.questionnaireSend.endpoint",
  "redacImrad.prospects.questionnaireSend.token",
  "redacImrad.prospects.questionnaireResponses.endpoint",
  "redacImrad.prospects.questionnaireResponses.token",
  "redacImrad.prospects.relanceEndpoint",
  "redacImrad.prospects.relanceToken",
  "redacImrad.k5Questionnaire.responsesUrl",
  "redacImrad.k5Questionnaire.responsesToken",
  "redacImrad.rattrapageQuestionnaire.responsesUrl",
  "redacImrad.rattrapageQuestionnaire.responsesToken",
];
const questionnaireStatsDefinitions = [
  { id: "prospects", label: "Prospects" },
  { id: "pointMemoire", label: "Point Mémoire" },
  { id: "k4", label: "K4" },
  { id: "k5", label: "K5" },
  { id: "rattrapage", label: "Rattrapage" },
];

function initializeStatusFilter() {
  statusFilter.textContent = "";
  const allStatuses = document.createElement("option");
  allStatuses.value = "tous";
  allStatuses.textContent = "Tous les statuts";
  statusFilter.append(allStatuses);
  statusValues.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = storage.getStatutSuiviLabel(value);
    statusFilter.append(option);
  });
}

function extractAgendaUrl(rawValue) {
  const input = String(rawValue || "").trim();
  if (!input) return "";
  if (!input.startsWith("<")) return input;

  const parsedMarkup = new DOMParser().parseFromString(input, "text/html");
  return parsedMarkup.querySelector("iframe")?.getAttribute("src")?.trim() || "";
}

function validateAgendaUrl(rawValue) {
  const extractedUrl = extractAgendaUrl(rawValue);
  if (!extractedUrl) return null;

  try {
    const parsedUrl = new URL(extractedUrl);
    if (parsedUrl.origin !== "https://calendar.google.com" || parsedUrl.username || parsedUrl.password || !allowedAgendaPaths.has(parsedUrl.pathname)) return null;
    if (parsedUrl.searchParams.get("src") !== CALENDAR_ID) return null;
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function setAgendaMessage(message, state = "") {
  agendaMessage.textContent = message;
  agendaMessage.dataset.state = state;
  agendaMessage.hidden = !message;
}

function renderGoogleAgenda(url) {
  agendaPreview.textContent = "";

  if (!url) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucun agenda connecté pour le moment.";
    agendaPreview.append(empty);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.width = "100%";
  iframe.height = "520";
  iframe.frameBorder = "0";
  iframe.scrolling = "no";
  iframe.loading = "lazy";
  iframe.title = "Google Agenda — Mes rendez-vous";
  agendaPreview.append(iframe);
}

function initializeGoogleAgenda() {
  const storedValue = storage.getEffectiveSettings?.().agenda.iframeUrl || storage.getDatabase().settings.googleAgendaEmbedUrl || "";
  const validUrl = validateAgendaUrl(storedValue);
  agendaEmbedInput.value = validUrl || storedValue;
  renderGoogleAgenda(validUrl);
  if (storedValue && !validUrl) setAgendaMessage(`L’URL enregistrée ne correspond pas à l’agenda ${CALENDAR_ID}.`, "error");
}

function createTextareaField(name, label) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const title = document.createElement("span");
  title.textContent = label;
  const textarea = document.createElement("textarea");
  textarea.name = name;
  textarea.rows = 3;
  wrapper.append(title, textarea);
  return wrapper;
}

function renderPointAxes() {
  pointAxes.textContent = "";
  window.GRILLE_POINT_MEMOIRE.axes.forEach((axis) => {
    const article = document.createElement("article");
    article.className = "axis-card";
    const heading = document.createElement("h3");
    heading.textContent = pointAxisLabels[axis.id] || axis.nom;
    article.append(
      heading,
      createTextareaField(`pointAxis-${axis.id}-pointsSolides`, "Points solides"),
      createTextareaField(`pointAxis-${axis.id}-pointsVigilance`, "Points de vigilance"),
      createTextareaField(`pointAxis-${axis.id}-prioritesCorrection`, "Priorités de correction"),
      createTextareaField(`pointAxis-${axis.id}-notesLibres`, "Notes libres"),
    );
    pointAxes.append(article);
  });
}

function showParcoursFields(parcours) {
  parcoursSections.forEach((section) => {
    section.hidden = section.dataset.parcoursFields !== parcours;
  });
}

function openForm(student = null) {
  editingStudentId = student?.id || null;
  convertingProspectId = null;
  studentForm.reset();
  formMessage.hidden = true;
  fileStatus.textContent = student?.memoireImporte?.nom || "Aucun fichier sélectionné.";
  formTitle.textContent = student ? "Modifier la fiche étudiant" : "Nouvel étudiant accompagné";
  saveButton.textContent = student ? "Mettre à jour la fiche étudiant" : "Créer la fiche étudiant";
  formWorkspace.hidden = false;

  if (student) {
    populateForm(student);
  } else {
    showParcoursFields("");
  }

  formWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  editingStudentId = null;
  convertingProspectId = null;
  studentForm.reset();
  showParcoursFields("");
  formWorkspace.hidden = true;
  history.replaceState({}, "", "index.html");
}

function openProspectConversion(prospect) {
  openForm();
  convertingProspectId = prospect.id;
  formTitle.textContent = "Convertir le prospect en étudiant";
  saveButton.textContent = "Créer la fiche étudiant";
  setField("prenom", prospect.prenom);
  setField("nom", prospect.nom);
  setField("email", prospect.email);
  setField("telephone", prospect.telephone);
  setField("dateDebut", new Date().toISOString().slice(0, 10));
  setField("notesInitiales", [prospect.messageInitial, prospect.notes].filter(Boolean).join("\n\n"));
  const parcours = parcoursLabels[prospect.parcoursInteresse] ? prospect.parcoursInteresse : "";
  setField("parcours", parcours);
  showParcoursFields(parcours);
}

function setField(name, value) {
  const field = studentForm.elements.namedItem(name);
  if (field) field.value = value ?? "";
}

function setBooleanField(name, checked) {
  const field = studentForm.elements.namedItem(name);
  if (field) field.checked = checked === true;
}

function setChecked(name, values) {
  const selected = new Set(values || []);
  studentForm.querySelectorAll(`input[type="checkbox"][name="${name}"]`).forEach((checkbox) => {
    checkbox.checked = selected.has(checkbox.value);
  });
}

function populateForm(student) {
  ["prenom", "nom", "email", "ifmk", "telephone", "dateDebut", "echeance", "parcours", "thematiqueMemoire", "statut", "statutSuivi", "notesInitiales"].forEach((name) => setField(name, student[name]));
  setBooleanField("urgentManuel", student.urgentManuel);
  showParcoursFields(student.parcours);
  const data = student.donneesParcours || {};

  if (student.parcours === "point-memoire") {
    setField("pointSynthese", data.syntheseQuestionnaire);
    (data.questions || []).forEach((question, index) => setField(`pointQuestion${index + 1}`, question));
    setField("pointNotesVisio", data.notesVisio);
    Object.entries(data.axes || {}).forEach(([axisId, axisData]) => {
      Object.entries(axisData).forEach(([key, value]) => setField(`pointAxis-${axisId}-${key}`, value));
    });
  }

  if (student.parcours === "k4") {
    setField("k4Cadrage", data.cadrageSujet); setField("k4Sujet", data.sujetActuel); setField("k4Question", data.questionRecherche); setField("k4Methode", data.choixMethode); setField("k4Articles", data.premiersArticles); setField("k4FeuilleRoute", data.feuilleRouteK5); setChecked("k4Documents", data.documents);
  }

  if (student.parcours === "k5") {
    setField("k5Coherence", data.coherence); setField("k5Structure", data.structureImrad); setField("k5Bibliographie", data.bibliographie); setField("k5Resultats", data.resultats); setField("k5Discussion", data.discussion); setField("k5Soutenance", data.preparationSoutenance); setField("k5ComptesRendus", data.comptesRendusVisio); setChecked("k5Documents", data.documents);
  }

  if (student.parcours === "rattrapage") {
    setField("rattrapageRetours", data.retoursJury); setField("rattrapageCorrections", data.correctionsDemandees); setField("rattrapagePriorites", data.correctionsPrioritaires); setField("rattrapageIncoherences", data.incoherencesMajeures); setField("rattrapagePlan", data.planReprise); setField("rattrapageOral", data.preparationOrale); setChecked("rattrapageDocuments", data.documents);
  }
}

function value(data, name) {
  return data.get(name)?.trim() || "";
}

function hasFormControl(name) {
  return Boolean(studentForm.elements.namedItem(name));
}

function setCollectedValue(target, key, data, name) {
  if (data.has(name)) target[key] = value(data, name);
}

function setCollectedValues(target, key, data, name) {
  if (hasFormControl(name)) target[key] = data.getAll(name);
}

function collectPointData(data) {
  const pointData = {};
  setCollectedValue(pointData, "syntheseQuestionnaire", data, "pointSynthese");
  const questions = ["pointQuestion1", "pointQuestion2", "pointQuestion3"].map((name) => data.has(name) ? value(data, name) : undefined);
  if (questions.some((question) => question !== undefined)) pointData.questions = questions.map((question) => question || "");
  setCollectedValue(pointData, "notesVisio", data, "pointNotesVisio");

  const axes = {};
  window.GRILLE_POINT_MEMOIRE.axes.forEach((axis) => {
    const axisData = {};
    setCollectedValue(axisData, "pointsSolides", data, `pointAxis-${axis.id}-pointsSolides`);
    setCollectedValue(axisData, "pointsVigilance", data, `pointAxis-${axis.id}-pointsVigilance`);
    setCollectedValue(axisData, "prioritesCorrection", data, `pointAxis-${axis.id}-prioritesCorrection`);
    setCollectedValue(axisData, "notesLibres", data, `pointAxis-${axis.id}-notesLibres`);
    if (Object.keys(axisData).length) axes[axis.id] = axisData;
  });
  if (Object.keys(axes).length) pointData.axes = axes;
  return pointData;
}

function collectK4Data(data) {
  const parcoursData = {};
  setCollectedValue(parcoursData, "cadrageSujet", data, "k4Cadrage");
  setCollectedValue(parcoursData, "sujetActuel", data, "k4Sujet");
  setCollectedValue(parcoursData, "questionRecherche", data, "k4Question");
  setCollectedValue(parcoursData, "choixMethode", data, "k4Methode");
  setCollectedValue(parcoursData, "premiersArticles", data, "k4Articles");
  setCollectedValue(parcoursData, "feuilleRouteK5", data, "k4FeuilleRoute");
  setCollectedValues(parcoursData, "documents", data, "k4Documents");
  return parcoursData;
}

function collectK5Data(data) {
  const parcoursData = {};
  setCollectedValue(parcoursData, "coherence", data, "k5Coherence");
  setCollectedValue(parcoursData, "structureImrad", data, "k5Structure");
  setCollectedValue(parcoursData, "bibliographie", data, "k5Bibliographie");
  setCollectedValue(parcoursData, "resultats", data, "k5Resultats");
  setCollectedValue(parcoursData, "discussion", data, "k5Discussion");
  setCollectedValue(parcoursData, "preparationSoutenance", data, "k5Soutenance");
  setCollectedValue(parcoursData, "comptesRendusVisio", data, "k5ComptesRendus");
  setCollectedValues(parcoursData, "documents", data, "k5Documents");
  return parcoursData;
}

function collectRattrapageData(data) {
  const parcoursData = {};
  setCollectedValue(parcoursData, "retoursJury", data, "rattrapageRetours");
  setCollectedValue(parcoursData, "correctionsDemandees", data, "rattrapageCorrections");
  setCollectedValue(parcoursData, "correctionsPrioritaires", data, "rattrapagePriorites");
  setCollectedValue(parcoursData, "incoherencesMajeures", data, "rattrapageIncoherences");
  setCollectedValue(parcoursData, "planReprise", data, "rattrapagePlan");
  setCollectedValue(parcoursData, "preparationOrale", data, "rattrapageOral");
  setCollectedValues(parcoursData, "documents", data, "rattrapageDocuments");
  return parcoursData;
}

function collectParcoursData(parcours, data) {
  if (parcours === "point-memoire") return collectPointData(data);
  if (parcours === "k4") return collectK4Data(data);
  if (parcours === "k5") return collectK5Data(data);
  if (parcours === "rattrapage") return collectRattrapageData(data);
  return {};
}

function createStudentCard(student) {
  const card = document.createElement("article");
  const parcoursClass = parcoursLabels[student.parcours] ? student.parcours : "default";
  card.className = `student-card accueil-student-card accueil-student-card--${parcoursClass}`;
  card.dataset.studentCategory = student.parcours;
  card.dataset.studentId = student.id;

  const header = document.createElement("div");
  header.className = "accueil-student-header";
  const category = document.createElement("span"); category.className = "category-label accueil-parcours-badge"; category.textContent = parcoursLabels[student.parcours] || student.parcours || "Parcours à renseigner";
  const name = document.createElement("h3"); name.textContent = `${student.prenom} ${student.nom}`.trim() || "Étudiant sans nom";
  const badges = document.createElement("div");
  badges.className = "accueil-status-badges statut-pastilles";
  const followUpStatus = document.createElement("span");
  followUpStatus.className = "statut-pastille";
  followUpStatus.dataset.statut = student.statutSuivi;
  followUpStatus.textContent = storage.getStatutSuiviLabel(student.statutSuivi);
  badges.append(followUpStatus);

  const deadlineLevel = storage.getNiveauEcheance(student);
  const deadlineBadge = document.createElement("span");
  if (deadlineLevel === "depassee") {
    deadlineBadge.className = "statut-pastille statut-pastille-depassee";
    deadlineBadge.textContent = "Échéance dépassée";
    badges.append(deadlineBadge);
  } else if (storage.isUrgent(student)) {
    deadlineBadge.className = "statut-pastille statut-pastille-urgent";
    deadlineBadge.textContent = "Urgent";
    badges.append(deadlineBadge);
  } else if (deadlineLevel === "bientot") {
    deadlineBadge.className = "statut-pastille statut-pastille-bientot";
    deadlineBadge.textContent = "Bientôt";
    badges.append(deadlineBadge);
  }
  header.append(category, name, badges);

  const details = document.createElement("dl");
  details.className = "accueil-student-details";
  [["Début", student.dateDebut || "À renseigner"], ["Thématique", student.thematiqueMemoire || "À renseigner"]].forEach(([label, content]) => {
    const row = document.createElement("div"); const term = document.createElement("dt"); const description = document.createElement("dd"); term.textContent = label; description.textContent = content; row.append(term, description); details.append(row);
  });

  const actions = document.createElement("div"); actions.className = "student-card-actions";
  const open = document.createElement("a"); open.className = "secondary-action"; open.href = `index.html?student=${encodeURIComponent(student.id)}`; open.textContent = "Voir la fiche";
  const edit = document.createElement("a"); edit.className = "secondary-action"; edit.href = `index.html?student=${encodeURIComponent(student.id)}&edit=1`; edit.textContent = "Modifier";
  const archive = document.createElement("button"); archive.className = "destructive-action"; archive.type = "button"; archive.textContent = student.statut === "Archivé" ? "Archivé" : "Archiver le dossier"; archive.disabled = student.statut === "Archivé";
  archive.addEventListener("click", () => {
    const confirmed = window.confirm("Confirmer l’archivage de ce dossier ?");
    if (!confirmed) return;
    storage.archiveStudent(student.id);
    formMessage.textContent = UI_MESSAGES.studentArchived;
    formMessage.hidden = false;
    renderStudents();
  });
  actions.append(open, edit, archive);
  card.append(header, details, actions);
  return card;
}

function renderStudents() {
  const database = storage.getDatabase();
  const searchTerm = normalizeSearchText(currentSearchTerm.trim());
  const students = database.students.filter((student) => {
    const parcoursMatches = currentFilter === "tous" || student.parcours === currentFilter;
    const statusMatches = currentStatusFilter === "tous" || student.statutSuivi === currentStatusFilter;
    const searchMatches = !searchTerm || [student.prenom, student.nom, student.email, student.parcours, parcoursLabels[student.parcours]]
      .some((value) => normalizeSearchText(value).includes(searchTerm));
    const deadlineMatches = !deadlineFilterActive || (student.statut !== "Archivé" && ["urgent", "depassee", "bientot"].includes(storage.getNiveauEcheance(student)));
    return parcoursMatches && statusMatches && searchMatches && deadlineMatches;
  });
  studentList.textContent = "";
  renderPilotage();
  renderAppointmentContacts();

  if (students.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = database.students.length ? "Aucun étudiant ne correspond à ta recherche." : "Aucun étudiant pour le moment. Ajoute ton premier étudiant depuis le bouton ci-dessus.";
    studentList.append(empty);
    return;
  }
  students.forEach((student) => studentList.append(createStudentCard(student)));
}

function focusStudentList() {
  document.querySelector("#students-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyStatusFilter(status) {
  currentFilter = "tous";
  currentStatusFilter = status;
  currentSearchTerm = "";
  deadlineFilterActive = false;
  studentSearchInput.value = "";
  statusFilter.value = status;
  filterButtons.forEach((button) => {
    const selected = button.dataset.studentFilter === "tous";
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderStudents();
  focusStudentList();
}

function appendTaskRow(container, label, count, status, tone = "") {
  if (count <= 0) return;
  const button = document.createElement("button");
  button.className = `accueil-todo-row${tone ? ` ${tone}` : ""}`;
  button.type = "button";
  const value = document.createElement("strong");
  value.textContent = String(count);
  const text = document.createElement("span");
  text.textContent = label;
  button.append(value, text);
  button.addEventListener("click", () => applyStatusFilter(status));
  container.append(button);
}

function parseDateValue(value) {
  if (!value) return null;
  const frenchDate = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const date = frenchDate
    ? new Date(Number(frenchDate[3]), Number(frenchDate[2]) - 1, Number(frenchDate[1]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function renderDeadlines(students) {
  deadlinesList.textContent = "";
  const deadlines = students
    .map((student) => ({ student, date: parseDateValue(student.echeance), level: storage.getNiveauEcheance(student) }))
    .filter(({ date, level }) => date && ["urgent", "depassee", "bientot"].includes(level))
    .sort((left, right) => left.date - right.date);
  showAllDeadlinesButton.disabled = deadlines.length === 0;

  if (!deadlines.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune échéance proche renseignée.";
    deadlinesList.append(empty);
    return;
  }

  deadlines.slice(0, 5).forEach(({ student, date, level }) => {
    const row = document.createElement("article");
    row.className = "accueil-deadline-row";
    const header = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${student.prenom || ""} ${student.nom || ""}`.trim() || "Étudiant sans nom";
    const badge = document.createElement("span");
    badge.className = `statut-pastille ${level === "bientot" ? "statut-pastille-bientot" : level === "depassee" ? "statut-pastille-depassee" : "statut-pastille-urgent"}`;
    badge.textContent = level === "depassee" ? "Échéance dépassée" : level === "bientot" ? "Bientôt" : "Urgent";
    header.append(name, badge);
    const detail = document.createElement("span");
    detail.textContent = `${parcoursLabels[student.parcours] || student.parcours || "Parcours à renseigner"} · ${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`;
    row.append(header, detail);
    deadlinesList.append(row);
  });
}

function renderNotifications(students) {
  notificationsList.textContent = "";
  const notifications = students.map((student) => {
    const name = `${student.prenom || ""} ${student.nom || ""}`.trim() || "Étudiant sans nom";
    const deadlineLevel = storage.getNiveauEcheance(student);
    if (student.statutSuivi === "a-relancer" && deadlineLevel === "depassee") return { priority: 1, message: `Relance en retard — ${name}`, tone: "late" };
    if (storage.isUrgent(student)) return { priority: 2, message: `Échéance urgente — ${name}`, tone: "urgent" };
    if (student.statutSuivi === "questionnaire-recu") return { priority: 3, message: `Nouveau questionnaire reçu — ${name}`, tone: "received" };
    return null;
  }).filter(Boolean).sort((left, right) => left.priority - right.priority);

  if (!notifications.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune notification pour le moment.";
    notificationsList.append(empty);
    return;
  }

  notifications.forEach((notification) => {
    const row = document.createElement("article");
    row.className = `accueil-notification-row is-${notification.tone}`;
    const content = document.createElement("strong");
    content.textContent = notification.message;
    row.append(content);
    notificationsList.append(row);
  });
}

function renderPilotage() {
  const activeStudents = storage.getActiveStudents();
  const urgentTotal = activeStudents.filter(storage.isUrgent).length;
  activeCount.textContent = String(activeStudents.length);
  urgentCount.textContent = String(urgentTotal);

  const questionnairesPending = activeStudents.filter((student) => student.statutSuivi === "questionnaire-envoye").length;
  const studentsToRelance = activeStudents.filter((student) => student.statutSuivi === "a-relancer").length;
  const memoiresToAnalyze = activeStudents.filter((student) => student.statutSuivi === "memoire-importe").length;

  todoList.textContent = "";
  appendTaskRow(todoList, "Questionnaires en attente de réponse", questionnairesPending, "questionnaire-envoye", "is-waiting");
  appendTaskRow(todoList, "À relancer", studentsToRelance, "a-relancer", "is-relance");
  appendTaskRow(todoList, "Mémoires à analyser", memoiresToAnalyze, "memoire-importe", "is-analysis");
  if (!todoList.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Rien d’urgent à traiter pour le moment.";
    todoList.append(empty);
  }
  renderDeadlines(activeStudents);
  renderNotifications(activeStudents);
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
}

function getProspectAppointmentName(prospect) {
  return `${prospect.prenom || ""} ${prospect.nom || ""}`.trim()
    || prospect.pseudo
    || prospect.reponseQuestionnaireProspect?.nomComplet
    || prospect.email
    || "Prospect sans nom";
}

function getActiveAppointmentProspects() {
  return storage.getProspects().filter((prospect) => {
    const currentStatus = prospect.statutProspect || "nouveau";
    const legacyStatus = String(prospect.statut || "").trim().toLocaleLowerCase("fr-FR");
    return currentStatus !== "archive"
      && currentStatus !== "transforme"
      && legacyStatus !== "archivé"
      && legacyStatus !== "converti en étudiant";
  });
}

function renderAppointmentContacts() {
  const contactType = appointmentContactTypeSelect.value || "student";
  const selectedContactId = appointmentContactSelect.value;
  const contacts = (contactType === "prospect" ? getActiveAppointmentProspects() : storage.getActiveStudents())
    .slice()
    .sort((first, second) => {
      const firstName = contactType === "prospect" ? getProspectAppointmentName(first) : `${first.prenom || ""} ${first.nom || ""}`.trim();
      const secondName = contactType === "prospect" ? getProspectAppointmentName(second) : `${second.prenom || ""} ${second.nom || ""}`.trim();
      return firstName.localeCompare(secondName, "fr");
    });

  appointmentContactLabel.textContent = contactType === "prospect" ? "Prospect concerné" : "Étudiant concerné";
  appointmentContactSelect.textContent = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = contacts.length
    ? `Sélectionner ${contactType === "prospect" ? "un prospect" : "un étudiant"}`
    : `Aucun ${contactType === "prospect" ? "prospect" : "étudiant"} actif`;
  appointmentContactSelect.append(placeholder);

  contacts.forEach((contact) => {
    const option = document.createElement("option");
    option.value = contact.id;
    option.textContent = contactType === "prospect"
      ? getProspectAppointmentName(contact)
      : `${contact.prenom || ""} ${contact.nom || ""}`.trim() || contact.email || "Étudiant sans nom";
    appointmentContactSelect.append(option);
  });

  if (contacts.some((contact) => contact.id === selectedContactId)) appointmentContactSelect.value = selectedContactId;
  appointmentContactSelect.disabled = contacts.length === 0;
  appointmentButton.disabled = contacts.length === 0;
}

function initializeAppointmentTimeSlots() {
  appointmentTimeSelect.textContent = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Sélectionner une heure";
  appointmentTimeSelect.append(placeholder);
  for (let minutes = 8 * 60; minutes <= 20 * 60; minutes += 15) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const quarter = String(minutes % 60).padStart(2, "0");
    const option = document.createElement("option");
    option.value = `${hours}:${quarter}`;
    option.textContent = option.value;
    appointmentTimeSelect.append(option);
  }
}

function formatCalendarLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function setAppointmentMessage(message, state = "") {
  appointmentMessage.textContent = message;
  appointmentMessage.dataset.state = state;
  appointmentMessage.hidden = !message;
}

function setCalendarConfigMessage(message, state = "") {
  calendarConfigMessage.textContent = message;
  calendarConfigMessage.dataset.state = state;
  calendarConfigMessage.hidden = !message;
}

function setQuestionnaireStatsMessage(message, state = "") {
  questionnaireStatsMessage.textContent = message;
  questionnaireStatsMessage.dataset.state = state;
  questionnaireStatsMessage.hidden = !message;
}

function validateGoogleFormsStatsUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  try {
    const url = new URL(rawValue);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || !url.pathname.includes("/forms/")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getQuestionnaireStatsLinks() {
  return storage.getFormsStatsLinks ? storage.getFormsStatsLinks() : storage.getDatabase().settings.formsStatsLinks || {};
}

function saveQuestionnaireStatsLinks() {
  const links = {};
  let hasInvalidLink = false;
  questionnaireStatsDefinitions.forEach(({ id }) => {
    const validUrl = validateGoogleFormsStatsUrl(questionnaireStatsInputs[id]?.value);
    if (validUrl === null) hasInvalidLink = true;
    links[id] = validUrl || "";
  });

  if (hasInvalidLink) {
    setQuestionnaireStatsMessage("Utilisez des liens Google Forms d’édition valides.", "error");
    return;
  }

  if (storage.saveFormsStatsLinks) storage.saveFormsStatsLinks(links);
  else {
    const database = storage.getDatabase();
    database.settings = { ...database.settings, formsStatsLinks: links };
    storage.saveDatabase(database);
  }
  Object.entries(links).forEach(([id, url]) => {
    if (questionnaireStatsInputs[id]) questionnaireStatsInputs[id].value = url;
  });
  setQuestionnaireStatsMessage("Liens statistiques enregistrés.", "success");
  renderQuestionnaireStats();
}

function initializeQuestionnaireStatsLinks() {
  const links = getQuestionnaireStatsLinks();
  questionnaireStatsDefinitions.forEach(({ id }) => {
    if (questionnaireStatsInputs[id]) questionnaireStatsInputs[id].value = links[id] || "";
  });
}

function formatQuestionnaireResponseCount(count) {
  if (count === null) return "Non connecté";
  if (count === "error") return "Erreur de récupération";
  const numericCount = Number(count) || 0;
  return `${numericCount} réponse${numericCount > 1 ? "s" : ""} au total`;
}

function validateStatsEndpoint(rawValue) {
  try {
    const url = new URL(String(rawValue || "").trim());
    if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !url.pathname.includes("/macros/") || !url.pathname.endsWith("/exec")) return "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

async function fetchQuestionnaireCount(endpoint, token = "") {
  const url = token
    ? `${endpoint}?action=getResponses&token=${encodeURIComponent(token)}`
    : endpoint;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json();
  if (!response.ok || data.success !== true) throw new Error(data.error || data.message || "Réponse Apps Script inattendue.");
  if (Number.isFinite(Number(data.count))) return Number(data.count);
  if (Array.isArray(data.responses)) return data.responses.length;
  return 0;
}

function getQuestionnaireStatsConnection(id) {
  if (id === "prospects") {
    return {
      endpoint: validateStatsEndpoint(storage.getProspectsResponsesEndpoint?.() || ""),
      token: String(storage.getProspectsResponsesToken?.() || "").trim(),
      needsToken: true,
    };
  }
  if (id === "pointMemoire") {
    const effectivePointMemoire = storage.getEffectiveSettings?.().pointMemoire || {};
    return {
      endpoint: validateStatsEndpoint(effectivePointMemoire.appsScriptUrl || browserStorage.getItem(POINT_MEMOIRE_RESPONSES_ENDPOINT_KEY) || ""),
      token: String(effectivePointMemoire.token || "").trim(),
      needsToken: false,
    };
  }
  if (id === "k4") {
    const effectiveK4 = storage.getEffectiveSettings?.().k4 || {};
    return {
      endpoint: validateStatsEndpoint(effectiveK4.responsesAppsScriptUrl || browserStorage.getItem(K4_RESPONSES_ENDPOINT_KEY) || ""),
      token: String(effectiveK4.token || browserStorage.getItem(K4_RESPONSES_TOKEN_KEY) || "").trim(),
      needsToken: true,
    };
  }
  if (id === "k5") {
    const effectiveK5 = storage.getEffectiveSettings?.().k5 || {};
    return {
      endpoint: validateStatsEndpoint(effectiveK5.responsesAppsScriptUrl || ""),
      token: String(effectiveK5.token || "").trim(),
      needsToken: true,
    };
  }
  if (id === "rattrapage") {
    const effectiveRattrapage = storage.getEffectiveSettings?.().rattrapage || {};
    return {
      endpoint: validateStatsEndpoint(effectiveRattrapage.responsesAppsScriptUrl || ""),
      token: String(effectiveRattrapage.token || "").trim(),
      needsToken: true,
    };
  }
  return { endpoint: "", token: "", needsToken: false };
}

async function loadQuestionnaireStatsCounts() {
  const result = {};
  await Promise.all(questionnaireStatsDefinitions.map(async ({ id }) => {
    const connection = getQuestionnaireStatsConnection(id);
    if (!connection.endpoint || (connection.needsToken && !connection.token)) {
      result[id] = null;
      return;
    }
    try {
      result[id] = await fetchQuestionnaireCount(connection.endpoint, connection.token);
    } catch {
      result[id] = "error";
    }
  }));
  return result;
}

function createQuestionnaireStatsRow(definition, count, links) {
  const row = document.createElement("article");
  row.className = "questionnaire-stats-row";
  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = definition.label;
  const total = document.createElement("span");
  total.textContent = formatQuestionnaireResponseCount(count);
  content.append(title, total);

  const link = links[definition.id] || "";
  const button = document.createElement("button");
  button.type = "button";
  button.className = link ? "secondary-action" : "secondary-action is-disabled";
  button.textContent = link ? "Voir les statistiques" : "Lien non configuré";
  button.disabled = !link;
  button.addEventListener("click", () => {
    if (link) window.open(link, "_blank");
  });
  row.append(content, button);
  return row;
}

async function renderQuestionnaireStats() {
  if (!questionnaireStatsList) return;
  questionnaireStatsList.textContent = "";
  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "Récupération des statistiques questionnaires.";
  questionnaireStatsList.append(loading);
  refreshQuestionnaireStatsButton.disabled = true;

  const links = getQuestionnaireStatsLinks();
  const counts = await loadQuestionnaireStatsCounts();
  questionnaireStatsList.textContent = "";
  questionnaireStatsDefinitions.forEach((definition) => {
    questionnaireStatsList.append(createQuestionnaireStatsRow(definition, counts[definition.id], links));
  });
  refreshQuestionnaireStatsButton.disabled = false;
}

function setPrivateConfigMessage(message, state = "") {
  privateConfigMessage.textContent = message;
  privateConfigMessage.dataset.state = state;
  privateConfigMessage.hidden = !message;
}

function getWhitelistedLocalStorageConfig() {
  return Object.fromEntries(CONFIG_EXPORT_LOCAL_STORAGE_KEYS.map((key) => [key, browserStorage.getItem(key) || ""]));
}

function buildPrivateConfigExport() {
  const database = storage.getDatabase();
  return {
    exportType: "redac-imrad-private-config",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      databaseSettings: database.settings || {},
      localStorage: getWhitelistedLocalStorageConfig(),
      effectiveSettings: storage.getEffectiveSettings?.() || {},
    },
  };
}

function getExportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function exportPrivateConfiguration() {
  const payload = buildPrivateConfigExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `CONFIG_PRIVEE_REDAC_IMRAD_${getExportDateStamp()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  setPrivateConfigMessage("Configuration exportée. À conserver uniquement dans le Google Drive privé d’Audrey.", "success");
}

function normalizeImportedSettings(settings) {
  if (!settings || typeof settings !== "object") return {};
  if (settings.databaseSettings || settings.localStorage || settings.effectiveSettings) return settings;
  return { databaseSettings: settings };
}

function applyEffectiveSettingsToLocalConfig(effectiveSettings) {
  if (!effectiveSettings || typeof effectiveSettings !== "object") return;
  const agenda = effectiveSettings.agenda || {};
  const prospects = effectiveSettings.prospects || {};
  const pointMemoire = effectiveSettings.pointMemoire || {};
  const k4 = effectiveSettings.k4 || {};
  const k5 = effectiveSettings.k5 || {};
  const rattrapage = effectiveSettings.rattrapage || {};

  const database = storage.getDatabase();
  database.settings = {
    ...(database.settings || {}),
    googleAgendaEmbedUrl: agenda.iframeUrl || database.settings?.googleAgendaEmbedUrl || "",
    formsStatsLinks: {
      ...(database.settings?.formsStatsLinks || {}),
      prospects: prospects.formsStatsUrl || "",
      pointMemoire: pointMemoire.formsStatsUrl || "",
      k4: k4.formsStatsUrl || "",
      k5: k5.formsStatsUrl || "",
      rattrapage: rattrapage.formsStatsUrl || "",
    },
    prospects: {
      ...(database.settings?.prospects || {}),
      formUrl: prospects.formsPublicUrl || "",
      responsesEndpoint: prospects.responsesAppsScriptUrl || "",
      responsesToken: prospects.tokenResponses || "",
      mailEndpoint: prospects.mailsAppsScriptUrl || "",
      mailToken: prospects.tokenMails || "",
    },
  };
  storage.saveDatabase(database);

  const values = {
    "redacImrad.calendar.endpoint": agenda.appsScriptUrl || "",
    "redacImrad.calendar.token": agenda.token || "",
    "redacImrad.pointMemoireResume.endpoint": pointMemoire.appsScriptUrl || "",
    "redacImrad.pointMemoireResume.token": pointMemoire.token || "",
    "redacImrad.k4Questionnaire.responsesUrl": k4.responsesAppsScriptUrl || "",
    "redacImrad.k4Questionnaire.responsesToken": k4.token || "",
    "redacImrad.k5Questionnaire.responsesUrl": k5.responsesAppsScriptUrl || "",
    "redacImrad.k5Questionnaire.responsesToken": k5.token || "",
    "redacImrad.rattrapageQuestionnaire.responsesUrl": rattrapage.responsesAppsScriptUrl || "",
    "redacImrad.rattrapageQuestionnaire.responsesToken": rattrapage.token || "",
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value) browserStorage.setItem(key, value);
  });
}

function applyImportedConfiguration(payload) {
  const imported = normalizeImportedSettings(payload.settings);
  const database = storage.getDatabase();
  database.settings = imported.databaseSettings && typeof imported.databaseSettings === "object"
    ? imported.databaseSettings
    : {};
  storage.saveDatabase(database);

  if (imported.localStorage && typeof imported.localStorage === "object") {
    CONFIG_EXPORT_LOCAL_STORAGE_KEYS.forEach((key) => {
      const value = String(imported.localStorage[key] || "").trim();
      if (value) browserStorage.setItem(key, value);
      else browserStorage.removeItem(key);
    });
  }

  applyEffectiveSettingsToLocalConfig(imported.effectiveSettings);
}

function refreshConfigurationInterface() {
  initializeGoogleAgenda();
  initializeCalendarConnection();
  initializeQuestionnaireStatsLinks();
  renderQuestionnaireStats();
}

async function importPrivateConfigurationFile(file) {
  if (!file) return;
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    setPrivateConfigMessage(UI_MESSAGES.fileImportFailed, "error");
    return;
  }

  if (!payload || payload.exportType !== "redac-imrad-private-config" || !payload.settings) {
    setPrivateConfigMessage("Fichier de configuration invalide.", "error");
    return;
  }

  if (!window.confirm("Importer cette configuration ? Les paramètres actuels seront remplacés.")) return;

  applyImportedConfiguration(payload);
  refreshConfigurationInterface();
  setPrivateConfigMessage("Configuration importée avec succès.", "success");
  privateConfigFileInput.value = "";
}

function parseCalendarEndpoint(rawValue) {
  try {
    const parsedUrl = new URL(String(rawValue || "").trim());
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "script.google.com" || !parsedUrl.pathname.includes("/macros/s/") || !parsedUrl.pathname.endsWith("/exec")) return null;
    const tokenFromUrl = parsedUrl.searchParams.get("token") || "";
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return { endpoint: parsedUrl.toString(), tokenFromUrl };
  } catch {
    return null;
  }
}

function initializeCalendarConnection() {
  const effectiveAgenda = storage.getEffectiveSettings?.().agenda || {};
  calendarEndpointInput.value = effectiveAgenda.appsScriptUrl || browserStorage.getItem(CALENDAR_ENDPOINT_KEY) || "";
  calendarTokenInput.value = effectiveAgenda.token || browserStorage.getItem(CALENDAR_TOKEN_KEY) || "";
}

function saveCalendarConnection() {
  const parsedEndpoint = parseCalendarEndpoint(calendarEndpointInput.value);
  const token = calendarTokenInput.value.trim() || parsedEndpoint?.tokenFromUrl || "";
  if (!parsedEndpoint || !token) {
    setCalendarConfigMessage(UI_MESSAGES.appsScriptNotConfigured, "error");
    return false;
  }

  browserStorage.setItem(CALENDAR_ENDPOINT_KEY, parsedEndpoint.endpoint);
  browserStorage.setItem(CALENDAR_TOKEN_KEY, token);
  calendarEndpointInput.value = parsedEndpoint.endpoint;
  calendarTokenInput.value = token;
  setCalendarConfigMessage(`Connexion enregistrée pour l’agenda ${CALENDAR_ID}.`, "success");
  return true;
}

async function addGoogleAppointment(event) {
  event.preventDefault();
  const contactType = appointmentContactTypeSelect.value || "student";
  const contactId = appointmentContactSelect.value || "";
  const date = document.querySelector("#agenda-date")?.value || "";
  const heureDebut = document.querySelector("#agenda-heure-debut")?.value || "";
  const typeRdv = document.querySelector("#agenda-type-rdv")?.value || "";
  const dureeMinutes = document.querySelector("#agenda-duree")?.value || "60";
  const notes = document.querySelector("#agenda-notes")?.value || "";
  const student = contactType === "student" ? storage.getStudentById(contactId) : null;
  const prospect = contactType === "prospect" ? storage.getProspectById(contactId) : null;
  const contact = prospect || student;

  if (!date) {
    setAppointmentMessage("Merci de renseigner la date du rendez-vous.", "error");
    return;
  }
  if (!heureDebut) {
    setAppointmentMessage("Merci de renseigner l’heure de début.", "error");
    return;
  }
  if (!typeRdv) {
    setAppointmentMessage("Merci de renseigner le type de rendez-vous.", "error");
    return;
  }
  if (!contact) {
    setAppointmentMessage(contactType === "prospect" ? "Aucun prospect sélectionné. Choisis un prospect dans la liste avant de continuer." : UI_MESSAGES.noStudentSelected, "error");
    return;
  }

  const effectiveAgenda = storage.getEffectiveSettings?.().agenda || {};
  const parsedEndpoint = parseCalendarEndpoint(effectiveAgenda.appsScriptUrl || browserStorage.getItem(CALENDAR_ENDPOINT_KEY));
  const agendaScriptUrl = parsedEndpoint?.endpoint || "";
  const agendaToken = effectiveAgenda.token || browserStorage.getItem(CALENDAR_TOKEN_KEY) || "";
  if (!agendaScriptUrl || !agendaToken) {
    setAppointmentMessage(UI_MESSAGES.appsScriptNotConfigured, "error");
    return;
  }

  const duration = Number(dureeMinutes || 60);
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = heureDebut.split(":").map(Number);
  const startDate = new Date(year, month - 1, day, hours, minutes, 0);
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
  const responseData = prospect?.reponseQuestionnaireProspect || {};
  const displayName = prospect
    ? getProspectAppointmentName(prospect)
    : `${student.prenom || ""} ${student.nom || ""}`.trim() || student.email || "Étudiant sans nom";
  const prenom = prospect ? prospect.prenom || prospect.pseudo || "" : student.prenom || "";
  const nom = prospect ? prospect.nom || "" : student.nom || "";
  const email = prospect ? prospect.email || "" : student.email || "";
  const parcours = prospect ? "Prospect" : student.parcours || "";
  const details = prospect
    ? [
      "Type : Prospect",
      `Nom / pseudo : ${displayName}`,
      `Email : ${email || "Non renseigné"}`,
      `Niveau : ${prospect.niveau || responseData.niveau || responseData.annee || "Non renseigné"}`,
      "",
      "Notes :",
      [prospect.notes, notes].filter(Boolean).join("\n") || "Aucune note renseignée.",
    ].join("\n")
    : [
      "Type : Étudiant",
      `Nom : ${displayName}`,
      `Email : ${email || "Non renseigné"}`,
      `Parcours : ${parcoursLabels[parcours] || parcours || "Non renseigné"}`,
      "",
      "Notes :",
      notes || "Aucune note renseignée.",
    ].join("\n");

  const payload = {
    token: agendaToken,
    calendarId: CALENDAR_ID,
    studentId: contact.id,
    prenom,
    nom,
    email,
    parcours,
    typeRdv,
    date,
    heureDebut,
    dureeMinutes: duration,
    notes,
    title: `${typeRdv} — ${displayName}`,
    start: formatCalendarLocalDateTime(startDate),
    end: formatCalendarLocalDateTime(endDate),
    timezone: "Europe/Paris",
    details,
  };

  const url =
    agendaScriptUrl +
    "?action=createCalendarEvent" +
    "&token=" + encodeURIComponent(agendaToken) +
    "&payload=" + encodeURIComponent(JSON.stringify(payload));

  appointmentButton.disabled = true;
  appointmentButton.textContent = "Ajout en cours";
  setAppointmentMessage(`Ajout dans l’agenda ${CALENDAR_ID} en cours.`, "");

  try {
    const response = await fetch(url);
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error(result.error || "Apps Script n’a pas confirmé la création du rendez-vous.");
    setAppointmentMessage(UI_MESSAGES.appointmentCreated, "success");
    appointmentForm.reset();
    appointmentContactTypeSelect.value = contactType;
    renderAppointmentContacts();
  } catch (error) {
    setAppointmentMessage(`L’ajout a échoué : ${error.message}`, "error");
  } finally {
    appointmentButton.textContent = "Ajouter à l’agenda";
    appointmentButton.disabled = appointmentContactSelect.disabled;
  }
}

initializeStatusFilter();
renderPointAxes();
renderStudents();
initializeGoogleAgenda();
initializeCalendarConnection();
initializeAppointmentTimeSlots();
initializeQuestionnaireStatsLinks();
renderQuestionnaireStats();

parcoursSelect.addEventListener("change", () => showParcoursFields(parcoursSelect.value));
fileInput.addEventListener("change", () => { fileStatus.textContent = fileInput.files?.[0]?.name || "Aucun fichier sélectionné."; });
addButton.addEventListener("click", () => openForm());
closeButton.addEventListener("click", closeForm);
cancelButton.addEventListener("click", closeForm);
appointmentContactTypeSelect.addEventListener("change", renderAppointmentContacts);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.studentFilter;
    deadlineFilterActive = false;
    filterButtons.forEach((item) => { const selected = item === button; item.classList.toggle("active", selected); item.setAttribute("aria-pressed", String(selected)); });
    renderStudents();
  });
});

statusFilter.addEventListener("change", () => {
  currentStatusFilter = statusFilter.value;
  deadlineFilterActive = false;
  renderStudents();
});

studentSearchInput.addEventListener("input", () => {
  currentSearchTerm = studentSearchInput.value;
  deadlineFilterActive = false;
  renderStudents();
});

showAllDeadlinesButton.addEventListener("click", () => {
  currentFilter = "tous";
  currentStatusFilter = "tous";
  currentSearchTerm = "";
  deadlineFilterActive = true;
  studentSearchInput.value = "";
  statusFilter.value = "tous";
  filterButtons.forEach((button) => {
    const selected = button.dataset.studentFilter === "tous";
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderStudents();
  focusStudentList();
});

saveAgendaButton.addEventListener("click", () => {
  const validUrl = validateAgendaUrl(agendaEmbedInput.value);
  if (!validUrl) {
    setAgendaMessage(`Utilisez le code d’intégration de l’agenda ${CALENDAR_ID}.`, "error");
    return;
  }

  const database = storage.getDatabase();
  database.settings = { ...database.settings, googleAgendaEmbedUrl: validUrl };
  storage.saveDatabase(database);
  agendaEmbedInput.value = validUrl;
  renderGoogleAgenda(validUrl);
  setAgendaMessage("L’agenda a été enregistré.", "success");
});

saveCalendarConnectionButton.addEventListener("click", saveCalendarConnection);
appointmentForm.addEventListener("submit", addGoogleAppointment);
saveQuestionnaireStatsLinksButton.addEventListener("click", saveQuestionnaireStatsLinks);
refreshQuestionnaireStatsButton.addEventListener("click", renderQuestionnaireStats);
exportPrivateConfigButton.addEventListener("click", exportPrivateConfiguration);
importPrivateConfigButton.addEventListener("click", () => privateConfigFileInput.click());
privateConfigFileInput.addEventListener("change", () => importPrivateConfigurationFile(privateConfigFileInput.files?.[0]));

quickProspectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(quickProspectForm);
  const identity = [value(data, "prenom"), value(data, "nom"), value(data, "email")];
  if (!identity.some(Boolean)) {
    quickProspectMessage.textContent = "Renseignez au moins un prénom, un nom ou un email.";
    quickProspectMessage.hidden = false;
    return;
  }
  storage.createProspect({
    prenom: identity[0],
    nom: identity[1],
    email: identity[2],
    telephone: value(data, "telephone"),
    source: data.get("source") || "",
    parcoursInteresse: data.get("parcoursInteresse") || "non défini",
    messageInitial: value(data, "messageInitial"),
    notes: value(data, "notes"),
    dateContact: new Date().toISOString().slice(0, 10),
    questionnaireEnvoye: false,
    questionnaireRepondu: false,
    statut: "nouveau",
  });
  quickProspectForm.reset();
  quickProspectMessage.textContent = "Prospect ajouté.";
  quickProspectMessage.hidden = false;
});

studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(studentForm);
  const parcours = normalizeParcours(data.get("parcours"));
  if (!isValidParcours(parcours)) {
    formMessage.textContent = "Sélectionnez un parcours valide : Point Mémoire, K4, K5 ou Rattrapage.";
    formMessage.hidden = false;
    return;
  }

  const selectedFile = fileInput.files?.[0];
  const existing = editingStudentId ? storage.getStudentById(editingStudentId) : null;
  const studentData = {
    prenom: value(data, "prenom"), nom: value(data, "nom"), email: value(data, "email"), ifmk: value(data, "ifmk"), telephone: value(data, "telephone"), dateDebut: data.get("dateDebut") || "", echeance: data.get("echeance") || "", parcours, thematiqueMemoire: value(data, "thematiqueMemoire"), statut: data.get("statut") || "En cours", statutSuivi: data.get("statutSuivi") || "nouveau", urgentManuel: data.get("urgentManuel") === "on", notesInitiales: value(data, "notesInitiales"), donneesParcours: { ...(existing?.donneesParcours || {}), ...collectParcoursData(parcours, data) }, memoireImporte: selectedFile ? { nom: selectedFile.name, type: selectedFile.type, taille: selectedFile.size } : existing?.memoireImporte || null,
    livrablesK4: parcours === "k4" ? existing?.livrablesK4 || window.LivrablesK4.getLivrablesK4() : existing?.livrablesK4 || null,
  };

  if (editingStudentId) storage.updateStudent(editingStudentId, studentData);
  else if (convertingProspectId) storage.convertProspectToStudent(convertingProspectId, studentData);
  else storage.createStudent(studentData);
  formMessage.textContent = editingStudentId ? "La fiche étudiant a été mise à jour." : (convertingProspectId ? UI_MESSAGES.prospectConverted : UI_MESSAGES.studentCreated);
  formMessage.hidden = false;
  renderStudents();
  setTimeout(closeForm, 700);
});

const requestedId = new URLSearchParams(window.location.search).get("student");
if (requestedId) {
  const requestedStudent = storage.getStudentById(requestedId);
  if (requestedStudent) openForm(requestedStudent);
}

const requestedParcours = new URLSearchParams(window.location.search).get("new");
if (!requestedId && parcoursLabels[requestedParcours]) {
  openForm();
  parcoursSelect.value = requestedParcours;
  showParcoursFields(requestedParcours);
}
