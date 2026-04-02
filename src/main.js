const WORLD_SIZE = 240;
const SAVE_KEY = "ecobox-save-v4";
const FROG_COST = 5;
const CRICKET_COST = 1;

const state = {
  tick: 0,
  coins: 10,
  oxygen: 82,
  cleanliness: 86,
  algae: 8,
  waste: 4,
  level: 1,
  boostTimer: 0,
  decorationsPlaced: 0,
  frogs: [],
  crickets: [],
  events: [
    { label: "EcoBox online", detail: "Empty habitat ready for your first animal." },
    { label: "Starter funds", detail: "You have 10 coins to begin stocking the tank." }
  ],
  upgrades: [
    { id: "frog", name: "Tree Frog", description: "Adds 1 frog to the tank", cost: FROG_COST, level: 0, maxLevel: 24, currency: "coins" },
    { id: "crickets", name: "Cricket Cup", description: "Release live food into the tank", cost: CRICKET_COST, level: 0, maxLevel: 999, currency: "coins" },
    { id: "reedbed", name: "Reed Bed", description: "Passively cleans waste", cost: 6, level: 0, maxLevel: 8, currency: "coins" },
    { id: "aerator", name: "Corner Aerator", description: "Keeps water oxygenated", cost: 7, level: 0, maxLevel: 8, currency: "coins" },
    { id: "decor", name: "Pretty Hide", description: "Adds logs, stones, and frog cover", cost: 4, level: 0, maxLevel: 8, currency: "coins" }
  ]
};

const elements = {
  canvas: document.getElementById("tank-canvas"),
  overlay: document.getElementById("tank-overlay"),
  saveButton: document.getElementById("save-button"),
  collectButton: document.getElementById("collect-button"),
  feedButton: document.getElementById("feed-button"),
  cleanButton: document.getElementById("clean-button"),
  boostButton: document.getElementById("boost-button"),
  tankChips: document.getElementById("tank-chips"),
  statusGrid: document.getElementById("status-grid"),
  milestones: document.getElementById("milestones"),
  upgradeList: document.getElementById("upgrade-list"),
  eventLog: document.getElementById("event-log")
};

const ctx = elements.canvas.getContext("2d");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pushEvent(label, detail) {
  state.events.unshift({ label, detail });
  state.events = state.events.slice(0, 16);
}

function spawnFrog() {
  return {
    x: rand(54, WORLD_SIZE - 54),
    y: rand(54, WORLD_SIZE - 54),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.18, 0.18),
    hopTimer: rand(0.2, 2.4),
    facing: Math.random() < 0.5 ? -1 : 1,
    hunger: rand(25, 50)
  };
}

function spawnCricket() {
  return {
    x: rand(40, WORLD_SIZE - 40),
    y: rand(40, WORLD_SIZE - 40),
    vx: rand(-0.42, 0.42),
    vy: rand(-0.42, 0.42),
    skitterTimer: rand(0.2, 1.4)
  };
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    tick: state.tick,
    coins: state.coins,
    oxygen: state.oxygen,
    cleanliness: state.cleanliness,
    algae: state.algae,
    waste: state.waste,
    level: state.level,
    boostTimer: state.boostTimer,
    decorationsPlaced: state.decorationsPlaced,
    events: state.events,
    upgrades: state.upgrades,
    frogs: state.frogs,
    crickets: state.crickets
  }));
  pushEvent("Saved", "Local habitat state stored on this device.");
  renderHud();
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch {
    pushEvent("Load failed", "Starting with a fresh habitat.");
  }
}

function resizeCanvas() {
  const rect = elements.canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const size = Math.max(240, Math.round(rect.width * dpr));
  elements.canvas.width = size;
  elements.canvas.height = size;
}

function getUpgrade(id) {
  return state.upgrades.find((upgrade) => upgrade.id === id);
}

function getUpgradeCost(upgrade) {
  if (upgrade.id === "frog") return FROG_COST;
  if (upgrade.id === "crickets") return CRICKET_COST;
  return Math.floor(upgrade.cost * (1 + upgrade.level * 0.55));
}

