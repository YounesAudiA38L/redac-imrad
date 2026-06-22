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

let currentFilter = "tous";
let editingStudentId = null;

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
  studentForm.reset();
  showParcoursFields("");
  formWorkspace.hidden = true;
  history.replaceState({}, "", "index.html");
}

function setField(name, value) {
  const field = studentForm.elements.namedItem(name);
  if (field) field.value = value ?? "";
}

function setChecked(name, values) {
  const selected = new Set(values || []);
  studentForm.querySelectorAll(`input[type="checkbox"][name="${name}"]`).forEach((checkbox) => {
    checkbox.checked = selected.has(checkbox.value);
  });
}

function populateForm(student) {
  ["prenom", "nom", "email", "ifmk", "telephone", "dateDebut", "parcours", "thematiqueMemoire", "statut", "notesInitiales"].forEach((name) => setField(name, student[name]));
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
  card.className = "student-card";
  card.dataset.studentCategory = student.parcours;

  const header = document.createElement("div");
  const category = document.createElement("span"); category.className = "category-label"; category.textContent = parcoursLabels[student.parcours] || student.parcours;
  const name = document.createElement("h3"); name.textContent = `${student.prenom} ${student.nom}`.trim() || "Étudiant sans nom";
  header.append(category, name);

  const details = document.createElement("dl");
  [["Début d’accompagnement", student.dateDebut || "À renseigner"], ["Statut", student.statut], ["Thématique", student.thematiqueMemoire || "À renseigner"]].forEach(([label, content]) => {
    const row = document.createElement("div"); const term = document.createElement("dt"); const description = document.createElement("dd"); term.textContent = label; description.textContent = content; row.append(term, description); details.append(row);
  });

  const actions = document.createElement("div"); actions.className = "student-card-actions";
  const open = document.createElement("a"); open.className = "secondary-action"; open.href = `index.html?student=${encodeURIComponent(student.id)}`; open.textContent = "Ouvrir la fiche";
  const edit = document.createElement("a"); edit.className = "secondary-action"; edit.href = `index.html?student=${encodeURIComponent(student.id)}&edit=1`; edit.textContent = "Modifier le suivi";
  const archive = document.createElement("button"); archive.className = "secondary-action"; archive.type = "button"; archive.textContent = student.statut === "Archivé" ? "Archivé" : "Archiver"; archive.disabled = student.statut === "Archivé";
  archive.addEventListener("click", () => { storage.archiveStudent(student.id); renderStudents(); });
  actions.append(open, edit, archive);
  card.append(header, details, actions);
  return card;
}

function renderStudents() {
  const database = storage.getDatabase();
  const students = currentFilter === "tous" ? database.students : storage.getStudentsByParcours(currentFilter);
  studentList.textContent = "";
  activeCount.textContent = String(storage.getActiveStudents().length);

  if (students.length === 0) {
    const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Aucun étudiant accompagné dans cette catégorie."; studentList.append(empty); return;
  }
  students.forEach((student) => studentList.append(createStudentCard(student)));
}

renderPointAxes();
renderStudents();

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

studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(studentForm);
  const parcours = data.get("parcours");
  const selectedFile = fileInput.files?.[0];
  const existing = editingStudentId ? storage.getStudentById(editingStudentId) : null;
  const studentData = {
    prenom: value(data, "prenom"), nom: value(data, "nom"), email: value(data, "email"), ifmk: value(data, "ifmk"), telephone: value(data, "telephone"), dateDebut: data.get("dateDebut") || "", parcours, thematiqueMemoire: value(data, "thematiqueMemoire"), statut: data.get("statut") || "En cours", notesInitiales: value(data, "notesInitiales"), donneesParcours: collectParcoursData(parcours, data), memoireImporte: selectedFile ? { nom: selectedFile.name, type: selectedFile.type, taille: selectedFile.size } : existing?.memoireImporte || null,
    livrablesK4: parcours === "k4" ? existing?.livrablesK4 || window.LivrablesK4.getLivrablesK4() : existing?.livrablesK4 || null,
  };

  if (editingStudentId) storage.updateStudent(editingStudentId, studentData); else storage.createStudent(studentData);
  formMessage.textContent = editingStudentId ? "La fiche étudiant a été mise à jour." : "La fiche étudiant a été créée.";
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
