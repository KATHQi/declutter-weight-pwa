const DB_NAME = "declutter-weight-db";
const STORE_NAME = "entries";
const DB_VERSION = 1;

let selectedDirection = "outgoing";

const elements = {
  todayNet: document.getElementById("todayNet"),
  totalNet: document.getElementById("totalNet"),
  todayOutgoing: document.getElementById("todayOutgoing"),
  todayIncoming: document.getElementById("todayIncoming"),
  entryList: document.getElementById("entryList"),
  emptyState: document.getElementById("emptyState"),
  entryForm: document.getElementById("entryForm"),
  weight: document.getElementById("weight"),
  category: document.getElementById("category"),
  note: document.getElementById("note"),
  outgoingBtn: document.getElementById("outgoingBtn"),
  incomingBtn: document.getElementById("incomingBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  storageBtn: document.getElementById("storageBtn"),
  storageDialog: document.getElementById("storageDialog"),
  storageStatus: document.getElementById("storageStatus"),
  closeDialogBtn: document.getElementById("closeDialogBtn"),
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("direction", "direction", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addEntry(entry) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteEntry(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllEntries() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKg(grams) {
  const sign = grams < 0 ? "-" : "";
  const abs = Math.abs(grams);
  return `${sign}${(abs / 1000).toFixed(2)} kg`;
}

function computeStats(entries) {
  const today = getLocalDateString();

  let todayIncoming = 0;
  let todayOutgoing = 0;
  let totalIncoming = 0;
  let totalOutgoing = 0;

  for (const entry of entries) {
    if (entry.direction === "incoming") {
      totalIncoming += entry.weightInGrams;
      if (entry.date === today) todayIncoming += entry.weightInGrams;
    }

    if (entry.direction === "outgoing") {
      totalOutgoing += entry.weightInGrams;
      if (entry.date === today) todayOutgoing += entry.weightInGrams;
    }
  }

  return {
    todayIncoming,
    todayOutgoing,
    todayNetReduction: todayOutgoing - todayIncoming,
    totalNetReduction: totalOutgoing - totalIncoming,
  };
}

function setDirection(direction) {
  selectedDirection = direction;

  elements.outgoingBtn.classList.toggle("active", direction === "outgoing");
  elements.incomingBtn.classList.toggle("active", direction === "incoming");
}

function renderEntries(entries) {
  elements.entryList.innerHTML = "";
  elements.emptyState.hidden = entries.length > 0;

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  for (const entry of sorted.slice(0, 50)) {
    const li = document.createElement("li");
    li.className = `entry-item ${entry.direction === "outgoing" ? "entry-outgoing" : "entry-incoming"}`;

    const main = document.createElement("div");
    main.className = "entry-main";

    const line = document.createElement("div");
    line.className = "entry-line";

    const direction = document.createElement("span");
    direction.className = "entry-direction";
    direction.textContent = entry.direction === "incoming" ? "带回家" : "离开家";

    const weight = document.createElement("span");
    weight.className = "entry-weight";
    weight.textContent = formatKg(entry.weightInGrams);

    line.append(direction, weight);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.textContent = `${entry.date} · ${entry.category}${entry.note ? " · " + entry.note : ""}`;

    main.append(line, meta);

    const del = document.createElement("button");
    del.className = "entry-delete-button";
    del.type = "button";
    del.innerHTML = "×";
    del.setAttribute("aria-label", "删除记录");
    del.addEventListener("click", async () => {
      const ok = confirm("删除这条记录？");
      if (!ok) return;
      await deleteEntry(entry.id);
      await render();
    });

    li.append(main, del);
    elements.entryList.appendChild(li);
  }
}

async function render() {
  const entries = await getAllEntries();
  const stats = computeStats(entries);

  elements.todayNet.textContent = formatKg(stats.todayNetReduction);
  elements.totalNet.textContent = formatKg(stats.totalNetReduction);
  elements.todayOutgoing.textContent = formatKg(stats.todayOutgoing);
  elements.todayIncoming.textContent = formatKg(stats.todayIncoming);

  renderEntries(entries);
}

async function checkStoragePersistence() {
  let message = "";

  if (!navigator.storage) {
    message = "当前浏览器不支持 StorageManager API。数据仍会保存在 IndexedDB，但无法检查持久化状态。";
    return message;
  }

  let estimateText = "";
  if (navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usedMB = estimate.usage ? (estimate.usage / 1024 / 1024).toFixed(2) : "未知";
    const quotaMB = estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(2) : "未知";
    estimateText = `\n\n当前估计用量：${usedMB} MB；可用配额：${quotaMB} MB。`;
  }

  if (!navigator.storage.persisted || !navigator.storage.persist) {
    return "当前浏览器不支持持久化存储请求。数据会以浏览器默认策略保存。" + estimateText;
  }

  const alreadyPersistent = await navigator.storage.persisted();
  if (alreadyPersistent) {
    return "当前站点已经处于 persistent storage 模式。一般只有你主动清理网站数据时才会删除。" + estimateText;
  }

  const granted = await navigator.storage.persist();
  if (granted) {
    return "已请求并获得 persistent storage。一般只有你主动清理网站数据时才会删除。" + estimateText;
  }

  return "浏览器没有授予 persistent storage。数据仍会保存在 IndexedDB，但在极端存储压力下可能被系统清理。建议：添加到主屏幕，并保持偶尔打开。" + estimateText;
}

elements.outgoingBtn.addEventListener("click", () => setDirection("outgoing"));
elements.incomingBtn.addEventListener("click", () => setDirection("incoming"));

elements.entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const weightKg = Number(elements.weight.value);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    alert("请输入有效重量。");
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    date: getLocalDateString(),
    direction: selectedDirection,
    weightInGrams: Math.round(weightKg * 1000),
    category: elements.category.value,
    note: elements.note.value.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await addEntry(entry);

  elements.weight.value = "";
  elements.note.value = "";
  elements.weight.focus();

  await render();
});

elements.refreshBtn.addEventListener("click", render);

elements.storageBtn.addEventListener("click", async () => {
  elements.storageStatus.textContent = "正在检查……";
  elements.storageDialog.showModal();
  elements.storageStatus.textContent = await checkStoragePersistence();
});

elements.closeDialogBtn.addEventListener("click", () => {
  elements.storageDialog.close();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}

setDirection("outgoing");
render().catch((error) => {
  console.error(error);
  alert("读取本地数据失败。请检查浏览器是否允许网站存储。");
});