function spendCoins(amount) {
  if (state.coins < amount) return false;
  state.coins -= amount;
  return true;
}

function simulate(dt) {
  state.tick += dt;

  const reedbed = getUpgrade("reedbed")?.level ?? 0;
  const aerator = getUpgrade("aerator")?.level ?? 0;
  const decor = getUpgrade("decor")?.level ?? 0;
  const frogCount = state.frogs.length;
  const cricketCount = state.crickets.length;
  const boostMultiplier = state.boostTimer > 0 ? 1.8 : 1;

  state.algae += (0.12 + decor * 0.04) * dt * boostMultiplier;
  state.oxygen += (0.16 + aerator * 0.2) * dt;
  state.cleanliness += (0.08 + reedbed * 0.16) * dt;
  state.cleanliness -= (frogCount * 0.03 + cricketCount * 0.008) * dt;
  state.waste += (frogCount * 0.045 + cricketCount * 0.01) * dt;
  state.waste -= (0.06 + reedbed * 0.14) * dt;

  if (state.waste > 40) {
    state.cleanliness -= 0.2 * dt;
    state.oxygen -= 0.1 * dt;
  }

  if (frogCount > 0 && Math.random() < 0.006 * frogCount * boostMultiplier) {
    state.coins += 1;
    pushEvent("Coins earned", "Visitors tipped you for the cute frog habitat.");
  }

  for (const frog of state.frogs) {
    frog.hunger += dt * 3.2;
    frog.hopTimer -= dt;

    if (frog.hopTimer <= 0) {
      frog.vx = rand(-0.28, 0.28);
      frog.vy = rand(-0.28, 0.28);
      frog.hopTimer = rand(0.6, 2.2);
    }

    frog.x += frog.vx * dt * 60;
    frog.y += frog.vy * dt * 60;
    frog.facing = frog.vx >= 0 ? 1 : -1;

    for (let i = state.crickets.length - 1; i >= 0; i -= 1) {
      const cricket = state.crickets[i];
      const dx = cricket.x - frog.x;
      const dy = cricket.y - frog.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        state.crickets.splice(i, 1);
        frog.hunger = Math.max(0, frog.hunger - 18);
        state.coins += 1;
        pushEvent("Frog fed", "A frog snapped up a cricket. +1 coin.");
        break;
      }
    }

    if (frog.x < 34 || frog.x > WORLD_SIZE - 34) frog.vx *= -1;
    if (frog.y < 34 || frog.y > WORLD_SIZE - 34) frog.vy *= -1;
    frog.x = clamp(frog.x, 34, WORLD_SIZE - 34);
    frog.y = clamp(frog.y, 34, WORLD_SIZE - 34);
  }

  for (const cricket of state.crickets) {
    cricket.skitterTimer -= dt;
    if (cricket.skitterTimer <= 0) {
      cricket.vx = rand(-0.5, 0.5);
      cricket.vy = rand(-0.5, 0.5);
      cricket.skitterTimer = rand(0.25, 1.2);
    }

    cricket.x += cricket.vx * dt * 60;
    cricket.y += cricket.vy * dt * 60;

    if (cricket.x < 30 || cricket.x > WORLD_SIZE - 30) cricket.vx *= -1;
    if (cricket.y < 30 || cricket.y > WORLD_SIZE - 30) cricket.vy *= -1;
    cricket.x = clamp(cricket.x, 30, WORLD_SIZE - 30);
    cricket.y = clamp(cricket.y, 30, WORLD_SIZE - 30);
  }

  if (state.boostTimer > 0) {
    state.boostTimer = Math.max(0, state.boostTimer - dt);
  }

  state.oxygen = clamp(state.oxygen, 0, 100);
  state.cleanliness = clamp(state.cleanliness, 0, 100);
  state.algae = clamp(state.algae, 0, 100);
  state.waste = clamp(state.waste, 0, 100);
  state.coins = clamp(state.coins, 0, 9999);
  state.level = clamp(1 + Math.floor((state.coins + frogCount * 6 + decor * 3) / 18), 1, 99);
}

function drawPixelRect(x, y, w, h, fill, stroke = "#000") {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke !== "transparent") {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
}

