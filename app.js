const STORAGE_KEY = "redacImrad.memoires";
const TEXT_DB_NAME = "redacImrad";
const TEXT_STORE_NAME = "textes";
const EXTRACTION_ERROR =
  "Impossible de lire ce fichier. Vérifie qu'il s'agit bien d'un fichier .docx ou .pdf valide.";

const SECTION_DEFINITIONS = [
  { key: "introduction", title: "Introduction", patterns: ["introduction"] },
  { key: "methode", title: "Méthode", patterns: ["méthode", "methode", "matériel et méthode", "materiel et methode", "méthodologie", "methodologie"] },
  { key: "resultats", title: "Résultats", patterns: ["résultats", "resultats"] },
  { key: "discussion", title: "Discussion", patterns: ["discussion"] },
  { key: "conclusion", title: "Conclusion", patterns: ["conclusion"] },
  { key: "bibliographie", title: "Bibliographie", patterns: ["bibliographie", "références", "references"] },
];

const importTrigger = document.querySelector("#import-trigger");
const fileInput = document.querySelector("#memoire-file");
const memoireList = document.querySelector("#memoire-list");
const emptyState = document.querySelector("#empty-memoire-state");
const memoireCount = document.querySelector("#memoire-count");
const memoireCountLabel = document.querySelector("#memoire-count-label");

let memoires = loadMemoires();
const fileRegistry = new Map();

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripDiacritics(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadMemoires() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMemoires() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memoires));
}

function openTextDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TEXT_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(TEXT_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLargeText(id, text) {
  const db = await openTextDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TEXT_STORE_NAME, "readwrite");
    transaction.objectStore(TEXT_STORE_NAME).put(text, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function loadLargeText(id) {
  const db = await openTextDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TEXT_STORE_NAME, "readonly");
    const request = transaction.objectStore(TEXT_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || "");
    request.onerror = () => reject(request.error);
  });
}

