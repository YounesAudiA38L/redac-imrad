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
const globalSearchInput = document.querySelector("#global-search-input");
const globalSearchResults = document.querySelector("#global-search-results");
const quickProspectForm = document.querySelector("#quick-prospect-form");
const quickProspectMessage = document.querySelector("#quick-prospect-message");
const urgentCount = document.querySelector("#urgent-count");
const todoList = document.querySelector("#todo-list");
const deadlinesList = document.querySelector("#deadlines-list");
const notificationsList = document.querySelector("#notifications-list");
const agendaEmbedInput = document.querySelector("#google-agenda-embed-input");
const saveAgendaButton = document.querySelector("#save-google-agenda");
const openAgendaButton = document.querySelector("#open-google-agenda");
const agendaMessage = document.querySelector("#google-agenda-message");
const agendaPreview = document.querySelector("#google-agenda-preview");

let currentFilter = "tous";
let currentStatusFilter = "tous";
let editingStudentId = null;
let convertingProspectId = null;

const parcoursLabels = {
  "point-memoire": "Point Mémoire",
  k4: "K4",
  k5: "K5",
  rattrapage: "Rattrapage",
};

const pointAxisLabels = {
  "recherche-bibliographique": "Bibliographie",
  "soutenance-jury": "Soutenance",
};

const allowedAgendaPaths = new Set([
  "/calendar/embed",
  "/calendar/u/0/embed",
  "/calendar/u/1/embed",
]);

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
  const students = database.students.filter((student) => {
    const parcoursMatches = currentFilter === "tous" || student.parcours === currentFilter;
    const statusMatches = currentStatusFilter === "tous" || student.statutSuivi === currentStatusFilter;
    return parcoursMatches && statusMatches;
  });
  studentList.textContent = "";
  renderPilotage(database);

  if (students.length === 0) {
    const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Aucun étudiant accompagné dans cette catégorie."; studentList.append(empty); return;
  }
  students.forEach((student) => studentList.append(createStudentCard(student)));
}

function hasUrgentStatus(item) {
  return normalizeSearchText(item?.statut).includes("urgent");
}

function appendMetricRow(container, label, count, tone = "") {
  const row = document.createElement("div");
  row.className = `accueil-todo-row${tone ? ` ${tone}` : ""}`;
  const text = document.createElement("span");
  text.textContent = label;
  const value = document.createElement("strong");
  value.textContent = String(count);
  row.append(text, value);
  container.append(row);
}

function getDeadlineValue(student) {
  return student.echeance
    || student.dateEcheance
    || student.donneesParcours?.echeance
    || student.questionnairePreVisioK4?.echeance
    || student.donneesParcours?.questionnaire?.echeance
    || "";
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 45);
  const deadlines = students
    .map((student) => ({ student, date: parseDateValue(getDeadlineValue(student)) }))
    .filter(({ date }) => date && date >= today && date <= limit)
    .sort((left, right) => left.date - right.date);

  if (!deadlines.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune échéance proche renseignée.";
    deadlinesList.append(empty);
    return;
  }

  deadlines.forEach(({ student, date }) => {
    const row = document.createElement("article");
    row.className = "accueil-info-row";
    const name = document.createElement("strong");
    name.textContent = `${student.prenom || ""} ${student.nom || ""}`.trim() || "Étudiant sans nom";
    const detail = document.createElement("span");
    detail.textContent = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    row.append(name, detail);
    deadlinesList.append(row);
  });
}

function renderNotifications(notifications) {
  notificationsList.textContent = "";
  if (!notifications.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune notification pour le moment.";
    notificationsList.append(empty);
    return;
  }

  notifications.slice(0, 6).forEach((notification) => {
    const row = document.createElement("article");
    row.className = "accueil-info-row";
    const content = document.createElement("strong");
    content.textContent = typeof notification === "string"
      ? notification
      : notification?.message || notification?.texte || notification?.title || notification?.titre || "Notification";
    const dateValue = notification && typeof notification === "object" ? notification.date || notification.createdAt || notification.dateCreation : "";
    row.append(content);
    if (dateValue) {
      const date = document.createElement("span");
      date.textContent = parseDateValue(dateValue)?.toLocaleDateString("fr-FR") || String(dateValue);
      row.append(date);
    }
    notificationsList.append(row);
  });
}

function renderPilotage(database) {
  const activeStudents = database.students.filter((student) => normalizeSearchText(student.statut) !== "archive");
  const urgentTotal = activeStudents.filter(storage.isUrgent).length + database.prospects.filter(hasUrgentStatus).length;
  activeCount.textContent = String(activeStudents.length);
  urgentCount.textContent = String(urgentTotal);

  const pendingProspectQuestionnaires = database.prospects.filter((prospect) => {
    const status = normalizeSearchText(prospect.statut);
    return prospect.questionnaireEnvoye === true && prospect.questionnaireRepondu !== true && status !== "converti en etudiant" && status !== "archive";
  }).length;
  const pendingStudentQuestionnaires = activeStudents.filter((student) => {
    const questionnaire = student.questionnairePreVisioK4;
    return questionnaire && questionnaire.sendStatus !== "non envoyé" && questionnaire.responseStatus !== "réponse reçue";
  }).length;
  const prospectsToRelance = database.prospects.filter((prospect) => {
    const status = normalizeSearchText(prospect.statut);
    return prospect.questionnaireEnvoye === true && prospect.questionnaireRepondu !== true && status !== "converti en etudiant" && status !== "archive";
  }).length;
  const memoiresToAnalyze = activeStudents.filter((student) => {
    const analysisStatus = normalizeSearchText(student.memoireImporte?.statut || student.analyseStatut || student.statutAnalyse);
    return Boolean(student.memoireImporte) && ["a analyser", "analyse non commencee", "non commence"].includes(analysisStatus);
  }).length;

  todoList.textContent = "";
  appendMetricRow(todoList, "Questionnaires en attente de réponse", pendingProspectQuestionnaires + pendingStudentQuestionnaires, "is-waiting");
  appendMetricRow(todoList, "Relances prospects à préparer", prospectsToRelance, "is-relance");
  appendMetricRow(todoList, "Mémoires à analyser", memoiresToAnalyze, "is-analysis");
  renderDeadlines(activeStudents);
  renderNotifications(database.notifications);
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
}