function drawPixelCircle(cx, cy, r, fill, stroke = "transparent") {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  if (stroke !== "transparent") {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawTankBase() {
  drawPixelRect(0, 0, WORLD_SIZE, WORLD_SIZE, "#193542", "#081118");
  drawPixelRect(14, 14, WORLD_SIZE - 28, WORLD_SIZE - 28, "#2b6578", "#0a1c21");
  drawPixelRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48, "#77d9cf", "#1c5d67");
  drawPixelRect(31, 31, WORLD_SIZE - 62, WORLD_SIZE - 62, "rgba(255,255,255,0.08)", "transparent");

  drawPixelRect(38, 150, 78, 36, "#6b4d30", "#3c2613");
  drawPixelRect(112, 156, 38, 24, "#80623b", "#4c3518");
  drawPixelRect(58, 72, 12, 56, "#8b6a44", "#4c3518");
  drawPixelRect(65, 88, 40, 8, "#8b6a44", "#4c3518");

  const algaeClusters = 4 + Math.floor(state.algae / 10);
  for (let i = 0; i < algaeClusters; i += 1) {
    const x = 48 + ((i * 29) % 124);
    const y = 46 + ((i * 23) % 122);
    drawPixelCircle(x, y, 9, "#2f8f4a");
    drawPixelCircle(x + 5, y - 4, 6, "#5edb7b");
    drawPixelCircle(x - 6, y + 4, 5, "#21753a");
  }

  const decorLevel = getUpgrade("decor")?.level ?? 0;
  for (let i = 0; i < decorLevel; i += 1) {
    const x = 142 + ((i * 14) % 34);
    const y = 146 + ((i * 11) % 26);
    drawPixelRect(x, y, 12, 8, "#8f8576", "#4b4439");
    drawPixelRect(x + 7, y - 8, 4, 8, "#72d37c", "transparent");
  }

  const reedbedLevel = getUpgrade("reedbed")?.level ?? 0;
  for (let i = 0; i < reedbedLevel; i += 1) {
    const x = 182 + (i % 3) * 8;
    const y = 132 + Math.floor(i / 3) * 14;
    drawPixelRect(x, y, 3, 18, "#6fd37a", "transparent");
    drawPixelRect(x + 4, y + 4, 3, 14, "#4ea85a", "transparent");
  }

  const aeratorLevel = getUpgrade("aerator")?.level ?? 0;
  drawPixelRect(188, 182, 16, 16, "#5c6e79", "#2e3a42");
  for (let i = 0; i < 2 + aeratorLevel * 2; i += 1) {
    const bob = ((state.tick * 18) + i * 13) % 110;
    drawPixelRect(194 + (i % 2) * 6, 176 - bob, 4, 4, "#d8fbff", "#5e9db0");
  }

  for (let i = 0; i < 6; i += 1) {
    drawPixelCircle(46 + i * 24, 40 + (i % 2) * 8, 2, "rgba(255,255,255,0.35)");
  }
}

function drawFrog(frog) {
  const x = Math.round(frog.x);
  const y = Math.round(frog.y);
  const faceX = frog.facing >= 0 ? x + 10 : x - 1;

  drawPixelRect(x, y, 12, 10, "#73d65f", "#2f6f2a");
  drawPixelRect(x + 2, y - 2, 3, 3, "#9df18b", "transparent");
  drawPixelRect(x + 7, y - 2, 3, 3, "#9df18b", "transparent");
  drawPixelRect(faceX, y + 3, 2, 2, "#0d1f10", "transparent");
  drawPixelRect(x - 2, y + 8, 3, 3, "#5bb04a", "transparent");
  drawPixelRect(x + 11, y + 8, 3, 3, "#5bb04a", "transparent");
}

function drawCricket(cricket) {
  const x = Math.round(cricket.x);
  const y = Math.round(cricket.y);
  drawPixelRect(x, y, 4, 4, "#392d25", "transparent");
  drawPixelRect(x + 4, y + 1, 2, 2, "#5a4735", "transparent");
}

function drawCreatures() {
  for (const cricket of state.crickets) {
    drawCricket(cricket);
  }
  for (const frog of state.frogs) {
    drawFrog(frog);
  }
}

function drawWaste() {
  const wastePatches = Math.floor(state.waste / 8);
  for (let i = 0; i < wastePatches; i += 1) {
    const x = 40 + ((i * 31) % 140);
    const y = 44 + ((i * 19) % 136);
    drawPixelRect(x, y, 6, 6, "rgba(102, 73, 31, 0.55)", "transparent");
  }
}

function renderTank() {
  const width = elements.canvas.width;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, width);

  const scale = width / WORLD_SIZE;
  ctx.save();
  ctx.scale(scale, scale);

  drawTankBase();
  drawWaste();
  drawCreatures();

  if (state.frogs.length === 0) {
    ctx.fillStyle = "rgba(8, 16, 24, 0.26)";
    ctx.fillRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48);
  }

  if (state.cleanliness < 40) {
    ctx.fillStyle = `rgba(57, 44, 22, ${Math.min(0.3, (40 - state.cleanliness) / 100)})`;
    ctx.fillRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48);
  }

  if (state.boostTimer > 0) {
    ctx.fillStyle = "rgba(255, 216, 102, 0.12)";
    ctx.fillRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48);
  }

  ctx.restore();
}