async function deleteLargeText(id) {
  const db = await openTextDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TEXT_STORE_NAME, "readwrite");
    transaction.objectStore(TEXT_STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function saveExtractedText(memoire, text) {
  memoire.texteExtrait = text;

  try {
    saveMemoires();
    return;
  } catch {
    memoire.texteExtrait = "";
    memoire.texteStockage = "indexedDB";
    await saveLargeText(memoire.id, text);
    saveMemoires();
  }
}

function getMemoire(id) {
  return memoires.find((memoire) => memoire.id === id);
}

function createInfo(label, value) {
  const item = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");

  term.textContent = label;
  description.textContent = value;
  item.append(term, description);

  return { item, description };
}

function updateMemoireCount() {
  if (!memoireCount || !memoireCountLabel) {
    return;
  }

  memoireCount.textContent = String(memoires.length);
  memoireCountLabel.textContent =
    memoires.length === 0
      ? "Aucun document n’a encore été ajouté."
      : `${memoires.length} mémoire${memoires.length > 1 ? "s" : ""} à relire.`;
}

function updateEmptyState() {
  if (emptyState) {
    emptyState.hidden = memoires.length > 0;
  }
}

function getApproxLength(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function getSectionComment(sectionTitle, detected) {
  if (!detected) {
    return `Section ${sectionTitle} non repérée automatiquement. Une vérification humaine reste nécessaire.`;
  }

  return `Section ${sectionTitle} détectée. Analyse méthodologique détaillée non encore disponible.`;
}

function getCriteriaForSection(sectionKey) {
  return window.GRILLES_IMRAD?.getCriteria(sectionKey) || [];
}

function findSectionStarts(text) {
  const lines = text.split("\n");
  const starts = [];
  let cursor = 0;

  lines.forEach((line) => {
    const cleanLine = line.trim();
    const normalizedLine = stripDiacritics(cleanLine).toLowerCase();

    SECTION_DEFINITIONS.forEach((definition) => {
      const found = definition.patterns.some((pattern) => {
        const normalizedPattern = stripDiacritics(pattern).toLowerCase();
        return new RegExp(`^(\\d+[.)]?\\s*)?${escapeRegExp(normalizedPattern)}\\b`).test(normalizedLine);
      });

      if (found) {
        starts.push({
          key: definition.key,
          index: cursor,
          title: definition.title,
          heading: cleanLine,
        });
      }
    });

    cursor += line.length + 1;
  });

  return starts.sort((a, b) => a.index - b.index);
}

function detectSections(text) {
  const starts = findSectionStarts(text);

  return SECTION_DEFINITIONS.map((definition) => {
    const startIndex = starts.findIndex((start) => start.key === definition.key);

    if (startIndex === -1) {
      return {
        key: definition.key,
        title: definition.title,
        detected: false,
        approximateLength: 0,
        excerpt: "",
        comment: getSectionComment(definition.title, false),
      };
    }

    const start = starts[startIndex];
    const nextStart = starts.find((candidate) => candidate.index > start.index);
    const content = normalizeText(text.slice(start.index, nextStart?.index || text.length));

    return {
      key: definition.key,
      title: definition.title,
      detected: true,
      approximateLength: getApproxLength(content),
      excerpt: content.slice(0, 420),
      comment: getSectionComment(definition.title, true),
    };
  });
}

function buildReport(memoire, text) {
  const sections = detectSections(text).map((section) => ({
    ...section,
    criteres: getCriteriaForSection(section.key),
  }));
  const detectedCount = sections.filter((section) => section.detected).length;

  return {
    generatedAt: new Date().toISOString(),
    title: memoire.fileName,
    globalSummary: {
      detectedSections: detectedCount,
      totalSections: sections.length,
      approximateLength: getApproxLength(text),
      comment:
        detectedCount === 0
          ? "Aucune section repérée automatiquement. Tu peux remplir la grille à la main."
          : "Rapport provisoire généré à partir des titres repérés. Cette analyse à vérifier sert d’aide à la relecture.",
      criteres: getCriteriaForSection("syntheseGlobale"),
    },
    sections,
    vigilancePoints: [
      detectedCount === sections.length
        ? "Toutes les sections attendues ont été repérées automatiquement, sous réserve de validation humaine."
        : "Certaines sections attendues ne sont pas repérées automatiquement.",
      "Le repérage se base sur les titres visibles dans le texte extrait.",
    ],
    correctionPriorities: [
      "Vérifier que les titres détectés correspondent bien aux parties du mémoire.",
      "Confirmer la lisibilité du texte extrait avant toute analyse de conformité IMRaD.",
    ],
  };
}

function decodeXmlEntities(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

async function inflateData(data, format = "deflate-raw") {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readUint16(data, offset) {
  return data[offset] | (data[offset + 1] << 8);
}

function readUint32(data, offset) {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

async function extractDocxText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const decoder = new TextDecoder("utf-8");
  const entries = [];

  for (let offset = 0; offset < data.length - 46; offset += 1) {
    if (readUint32(data, offset) !== 0x02014b50) {
      continue;
    }

    const compression = readUint16(data, offset + 10);
    const compressedSize = readUint32(data, offset + 20);
    const fileNameLength = readUint16(data, offset + 28);
    const extraLength = readUint16(data, offset + 30);
    const commentLength = readUint16(data, offset + 32);
    const localHeaderOffset = readUint32(data, offset + 42);
    const fileName = decoder.decode(data.slice(offset + 46, offset + 46 + fileNameLength));

    entries.push({ compression, compressedSize, fileName, localHeaderOffset });
    offset += 45 + fileNameLength + extraLength + commentLength;
  }

  const documentEntry = entries.find((entry) => entry.fileName === "word/document.xml");

  if (!documentEntry) {
    throw new Error("Document DOCX illisible");
  }

  const localOffset = documentEntry.localHeaderOffset;
  const localFileNameLength = readUint16(data, localOffset + 26);
  const localExtraLength = readUint16(data, localOffset + 28);
  const dataStart = localOffset + 30 + localFileNameLength + localExtraLength;
  const compressedData = data.slice(dataStart, dataStart + documentEntry.compressedSize);
  const xmlData =
    documentEntry.compression === 0
      ? compressedData
      : documentEntry.compression === 8
        ? await inflateData(compressedData)
        : null;

  if (!xmlData) {
    throw new Error("Compression DOCX non prise en charge");
  }

  const xml = decoder.decode(xmlData);
  const withBreaks = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br\/>/g, "\n");
  const text = decodeXmlEntities(withBreaks.replace(/<[^>]+>/g, ""));

  return normalizeText(text);
}

function decodePdfString(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractPdfStringsFromText(text) {
  const parts = [];

  for (const match of text.matchAll(/\((?:\\.|[^\\)]){2,}\)/g)) {
    parts.push(decodePdfString(match[0].slice(1, -1)));
  }

  for (const match of text.matchAll(/<([0-9a-fA-F]{8,})>/g)) {
    const hex = match[1];
    let decoded = "";
    for (let index = 0; index < hex.length - 1; index += 2) {
      const code = parseInt(hex.slice(index, index + 2), 16);
      if (code >= 32 && code <= 126) {
        decoded += String.fromCharCode(code);
      }
    }
    if (decoded.length > 2) {
      parts.push(decoded);
    }
  }

  return parts;
}

function trimPdfStreamBytes(data) {
  let end = data.length;

  while (end > 0 && (data[end - 1] === 10 || data[end - 1] === 13 || data[end - 1] === 32)) {
    end -= 1;
  }

  return data.slice(0, end);
}

async function extractPdfText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const binary = new TextDecoder("latin1").decode(bytes);
  const parts = extractPdfStringsFromText(binary);
  const streamPattern = /<<(?:.|\n|\r)*?\/FlateDecode(?:.|\n|\r)*?>>\s*stream\r?\n/g;
  let streamMatch;

  while ((streamMatch = streamPattern.exec(binary))) {
    const start = streamPattern.lastIndex;
    const end = binary.indexOf("endstream", start);

    if (end === -1) {
      break;
    }

    try {
      const inflated = await inflateData(trimPdfStreamBytes(bytes.slice(start, end)), "deflate");
      const streamText = new TextDecoder("latin1").decode(inflated);
      parts.push(...extractPdfStringsFromText(streamText));
    } catch {
      // Some PDF streams use filters or encodings this local extractor does not support yet.
    }
  }

  return normalizeText(parts.join(" "));
}

async function extractText(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const text =
    extension === "docx"
      ? await extractDocxText(file)
      : extension === "pdf"
        ? await extractPdfText(file)
        : "";

  if (!text || text.length < 50) {
    throw new Error(EXTRACTION_ERROR);
  }

  return text;
}

function setCardState(messageElement, statusValue, message, status) {
  messageElement.textContent = message;
  messageElement.hidden = false;
  if (status) {
    statusValue.textContent = status;
  }
}

function waitForPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function analyzeMemoire(memoire, statusValue, messageElement, analyzeButton, openLink) {
  const file = fileRegistry.get(memoire.id);

  if (!file) {
    setCardState(messageElement, statusValue, "Le fichier doit être réimporté pour lancer l’analyse locale.", memoire.status);
    return;
  }

  analyzeButton.disabled = true;

  try {
    setCardState(messageElement, statusValue, "Extraction du texte en cours", memoire.status);
    await waitForPaint();
    const text = await extractText(file);
    await saveExtractedText(memoire, text);

    setCardState(messageElement, statusValue, "Repérage des sections IMRaD", memoire.status);
    await waitForPaint();
    const report = buildReport(memoire, text);

    memoire.report = report;
    memoire.status = "Rapport provisoire à vérifier";
    memoire.analyzedAt = report.generatedAt;
    saveMemoires();

    setCardState(messageElement, statusValue, "Rapport provisoire généré", memoire.status);
    openLink.href = `rapport-memoire.html?id=${encodeURIComponent(memoire.id)}`;
    openLink.removeAttribute("aria-disabled");
  } catch (error) {
    const message = error.message || EXTRACTION_ERROR;
    setCardState(messageElement, statusValue, message, memoire.status);
  } finally {
    analyzeButton.disabled = false;
  }
}

function createMemoireCard(memoire) {
  const card = document.createElement("article");
  card.className = "memoire-card";
  card.dataset.memoireId = memoire.id;

  const heading = document.createElement("h3");
  heading.textContent = memoire.fileName;

  const details = document.createElement("dl");
  details.className = "memoire-card-details";

  const typeInfo = createInfo("Type", memoire.type || "À renseigner");
  const statusInfo = createInfo("Statut", memoire.status);
  const scoreInfo = createInfo("Score", "Non disponible pour le moment");

  details.append(typeInfo.item, statusInfo.item, scoreInfo.item);

  const analysisState = document.createElement("p");
  analysisState.className = "analysis-state";
  analysisState.hidden = true;

  const actions = document.createElement("div");
  actions.className = "memoire-card-actions";

  const analyzeButton = document.createElement("button");
  analyzeButton.className = "primary-action";
  analyzeButton.type = "button";
  analyzeButton.textContent = "Analyser le mémoire";

  const contextLink = document.createElement("a");
  contextLink.className = "secondary-action";
  contextLink.href = `contexte-etudiant.html?id=${encodeURIComponent(memoire.id)}`;
  contextLink.textContent = "Contexte étudiant";

  const openLink = document.createElement("a");
  openLink.className = "secondary-action";
  openLink.href = memoire.report ? `rapport-memoire.html?id=${encodeURIComponent(memoire.id)}` : "rapport-memoire.html";
  openLink.textContent = "Ouvrir";

  const deleteButton = document.createElement("button");
  deleteButton.className = "destructive-action";
  deleteButton.type = "button";
  deleteButton.textContent = "Supprimer définitivement";

  analyzeButton.addEventListener("click", () => {
    analyzeMemoire(memoire, statusInfo.description, analysisState, analyzeButton, openLink);
  });

  deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm("Supprimer définitivement cet élément ? Cette action est irréversible.");
    if (!confirmed) return;
    memoires = memoires.filter((item) => item.id !== memoire.id);
    fileRegistry.delete(memoire.id);
    await deleteLargeText(memoire.id).catch(() => {});
    saveMemoires();
    card.remove();
    updateMemoireCount();
    updateEmptyState();
  });

  actions.append(analyzeButton, contextLink, openLink, deleteButton);
  card.append(heading, details, analysisState, actions);

  return card;
}

