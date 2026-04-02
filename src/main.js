const WORLD_SIZE = 240;
const SAVE_KEY = "ecobox-save-v2";

const state = {
  tick: 0,
  energy: 20,
  oxygen: 74,
  cleanliness: 68,
  population: 7,
  algae: 12,
  waste: 18,
  level: 1,
  boostTimer: 0,
  events: [
    { label: "EcoBox online", detail: "Top-down tank initialized." },
    { label: "Starter biome", detail: "Moss pads, snails, and micro-swimmers added." }
  ],
  upgrades: [
    { id: "aerator", name: "Corner Aerator", description: "Keeps water oxygenated", cost: 15, level: 0, maxLevel: 8 },
    { id: "reedbed", name: "Reed Bed", description: "Passively cleans waste", cost: 18, level: 0, maxLevel: 8 },
    { id: "broodlight", name: "Brood Light", description: "Improves population growth", cost: 22, level: 0, maxLevel: 6 },
    { id: "autofeeder", name: "Auto Feeder", description: "Increases algae production", cost: 20, level: 0, maxLevel: 8 }
  ],
  critters: []
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
  state.events = state.events.slice(0, 14);
}

function createCritters(count) {
  state.critters = Array.from({ length: count }, (_, index) => ({
    x: rand(38, WORLD_SIZE - 38),
    y: rand(38, WORLD_SIZE - 38),
    vx: rand(-0.25, 0.25),
    vy: rand(-0.25, 0.25),
    hue: index % 3 === 0 ? "#ffd866" : index % 3 === 1 ? "#ff9f6e" : "#f7f1c7"
  }));
}