function renderHud() {
  elements.tankChips.innerHTML = [
    `<div class="chip">LV ${state.level}</div>`,
    `<div class="chip">COINS ${Math.floor(state.coins)}</div>`,
    `<div class="chip">FROGS ${state.frogs.length}</div>`
  ].join("");

  elements.overlay.innerHTML = [
    `<div class="chip">Crickets ${state.crickets.length}</div>`,
    `<div class="chip">${state.frogs.length === 0 ? "Buy your first frog" : state.boostTimer > 0 ? `Sun Boost ${Math.ceil(state.boostTimer)}s` : "Habitat Stable"}</div>`
  ].join("");

  const statusItems = [
    { label: "Coins", value: state.coins, max: 40, suffix: "¢" },
    { label: "Oxygen", value: state.oxygen, max: 100, suffix: "%" },
    { label: "Cleanliness", value: state.cleanliness, max: 100, suffix: "%" },
    { label: "Frogs", value: state.frogs.length, max: 8, suffix: " frogs" },
    { label: "Crickets", value: state.crickets.length, max: 20, suffix: " bugs" }
  ];

  elements.statusGrid.innerHTML = statusItems.map((item) => {
    const percent = clamp((item.value / item.max) * 100, 0, 100);
    return `
      <article class="status-card">
        <div class="status-name">${item.label}</div>
        <div class="bar"><span style="width:${percent}%"></span></div>
        <div class="status-value">${Math.floor(item.value)}${item.suffix}</div>
      </article>
    `;
  }).join("");

  const milestoneData = [
    { title: "First Frog", done: state.frogs.length >= 1, text: "Buy your first frog for 5 coins." },
    { title: "Feeding Time", done: state.crickets.length >= 3 || state.upgrades.find((u) => u.id === "crickets")?.level >= 3, text: "Release at least 3 crickets." },
    { title: "Pretty Home", done: (getUpgrade("decor")?.level ?? 0) >= 2, text: "Add two pretty hides for cover." }
  ];

  elements.milestones.innerHTML = milestoneData.map((milestone) => `
    <article class="milestone">
      <strong>${milestone.done ? "[DONE]" : "[TODO]"} ${milestone.title}</strong>
      <div>${milestone.text}</div>
    </article>
  `).join("");

  elements.upgradeList.innerHTML = state.upgrades.map((upgrade) => {
    const cost = getUpgradeCost(upgrade);
    const disabled = state.coins < cost || upgrade.level >= upgrade.maxLevel;
    const buyLabel = upgrade.id === "frog" ? "ADOPT" : upgrade.id === "crickets" ? "DROP" : upgrade.level >= upgrade.maxLevel ? "MAX" : "BUY";
    return `
      <article class="upgrade">
        <div>
          <strong>${upgrade.name}${upgrade.maxLevel < 900 ? ` Lv.${upgrade.level}` : ""}</strong>
          <div class="upgrade-meta">${upgrade.description}</div>
          <div class="upgrade-meta">Cost: ${cost} coins</div>
        </div>
        <button class="pixel-button ${disabled ? "secondary" : ""}" data-upgrade-id="${upgrade.id}" ${disabled ? "disabled" : ""}>
          ${upgrade.level >= upgrade.maxLevel ? "MAX" : buyLabel}
        </button>
      </article>
    `;
  }).join("");

  elements.eventLog.innerHTML = state.events.map((event) => `
    <div class="event-item"><strong>${event.label}</strong><br />${event.detail}</div>
  `).join("");

  elements.upgradeList.querySelectorAll("[data-upgrade-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const upgrade = getUpgrade(button.dataset.upgradeId);
      if (!upgrade) return;
      const cost = getUpgradeCost(upgrade);
      if (!spendCoins(cost) || upgrade.level >= upgrade.maxLevel) return;

      if (upgrade.id === "frog") {
        state.frogs.push(spawnFrog());
        pushEvent("New frog", "A tree frog hopped into the habitat.");
      } else if (upgrade.id === "crickets") {
        state.crickets.push(spawnCricket());
        pushEvent("Crickets released", "Fresh live food was added to the tank.");
      } else if (upgrade.id === "decor") {
        state.decorationsPlaced += 1;
        upgrade.level += 1;
        pushEvent("Pretty hide added", "The habitat looks nicer and safer.");
      } else {
        upgrade.level += 1;
        pushEvent("Upgrade bought", `${upgrade.name} upgraded to level ${upgrade.level}.`);
      }

      if (upgrade.id === "frog" || upgrade.id === "crickets") {
        upgrade.level += 1;
      }

      renderHud();
    });
  });
}