function renderMemoires() {
  if (!memoireList) {
    return;
  }

  memoireList.querySelectorAll(".memoire-card").forEach((card) => card.remove());
  memoires.forEach((memoire) => {
    memoireList.append(createMemoireCard(memoire));
  });
  updateMemoireCount();
  updateEmptyState();
}

function addMemoire(file) {
  const memoire = {
    id: globalThis.crypto?.randomUUID?.() || `memoire-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fileName: file.name,
    type: "À renseigner",
    status: "Mémoire importé — analyse non commencée",
    texteExtrait: "",
    texteStockage: "localStorage",
    report: null,
    createdAt: new Date().toISOString(),
  };

  memoires.push(memoire);
  fileRegistry.set(memoire.id, file);
  saveMemoires();
  renderMemoires();
}

importTrigger?.addEventListener("click", () => {
  fileInput.click();
});

document.querySelectorAll("[data-secondary-import]").forEach((button) => {
  button.addEventListener("click", () => fileInput?.click());
});

fileInput?.addEventListener("change", () => {
  const file = fileInput.files?.[0];

  if (!file) {
    return;
  }

  addMemoire(file);
  fileInput.value = "";
});

renderMemoires();

window.redacImrad = {
  buildReport,
  detectSections,
  extractPdfText,
  extractDocxText,
  getMemoire,
  loadLargeText,
};