function matchesSearch(item, fields, query) {
  return fields.some((field) => normalizeSearchText(item[field]).includes(query));
}

function appendSearchDetail(list, label, content) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = content || "À renseigner";
  row.append(term, detail);
  list.append(row);
}

function createSearchResultCard(item, type) {
  const card = document.createElement("article");
  card.className = "quick-search-card";
  const heading = document.createElement("h4");
  heading.textContent = `${item.prenom || ""} ${item.nom || ""}`.trim() || (type === "student" ? "Étudiant sans nom" : "Prospect sans nom");
  const details = document.createElement("dl");
  appendSearchDetail(details, "Email", item.email);

  const actions = document.createElement("div");
  actions.className = "quick-search-actions";
  if (type === "student") {
    appendSearchDetail(details, "Parcours", parcoursLabels[item.parcours] || item.parcours);
    appendSearchDetail(details, "Statut de suivi", storage.getStatutSuiviLabel(item.statutSuivi));
    appendSearchDetail(details, "Date de début", item.dateDebut);
    const open = document.createElement("a");
    open.className = "secondary-action";
    open.href = `index.html?student=${encodeURIComponent(item.id)}`;
    open.textContent = "Ouvrir la fiche";
    const path = document.createElement("a");
    path.className = "secondary-action";
    path.href = { "point-memoire": "point-memoire.html", k4: "k4.html", k5: "k5.html", rattrapage: "rattrapage.html" }[item.parcours] || "index.html";
    path.textContent = "Voir dans parcours";
    actions.append(open, path);
  } else {
    appendSearchDetail(details, "Source", item.source);
    appendSearchDetail(details, "Statut", item.statut);
    appendSearchDetail(details, "Date de contact", item.dateContact);
    appendSearchDetail(details, "Questionnaire envoyé", item.questionnaireEnvoye === true ? "Oui" : "Non");
    const view = document.createElement("a");
    view.className = "secondary-action";
    view.href = `prospects.html?prospect=${encodeURIComponent(item.id)}`;
    view.textContent = "Voir dans Prospects";
    actions.append(view);
    if (normalizeSearchText(item.statut) !== "converti en etudiant") {
      const convert = document.createElement("button");
      convert.className = "primary-action";
      convert.type = "button";
      convert.textContent = "Convertir en étudiant";
      convert.addEventListener("click", () => openProspectConversion(item));
      actions.append(convert);
    }
  }
  card.append(heading, details, actions);
  return card;
}

function appendSearchGroup(title, items, type) {
  const section = document.createElement("section");
  section.className = "quick-search-group";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const list = document.createElement("div");
  list.className = "quick-search-list";
  items.forEach((item) => list.append(createSearchResultCard(item, type)));
  section.append(heading, list);
  globalSearchResults.append(section);
}

function renderGlobalSearch() {
  const query = normalizeSearchText(globalSearchInput.value.trim());
  globalSearchResults.textContent = "";
  if (!query) {
    const prompt = document.createElement("p");
    prompt.className = "empty-state";
    prompt.textContent = "Saisissez une recherche pour trouver un étudiant ou un prospect.";
    globalSearchResults.append(prompt);
    return;
  }

  const database = storage.getDatabase();
  const students = database.students.filter((student) => matchesSearch(student, ["prenom", "nom", "email", "telephone", "ifmk", "parcours", "statut", "statutSuivi"], query));
  const prospects = database.prospects.filter((prospect) => matchesSearch(prospect, ["prenom", "nom", "email", "telephone", "statut", "source", "parcoursInteresse"], query));
  if (!students.length && !prospects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucun étudiant ou prospect trouvé.";
    globalSearchResults.append(empty);
    return;
  }
  if (students.length) appendSearchGroup("Étudiants trouvés", students, "student");
  if (prospects.length) appendSearchGroup("Prospects trouvés", prospects, "prospect");
}

renderPointAxes();
renderStudents();
renderGlobalSearch();
initializeGoogleAgenda();

parcoursSelect.addEventListener("change", () => showParcoursFields(parcoursSelect.value));
fileInput.addEventListener("change", () => { fileStatus.textContent = fileInput.files?.[0]?.name || "Aucun fichier sélectionné."; });
addButton.addEventListener("click", () => openForm());
closeButton.addEventListener("click", closeForm);
cancelButton.addEventListener("click", closeForm);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.studentFilter;
    filterButtons.forEach((item) => { const selected = item === button; item.classList.toggle("active", selected); item.setAttribute("aria-pressed", String(selected)); });
    renderStudents();
  });
});

statusFilter.addEventListener("change", () => {
  currentStatusFilter = statusFilter.value;
  renderStudents();
});

globalSearchInput.addEventListener("input", renderGlobalSearch);

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
  renderGlobalSearch();
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
  renderGlobalSearch();
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
