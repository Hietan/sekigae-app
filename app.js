const STORAGE_KEY = "sekigae-seat-app-v1";

const defaultState = {
  rows: 5,
  cols: 6,
  studentsText: "",
  unavailableSeats: [],
  assignments: {},
  lockedSeats: [],
  editMode: false
};

const state = loadState();

const elements = {
  rowsInput: document.querySelector("#rowsInput"),
  colsInput: document.querySelector("#colsInput"),
  studentInput: document.querySelector("#studentInput"),
  seatGrid: document.querySelector("#seatGrid"),
  messageBox: document.querySelector("#messageBox"),
  studentCount: document.querySelector("#studentCount"),
  usableSeatCount: document.querySelector("#usableSeatCount"),
  emptySeatCount: document.querySelector("#emptySeatCount"),
  lockedSeatCount: document.querySelector("#lockedSeatCount"),
  shuffleAllBtn: document.querySelector("#shuffleAllBtn"),
  shuffleUnlockedBtn: document.querySelector("#shuffleUnlockedBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  applyLayoutBtn: document.querySelector("#applyLayoutBtn"),
  editLayoutBtn: document.querySelector("#editLayoutBtn"),
  printBtn: document.querySelector("#printBtn"),
  sampleBtn: document.querySelector("#sampleBtn")
};

let dragSourceSeat = null;

initialize();

function initialize() {
  syncInputsFromState();
  pruneStateForCurrentLayout();
  saveState();
  render();

  elements.rowsInput.addEventListener("change", applyLayout);
  elements.colsInput.addEventListener("change", applyLayout);
  elements.studentInput.addEventListener("input", handleStudentInput);
  elements.applyLayoutBtn.addEventListener("click", applyLayout);
  elements.editLayoutBtn.addEventListener("click", toggleEditMode);
  elements.shuffleAllBtn.addEventListener("click", shuffleAllSeats);
  elements.shuffleUnlockedBtn.addEventListener("click", shuffleUnlockedSeats);
  elements.clearBtn.addEventListener("click", clearAssignments);
  elements.printBtn.addEventListener("click", () => window.print());
  elements.sampleBtn.addEventListener("click", loadSampleRoster);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") {
      return { ...defaultState };
    }

    return {
      rows: sanitizeInteger(saved.rows, defaultState.rows),
      cols: sanitizeInteger(saved.cols, defaultState.cols),
      studentsText: typeof saved.studentsText === "string" ? saved.studentsText : "",
      unavailableSeats: Array.isArray(saved.unavailableSeats) ? saved.unavailableSeats : [],
      assignments: saved.assignments && typeof saved.assignments === "object" ? saved.assignments : {},
      lockedSeats: Array.isArray(saved.lockedSeats) ? saved.lockedSeats : [],
      editMode: false
    };
  } catch (error) {
    return { ...defaultState };
  }
}

