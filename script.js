const elements = {
  board: document.getElementById("board"),
  boardSize: document.getElementById("boardSize"),
  algorithm: document.getElementById("algorithm"),
  speed: document.getElementById("speed"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  compareBtn: document.getElementById("compareBtn"),
  statusBadge: document.getElementById("statusBadge"),
  boardCaption: document.getElementById("boardCaption"),
  message: document.getElementById("message"),
  stepsValue: document.getElementById("stepsValue"),
  backtracksValue: document.getElementById("backtracksValue"),
  timeValue: document.getElementById("timeValue"),
  queensValue: document.getElementById("queensValue"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  algorithmTitle: document.getElementById("algorithmTitle"),
  algorithmDescription: document.getElementById("algorithmDescription"),
  btSteps: document.getElementById("btSteps"),
  btBacktracks: document.getElementById("btBacktracks"),
  btTime: document.getElementById("btTime"),
  btResult: document.getElementById("btResult"),
  fcSteps: document.getElementById("fcSteps"),
  fcBacktracks: document.getElementById("fcBacktracks"),
  fcTime: document.getElementById("fcTime"),
  fcResult: document.getElementById("fcResult"),
  comparisonSummary: document.getElementById("comparisonSummary")
};

const state = {
  running: false,
  paused: false,
  cancel: false,
  timer: null,
  queens: [],
  steps: 0,
  backtracks: 0,
  startedAt: 0,
  elapsed: 0,
  current: null,
  rejected: null,
  totalChecks: 0
};

function createBoard(size) {
  elements.board.innerHTML = "";
  elements.board.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
  elements.board.style.gridTemplateRows = `repeat(${size}, minmax(0, 1fr))`;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const cell = document.createElement("div");
      cell.className = `cell ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      elements.board.appendChild(cell);
    }
  }
  renderBoard();
}

function renderBoard() {
  const size = Number(elements.boardSize.value);
  const cells = elements.board.children;
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    cell.classList.remove("queen", "current", "rejected");
    cell.textContent = "";
    if (state.queens[row] === col) {
      cell.classList.add("queen");
    }
    if (state.current && state.current.row === row && state.current.col === col) {
      cell.classList.add("current");
    }
    if (state.rejected && state.rejected.row === row && state.rejected.col === col) {
      cell.classList.add("rejected");
    }
  }
  elements.queensValue.textContent = `${state.queens.filter((col) => col !== undefined && col !== -1).length} / ${size}`;
  elements.boardCaption.textContent = `Papan ${size} × ${size} · ${state.running ? "sedang diproses" : "siap"}`;
}

function resetStats() {
  state.steps = 0;
  state.backtracks = 0;
  state.elapsed = 0;
  state.current = null;
  state.rejected = null;
  state.queens = Array(Number(elements.boardSize.value)).fill(-1);
  elements.stepsValue.textContent = "0";
  elements.backtracksValue.textContent = "0";
  elements.timeValue.textContent = "0 ms";
  elements.progressBar.style.width = "0%";
  elements.progressText.textContent = "Menunggu proses dimulai";
}

function resetApplication() {
  stopRun();
  resetStats();
  createBoard(Number(elements.boardSize.value));
  setStatus("SIAP");
  elements.message.textContent = "Pilih pengaturan, lalu tekan Mulai Algoritma.";
  elements.startBtn.disabled = false;
  elements.pauseBtn.disabled = true;
  elements.pauseBtn.textContent = "Ⅱ Jeda";
  elements.boardCaption.textContent = `Papan ${elements.boardSize.value} × ${elements.boardSize.value} · belum dimulai`;
}

function setStatus(label) {
  elements.statusBadge.textContent = label;
}

function updateStats(row) {
  elements.stepsValue.textContent = state.steps.toLocaleString("id-ID");
  elements.backtracksValue.textContent = state.backtracks.toLocaleString("id-ID");
  elements.timeValue.textContent = `${Math.max(0, Math.round(performance.now() - state.startedAt)).toLocaleString("id-ID")} ms`;
  const size = Number(elements.boardSize.value);
  elements.progressBar.style.width = `${Math.min(100, (row / size) * 100)}%`;
  elements.progressText.textContent = `Memproses baris ${Math.min(row + 1, size)} dari ${size}`;
}

function isSafe(queens, row, col) {
  for (let previousRow = 0; previousRow < row; previousRow += 1) {
    const previousCol = queens[previousRow];
    if (previousCol === col || Math.abs(previousCol - col) === Math.abs(previousRow - row)) {
      return false;
    }
  }
  return true;
}

function delay(ms) {
  return new Promise((resolve) => {
    state.timer = setTimeout(resolve, ms);
  });
}

async function waitWhilePaused() {
  while (state.paused && !state.cancel) {
    await delay(80);
  }
}

async function searchAnimated(row, size, useForwardChecking, domains) {
  if (state.cancel) return false;
  await waitWhilePaused();
  if (state.cancel) return false;
  if (row === size) return true;

  let choices = useForwardChecking ? [...domains[row]] : Array.from({ length: size }, (_, col) => col);
  for (const col of choices) {
    if (state.cancel) return false;
    await waitWhilePaused();
    if (state.cancel) return false;

    state.steps += 1;
    state.current = { row, col };
    state.rejected = null;
    updateStats(row);

    if (isSafe(state.queens, row, col)) {
      state.queens[row] = col;
      renderBoard();
      elements.message.textContent = `Ratu ditempatkan pada baris ${row + 1}, kolom ${col + 1}.`;
      if (Number(elements.speed.value) > 0) await delay(Number(elements.speed.value));

      let nextDomains = domains;
      if (useForwardChecking) {
        nextDomains = domains.map((domain) => [...domain]);
        nextDomains[row] = [];
        for (let nextRow = row + 1; nextRow < size; nextRow += 1) {
          nextDomains[nextRow] = nextDomains[nextRow].filter((nextCol) => {
            return nextCol !== col && Math.abs(nextCol - col) !== nextRow - row;
          });
          if (nextDomains[nextRow].length === 0) {
            nextDomains = null;
            break;
          }
        }
      }

      if (!useForwardChecking || nextDomains !== null) {
        if (await searchAnimated(row + 1, size, useForwardChecking, nextDomains || domains)) {
          return true;
        }
      }

      state.queens[row] = -1;
      state.backtracks += 1;
      state.rejected = { row, col };
      state.current = null;
      renderBoard();
      updateStats(row);
      elements.message.textContent = `Mundur dari baris ${row + 1}, kolom ${col + 1}; mencoba posisi berikutnya.`;
      if (Number(elements.speed.value) > 0) await delay(Math.max(25, Number(elements.speed.value) / 2));
    } else {
      state.rejected = { row, col };
      renderBoard();
      elements.message.textContent = `Posisi baris ${row + 1}, kolom ${col + 1} konflik dengan ratu sebelumnya.`;
      if (Number(elements.speed.value) > 0) await delay(Math.max(20, Number(elements.speed.value) / 3));
      state.rejected = null;
    }
  }
  return false;
}

function solveInstant(size, useForwardChecking) {
  const queens = Array(size).fill(-1);
  let steps = 0;
  let backtracks = 0;

  function search(row, domains) {
    if (row === size) return true;
    const choices = useForwardChecking ? domains[row] : Array.from({ length: size }, (_, col) => col);
    for (const col of choices) {
      steps += 1;
      if (!isSafe(queens, row, col)) continue;
      queens[row] = col;
      let nextDomains = domains;
      if (useForwardChecking) {
        nextDomains = domains.map((domain) => [...domain]);
        nextDomains[row] = [];
        let emptyDomain = false;
        for (let nextRow = row + 1; nextRow < size; nextRow += 1) {
          nextDomains[nextRow] = nextDomains[nextRow].filter((nextCol) => {
            return nextCol !== col && Math.abs(nextCol - col) !== nextRow - row;
          });
          if (nextDomains[nextRow].length === 0) {
            emptyDomain = true;
            break;
          }
        }
        if (emptyDomain) {
          queens[row] = -1;
          backtracks += 1;
          continue;
        }
      }
      if (search(row + 1, nextDomains)) return true;
      queens[row] = -1;
      backtracks += 1;
    }
    return false;
  }

  const domains = Array.from({ length: size }, () => Array.from({ length: size }, (_, col) => col));
  const started = performance.now();
  const solved = search(0, domains);
  return { solved, steps, backtracks, time: performance.now() - started, queens };
}

async function startAlgorithm() {
  if (state.running) return;
  const size = Number(elements.boardSize.value);
  const useForwardChecking = elements.algorithm.value === "forward";
  state.running = true;
  state.paused = false;
  state.cancel = false;
  resetStats();
  state.startedAt = performance.now();
  elements.startBtn.disabled = true;
  elements.pauseBtn.disabled = false;
  elements.compareBtn.disabled = true;
  setStatus("BERJALAN");
  elements.algorithmTitle.textContent = useForwardChecking ? "Backtracking + Forward Checking" : "Backtracking";
  elements.algorithmDescription.textContent = useForwardChecking
    ? "Selain memeriksa konflik, algoritma memangkas domain baris berikutnya. Jika ada domain kosong, ia segera melakukan backtrack."
    : "Algoritma mencoba kolom dari kiri ke kanan. Jika posisi konflik atau jalan buntu ditemukan, algoritma kembali dan mencoba kolom lain.";
  elements.message.textContent = "Algoritma dimulai...";
  const domains = Array.from({ length: size }, () => Array.from({ length: size }, (_, col) => col));

  const solved = await searchAnimated(0, size, useForwardChecking, domains);
  const elapsed = performance.now() - state.startedAt;
  state.running = false;
  state.paused = false;
  state.timer = null;
  elements.startBtn.disabled = false;
  elements.pauseBtn.disabled = true;
  elements.compareBtn.disabled = false;
  elements.pauseBtn.textContent = "Ⅱ Jeda";
  elements.timeValue.textContent = `${Math.round(elapsed).toLocaleString("id-ID")} ms`;
  elements.progressBar.style.width = solved ? "100%" : elements.progressBar.style.width;
  setStatus(state.cancel ? "DIHENTIKAN" : solved ? "SELESAI" : "TIDAK ADA SOLUSI");
  elements.boardCaption.textContent = `Papan ${size} × ${size} · ${solved ? "solusi ditemukan" : "proses selesai"}`;
  elements.progressText.textContent = solved ? "Solusi berhasil ditemukan" : "Pencarian selesai";
  elements.message.textContent = state.cancel ? "Proses dihentikan." : solved
    ? `Solusi ditemukan! Semua ${size} ratu tidak saling menyerang.`
    : "Solusi tidak ditemukan untuk konfigurasi ini.";
  if (solved) {
    state.current = null;
    state.rejected = null;
    renderBoard();
  }
}

function stopRun() {
  state.cancel = true;
  state.paused = false;
  state.running = false;
  if (state.timer !== null) clearTimeout(state.timer);
  state.timer = null;
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  elements.pauseBtn.textContent = state.paused ? "▶ Lanjutkan" : "Ⅱ Jeda";
  setStatus(state.paused ? "DIJEDA" : "BERJALAN");
  elements.message.textContent = state.paused ? "Simulasi dijeda." : "Simulasi dilanjutkan.";
}

function displayComparisonResult(prefix, result) {
  elements[`${prefix}Steps`].textContent = result.steps.toLocaleString("id-ID");
  elements[`${prefix}Backtracks`].textContent = result.backtracks.toLocaleString("id-ID");
  elements[`${prefix}Time`].textContent = `${result.time.toFixed(3)} ms`;
  elements[`${prefix}Result`].textContent = result.solved ? "✓ Solusi ditemukan" : "✕ Tidak ada solusi";
  elements[`${prefix}Result`].className = `result-label ${result.solved ? "success" : "error"}`;
}

function compareAlgorithms() {
  if (state.running) return;
  const size = Number(elements.boardSize.value);
  elements.compareBtn.disabled = true;
  elements.comparisonSummary.textContent = "Menghitung kedua algoritma...";
  setTimeout(() => {
    const bt = solveInstant(size, false);
    const fc = solveInstant(size, true);
    displayComparisonResult("bt", bt);
    displayComparisonResult("fc", fc);
    const stepDifference = bt.steps === 0 ? 0 : ((bt.steps - fc.steps) / bt.steps) * 100;
    let summary = `Untuk papan ${size} × ${size}, `;
    if (fc.steps < bt.steps) {
      summary += `Forward Checking memeriksa ${Math.abs(stepDifference).toFixed(1)}% lebih sedikit kandidat posisi (${fc.steps} dibanding ${bt.steps}). `;
    } else if (fc.steps > bt.steps) {
      summary += `Forward Checking memeriksa lebih banyak kandidat pada urutan pencarian ini (${fc.steps} dibanding ${bt.steps}). `;
    } else {
      summary += `jumlah kandidat yang diperiksa sama, yaitu ${bt.steps}. `;
    }
    summary += `Backtracking membutuhkan ${bt.backtracks} backtrack, sedangkan Forward Checking membutuhkan ${fc.backtracks}. Waktu dapat berubah bergantung pada perangkat dan kondisi browser.`;
    elements.comparisonSummary.textContent = summary;
    elements.compareBtn.disabled = false;
  }, 20);
}

elements.startBtn.addEventListener("click", startAlgorithm);
elements.pauseBtn.addEventListener("click", togglePause);
elements.resetBtn.addEventListener("click", resetApplication);
elements.compareBtn.addEventListener("click", compareAlgorithms);
elements.boardSize.addEventListener("change", resetApplication);
elements.algorithm.addEventListener("change", () => {
  if (state.running) return;
  const forward = elements.algorithm.value === "forward";
  elements.algorithmTitle.textContent = forward ? "Backtracking + Forward Checking" : "Backtracking";
  elements.algorithmDescription.textContent = forward
    ? "Memangkas pilihan yang tidak mungkin pada baris berikutnya agar jalan buntu diketahui lebih awal."
    : "Mencoba posisi satu per satu dan kembali saat menemukan jalan buntu.";
  elements.message.textContent = `Algoritma dipilih: ${forward ? "Backtracking + Forward Checking" : "Backtracking"}.`;
});
resetApplication();
