const WORLD_WIDTH = 320;
const WORLD_HEIGHT = 214;
const SAVE_KEY = "ecobox-save-v1";

const state = {
  tick: 0,
  energy: 18,
  oxygen: 72,
  cleanliness: 64,
  population: 6,
  algae: 10,
  shells: 0,
  level: 1,
  boostTimer: 0,
  events: [
    { label: "Cycle started", detail: "Tiny ecosystem online." },
    { label: "Starter stock", detail: "6 critters added to the tank." }
  ],
  upgrades: [
    {
      id: "aerator",
      name: "Bubble Pump",
      description: "+4 oxygen per level",
      cost: 15,
      level: 0,
      maxLevel: 8
    },
    {
      id: "scrubber",
      name: "Filter Sponge",
      description: "+3 cleanliness per level",
      cost: 20,
      level: 0,
      maxLevel: 8
    },
    {
      id: "nursery",
      name: "Nursery Mesh",
      description: "+1 population growth",
      cost: 26,
      level: 0,
      maxLevel: 6
    },
    {
      id: "light",
      name: "Grow Light",
      description: "+2 algae growth",
      cost: 18,
      level: 0,
      maxLevel: 8
    }
  ]
};

const elements = {
  canvas: document.getElementById("tank-canvas"),
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

function pushEvent(label, detail) {
  state.events.unshift({ label, detail });
  state.events = state.events.slice(0, 12);
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
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
  elements.canvas.width = Math.round(rect.width * dpr);
  elements.canvas.height = Math.round((rect.width * (WORLD_HEIGHT / WORLD_WIDTH)) * dpr);
}

function getUpgrade(id) {
  return state.upgrades.find((upgrade) => upgrade.id === id);
}

function simulate(dt) {
  state.tick += dt;

  const aerator = getUpgrade("aerator")?.level ?? 0;
  const scrubber = getUpgrade("scrubber")?.level ?? 0;
  const nursery = getUpgrade("nursery")?.level ?? 0;
  const light = getUpgrade("light")?.level ?? 0;
  const boostMultiplier = state.boostTimer > 0 ? 2 : 1;

  state.algae += (0.8 + light * 0.22) * dt * boostMultiplier;
  state.energy += (0.5 + state.population * 0.05) * dt * boostMultiplier;
  state.oxygen += (0.2 + aerator * 0.16) * dt;
  state.cleanliness -= (0.16 + state.population * 0.018) * dt;
  state.cleanliness += scrubber * 0.12 * dt;

  if (state.algae > 4) {
    state.population += (0.02 + nursery * 0.008) * dt;
    state.algae -= 0.12 * dt * state.population;
  }

  if (state.cleanliness < 30) {
    state.oxygen -= 0.28 * dt;
  }

  if (state.oxygen < 28) {
    state.population -= 0.03 * dt;
  }

  if (state.boostTimer > 0) {
    state.boostTimer = Math.max(0, state.boostTimer - dt);
  }

  state.energy = clamp(state.energy, 0, 9999);
  state.oxygen = clamp(state.oxygen, 0, 100);
  state.cleanliness = clamp(state.cleanliness, 0, 100);
  state.population = clamp(state.population, 0, 999);
  state.algae = clamp(state.algae, 0, 200);

  const nextLevel = 1 + Math.floor((state.energy + state.population * 3) / 60);
  state.level = clamp(nextLevel, 1, 99);
}

function drawPixelRect(x, y, w, h, fill, stroke = "#000") {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function renderTank() {
  const width = elements.canvas.width;
  const height = elements.canvas.height;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const scaleX = width / WORLD_WIDTH;
  const scaleY = height / WORLD_HEIGHT;
  ctx.save();
  ctx.scale(scaleX, scaleY);

  drawPixelRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "#163d4c", "#09161c");

  for (let i = 0; i < 10; i += 1) {
    drawPixelRect(i * 32, 0, 16, 6, "rgba(255,255,255,0.08)", "rgba(0,0,0,0)");
  }

  drawPixelRect(0, WORLD_HEIGHT - 34, WORLD_WIDTH, 34, "#4d3520", "#2a1b0b");

  const algaeHeight = 12 + Math.floor(Math.min(28, state.algae * 0.3));
  drawPixelRect(0, WORLD_HEIGHT - 34 - algaeHeight, WORLD_WIDTH, algaeHeight, "#2fa34f", "#1d5a2e");

  const bubbleCount = 4 + Math.floor((getUpgrade("aerator")?.level ?? 0) * 1.5);
  for (let i = 0; i < bubbleCount; i += 1) {
    const x = 36 + i * 18;
    const bob = ((state.tick * 24) + i * 17) % 120;
    drawPixelRect(x, WORLD_HEIGHT - 24 - bob, 4, 4, "#c7f4ff", "#4d8aa0");
  }

  const critterCount = Math.max(3, Math.min(24, Math.floor(state.population)));
  for (let i = 0; i < critterCount; i += 1) {
    const x = 36 + ((i * 23 + Math.floor(state.tick * 10)) % 240);
    const y = 40 + ((i * 17 + Math.floor(state.tick * 7)) % 110);
    drawPixelRect(x, y, 10, 6, "#ffd45e", "#7a5514");
    drawPixelRect(x + 8, y + 2, 4, 2, "#fff4c4", "#7a5514");
  }

  const cleanlinessShade = Math.floor(100 - state.cleanliness);
  if (cleanlinessShade > 10) {
    ctx.fillStyle = `rgba(52, 38, 20, ${Math.min(0.35, cleanlinessShade / 180)})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  ctx.restore();
}

function renderHud() {
  elements.tankChips.innerHTML = [
    `<div class="chip">LV ${state.level}</div>`,
    `<div class="chip">POP ${Math.floor(state.population)}</div>`,
    `<div class="chip">ENERGY ${Math.floor(state.energy)}</div>`
  ].join("");

  const statusItems = [
    { label: "Energy", value: state.energy, max: 120, suffix: "⚡" },
    { label: "Oxygen", value: state.oxygen, max: 100, suffix: "%" },
    { label: "Cleanliness", value: state.cleanliness, max: 100, suffix: "%" },
    { label: "Population", value: state.population, max: 40, suffix: " critters" },
    { label: "Algae", value: state.algae, max: 40, suffix: " units" }
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
    {
      title: "Balanced Tank",
      done: state.oxygen >= 65 && state.cleanliness >= 60,
      text: "Keep oxygen and cleanliness above 60."
    },
    {
      title: "Growing Colony",
      done: state.population >= 12,
      text: "Reach 12 critters in one tank."
    },
    {
      title: "Idle Income",
      done: state.energy >= 50,
      text: "Store 50 energy for future upgrades."
    }
  ];

  elements.milestones.innerHTML = milestoneData.map((milestone) => `
    <article class="milestone">
      <strong>${milestone.done ? "[DONE]" : "[TODO]"} ${milestone.title}</strong>
      <div>${milestone.text}</div>
    </article>
  `).join("");

  elements.upgradeList.innerHTML = state.upgrades.map((upgrade) => {
    const cost = Math.floor(upgrade.cost * (1 + upgrade.level * 0.65));
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
      const cost = Math.floor(upgrade.cost * (1 + upgrade.level * 0.65));
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
    const gained = 6 + Math.floor(state.population * 0.6);
    state.energy += gained;
    state.shells += 1;
    pushEvent("Collected", `Harvested ${gained} energy from the ecosystem.`);
    renderHud();
  });

  elements.feedButton.addEventListener("click", () => {
    state.algae = clamp(state.algae + 8, 0, 200);
    state.cleanliness = clamp(state.cleanliness - 3, 0, 100);
    pushEvent("Fed tank", "Nutrient gel added. Growth increased.");
    renderHud();
  });

  elements.cleanButton.addEventListener("click", () => {
    state.cleanliness = clamp(state.cleanliness + 16, 0, 100);
    state.energy = Math.max(0, state.energy - 4);
    pushEvent("Cleaned tank", "Waste removed and water clarity improved.");
    renderHud();
  });

  elements.boostButton.addEventListener("click", () => {
    if (state.energy < 12) {
      pushEvent("Boost failed", "Need 12 energy to overclock the tank.");
      renderHud();
      return;
    }
    state.energy -= 12;
    state.boostTimer = 20;
    pushEvent("Boost online", "Production doubled for 20 seconds.");
    renderHud();
  });

  elements.saveButton.addEventListener("click", saveGame);
}

function tick() {
  simulate(1 / 20);
  renderTank();
  renderHud();
  if (Math.floor(state.tick) % 15 === 0 && Math.abs((state.tick % 15)) < 0.051) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
  requestAnimationFrame(tick);
}

loadGame();
bindUi();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
renderHud();
renderTank();
requestAnimationFrame(tick);