function saveState() {
  const serializable = {
    rows: state.rows,
    cols: state.cols,
    studentsText: state.studentsText,
    unavailableSeats: state.unavailableSeats,
    assignments: state.assignments,
    lockedSeats: state.lockedSeats
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

function syncInputsFromState() {
  elements.rowsInput.value = String(state.rows);
  elements.colsInput.value = String(state.cols);
  elements.studentInput.value = state.studentsText;
}

function sanitizeInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(10, Math.max(1, number));
}

function parseStudents(text) {
  return text
    .split(/\n|,|，|、/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getSeatKey(row, col) {
  return `${row}-${col}`;
}

function getAllSeatKeys() {
  const keys = [];
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      keys.push(getSeatKey(row, col));
    }
  }
  return keys;
}

function getUsableSeatKeys() {
  const unavailable = new Set(state.unavailableSeats);
  return getAllSeatKeys().filter((key) => !unavailable.has(key));
}

function pruneStateForCurrentLayout() {
  const validSeats = new Set(getAllSeatKeys());

  state.unavailableSeats = state.unavailableSeats.filter((key) => validSeats.has(key));
  state.lockedSeats = state.lockedSeats.filter(
    (key) => validSeats.has(key) && !state.unavailableSeats.includes(key) && state.assignments[key]
  );

  state.assignments = Object.fromEntries(
    Object.entries(state.assignments).filter(([key, value]) => validSeats.has(key) && typeof value === "string" && value)
  );

  for (const key of state.unavailableSeats) {
    delete state.assignments[key];
  }
}

function applyLayout() {
  state.rows = sanitizeInteger(elements.rowsInput.value, state.rows);
  state.cols = sanitizeInteger(elements.colsInput.value, state.cols);
  pruneStateForCurrentLayout();
  saveState();
  render();
  setMessage("座席数を更新しました。編集モードで使わない席を指定できます。");
}

function handleStudentInput() {
  state.studentsText = elements.studentInput.value;
  saveState();
  renderSummary();
}

function toggleEditMode() {
  state.editMode = !state.editMode;
  render();
  setMessage(
    state.editMode
      ? "編集モードです。席をクリックすると使わない席に切り替わります。"
      : "編集モードを終了しました。"
  );
}

function loadSampleRoster() {
  const sample = [
    "青木 真央",
    "石田 陸",
    "上田 未来",
    "遠藤 陽菜",
    "大久保 翔",
    "加藤 凛",
    "川村 颯太",
    "木村 結衣",
    "小林 海斗",
    "斎藤 芽衣",
    "佐々木 悠真",
    "清水 花",
    "鈴木 湊",
    "高橋 琴音",
    "田中 新",
    "中村 美羽",
    "西村 蒼",
    "長谷川 凪",
    "林 千尋",
    "平野 蓮",
    "藤田 結菜",
    "松本 翼",
    "三浦 心春",
    "森 陽翔",
    "山口 ひなた",
    "山田 颯",
    "吉田 和花",
    "渡辺 晴"
  ];

  state.studentsText = sample.join("\n");
  elements.studentInput.value = state.studentsText;
  saveState();
  renderSummary();
  setMessage("サンプル名簿を読み込みました。必要なら編集してから抽選してください。");
}

function clearAssignments() {
  state.assignments = {};
  state.lockedSeats = [];
  saveState();
  render();
  setMessage("配置をクリアしました。");
}

function shuffleAllSeats() {
  const students = parseStudents(elements.studentInput.value);
  state.studentsText = elements.studentInput.value;

  const usableSeats = getUsableSeatKeys();
  if (!students.length) {
    render();
    setMessage("名簿が空です。生徒名を1行ずつ入力してください。", "warning");
    return;
  }

  if (students.length > usableSeats.length) {
    render();
    setMessage("生徒数が使用可能な席数を超えています。行数・列数を増やすか、使わない席を減らしてください。", "error");
    return;
  }

  const assignments = {};
  const randomizedStudents = shuffle([...students]);
  const randomizedSeats = shuffle([...usableSeats]);

  randomizedStudents.forEach((student, index) => {
    assignments[randomizedSeats[index]] = student;
  });

  state.assignments = assignments;
  state.lockedSeats = [];
  saveState();
  render();
  setMessage("全員の席を抽選しました。固定したい席は各カードの「固定」でロックできます。");
}

function shuffleUnlockedSeats() {
  const students = parseStudents(elements.studentInput.value);
  state.studentsText = elements.studentInput.value;

  const usableSeats = getUsableSeatKeys();
  if (!students.length) {
    render();
    setMessage("名簿が空です。生徒名を入力してから抽選してください。", "warning");
    return;
  }

  if (students.length > usableSeats.length) {
    render();
    setMessage("生徒数が使用可能な席数を超えています。席数設定を見直してください。", "error");
    return;
  }

  const lockedAssignments = state.lockedSeats
    .filter((seatKey) => state.assignments[seatKey] && !state.unavailableSeats.includes(seatKey))
    .map((seatKey) => [seatKey, state.assignments[seatKey]]);

  const remainingStudents = [...students];

  for (const [, student] of lockedAssignments) {
    const index = remainingStudents.indexOf(student);
    if (index === -1) {
      setMessage("固定席の生徒が名簿と一致しません。名簿を変更した場合は「全員を抽選」を使ってください。", "error");
      return;
    }
    remainingStudents.splice(index, 1);
  }

  const assignments = Object.fromEntries(lockedAssignments);
  const lockedSeatSet = new Set(lockedAssignments.map(([seatKey]) => seatKey));
  const openSeats = usableSeats.filter((seatKey) => !lockedSeatSet.has(seatKey));
  const randomizedStudents = shuffle(remainingStudents);
  const randomizedSeats = shuffle(openSeats);

  randomizedStudents.forEach((student, index) => {
    assignments[randomizedSeats[index]] = student;
  });

  state.assignments = assignments;
  saveState();
  render();
  setMessage("固定席を維持したまま、他の席だけ再抽選しました。");
}

function shuffle(values) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function setMessage(text, type = "info") {
  elements.messageBox.textContent = text;
  elements.messageBox.className = `message-box${type === "info" ? "" : ` ${type}`}`;
}

function render() {
  renderSummary();
  renderControls();
  renderGrid();
}

function renderControls() {
  elements.editLayoutBtn.classList.toggle("active", state.editMode);
  elements.editLayoutBtn.setAttribute("aria-pressed", String(state.editMode));
  elements.editLayoutBtn.textContent = state.editMode ? "編集モードを終了" : "使わない席を編集";
}

function renderSummary() {
  const students = parseStudents(elements.studentInput.value || state.studentsText);
  const usableSeats = getUsableSeatKeys();
  const assignedCount = Object.keys(state.assignments).length;

  elements.studentCount.textContent = String(students.length);
  elements.usableSeatCount.textContent = String(usableSeats.length);
  elements.emptySeatCount.textContent = String(Math.max(usableSeats.length - assignedCount, 0));
  elements.lockedSeatCount.textContent = String(state.lockedSeats.length);
}

function renderGrid() {
  elements.seatGrid.innerHTML = "";
  elements.seatGrid.style.setProperty("--columns", String(state.cols));

  const fragment = document.createDocumentFragment();
  const unavailable = new Set(state.unavailableSeats);
  const locked = new Set(state.lockedSeats);

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const seatKey = getSeatKey(row, col);
      const seat = document.createElement("article");
      const student = state.assignments[seatKey];
      const isUnavailable = unavailable.has(seatKey);
      const isLocked = locked.has(seatKey);

      seat.className = "seat-card";
      seat.dataset.seatKey = seatKey;

      if (isUnavailable) {
        seat.classList.add("unavailable");
      } else {
        seat.classList.add("available");
      }

      if (student) {
        seat.classList.add("occupied");
      }

      if (isLocked) {
        seat.classList.add("locked");
      }

      if (state.editMode) {
        seat.classList.add("editing");
      }

      seat.appendChild(createSeatLabel(row, col));

      if (isUnavailable) {
        const note = document.createElement("p");
        note.className = "seat-empty";
        note.textContent = "使わない席";
        seat.appendChild(note);
      } else if (student) {
        const name = document.createElement("p");
        name.className = "seat-name";
        name.textContent = student;
        seat.appendChild(name);

        const lockButton = document.createElement("button");
        lockButton.type = "button";
        lockButton.className = `seat-lock${isLocked ? " locked" : ""}`;
        lockButton.textContent = isLocked ? "固定中" : "固定";
        lockButton.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleSeatLock(seatKey);
        });
        seat.appendChild(lockButton);
      } else {
        const empty = document.createElement("p");
        empty.className = "seat-empty";
        empty.textContent = state.editMode ? "クリックで切替" : "空席";
        seat.appendChild(empty);
      }

      if (state.editMode) {
        seat.addEventListener("click", () => toggleUnavailableSeat(seatKey));
      } else if (!isUnavailable && student && !isLocked) {
        enableDragging(seat, seatKey);
      } else if (!isUnavailable && !student) {
        enableDropTarget(seat, seatKey);
      }

      fragment.appendChild(seat);
    }
  }

  elements.seatGrid.appendChild(fragment);
}

