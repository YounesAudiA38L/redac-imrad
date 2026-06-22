const STORAGE_KEY = "redacImrad.memoires";

const form = document.querySelector("#student-context-form");
const message = document.querySelector("#context-message");
const fileName = document.querySelector("#context-file-name");
const contextStatus = document.querySelector("#context-status");
const progressRange = document.querySelector("#progress-range");
const progressOutput = document.querySelector("#progress-output");
const stressRange = document.querySelector("#stress-range");
const stressOutput = document.querySelector("#stress-output");

function loadMemoires() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getMemoireContext() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const memoires = loadMemoires();

  return {
    id,
    memoires,
    memoire: memoires.find((item) => item.id === id),
  };
}

function updateRange(range, output) {
  output.textContent = range.value;
}

function populateForm(context) {
  Object.entries(context || {}).forEach(([name, value]) => {
    if (name === "partiesCommencees") {
      const selected = new Set(value || []);
      form.querySelectorAll('[name="partiesCommencees"]').forEach((checkbox) => {
        checkbox.checked = selected.has(checkbox.value);
      });
      return;
    }

    if (name === "questionsEtudiant") {
      value.forEach((question, index) => {
        const field = form.elements.namedItem(`questionEtudiant${index + 1}`);
        if (field) {
          field.value = question || "";
        }
      });
      return;
    }

    const field = form.elements.namedItem(name);
    if (field && typeof value !== "object") {
      field.value = value ?? "";
    }
  });

  updateRange(progressRange, progressOutput);
  updateRange(stressRange, stressOutput);
}

function collectContext() {
  const data = new FormData(form);

  return {
    identiteEtudiant: data.get("identiteEtudiant")?.trim() || "",
    email: data.get("email")?.trim() || "",
    ifmk: data.get("ifmk")?.trim() || "",
    niveau: data.get("niveau") || "",
    situationActuelle: data.get("situationActuelle")?.trim() || "",
    echeanceImportante: data.get("echeanceImportante")?.trim() || "",
    niveauAvancement: Number(data.get("niveauAvancement") || 0),
    niveauStress: Number(data.get("niveauStress") || 0),
    themeGeneral: data.get("themeGeneral")?.trim() || "",
    sujetActuel: data.get("sujetActuel")?.trim() || "",
    sujetValide: data.get("sujetValide") || "",
    questionRecherche: data.get("questionRecherche")?.trim() || "",
    methodeEnvisagee: data.get("methodeEnvisagee")?.trim() || "",
    typeMemoire: data.get("typeMemoire") || "",
    rechercheBibliographiqueCommencee: data.get("rechercheBibliographiqueCommencee") || "",
    basesDonnees: data.get("basesDonnees")?.trim() || "",
    motsCles: data.get("motsCles")?.trim() || "",
    nombreArticles: Number(data.get("nombreArticles") || 0),
    partiesCommencees: data.getAll("partiesCommencees"),
    blocagePrincipal: data.get("blocagePrincipal")?.trim() || "",
    prioriteVisio: data.get("prioriteVisio")?.trim() || "",
    questionsEtudiant: [
      data.get("questionEtudiant1")?.trim() || "",
      data.get("questionEtudiant2")?.trim() || "",
      data.get("questionEtudiant3")?.trim() || "",
    ],
    documentsTransmis: data.get("documentsTransmis")?.trim() || "",
    notesRelecture: data.get("notesRelecture")?.trim() || "",
    updatedAt: new Date().toISOString(),
  };
}

const state = getMemoireContext();

if (!state.memoire) {
  fileName.textContent = "Mémoire introuvable";
  contextStatus.textContent = "Retourner à l’Accueil";
  form.querySelectorAll("input, select, textarea, button").forEach((field) => {
    field.disabled = true;
  });
  message.textContent = "Le mémoire correspondant à cet identifiant n’a pas été trouvé.";
  message.hidden = false;
} else {
  fileName.textContent = state.memoire.fileName;
  contextStatus.textContent = state.memoire.contexteEtudiant ? "Contexte enregistré" : "Contexte à renseigner";
  populateForm(state.memoire.contexteEtudiant);
}

progressRange.addEventListener("input", () => updateRange(progressRange, progressOutput));
stressRange.addEventListener("input", () => updateRange(stressRange, stressOutput));

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.memoire) {
    return;
  }

  state.memoire.contexteEtudiant = collectContext();
  if (state.memoire.contexteEtudiant.typeMemoire) {
    state.memoire.type = state.memoire.contexteEtudiant.typeMemoire;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.memoires));
    contextStatus.textContent = "Contexte enregistré";
    message.textContent = "Le contexte étudiant a été enregistré localement.";
    message.hidden = false;
  } catch {
    message.textContent = "Le contexte n’a pas pu être enregistré dans le stockage local.";
    message.hidden = false;
  }
});