function syncCritterCount() {
  const target = Math.max(3, Math.min(28, Math.floor(state.population)));
  if (state.critters.length < target) {
    const needed = target - state.critters.length;
    for (let i = 0; i < needed; i += 1) {
      state.critters.push({
        x: rand(38, WORLD_SIZE - 38),
        y: rand(38, WORLD_SIZE - 38),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.25, 0.25),
        hue: i % 2 === 0 ? "#ffd866" : "#ff9f6e"
      });
    }
  } else if (state.critters.length > target) {
    state.critters.length = target;
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    tick: state.tick,
    energy: state.energy,
    oxygen: state.oxygen,
    cleanliness: state.cleanliness,
    population: state.population,
    algae: state.algae,
    waste: state.waste,
    level: state.level,
    boostTimer: state.boostTimer,
    events: state.events,
    upgrades: state.upgrades
  }));
  pushEvent("Saved", "Local tank state stored on this device.");
  renderHud();
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch {
    pushEvent("Load failed", "Starting with a fresh ecosystem.");
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

function simulate(dt) {
  state.tick += dt;

  const aerator = getUpgrade("aerator")?.level ?? 0;
  const reedbed = getUpgrade("reedbed")?.level ?? 0;
  const broodlight = getUpgrade("broodlight")?.level ?? 0;
  const autofeeder = getUpgrade("autofeeder")?.level ?? 0;
  const boostMultiplier = state.boostTimer > 0 ? 2 : 1;

  state.algae += (0.55 + autofeeder * 0.18) * dt * boostMultiplier;
  state.energy += (0.42 + state.population * 0.05) * dt * boostMultiplier;
  state.oxygen += (0.18 + aerator * 0.18) * dt;
  state.cleanliness -= (0.14 + state.population * 0.02) * dt;
  state.cleanliness += reedbed * 0.13 * dt;
  state.waste += (0.18 + state.population * 0.016) * dt;
  state.waste -= (0.1 + reedbed * 0.12) * dt;

  if (state.algae > 4) {
    state.population += (0.018 + broodlight * 0.008) * dt;
    state.algae -= 0.08 * dt * state.population;
  }

  if (state.waste > 45) {
    state.cleanliness -= 0.24 * dt;
    state.oxygen -= 0.18 * dt;
  }

  if (state.oxygen < 28 || state.cleanliness < 24) {
    state.population -= 0.025 * dt;
  }

  if (state.boostTimer > 0) {
    state.boostTimer = Math.max(0, state.boostTimer - dt);
  }

  state.energy = clamp(state.energy, 0, 9999);
  state.oxygen = clamp(state.oxygen, 0, 100);
  state.cleanliness = clamp(state.cleanliness, 0, 100);
  state.population = clamp(state.population, 0, 999);
  state.algae = clamp(state.algae, 0, 200);
  state.waste = clamp(state.waste, 0, 100);
  state.level = clamp(1 + Math.floor((state.energy + state.population * 4) / 65), 1, 99);

  for (const critter of state.critters) {
    critter.x += critter.vx * dt * 60;
    critter.y += critter.vy * dt * 60;

    if (Math.random() < 0.04) {
      critter.vx += rand(-0.08, 0.08);
      critter.vy += rand(-0.08, 0.08);
    }

    critter.vx = clamp(critter.vx, -0.45, 0.45);
    critter.vy = clamp(critter.vy, -0.45, 0.45);

    if (critter.x < 26 || critter.x > WORLD_SIZE - 26) critter.vx *= -1;
    if (critter.y < 26 || critter.y > WORLD_SIZE - 26) critter.vy *= -1;
    critter.x = clamp(critter.x, 26, WORLD_SIZE - 26);
    critter.y = clamp(critter.y, 26, WORLD_SIZE - 26);
  }

  syncCritterCount();
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

function drawTankBase() {
  drawPixelRect(0, 0, WORLD_SIZE, WORLD_SIZE, "#183b47", "#071218");
  drawPixelRect(14, 14, WORLD_SIZE - 28, WORLD_SIZE - 28, "#2d7d7d", "#0a1c21");
  drawPixelRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48, "#5bc0be", "#184c55");

  for (let i = 0; i < 7; i += 1) {
    const lilyX = 30 + i * 28 + ((i % 2) * 7);
    const lilyY = 34 + (i % 3) * 46;
    drawPixelRect(lilyX, lilyY, 14, 10, "#2d8f4a", "#164a25");
    drawPixelRect(lilyX + 5, lilyY + 2, 3, 3, "#8cff96", "transparent");
  }

  const reedbedLevel = getUpgrade("reedbed")?.level ?? 0;
  for (let i = 0; i < reedbedLevel; i += 1) {
    const x = 36 + (i % 4) * 18;
    const y = WORLD_SIZE - 52 - Math.floor(i / 4) * 14;
    drawPixelRect(x, y, 3, 14, "#6fd37a", "transparent");
    drawPixelRect(x + 3, y + 3, 3, 11, "#509d57", "transparent");
  }

  const aeratorLevel = getUpgrade("aerator")?.level ?? 0;
  for (let i = 0; i < 3 + aeratorLevel * 2; i += 1) {
    const baseX = WORLD_SIZE - 42 + (i % 2) * 8;
    const rise = ((state.tick * 18) + i * 13) % 140;
    drawPixelRect(baseX, WORLD_SIZE - 34 - rise, 4, 4, "#d8fbff", "#5e9db0");
  }

  const autofeederLevel = getUpgrade("autofeeder")?.level ?? 0;
  for (let i = 0; i < autofeederLevel; i += 1) {
    const x = WORLD_SIZE - 62 - i * 10;
    drawPixelRect(x, 28, 8, 8, "#f4c96f", "#8f6112");
    drawPixelRect(x + 2, 36, 4, 6, "#7ce38b", "transparent");
  }

  const broodlightLevel = getUpgrade("broodlight")?.level ?? 0;
  for (let i = 0; i < broodlightLevel; i += 1) {
    const x = 42 + i * 14;
    drawPixelRect(x, 26, 8, 4, "#fff1b8", "#8f6112");
  }
}

function drawCritters() {
  for (const critter of state.critters) {
    drawPixelRect(Math.round(critter.x), Math.round(critter.y), 8, 8, critter.hue, "#55371d");
    drawPixelRect(Math.round(critter.x + 6), Math.round(critter.y + 3), 3, 2, "#fff8d6", "transparent");
  }
}

function drawWaste() {
  const wastePatches = Math.floor(state.waste / 7);
  for (let i = 0; i < wastePatches; i += 1) {
    const x = 28 + ((i * 31) % 170);
    const y = 34 + ((i * 19) % 170);
    drawPixelRect(x, y, 6, 6, "rgba(102, 73, 31, 0.55)", "transparent");
  }
}

function renderTank() {
  const width = elements.canvas.width;
  const height = elements.canvas.height;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const scale = width / WORLD_SIZE;
  ctx.save();
  ctx.scale(scale, scale);

  drawTankBase();
  drawWaste();
  drawCritters();

  if (state.cleanliness < 40) {
    ctx.fillStyle = `rgba(57, 44, 22, ${Math.min(0.3, (40 - state.cleanliness) / 100)})`;
    ctx.fillRect(14, 14, WORLD_SIZE - 28, WORLD_SIZE - 28);
  }

  if (state.boostTimer > 0) {
    ctx.fillStyle = "rgba(255, 216, 102, 0.12)";
    ctx.fillRect(14, 14, WORLD_SIZE - 28, WORLD_SIZE - 28);
  }

  ctx.restore();
}

function renderHud() {
  elements.tankChips.innerHTML = [
    `<div class="chip">LV ${state.level}</div>`,
    `<div class="chip">POP ${Math.floor(state.population)}</div>`,
    `<div class="chip">ENERGY ${Math.floor(state.energy)}</div>`
  ].join("");

  elements.overlay.innerHTML = [
    `<div class="chip">Waste ${Math.floor(state.waste)}%</div>`,
    `<div class="chip">${state.boostTimer > 0 ? `Sun Boost ${Math.ceil(state.boostTimer)}s` : "Stable Cycle"}</div>`
  ].join("");

  const statusItems = [
    { label: "Energy", value: state.energy, max: 120, suffix: "⚡" },
    { label: "Oxygen", value: state.oxygen, max: 100, suffix: "%" },
    { label: "Cleanliness", value: state.cleanliness, max: 100, suffix: "%" },
    { label: "Population", value: state.population, max: 40, suffix: " critters" },
    { label: "Algae", value: state.algae, max: 40, suffix: " mats" }
  ];

  elements.statusGrid.innerHTML = statusItems.map((item) => {
    const percent = clamp((item.value / item.max) * 100, 0, 100);
    return `
      <article class="status-card">
        <strong>${item.label}</strong>
        <div>${Math.floor(item.value)}${item.suffix}</div>
        <div class="bar"><span style="width:${percent}%"></span></div>
      </article>
    `;
  }).join("");

  const milestoneData = [
    { title: "Clear Water", done: state.cleanliness >= 75, text: "Raise cleanliness to 75." },
    { title: "Crowded Box", done: state.population >= 14, text: "Reach 14 critters in one tank." },
    { title: "Automation", done: state.upgrades.some((upgrade) => upgrade.level >= 2), text: "Get any upgrade to level 2." }
  ];

  elements.milestones.innerHTML = milestoneData.map((milestone) => `
    <article class="milestone">
      <strong>${milestone.done ? "[DONE]" : "[TODO]"} ${milestone.title}</strong>
      <div>${milestone.text}</div>
    </article>
  `).join("");

  elements.upgradeList.innerHTML = state.upgrades.map((upgrade) => {
    const cost = Math.floor(upgrade.cost * (1 + upgrade.level * 0.7));
    const disabled = state.energy < cost || upgrade.level >= upgrade.maxLevel;
    return `
      <article class="upgrade">
        <div>
          <strong>${upgrade.name} Lv.${upgrade.level}</strong>
          <div class="upgrade-meta">${upgrade.description}</div>
          <div class="upgrade-meta">Cost: ${cost} energy</div>
        </div>
        <button class="pixel-button ${disabled ? "secondary" : ""}" data-upgrade-id="${upgrade.id}" ${disabled ? "disabled" : ""}>
          ${upgrade.level >= upgrade.maxLevel ? "MAX" : "BUY"}
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
      const cost = Math.floor(upgrade.cost * (1 + upgrade.level * 0.7));
      if (state.energy < cost || upgrade.level >= upgrade.maxLevel) return;
      state.energy -= cost;
      upgrade.level += 1;
      pushEvent("Upgrade bought", `${upgrade.name} upgraded to level ${upgrade.level}.`);
      renderHud();
    });
  });
}

function bindUi() {
  elements.collectButton.addEventListener("click", () => {
    const gained = 5 + Math.floor(state.population * 0.7);
    state.energy += gained;
    pushEvent("Collected", `Stored ${gained} energy from the tank cycle.`);
    renderHud();
  });

  elements.feedButton.addEventListener("click", () => {
    state.algae = clamp(state.algae + 10, 0, 200);
    state.waste = clamp(state.waste + 4, 0, 100);
    pushEvent("Algae seeded", "Fresh growth pads dropped into the tank.");
    renderHud();
  });

  elements.cleanButton.addEventListener("click", () => {
    state.cleanliness = clamp(state.cleanliness + 18, 0, 100);
    state.waste = clamp(state.waste - 16, 0, 100);
    state.energy = Math.max(0, state.energy - 4);
    pushEvent("Waste skimmed", "Surface debris removed from the box.");
    renderHud();
  });

  elements.boostButton.addEventListener("click", () => {
    if (state.energy < 14) {
      pushEvent("Boost failed", "Need 14 energy to trigger a sun burst.");
      renderHud();
      return;
    }
    state.energy -= 14;
    state.boostTimer = 20;
    pushEvent("Sun boost", "Warm light doubles output for 20 seconds.");
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
      energy: state.energy,
      oxygen: state.oxygen,
      cleanliness: state.cleanliness,
      population: state.population,
      algae: state.algae,
      waste: state.waste,
      level: state.level,
      boostTimer: state.boostTimer,
      events: state.events,
      upgrades: state.upgrades
    }));
  }
  requestAnimationFrame(tick);
}

loadGame();
createCritters(Math.floor(state.population));
syncCritterCount();
bindUi();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
renderHud();
renderTank();
requestAnimationFrame(tick);