function createSeatLabel(row, col) {
  const label = document.createElement("span");
  label.className = "seat-label";
  label.textContent = `${row + 1}-${col + 1}`;
  return label;
}

function toggleUnavailableSeat(seatKey) {
  const index = state.unavailableSeats.indexOf(seatKey);
  const hadStudent = Boolean(state.assignments[seatKey]);

  if (index >= 0) {
    state.unavailableSeats.splice(index, 1);
    setMessage("使わない席を解除しました。");
  } else {
    state.unavailableSeats.push(seatKey);
    delete state.assignments[seatKey];
    state.lockedSeats = state.lockedSeats.filter((key) => key !== seatKey);
    setMessage(
      hadStudent
        ? "この席を使わない席に変更しました。元の配置を保ちたい場合は再抽選してください。"
        : "この席を使わない席に変更しました。"
    );
  }

  saveState();
  render();
}

function toggleSeatLock(seatKey) {
  const hasStudent = Boolean(state.assignments[seatKey]);
  if (!hasStudent) {
    return;
  }

  const index = state.lockedSeats.indexOf(seatKey);
  if (index >= 0) {
    state.lockedSeats.splice(index, 1);
    setMessage("固定を解除しました。");
  } else {
    state.lockedSeats.push(seatKey);
    setMessage("この席を固定しました。");
  }

  saveState();
  render();
}

