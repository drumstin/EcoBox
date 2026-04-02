const WORLD_SIZE = 240;
const SAVE_KEY = "ecobox-save-v5";
const FROG_COST = 5;
const CRICKET_COST = 1;

const state = {
  tick: 0,
  coins: 10,
  humidity: 78,
  cleanliness: 86,
  moss: 18,
  waste: 4,
  level: 1,
  lampTimer: 0,
  decorationsPlaced: 0,
  frogs: [],
  crickets: [],
  events: [
    { label: "EcoBox online", detail: "Empty frog habitat ready for your first resident." },
    { label: "Starter funds", detail: "You have 10 coins to begin stocking the enclosure." }
  ],
  upgrades: [
    { id: "frog", name: "Tree Frog", description: "Adds 1 frog to the habitat", cost: FROG_COST, level: 0, maxLevel: 24, currency: "coins" },
    { id: "crickets", name: "Cricket Cup", description: "Release live feeder crickets", cost: CRICKET_COST, level: 0, maxLevel: 999, currency: "coins" },
    { id: "mist", name: "Mister", description: "Keeps humidity high", cost: 6, level: 0, maxLevel: 8, currency: "coins" },
    { id: "plants", name: "Leafy Vines", description: "Adds cover and natural beauty", cost: 7, level: 0, maxLevel: 8, currency: "coins" },
    { id: "decor", name: "Pretty Hide", description: "Adds bark hides and stones", cost: 4, level: 0, maxLevel: 8, currency: "coins" }
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
    x: rand(56, WORLD_SIZE - 56),
    y: rand(56, WORLD_SIZE - 56),
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
    humidity: state.humidity,
    cleanliness: state.cleanliness,
    moss: state.moss,
    waste: state.waste,
    level: state.level,
    lampTimer: state.lampTimer,
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

  const mist = getUpgrade("mist")?.level ?? 0;
  const plants = getUpgrade("plants")?.level ?? 0;
  const decor = getUpgrade("decor")?.level ?? 0;
  const frogCount = state.frogs.length;
  const cricketCount = state.crickets.length;
  const lampMultiplier = state.lampTimer > 0 ? 1.8 : 1;

  state.moss += (0.1 + plants * 0.08) * dt * lampMultiplier;
  state.humidity += (0.08 + mist * 0.18) * dt;
  state.cleanliness += (0.04 + plants * 0.05 + decor * 0.03) * dt;
  state.cleanliness -= (frogCount * 0.03 + cricketCount * 0.008) * dt;
  state.waste += (frogCount * 0.045 + cricketCount * 0.01) * dt;
  state.waste -= (0.05 + decor * 0.05) * dt;

  if (state.waste > 40) {
    state.cleanliness -= 0.2 * dt;
    state.humidity -= 0.08 * dt;
  }

  if (frogCount > 0 && Math.random() < 0.006 * frogCount * lampMultiplier) {
    state.coins += 1;
    pushEvent("Coins earned", "Visitors tipped you for the cute frog habitat.");
  }

  for (const frog of state.frogs) {
    frog.hunger += dt * 3.2;
    frog.hopTimer -= dt;

    let targetCricket = null;
    let closestDist = Infinity;
    for (const cricket of state.crickets) {
      const dx = cricket.x - frog.x;
      const dy = cricket.y - frog.y;
      const dist = Math.hypot(dx, dy);
      if (dist < closestDist) {
        closestDist = dist;
        targetCricket = cricket;
      }
    }

    if (targetCricket && closestDist < 64) {
      const dx = targetCricket.x - frog.x;
      const dy = targetCricket.y - frog.y;
      frog.vx += Math.sign(dx) * 0.02;
      frog.vy += Math.sign(dy) * 0.02;
    } else if (frog.hopTimer <= 0) {
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

    frog.vx = clamp(frog.vx, -0.34, 0.34);
    frog.vy = clamp(frog.vy, -0.34, 0.34);
    if (frog.x < 36 || frog.x > WORLD_SIZE - 36) frog.vx *= -1;
    if (frog.y < 36 || frog.y > WORLD_SIZE - 36) frog.vy *= -1;
    frog.x = clamp(frog.x, 36, WORLD_SIZE - 36);
    frog.y = clamp(frog.y, 36, WORLD_SIZE - 36);
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

  if (state.lampTimer > 0) {
    state.lampTimer = Math.max(0, state.lampTimer - dt);
  }

  state.humidity = clamp(state.humidity, 0, 100);
  state.cleanliness = clamp(state.cleanliness, 0, 100);
  state.moss = clamp(state.moss, 0, 100);
  state.waste = clamp(state.waste, 0, 100);
  state.coins = clamp(state.coins, 0, 9999);
  state.level = clamp(1 + Math.floor((state.coins + frogCount * 6 + decor * 3 + plants * 2) / 18), 1, 99);
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

function drawHabitatBase() {
  drawPixelRect(0, 0, WORLD_SIZE, WORLD_SIZE, "#2c2418", "#110d09");
  drawPixelRect(14, 14, WORLD_SIZE - 28, WORLD_SIZE - 28, "#4b3a24", "#23180f");
  drawPixelRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48, "#6f5938", "#342415");
  drawPixelRect(31, 31, WORLD_SIZE - 62, WORLD_SIZE - 62, "rgba(255,255,255,0.04)", "transparent");

  drawPixelRect(36, 32, 168, 74, "#5b7f41", "#2d4420");
  drawPixelRect(44, 110, 152, 84, "#6c5232", "#392513");
  drawPixelRect(40, 140, 78, 28, "#725737", "#412917");
  drawPixelRect(126, 126, 34, 18, "#58412c", "#2e1e14");
  drawPixelRect(54, 66, 14, 44, "#8a6a45", "#53371c");
  drawPixelRect(62, 84, 48, 9, "#8a6a45", "#53371c");

  const mossClusters = 5 + Math.floor(state.moss / 8);
  for (let i = 0; i < mossClusters; i += 1) {
    const x = 44 + ((i * 27) % 138);
    const y = 40 + ((i * 21) % 58);
    drawPixelCircle(x, y, 10, "#3f9a48");
    drawPixelCircle(x + 6, y - 4, 6, "#6add6f");
    drawPixelCircle(x - 6, y + 4, 5, "#246c31");
  }

  const plantLevel = getUpgrade("plants")?.level ?? 0;
  for (let i = 0; i < plantLevel; i += 1) {
    const x = 168 + (i % 2) * 10;
    const y = 44 + (i * 13) % 54;
    drawPixelRect(x, y, 4, 24, "#6cc76f", "transparent");
    drawPixelRect(x - 6, y + 6, 6, 4, "#7fe285", "transparent");
    drawPixelRect(x + 4, y + 12, 6, 4, "#5ab55f", "transparent");
  }

  const decorLevel = getUpgrade("decor")?.level ?? 0;
  for (let i = 0; i < decorLevel; i += 1) {
    const x = 144 + ((i * 16) % 28);
    const y = 150 + ((i * 10) % 20);
    drawPixelRect(x, y, 12, 8, "#867965", "#4b4439");
    drawPixelRect(x + 6, y - 8, 6, 8, "#79d882", "transparent");
  }

  const mistLevel = getUpgrade("mist")?.level ?? 0;
  drawPixelRect(188, 38, 16, 14, "#8aa3aa", "#4a5860");
  for (let i = 0; i < 2 + mistLevel * 2; i += 1) {
    const drift = ((state.tick * 18) + i * 15) % 70;
    drawPixelCircle(192 + (i % 3) * 5, 68 + drift, 3, "rgba(220,245,255,0.6)");
  }

  for (let i = 0; i < 5; i += 1) {
    drawPixelCircle(48 + i * 28, 36 + (i % 2) * 6, 2, "rgba(255,255,255,0.24)");
  }
}

function drawFrog(frog) {
  const x = Math.round(frog.x);
  const y = Math.round(frog.y);
  const faceX = frog.facing >= 0 ? x + 11 : x - 1;

  drawPixelRect(x, y, 12, 10, "#73d65f", "#2f6f2a");
  drawPixelRect(x + 1, y + 2, 10, 5, "#91ec79", "transparent");
  drawPixelRect(x + 2, y - 2, 3, 3, "#b8ff9f", "transparent");
  drawPixelRect(x + 7, y - 2, 3, 3, "#b8ff9f", "transparent");
  drawPixelRect(faceX, y + 3, 2, 2, "#102313", "transparent");
  drawPixelRect(x - 2, y + 8, 3, 3, "#5bb04a", "transparent");
  drawPixelRect(x + 11, y + 8, 3, 3, "#5bb04a", "transparent");
  drawPixelRect(x + 4, y + 6, 4, 2, "#dbf3c4", "transparent");
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
    const x = 46 + ((i * 29) % 132);
    const y = 118 + ((i * 19) % 58);
    drawPixelRect(x, y, 6, 6, "rgba(92, 62, 29, 0.65)", "transparent");
  }
}

function renderHabitat() {
  const width = elements.canvas.width;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, width);

  const scale = width / WORLD_SIZE;
  ctx.save();
  ctx.scale(scale, scale);

  drawHabitatBase();
  drawWaste();
  drawCreatures();

  if (state.frogs.length === 0) {
    ctx.fillStyle = "rgba(20, 24, 12, 0.18)";
    ctx.fillRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48);
  }

  if (state.cleanliness < 40) {
    ctx.fillStyle = `rgba(57, 44, 22, ${Math.min(0.3, (40 - state.cleanliness) / 100)})`;
    ctx.fillRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48);
  }

  if (state.lampTimer > 0) {
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
    `<div class="chip">${state.frogs.length === 0 ? "Buy your first frog" : state.lampTimer > 0 ? `Sun Lamp ${Math.ceil(state.lampTimer)}s` : "Terrarium Stable"}</div>`
  ].join("");

  const statusItems = [
    { label: "Coins", value: state.coins, max: 40, suffix: "¢" },
    { label: "Humidity", value: state.humidity, max: 100, suffix: "%" },
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
        pushEvent("Crickets released", "Fresh feeder insects were added.");
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
    pushEvent("Crickets released", "Fresh feeder insects were added.");
    renderHud();
  });

  elements.cleanButton.addEventListener("click", () => {
    state.cleanliness = clamp(state.cleanliness + 18, 0, 100);
    state.waste = clamp(state.waste - 16, 0, 100);
    pushEvent("Habitat cleaned", "Bark, glass, and substrate were tidied.");
    renderHud();
  });

  elements.boostButton.addEventListener("click", () => {
    if (!spendCoins(3)) {
      pushEvent("Need coins", "Sun Lamp costs 3 coins.");
      renderHud();
      return;
    }
    state.lampTimer = 20;
    pushEvent("Sun lamp", "Warm light brightens the terrarium for 20 seconds.");
    renderHud();
  });

  elements.saveButton.addEventListener("click", saveGame);
}

function tick() {
  simulate(1 / 20);
  renderHabitat();
  renderHud();
  if (Math.floor(state.tick) % 15 === 0 && Math.abs(state.tick % 15) < 0.051) {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      tick: state.tick,
      coins: state.coins,
      humidity: state.humidity,
      cleanliness: state.cleanliness,
      moss: state.moss,
      waste: state.waste,
      level: state.level,
      lampTimer: state.lampTimer,
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
renderHabitat();
requestAnimationFrame(tick);
