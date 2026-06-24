const storage = window.RedacStorage;
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
const openAgendaButton = document.querySelector("#open-google-agenda");
const agendaMessage = document.querySelector("#google-agenda-message");
const agendaPreview = document.querySelector("#google-agenda-preview");

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
  openAgendaButton.disabled = !url;

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

function getStoredAgendaUrl() {
  return validateAgendaUrl(storage.getDatabase().settings.googleAgendaEmbedUrl);
}

function initializeGoogleAgenda() {
  const database = storage.getDatabase();
  const storedValue = database.settings.googleAgendaEmbedUrl || "";
  const validUrl = validateAgendaUrl(storedValue);
  agendaEmbedInput.value = validUrl || storedValue;
  renderGoogleAgenda(validUrl);
  if (storedValue && !validUrl) setAgendaMessage("L’URL d’agenda enregistrée n’est pas valide.", "error");
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

function collectPointData(data) {
  const axes = {};
  window.GRILLE_POINT_MEMOIRE.axes.forEach((axis) => {
    axes[axis.id] = {
      pointsSolides: value(data, `pointAxis-${axis.id}-pointsSolides`),
      pointsVigilance: value(data, `pointAxis-${axis.id}-pointsVigilance`),
      prioritesCorrection: value(data, `pointAxis-${axis.id}-prioritesCorrection`),
      notesLibres: value(data, `pointAxis-${axis.id}-notesLibres`),
    };
  });
  return { syntheseQuestionnaire: value(data, "pointSynthese"), questions: [value(data, "pointQuestion1"), value(data, "pointQuestion2"), value(data, "pointQuestion3")], notesVisio: value(data, "pointNotesVisio"), axes };
}

function collectParcoursData(parcours, data) {
  if (parcours === "point-memoire") return collectPointData(data);
  if (parcours === "k4") return { cadrageSujet: value(data, "k4Cadrage"), sujetActuel: value(data, "k4Sujet"), questionRecherche: value(data, "k4Question"), choixMethode: value(data, "k4Methode"), premiersArticles: value(data, "k4Articles"), feuilleRouteK5: value(data, "k4FeuilleRoute"), documents: data.getAll("k4Documents") };
  if (parcours === "k5") return { coherence: value(data, "k5Coherence"), structureImrad: value(data, "k5Structure"), bibliographie: value(data, "k5Bibliographie"), resultats: value(data, "k5Resultats"), discussion: value(data, "k5Discussion"), preparationSoutenance: value(data, "k5Soutenance"), comptesRendusVisio: value(data, "k5ComptesRendus"), documents: data.getAll("k5Documents") };
  if (parcours === "rattrapage") return { retoursJury: value(data, "rattrapageRetours"), correctionsDemandees: value(data, "rattrapageCorrections"), correctionsPrioritaires: value(data, "rattrapagePriorites"), incoherencesMajeures: value(data, "rattrapageIncoherences"), planReprise: value(data, "rattrapagePlan"), preparationOrale: value(data, "rattrapageOral"), documents: data.getAll("rattrapageDocuments") };
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
  const open = document.createElement("a"); open.className = "secondary-action"; open.href = `index.html?student=${encodeURIComponent(student.id)}`; open.textContent = "Ouvrir";
  const edit = document.createElement("a"); edit.className = "secondary-action"; edit.href = `index.html?student=${encodeURIComponent(student.id)}&edit=1`; edit.textContent = "Modifier";
  const archive = document.createElement("button"); archive.className = "secondary-action"; archive.type = "button"; archive.textContent = student.statut === "Archivé" ? "Archivé" : "Archiver"; archive.disabled = student.statut === "Archivé";
  archive.addEventListener("click", () => { storage.archiveStudent(student.id); renderStudents(); });
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

  if (students.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = database.students.length ? "Aucun étudiant ne correspond à ta recherche." : "Aucun étudiant accompagné pour le moment.";
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

initializeStatusFilter();
renderPointAxes();
renderStudents();
initializeGoogleAgenda();

parcoursSelect.addEventListener("change", () => showParcoursFields(parcoursSelect.value));
fileInput.addEventListener("change", () => { fileStatus.textContent = fileInput.files?.[0]?.name || "Aucun fichier sélectionné."; });
addButton.addEventListener("click", () => openForm());
closeButton.addEventListener("click", closeForm);
cancelButton.addEventListener("click", closeForm);

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
    setAgendaMessage("Utilisez une URL d’intégration Google Agenda valide ou son code iframe complet.", "error");
    return;
  }

  const database = storage.getDatabase();
  database.settings = { ...database.settings, googleAgendaEmbedUrl: validUrl };
  storage.saveDatabase(database);
  agendaEmbedInput.value = validUrl;
  renderGoogleAgenda(validUrl);
  setAgendaMessage("L’agenda a été enregistré.", "success");
});

openAgendaButton.addEventListener("click", () => {
  const agendaUrl = getStoredAgendaUrl();
  if (!agendaUrl) {
    setAgendaMessage("Ajoute d’abord une URL Google Agenda.", "error");
    return;
  }
  window.open(agendaUrl, "_blank", "noopener,noreferrer");
});

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
  const parcours = data.get("parcours");
  const selectedFile = fileInput.files?.[0];
  const existing = editingStudentId ? storage.getStudentById(editingStudentId) : null;
  const studentData = {
    prenom: value(data, "prenom"), nom: value(data, "nom"), email: value(data, "email"), ifmk: value(data, "ifmk"), telephone: value(data, "telephone"), dateDebut: data.get("dateDebut") || "", echeance: data.get("echeance") || "", parcours, thematiqueMemoire: value(data, "thematiqueMemoire"), statut: data.get("statut") || "En cours", statutSuivi: data.get("statutSuivi") || "nouveau", urgentManuel: data.get("urgentManuel") === "on", notesInitiales: value(data, "notesInitiales"), donneesParcours: collectParcoursData(parcours, data), memoireImporte: selectedFile ? { nom: selectedFile.name, type: selectedFile.type, taille: selectedFile.size } : existing?.memoireImporte || null,
    livrablesK4: parcours === "k4" ? existing?.livrablesK4 || window.LivrablesK4.getLivrablesK4() : existing?.livrablesK4 || null,
  };

  if (editingStudentId) storage.updateStudent(editingStudentId, studentData);
  else if (convertingProspectId) storage.convertProspectToStudent(convertingProspectId, studentData);
  else storage.createStudent(studentData);
  formMessage.textContent = editingStudentId ? "La fiche étudiant a été mise à jour." : (convertingProspectId ? "Le prospect a été converti en étudiant." : "La fiche étudiant a été créée.");
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
