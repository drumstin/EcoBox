const WORLD_SIZE = 240;
const SAVE_KEY = "ecobox-save-v3";

const SPECIES = [
  { key: "glider", color: "#ffd866", eye: "#fff8d6", speed: 0.34, size: 8 },
  { key: "snout", color: "#ff9f6e", eye: "#fff1d6", speed: 0.28, size: 9 },
  { key: "mote", color: "#f7f1c7", eye: "#ffffff", speed: 0.22, size: 6 }
];

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
  decorationsPlaced: 0,
  events: [
    { label: "EcoBox online", detail: "Top-down tank initialized." },
    { label: "Starter biome", detail: "Moss pads, snails, and micro-swimmers added." }
  ],
  upgrades: [
    { id: "aerator", name: "Corner Aerator", description: "Keeps water oxygenated", cost: 15, level: 0, maxLevel: 8 },
    { id: "reedbed", name: "Reed Bed", description: "Passively cleans waste", cost: 18, level: 0, maxLevel: 8 },
    { id: "broodlight", name: "Brood Light", description: "Improves population growth", cost: 22, level: 0, maxLevel: 6 },
    { id: "autofeeder", name: "Auto Feeder", description: "Increases algae production", cost: 20, level: 0, maxLevel: 8 },
    { id: "decor", name: "Pixel Decor", description: "Adds rocks, logs, and cover", cost: 16, level: 0, maxLevel: 6 }
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

function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pushEvent(label, detail) {
  state.events.unshift({ label, detail });
  state.events = state.events.slice(0, 14);
}

function spawnCritter() {
  const species = choice(SPECIES);
  return {
    species: species.key,
    x: rand(44, WORLD_SIZE - 44),
    y: rand(44, WORLD_SIZE - 44),
    vx: rand(-species.speed, species.speed),
    vy: rand(-species.speed, species.speed),
    color: species.color,
    eye: species.eye,
    size: species.size
  };
}

function createCritters(count) {
  state.critters = Array.from({ length: count }, () => spawnCritter());
}

function syncCritterCount() {
  const target = Math.max(3, Math.min(30, Math.floor(state.population)));
  if (state.critters.length < target) {
    const needed = target - state.critters.length;
    for (let i = 0; i < needed; i += 1) {
      state.critters.push(spawnCritter());
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
    decorationsPlaced: state.decorationsPlaced,
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
  const decor = getUpgrade("decor")?.level ?? 0;
  const boostMultiplier = state.boostTimer > 0 ? 2 : 1;

  state.algae += (0.55 + autofeeder * 0.18) * dt * boostMultiplier;
  state.energy += (0.42 + state.population * 0.05 + decor * 0.03) * dt * boostMultiplier;
  state.oxygen += (0.18 + aerator * 0.18) * dt;
  state.cleanliness -= (0.14 + state.population * 0.02) * dt;
  state.cleanliness += reedbed * 0.13 * dt;
  state.waste += (0.18 + state.population * 0.016) * dt;
  state.waste -= (0.1 + reedbed * 0.12 + decor * 0.03) * dt;

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
  state.level = clamp(1 + Math.floor((state.energy + state.population * 4 + decor * 6) / 65), 1, 99);

  for (const critter of state.critters) {
    critter.x += critter.vx * dt * 60;
    critter.y += critter.vy * dt * 60;

    if (Math.random() < 0.04) {
      critter.vx += rand(-0.08, 0.08);
      critter.vy += rand(-0.08, 0.08);
    }

    critter.vx = clamp(critter.vx, -0.45, 0.45);
    critter.vy = clamp(critter.vy, -0.45, 0.45);

    if (critter.x < 30 || critter.x > WORLD_SIZE - 30) critter.vx *= -1;
    if (critter.y < 30 || critter.y > WORLD_SIZE - 30) critter.vy *= -1;
    critter.x = clamp(critter.x, 30, WORLD_SIZE - 30);
    critter.y = clamp(critter.y, 30, WORLD_SIZE - 30);
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
  drawPixelRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48, "#68cdd0", "#1c5d67");

  drawPixelRect(31, 31, WORLD_SIZE - 62, WORLD_SIZE - 62, "rgba(255,255,255,0.08)", "transparent");

  const algaeClusters = 5 + Math.floor(state.algae / 8);
  for (let i = 0; i < algaeClusters; i += 1) {
    const x = 42 + ((i * 37) % 138) + (i % 2) * 9;
    const y = 42 + ((i * 29) % 132) + ((i + 1) % 3) * 7;
    drawPixelCircle(x, y, 9, "#2f8f4a");
    drawPixelCircle(x + 5, y - 4, 6, "#5edb7b");
    drawPixelCircle(x - 6, y + 4, 5, "#21753a");
  }

  const decorLevel = getUpgrade("decor")?.level ?? 0;
  for (let i = 0; i < decorLevel; i += 1) {
    const x = 44 + ((i * 26) % 120);
    const y = 150 + ((i * 17) % 34);
    drawPixelRect(x, y, 12, 8, "#8c6a42", "#4c3518");
    drawPixelRect(x + 8, y - 8, 5, 8, "#6fd37a", "transparent");
  }

  const reedbedLevel = getUpgrade("reedbed")?.level ?? 0;
  for (let i = 0; i < reedbedLevel; i += 1) {
    const x = 42 + (i % 4) * 20;
    const y = 176 - Math.floor(i / 4) * 16;
    drawPixelRect(x, y, 3, 16, "#6fd37a", "transparent");
    drawPixelRect(x + 4, y + 3, 3, 13, "#4ea85a", "transparent");
  }

  const aeratorLevel = getUpgrade("aerator")?.level ?? 0;
  drawPixelRect(184, 182, 16, 16, "#5c6e79", "#2e3a42");
  for (let i = 0; i < 3 + aeratorLevel * 2; i += 1) {
    const bob = ((state.tick * 18) + i * 13) % 116;
    drawPixelRect(190 + (i % 2) * 8, 174 - bob, 4, 4, "#d8fbff", "#5e9db0");
  }

  const autofeederLevel = getUpgrade("autofeeder")?.level ?? 0;
  for (let i = 0; i < autofeederLevel; i += 1) {
    const x = 168 - i * 12;
    drawPixelRect(x, 34, 9, 9, "#f4c96f", "#8f6112");
    drawPixelRect(x + 2, 43, 4, 5, "#7ce38b", "transparent");
  }

  const broodlightLevel = getUpgrade("broodlight")?.level ?? 0;
  for (let i = 0; i < broodlightLevel; i += 1) {
    const x = 54 + i * 16;
    drawPixelRect(x, 30, 9, 4, "#fff1b8", "#8f6112");
  }
}

function drawCritter(critter) {
  const x = Math.round(critter.x);
  const y = Math.round(critter.y);

  if (critter.species === "glider") {
    drawPixelRect(x, y, 10, 7, critter.color, "#55371d");
    drawPixelRect(x + 7, y + 2, 4, 2, critter.eye, "transparent");
    drawPixelRect(x - 2, y + 2, 2, 2, "#c98f26", "transparent");
  } else if (critter.species === "snout") {
    drawPixelRect(x, y, 9, 9, critter.color, "#704024");
    drawPixelRect(x + 6, y + 3, 4, 2, critter.eye, "transparent");
    drawPixelRect(x + 2, y - 2, 3, 2, "#ffcf9e", "transparent");
  } else {
    drawPixelRect(x, y, 6, 6, critter.color, "#77704a");
    drawPixelRect(x + 4, y + 2, 2, 2, critter.eye, "transparent");
  }
}

function drawCritters() {
  for (const critter of state.critters) {
    drawCritter(critter);
  }
}

function drawWaste() {
  const wastePatches = Math.floor(state.waste / 7);
  for (let i = 0; i < wastePatches; i += 1) {
    const x = 36 + ((i * 31) % 146);
    const y = 42 + ((i * 19) % 138);
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
  drawCritters();

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
        <div class="status-name">${item.label}</div>
        <div class="bar"><span style="width:${percent}%"></span></div>
        <div class="status-value">${Math.floor(item.value)}${item.suffix}</div>
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
      if (upgrade.id === "decor") {
        state.decorationsPlaced += 1;
      }
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
      decorationsPlaced: state.decorationsPlaced,
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