function enableDragging(seat, seatKey) {
  seat.draggable = true;

  seat.addEventListener("dragstart", () => {
    dragSourceSeat = seatKey;
    seat.classList.add("dragging");
  });

  seat.addEventListener("dragend", () => {
    dragSourceSeat = null;
    seat.classList.remove("dragging");
    clearDropHighlights();
  });

  enableDropTarget(seat, seatKey);
}

function enableDropTarget(seat, seatKey) {
  seat.addEventListener("dragover", (event) => {
    if (!dragSourceSeat || seatKey === dragSourceSeat || state.lockedSeats.includes(seatKey)) {
      return;
    }
    event.preventDefault();
    seat.classList.add("drop-target");
  });

  seat.addEventListener("dragleave", () => {
    seat.classList.remove("drop-target");
  });

  seat.addEventListener("drop", (event) => {
    if (!dragSourceSeat || seatKey === dragSourceSeat || state.lockedSeats.includes(seatKey)) {
      return;
    }

    event.preventDefault();
    swapSeats(dragSourceSeat, seatKey);
    dragSourceSeat = null;
    clearDropHighlights();
  });
}

function clearDropHighlights() {
  elements.seatGrid.querySelectorAll(".drop-target").forEach((seat) => {
    seat.classList.remove("drop-target");
  });
}

function swapSeats(firstSeatKey, secondSeatKey) {
  if (state.lockedSeats.includes(firstSeatKey) || state.lockedSeats.includes(secondSeatKey)) {
    return;
  }

  const firstStudent = state.assignments[firstSeatKey] || "";
  const secondStudent = state.assignments[secondSeatKey] || "";

  if (firstStudent) {
    state.assignments[secondSeatKey] = firstStudent;
  } else {
    delete state.assignments[secondSeatKey];
  }

  if (secondStudent) {
    state.assignments[firstSeatKey] = secondStudent;
  } else {
    delete state.assignments[firstSeatKey];
  }

  saveState();
  render();
  setMessage("席を入れ替えました。");
}