function bindUi() {
  elements.collectButton.addEventListener("click", () => {
    const gained = Math.max(1, state.frogs.length + Math.floor((getUpgrade("decor")?.level ?? 0) / 2));
    state.coins += gained;
    pushEvent("Coins collected", `You collected ${gained} coins from habitat visitors.`);
    renderHud();
  });

  elements.feedButton.addEventListener("click", () => {
    if (!spendCoins(CRICKET_COST)) {
      pushEvent("Need coins", "You need 1 coin to buy crickets.");
      renderHud();
      return;
    }
    state.crickets.push(spawnCricket());
    pushEvent("Crickets released", "Fresh live food was added to the tank.");
    renderHud();
  });

  elements.cleanButton.addEventListener("click", () => {
    state.cleanliness = clamp(state.cleanliness + 18, 0, 100);
    state.waste = clamp(state.waste - 16, 0, 100);
    pushEvent("Habitat cleaned", "Glass wiped and debris removed.");
    renderHud();
  });

  elements.boostButton.addEventListener("click", () => {
    if (!spendCoins(3)) {
      pushEvent("Need coins", "Sun Boost costs 3 coins.");
      renderHud();
      return;
    }
    state.boostTimer = 20;
    pushEvent("Sun boost", "Warm light brightens the habitat for 20 seconds.");
    renderHud();
  });

  elements.saveButton.addEventListener("click", saveGame);
}

function tick() {
  simulate(1 / 20);
  renderTank();
  renderHud();
  if (Math.floor(state.tick) % 15 === 0 && Math.abs(state.tick % 15) < 0.051) {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      tick: state.tick,
      coins: state.coins,
      oxygen: state.oxygen,
      cleanliness: state.cleanliness,
      algae: state.algae,
      waste: state.waste,
      level: state.level,
      boostTimer: state.boostTimer,
      decorationsPlaced: state.decorationsPlaced,
      events: state.events,
      upgrades: state.upgrades,
      frogs: state.frogs,
      crickets: state.crickets
    }));
  }
  requestAnimationFrame(tick);
}

loadGame();
state.frogs = Array.isArray(state.frogs) ? state.frogs : [];
state.crickets = Array.isArray(state.crickets) ? state.crickets : [];
bindUi();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
renderHud();
renderTank();
requestAnimationFrame(tick);
