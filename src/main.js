const WORLD_SIZE = 240;
const SAVE_KEY = "ecobox-save-v9";
const FROG_COST = 5;
const CRICKET_COST = 1;
const PILL_BUG_COST = 1;
const PILL_BUG_BITE_RANGE = 12;
const MAX_PILL_BUGS = 24;
const LOG_OBSTACLES = [
  { x: 86, y: 134, w: 50, h: 18 },
  { x: 118, y: 146, w: 24, h: 12 },
  { x: 70, y: 88, w: 44, h: 10 },
  { x: 150, y: 72, w: 28, h: 8 },
  { x: 56, y: 156, w: 16, h: 10 },
  { x: 164, y: 150, w: 14, h: 9 }
];
const FROG_HIDE_CAVES = [
  { id: "log-a", x: 116, y: 148, w: 24, h: 12, exitX: 108, exitY: 144, capacity: 5 },
  { id: "log-b", x: 56, y: 154, w: 24, h: 12, exitX: 82, exitY: 152, capacity: 5 }
];

function createInitialState() {
  return {
    tick: 0,
    coins: 10,
    humidity: 78,
    cleanliness: 86,
    groundCover: 18,
    waste: 4,
    level: 1,
    lampTimer: 0,
    mistBurstTimer: 60,
    mistPauseTimer: 0,
    decorationsPlaced: 0,
    frogs: [],
    frogEggs: [],
    tadpoles: [],
    crickets: [],
    pillBugs: [],
    pillBugEggs: [],
    droppings: [],
    fungusPatches: [],
    popups: [],
    cricketFarmOpen: false,
    multiBuyAmount: 1,
    cricketFarm: {
      carrots: 0,
      potatoes: 0,
      boxes: [
        { id: 1, type: "cricket", crickets: 0, minimized: false, breedingTimer: 0 }
      ]
    },
    events: [
      { label: "EcoBox online", detail: "Empty frog habitat ready for your first resident." },
      { label: "Starter funds", detail: "You have 10 coins to begin stocking the enclosure." }
    ],
    upgrades: [
      { id: "frog", name: "Tree Frog", description: "Adds 1 frog to the habitat", cost: FROG_COST, level: 0, maxLevel: 24, currency: "coins" },
      { id: "crickets", name: "Cricket Cup", description: "Release live feeder crickets", cost: CRICKET_COST, level: 0, maxLevel: 999, currency: "coins" },
      { id: "pillbug", name: "Pill Bug Crew", description: "Adds 1 waste-eating pill bug", cost: PILL_BUG_COST, level: 0, maxLevel: 20, currency: "coins" },
      { id: "mist", name: "Mister", description: "Keeps humidity high", cost: 6, level: 0, maxLevel: 8, currency: "coins" },
      { id: "plants", name: "Leafy Vines", description: "Grows one spreading vine across the habitat", cost: 7, level: 0, maxLevel: 5, currency: "coins" },
      { id: "decor", name: "Pretty Hide", description: "Adds bark hides and stones", cost: 4, level: 0, maxLevel: 8, currency: "coins" }
    ]
  };
}

const state = createInitialState();

const elements = {
  canvas: document.getElementById("tank-canvas"),
  overlay: document.getElementById("tank-overlay"),
  tankFx: document.getElementById("tank-fx"),
  albumButton: document.getElementById("album-button"),
  albumModal: document.getElementById("album-modal"),
  albumList: document.getElementById("album-list"),
  closeAlbumButton: document.getElementById("close-album-button"),
  saveButton: document.getElementById("save-button"),
  resetButton: document.getElementById("reset-button"),
  confirmModal: document.getElementById("confirm-modal"),
  confirmResetButton: document.getElementById("confirm-reset-button"),
  cancelResetButton: document.getElementById("cancel-reset-button"),
  toggleFarmButton: document.getElementById("toggle-farm-button"),
  cricketFarmPanel: document.getElementById("cricket-farm-panel"),
  cricketFarmBoxes: document.getElementById("cricket-farm-boxes"),
  buyCarrotButton: document.getElementById("buy-carrot-button"),
  buyCarrotPrice: document.getElementById("buy-carrot-price"),
  buyPotatoButton: document.getElementById("buy-potato-button"),
  buyPotatoPrice: document.getElementById("buy-potato-price"),
  addCricketBoxButton: document.getElementById("add-cricket-box-button"),
  addCricketBoxPrice: document.getElementById("add-cricket-box-price"),
  addPillbugBoxButton: document.getElementById("add-pillbug-box-button"),
  addPillbugBoxPrice: document.getElementById("add-pillbug-box-price"),
  multiBuyTabs: document.getElementById("multi-buy-tabs"),
  buyFrogButton: document.getElementById("buy-frog-button"),
  buyFrogPrice: document.getElementById("buy-frog-price"),
  sellFrogButton: document.getElementById("sell-frog-button"),
  sellFrogPrice: document.getElementById("sell-frog-price"),
  buyPillBugButton: document.getElementById("buy-pillbug-button"),
  buyPillBugPrice: document.getElementById("buy-pillbug-price"),
  feedButton: document.getElementById("feed-button"),
  feedPrice: document.getElementById("feed-price"),
  cleanButton: document.getElementById("clean-button"),
  cleanPrice: document.getElementById("clean-price"),
  boostButton: document.getElementById("boost-button"),
  boostPrice: document.getElementById("boost-price"),
  tankChips: document.getElementById("tank-chips"),
  tankLiveReadout: document.getElementById("tank-live-readout"),
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
  state.events = state.events.slice(0, 18);
}

function spawnPopup(x, y, text) {
  state.popups.push({ x, y, text, age: 0 });
  state.popups = state.popups.slice(-10);
}

function getGroundY(x, y) {
  return clamp(Math.max(118, y), 118, 182);
}

function spawnFrog(stage = "adult") {
  return {
    x: rand(56, WORLD_SIZE - 56),
    y: rand(56, WORLD_SIZE - 56),
    vx: 0,
    vy: 0,
    hopTimer: rand(0.3, 1.8),
    restTimer: rand(0.8, 2.4),
    jumping: false,
    jumpArc: 0,
    jumpPhase: "idle",
    crouchTimer: 0,
    facing: Math.random() < 0.5 ? -1 : 1,
    hunger: rand(25, 50),
    tongueTimer: 0,
    tongueTargetX: 0,
    tongueTargetY: 0,
    poopTimer: rand(12, 26),
    digestedCrickets: 0,
    digestedPillBugs: 0,
    sleepTimer: 0,
    totalCricketsEaten: 0,
    inHide: false,
    stage,
    age: 0,
    breedReady: false
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

function spawnPillBug(stage = "adult") {
  return {
    x: rand(46, WORLD_SIZE - 46),
    y: rand(122, WORLD_SIZE - 34),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.1, 0.1),
    scootTimer: rand(0.3, 1.2),
    restTimer: rand(0.4, 1.6),
    age: 0,
    stage,
    poopEaten: 0
  };
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    tick: state.tick,
    coins: state.coins,
    humidity: state.humidity,
    cleanliness: state.cleanliness,
    groundCover: state.groundCover,
    waste: state.waste,
    level: state.level,
    lampTimer: state.lampTimer,
    mistPauseTimer: state.mistPauseTimer,
    decorationsPlaced: state.decorationsPlaced,
    events: state.events,
    upgrades: state.upgrades,
    frogs: state.frogs,
    frogEggs: state.frogEggs,
    tadpoles: state.tadpoles,
    crickets: state.crickets,
    pillBugs: state.pillBugs,
    pillBugEggs: state.pillBugEggs,
    droppings: state.droppings,
    fungusPatches: state.fungusPatches
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

function openAlbum() {
  if (!elements.albumModal || !elements.albumList) return;
  const entries = [
    { name: "Tree Frog", icon: "🐸", unlocked: state.frogs.some((frog) => frog.stage === "adult"), count: state.frogs.filter((frog) => frog.stage === "adult").length, note: "Main terrarium frogs." },
    { name: "Froglet", icon: "🐸", unlocked: state.frogs.some((frog) => frog.stage === "froglet"), count: state.frogs.filter((frog) => frog.stage === "froglet").length, note: "Young frogs growing out of the pond." },
    { name: "Tadpole", icon: "~", unlocked: state.tadpoles.length > 0 || state.frogEggs.length > 0, count: state.tadpoles.length, note: "Wiggling pond babies." },
    { name: "Cricket", icon: "🦗", unlocked: state.crickets.length > 0 || state.cricketFarm.boxes.some((box) => box.type !== "pillbug" && box.crickets > 0), count: state.crickets.length, note: "Feeder insects in the habitat." },
    { name: "Pill Bug", icon: "◔", unlocked: state.pillBugs.length > 0 || state.cricketFarm.boxes.some((box) => box.type === "pillbug" && box.crickets > 0), count: state.pillBugs.length, note: "Cleanup crew on the substrate." }
  ];
  elements.albumList.innerHTML = entries.map((entry) => `
    <article class="album-entry ${entry.unlocked ? "" : "album-entry-locked"}">
      <div class="album-entry-top">
        <span class="album-icon">${entry.unlocked ? entry.icon : "?"}</span>
        <div>
          <strong>${entry.unlocked ? entry.name : "Locked"}</strong>
          <div>${entry.unlocked ? `Seen now: ${entry.count}` : "Discover this critter"}</div>
        </div>
      </div>
      <div>${entry.unlocked ? entry.note : "Keep building the habitat to unlock this entry."}</div>
    </article>
  `).join("");
  elements.albumModal.hidden = false;
  elements.albumModal.style.display = "grid";
}

function closeAlbum() {
  if (!elements.albumModal) return;
  elements.albumModal.hidden = true;
  elements.albumModal.style.display = "none";
}

function openResetConfirm() {
  if (elements.confirmModal) {
    elements.confirmModal.hidden = false;
    elements.confirmModal.style.display = "grid";
  }
}

function closeResetConfirm() {
  if (elements.confirmModal) {
    elements.confirmModal.hidden = true;
    elements.confirmModal.style.display = "none";
  }
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  Object.assign(state, createInitialState());
  pushEvent("Reset", "Started a fresh habitat.");
  closeResetConfirm();
  renderHud();
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
  if (upgrade.id === "pillbug") return PILL_BUG_COST;
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
  const pillBugCount = state.pillBugs.length;
  const lampMultiplier = state.lampTimer > 0 ? 1.8 : 1;

  state.groundCover += (0.08 + plants * 0.08) * dt * lampMultiplier;
  state.humidity += (0.08 + mist * 0.18) * dt;
  state.cleanliness += (0.04 + plants * 0.05 + decor * 0.03 + pillBugCount * 0.02) * dt;
  state.cleanliness -= (frogCount * 0.03 + cricketCount * 0.008) * dt;
  state.waste += (frogCount * 0.045 + cricketCount * 0.01) * dt;
  state.waste -= (0.05 + decor * 0.05 + pillBugCount * 0.09) * dt;
  state.coins += (frogCount * 0.03 + decor * 0.015) * dt;

  if (state.waste > 40) {
    state.cleanliness -= 0.2 * dt;
    state.humidity -= 0.08 * dt;
  }

  for (const frog of state.frogs) {
    frog.age += dt;
    if (frog.stage === "froglet" && frog.age >= 90) {
      frog.stage = "adult";
      frog.age = 0;
      spawnPopup(frog.x, frog.y - 8, "grown");
    }

    if (frog.stage === "adult" && frog.age >= 300) {
      state.frogs.splice(state.frogs.indexOf(frog), 1);
      spawnPopup(frog.x, frog.y - 8, "rip");
      continue;
    }

    if (frog.inHide) {
      frog.sleepTimer = Math.max(0, frog.sleepTimer - dt);
      if (frog.sleepTimer === 0) {
        const cave = FROG_HIDE_CAVES.find((entry) => entry.id === frog.hideId) ?? FROG_HIDE_CAVES[0];
        frog.inHide = false;
        frog.hideId = null;
        frog.x = cave.exitX;
        frog.y = cave.exitY;
        frog.hunger = 8;
        frog.totalCricketsEaten = 0;
        frog.breedReady = true;
        spawnPopup(frog.x, frog.y - 8, "awake");
      }
      continue;
    }

    frog.hunger += dt * 3.2;
    frog.hopTimer -= dt;
    frog.restTimer -= dt;
    frog.poopTimer -= dt;
    frog.tongueTimer = Math.max(0, frog.tongueTimer - dt * 2.8);

    let targetType = null;
    let targetX = 0;
    let targetY = 0;
    let closestDist = Infinity;
    for (const cricket of state.crickets) {
      const dx = cricket.x - frog.x;
      const dy = cricket.y - frog.y;
      const dist = Math.hypot(dx, dy);
      if (dist < closestDist) {
        closestDist = dist;
        targetType = "cricket";
        targetX = cricket.x;
        targetY = cricket.y;
      }
    }

    if (frog.jumpPhase === "crouch") {
      frog.crouchTimer = Math.max(0, frog.crouchTimer - dt * 3.4);
      if (frog.crouchTimer === 0) {
        frog.jumpPhase = "air";
        frog.jumping = true;
        frog.jumpArc = 1;
      }
    } else if (frog.jumping) {
      frog.jumpArc = Math.max(0, frog.jumpArc - dt * 1.9);
      if (frog.jumpArc === 0) {
        frog.jumping = false;
        frog.jumpPhase = "idle";
        frog.vx = 0;
        frog.vy = 0;
        frog.restTimer = rand(0.8, 2.6);
      }
    } else if (frog.restTimer <= 0) {
      if (targetType === "cricket" && closestDist < 78) {
        const dx = targetX - frog.x;
        const dy = targetY - frog.y;
        frog.vx = clamp(Math.sign(dx) * rand(0.18, 0.36), -0.38, 0.38);
        frog.vy = clamp(Math.sign(dy) * rand(0.18, 0.36), -0.38, 0.38);
      } else if (frog.hopTimer <= 0 && Math.random() < 0.28) {
        frog.vx = rand(-0.22, 0.22);
        frog.vy = rand(-0.22, 0.22);
      }

      if (Math.abs(frog.vx) > 0.05 || Math.abs(frog.vy) > 0.05) {
        frog.jumpPhase = "crouch";
        frog.crouchTimer = 1;
        frog.hopTimer = targetType === "cricket" ? rand(0.55, 1.2) : rand(1.6, 3.2);
      } else {
        frog.restTimer = rand(1.4, 3.8);
      }
    }

    if (frog.jumping) {
      frog.x += frog.vx * dt * 72;
      frog.y += frog.vy * dt * 72;
      frog.facing = frog.vx >= 0 ? 1 : -1;
    }

    let ateSomething = false;
    for (let i = state.crickets.length - 1; i >= 0; i -= 1) {
      const cricket = state.crickets[i];
      const dx = cricket.x - frog.x;
      const dy = cricket.y - frog.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        frog.facing = cricket.x >= frog.x ? 1 : -1;
        const tongueDx = cricket.x - frog.x;
        const tongueDy = cricket.y - frog.y;
        const tongueDist = Math.hypot(tongueDx, tongueDy) || 1;
        const maxTongue = 12;
        const reach = Math.min(maxTongue, tongueDist);
        frog.tongueTimer = 1;
        frog.tongueTargetX = frog.x + (tongueDx / tongueDist) * reach;
        frog.tongueTargetY = frog.y + (tongueDy / tongueDist) * reach;
        state.crickets.splice(i, 1);
        frog.hunger = Math.max(0, frog.hunger - 18);
        frog.digestedCrickets += 1;
        frog.totalCricketsEaten += 1;
        state.coins += 1;
        spawnPopup(frog.x, frog.y - 8, "+1 coin");
        pushEvent("Frog fed", "A frog snapped up a cricket. +1 coin.");
        ateSomething = true;
        break;
      }
    }

    if (!ateSomething) {
      // Pill bugs are cleanup creatures only and are no longer part of the frog diet.
    }

    if (frog.digestedCrickets >= 3 || frog.digestedPillBugs >= 2 || frog.poopTimer <= 0) {
      const dropX = frog.x + rand(-4, 4);
      const dropY = getGroundY(dropX, frog.y + rand(4, 8));
      state.droppings.push({ x: dropX, y: dropY, age: 0 });
      frog.poopTimer = rand(18, 34);
      frog.digestedCrickets = 0;
      frog.digestedPillBugs = 0;
    }

    if (frog.totalCricketsEaten >= 10) {
      const availableHide = FROG_HIDE_CAVES.find((cave) => state.frogs.filter((other) => other.inHide && other.hideId === cave.id).length < cave.capacity);
      if (availableHide) {
        frog.inHide = true;
        frog.hideId = availableHide.id;
        frog.sleepTimer = 30;
        frog.x = availableHide.x + availableHide.w / 2;
        frog.y = availableHide.y + availableHide.h / 2;
        spawnPopup(frog.x, frog.y - 8, "sleep");
        continue;
      }
    }

    for (const obstacle of LOG_OBSTACLES) {
      const insideX = frog.x > obstacle.x && frog.x < obstacle.x + obstacle.w;
      const insideY = frog.y > obstacle.y && frog.y < obstacle.y + obstacle.h;
      if (insideX && insideY) {
        if (frog.vx >= 0) frog.x = obstacle.x - 2;
        else frog.x = obstacle.x + obstacle.w + 2;
        if (frog.vy >= 0) frog.y = obstacle.y - 2;
        else frog.y = obstacle.y + obstacle.h + 2;
        frog.vx *= -0.4;
        frog.vy *= -0.4;
      }
    }

    if (frog.x < 36 || frog.x > WORLD_SIZE - 36) frog.vx *= -1;
    if (frog.y < 36 || frog.y > WORLD_SIZE - 36) frog.vy *= -1;
    frog.x = clamp(frog.x, 36, WORLD_SIZE - 36);
    frog.y = clamp(frog.y, 36, WORLD_SIZE - 36);
  }

  const readyFrogs = state.frogs.filter((frog) => frog.stage === "adult" && frog.breedReady && !frog.inHide);
  if (readyFrogs.length >= 2) {
    for (let egg = 0; egg < 5; egg += 1) {
      state.frogEggs.push({ x: 58 + rand(-14, 14), y: 150 + rand(-8, 8), age: 0, hatchTimer: 8 });
    }
    readyFrogs[0].breedReady = false;
    readyFrogs[1].breedReady = false;
    pushEvent("Frog eggs", "A pair of frogs laid eggs in the pond.");
  }

  for (const dropping of state.droppings) {
    dropping.age += dt;
  }

  for (let i = state.droppings.length - 1; i >= 0; i -= 1) {
    const dropping = state.droppings[i];
    if (dropping.age >= 30) {
      const fungusY = getGroundY(dropping.x, dropping.y);
      state.fungusPatches.push({ x: dropping.x, y: fungusY, size: rand(4, 7) });
      state.droppings.splice(i, 1);
      pushEvent("Fungus sprouted", "Neglected droppings turned into fungus.");
    }
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

  for (let p = state.pillBugs.length - 1; p >= 0; p -= 1) {
    const pillBug = state.pillBugs[p];
    pillBug.scootTimer -= dt;
    pillBug.restTimer -= dt;
    pillBug.age += dt;

    if (pillBug.stage === "adult" && pillBug.age >= 600) {
      state.waste = Math.min(100, state.waste + 0.4);
      state.pillBugs.splice(p, 1);
      continue;
    }

    if (pillBug.stage === "juvenile" && pillBug.age >= 40) {
      pillBug.stage = "adult";
      pillBug.age = 0;
    }

    let nearestDropping = null;
    let nearestDist = Infinity;
    for (const dropping of state.droppings) {
      const dx = dropping.x - pillBug.x;
      const dy = dropping.y - pillBug.y;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestDropping = dropping;
      }
    }

    let nearestFungus = null;
    let nearestFungusDist = Infinity;
    if (!nearestDropping) {
      for (const fungus of state.fungusPatches) {
        const dx = fungus.x - pillBug.x;
        const dy = fungus.y - pillBug.y;
        const dist = Math.hypot(dx, dy);
        if (dist < nearestFungusDist) {
          nearestFungusDist = dist;
          nearestFungus = fungus;
        }
      }
    }

    if (nearestDropping && nearestDist < 90) {
      const dx = nearestDropping.x - pillBug.x;
      const dy = nearestDropping.y - pillBug.y;
      pillBug.vx = clamp(Math.sign(dx) * 0.18, -0.18, 0.18);
      pillBug.vy = clamp(Math.sign(dy) * 0.12, -0.12, 0.12);
      pillBug.x += pillBug.vx * dt * 42;
      pillBug.y += pillBug.vy * dt * 42;
    } else if (nearestFungus && nearestFungusDist < 120) {
      const dx = nearestFungus.x - pillBug.x;
      const dy = nearestFungus.y - pillBug.y;
      pillBug.vx = clamp(Math.sign(dx) * 0.18, -0.18, 0.18);
      pillBug.vy = clamp(Math.sign(dy) * 0.12, -0.12, 0.12);
      pillBug.x += pillBug.vx * dt * 44;
      pillBug.y += pillBug.vy * dt * 44;
    } else {
      if (pillBug.restTimer <= 0 && pillBug.scootTimer <= 0) {
        pillBug.vx = rand(-0.2, 0.2);
        pillBug.vy = rand(-0.12, 0.12);
        pillBug.scootTimer = rand(0.35, 1.1);
        pillBug.restTimer = rand(0.8, 1.8);
      }

      if (pillBug.scootTimer > 0) {
        pillBug.x += pillBug.vx * dt * 54;
        pillBug.y += pillBug.vy * dt * 54;
      }
    }

    for (let i = state.droppings.length - 1; i >= 0; i -= 1) {
      const dropping = state.droppings[i];
      const dx = dropping.x - pillBug.x;
      const dy = dropping.y - pillBug.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        state.droppings.splice(i, 1);
        state.waste = Math.max(0, state.waste - 0.6);
        if (pillBug.stage === "adult") {
          pillBug.poopEaten += 1;
          if (pillBug.poopEaten >= 10 && state.pillBugs.some((other) => other !== pillBug && other.stage === "adult")) {
            const availableSlots = Math.max(0, MAX_PILL_BUGS - state.pillBugs.length - state.pillBugEggs.length);
            const eggCount = Math.min(5, availableSlots);
            for (let egg = 0; egg < eggCount; egg += 1) {
              state.pillBugEggs.push({ x: pillBug.x + rand(-4, 4), y: pillBug.y + rand(-2, 2), age: 0, hatchTimer: 5 });
            }
            pillBug.poopEaten = 0;
            pushEvent("Pill bug eggs", "A pair of pill bugs laid 5 eggs.");
          }
        }
        break;
      }
    }

    for (let i = state.fungusPatches.length - 1; i >= 0; i -= 1) {
      const fungus = state.fungusPatches[i];
      const dx = fungus.x - pillBug.x;
      const dy = fungus.y - pillBug.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) {
        state.fungusPatches.splice(i, 1);
        state.waste = Math.max(0, state.waste - 0.4);
        spawnPopup(pillBug.x, pillBug.y - 6, "mushroom");
        break;
      }
    }

    if (state.waste > 0 && Math.random() < 0.01) {
      state.waste = Math.max(0, state.waste - 0.15);
    }

    if (pillBug.x < 34 || pillBug.x > WORLD_SIZE - 34) pillBug.vx *= -1;
    if (pillBug.y < 116 || pillBug.y > WORLD_SIZE - 30) pillBug.vy *= -1;
    pillBug.x = clamp(pillBug.x, 34, WORLD_SIZE - 34);
    pillBug.y = clamp(pillBug.y, 116, WORLD_SIZE - 30);
  }

  for (let e = state.pillBugEggs.length - 1; e >= 0; e -= 1) {
    const egg = state.pillBugEggs[e];
    egg.age += dt;
    egg.hatchTimer -= dt;
    if (egg.hatchTimer <= 0) {
      if (state.pillBugs.length < MAX_PILL_BUGS) {
        const juvenile = spawnPillBug("juvenile");
        juvenile.x = egg.x;
        juvenile.y = egg.y;
        state.pillBugs.push(juvenile);
      }
      state.pillBugEggs.splice(e, 1);
    }
  }

  for (let e = state.frogEggs.length - 1; e >= 0; e -= 1) {
    const egg = state.frogEggs[e];
    egg.age += dt;
    egg.hatchTimer -= dt;
    if (egg.hatchTimer <= 0) {
      state.tadpoles.push({ x: egg.x + rand(-2, 2), y: egg.y + rand(-2, 2), age: 0, wiggle: rand(0, Math.PI * 2) });
      state.frogEggs.splice(e, 1);
      spawnPopup(egg.x, egg.y - 8, "hatch");
    }
  }

  for (let t = state.tadpoles.length - 1; t >= 0; t -= 1) {
    const tadpole = state.tadpoles[t];
    tadpole.age += dt;
    tadpole.wiggle += dt * 6;
    tadpole.x = clamp(tadpole.x + Math.sin(tadpole.wiggle) * 0.34, 34, 84);
    tadpole.y = clamp(tadpole.y + Math.cos(tadpole.wiggle * 0.8) * 0.24, 138, 162);
    if (tadpole.age >= 45) {
      const froglet = spawnFrog("froglet");
      froglet.x = tadpole.x;
      froglet.y = tadpole.y;
      froglet.hunger = 12;
      state.frogs.push(froglet);
      state.tadpoles.splice(t, 1);
      spawnPopup(froglet.x, froglet.y - 8, "froglet");
    }
  }

  for (const box of state.cricketFarm.boxes) {
    box.breedingTimer += dt;
    if (box.breedingTimer >= 5 && box.crickets < 100) {
      const growth = box.type === "pillbug"
        ? (box.crickets <= 0 ? 1 : 1)
        : (box.crickets <= 0 ? 1 : 2);
      box.crickets = Math.min(100, box.crickets + growth);
      box.breedingTimer = 0;
      if (box.crickets >= 100) {
        box.minimized = true;
      }
    }
  }

  const mistLevelNow = getUpgrade("mist")?.level ?? 0;
  if (mistLevelNow >= 8 && state.mistPauseTimer > 0) {
    state.mistPauseTimer = Math.max(0, state.mistPauseTimer - dt);
  } else {
    state.mistBurstTimer -= dt;
    if (state.mistBurstTimer <= 0) {
      state.mistBurstTimer = 60;
      spawnPopup(192, 72, "mist");
      if (mistLevelNow >= 8) {
        state.mistPauseTimer = 130;
      }
    }
  }

  for (const popup of state.popups) {
    popup.age += dt;
  }
  state.popups = state.popups.filter((popup) => popup.age < 1.4);

  if (state.lampTimer > 0) {
    state.lampTimer = Math.max(0, state.lampTimer - dt);
  }

  state.humidity = clamp(state.humidity, 0, 100);
  state.cleanliness = clamp(state.cleanliness, 0, 100);
  state.groundCover = clamp(state.groundCover, 0, 100);
  state.waste = clamp(state.waste, 0, 100);
  state.coins = clamp(state.coins, 0, 9999);
  state.level = clamp(1 + Math.floor((state.coins + frogCount * 6 + pillBugCount * 3 + decor * 3 + plants * 2) / 18), 1, 99);
}

function drawPixelRect(x, y, w, h, fill, stroke = "#000") {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke !== "transparent") {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
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
  const glow = ctx.createRadialGradient(118, 112, 12, 120, 118, 120);
  glow.addColorStop(0, "rgba(255, 244, 194, 0.12)");
  glow.addColorStop(1, "rgba(255, 244, 194, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

  const wallGrad = ctx.createRadialGradient(120, 120, 36, 120, 120, 170);
  wallGrad.addColorStop(0, "#705333");
  wallGrad.addColorStop(1, "#241910");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

  const floorGrad = ctx.createRadialGradient(118, 122, 22, 118, 122, 92);
  floorGrad.addColorStop(0, "#8a6a42");
  floorGrad.addColorStop(1, "#4a3621");
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.ellipse(118, 120, 88, 72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(50, 34, 21, 0.34)";
  ctx.beginPath();
  ctx.ellipse(118, 120, 92, 76, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(130, 98, 60, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#476534";
  ctx.beginPath();
  ctx.ellipse(76, 74, 18, 10, -0.12, 0, Math.PI * 2);
  ctx.ellipse(166, 70, 16, 9, 0.12, 0, Math.PI * 2);
  ctx.ellipse(128, 56, 22, 11, 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4d3f2c";
  ctx.beginPath();
  ctx.ellipse(58, 150, 31, 19, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b4b34";
  ctx.beginPath();
  ctx.ellipse(58, 150, 27, 16, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6fb8b8";
  ctx.beginPath();
  ctx.ellipse(58, 150, 23, 12, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(60,120,130,0.28)";
  ctx.beginPath();
  ctx.ellipse(58, 150, 24, 13, -0.04, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(190,255,255,0.24)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(210,255,255,0.38)";
  ctx.beginPath();
  ctx.ellipse(50, 146, 12, 5, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7cc96c";
  ctx.beginPath();
  ctx.ellipse(44, 154, 2.5, 1.8, 0.2, 0, Math.PI * 2);
  ctx.ellipse(70, 145, 2.2, 1.6, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6f5437";
  ctx.beginPath();
  ctx.ellipse(110, 154, 52, 19, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(52, 34, 18, 0.16)";
  ctx.beginPath();
  ctx.ellipse(112, 156, 46, 15, -0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#916f47";
  ctx.save();
  ctx.translate(98, 98);
  ctx.rotate(-0.28);
  ctx.fillRect(-5, -24, 10, 50);
  ctx.restore();

  ctx.save();
  ctx.translate(108, 92);
  ctx.rotate(0.06);
  ctx.fillRect(-5, -4, 56, 9);
  ctx.restore();

  ctx.save();
  ctx.translate(116, 148);
  ctx.rotate(-0.08);
  ctx.fillStyle = "#7b5533";
  ctx.fillRect(-30, -11, 60, 22);
  ctx.fillStyle = "#966b41";
  ctx.fillRect(-26, -8, 52, 16);
  ctx.fillStyle = "rgba(26, 16, 10, 0.94)";
  ctx.beginPath();
  ctx.ellipse(-20, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a4828";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -7);
  ctx.lineTo(18, -7);
  ctx.moveTo(-14, 0);
  ctx.lineTo(22, 0);
  ctx.moveTo(-10, 7);
  ctx.lineTo(18, 7);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(68, 158);
  ctx.rotate(0.04);
  ctx.fillStyle = "#7b5533";
  ctx.fillRect(-18, -8, 36, 16);
  ctx.fillStyle = "#966b41";
  ctx.fillRect(-15, -6, 30, 12);
  ctx.fillStyle = "rgba(22, 14, 9, 0.90)";
  ctx.beginPath();
  ctx.ellipse(-11, 0, 6.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a4828";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(10, -5);
  ctx.moveTo(-8, 0);
  ctx.lineTo(12, 0);
  ctx.moveTo(-5, 5);
  ctx.lineTo(9, 5);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#65472d";
  ctx.beginPath();
  ctx.ellipse(64, 160, 10, 5, 0.1, 0, Math.PI * 2);
  ctx.ellipse(170, 154, 8, 4.5, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7c5a38";
  ctx.fillRect(58, 155, 12, 4);
  ctx.fillRect(164, 150, 10, 4);

  for (let i = 0; i < 18; i += 1) {
    const pebbleX = 42 + ((i * 17) % 146);
    const pebbleY = 86 + ((i * 13) % 86);
    ctx.fillStyle = i % 3 === 0 ? "rgba(86,72,56,0.40)" : "rgba(58,46,34,0.32)";
    ctx.beginPath();
    ctx.ellipse(pebbleX, pebbleY, 2.2, 1.5, (i % 4) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 10; i += 1) {
    const mossX = 48 + ((i * 19) % 124);
    const mossY = 92 + ((i * 23) % 70);
    ctx.fillStyle = i % 2 === 0 ? "rgba(72,132,64,0.22)" : "rgba(104,164,80,0.18)";
    ctx.beginPath();
    ctx.ellipse(mossX, mossY, 8, 5, (i % 3) * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  const coverPatches = 6 + Math.floor(state.groundCover / 7);
  for (let i = 0; i < coverPatches; i += 1) {
    const x = 52 + ((i * 23) % 128);
    const y = 58 + ((i * 21) % 98);
    ctx.fillStyle = "#4f8d46";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 6, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#78cf73";
    ctx.beginPath();
    ctx.ellipse(x + 6, y - 3, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#315f2f";
    ctx.beginPath();
    ctx.ellipse(x - 5, y + 4, 5, 3, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 12; i += 1) {
    const leafX = 50 + (i * 14) % 142;
    const leafY = 88 + ((i % 5) * 16);
    ctx.fillStyle = i % 2 === 0 ? "#9f7d4d" : "#765636";
    ctx.beginPath();
    ctx.ellipse(leafX, leafY, 5, 2.3, (i % 3) * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 8; i += 1) {
    const fernX = 46 + i * 20;
    const fernY = 86 + (i % 3) * 18;
    ctx.strokeStyle = "#4f9f56";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fernX, fernY + 14);
    ctx.lineTo(fernX, fernY);
    ctx.moveTo(fernX, fernY + 4);
    ctx.lineTo(fernX - 5, fernY + 7);
    ctx.moveTo(fernX, fernY + 8);
    ctx.lineTo(fernX + 5, fernY + 10);
    ctx.stroke();
  }

  const plantLevel = getUpgrade("plants")?.level ?? 0;
  if (plantLevel > 0) {
    const vineSegments = [
      [[166, 46], [154, 58], [146, 82], [140, 104]],
      [[140, 104], [134, 126], [124, 144], [114, 158]],
      [[114, 158], [100, 166], [84, 170], [66, 168]],
      [[140, 104], [154, 112], [166, 126], [178, 144]],
      [[126, 138], [138, 150], [156, 162], [174, 170]],
      [[104, 160], [102, 146], [96, 128], [82, 112]],
      [[92, 118], [108, 110], [122, 98], [132, 82]],
      [[72, 166], [92, 176], [122, 178], [154, 176]]
    ].slice(0, 2 + plantLevel + Math.floor(plantLevel / 2));

    const accentSegments = [
      [[148, 78], [138, 72], [124, 70], [110, 74]],
      [[118, 150], [126, 140], [134, 130], [144, 120]],
      [[86, 114], [76, 104], [68, 92], [64, 80]],
      [[150, 160], [160, 152], [168, 144], [172, 134]]
    ].slice(0, Math.max(0, plantLevel - 1));

    ctx.strokeStyle = "#2c6633";
    ctx.lineWidth = 2.4;
    for (const seg of vineSegments) {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      ctx.bezierCurveTo(seg[1][0], seg[1][1], seg[2][0], seg[2][1], seg[3][0], seg[3][1]);
      ctx.stroke();
    }

    ctx.strokeStyle = "#3c7a42";
    ctx.lineWidth = 1.6;
    for (const seg of accentSegments) {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      ctx.bezierCurveTo(seg[1][0], seg[1][1], seg[2][0], seg[2][1], seg[3][0], seg[3][1]);
      ctx.stroke();
    }

    const leafClusters = [
      [158, 58], [149, 78], [142, 98], [136, 118],
      [128, 136], [118, 150], [104, 162], [88, 168],
      [154, 120], [168, 136], [96, 174], [126, 176], [150, 177],
      [106, 112], [86, 114], [72, 96], [146, 156], [170, 167]
    ].slice(0, 6 + plantLevel * 3);

    for (const [lx, ly] of leafClusters) {
      ctx.fillStyle = "#4d8f4d";
      ctx.beginPath();
      ctx.moveTo(lx - 5, ly + 2);
      ctx.lineTo(lx, ly - 3);
      ctx.lineTo(lx + 6, ly + 2);
      ctx.lineTo(lx, ly + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6bad62";
      ctx.beginPath();
      ctx.moveTo(lx - 3, ly + 1);
      ctx.lineTo(lx, ly - 1);
      ctx.lineTo(lx + 3, ly + 1);
      ctx.lineTo(lx, ly + 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  const decorLevel = getUpgrade("decor")?.level ?? 0;
  for (let i = 0; i < decorLevel; i += 1) {
    const x = 136 + ((i * 16) % 34);
    const y = 138 + ((i * 11) % 26);
    const width = 18 + (i % 2) * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(i % 2 === 0 ? 0.08 : -0.06);
    ctx.fillStyle = "#77512f";
    ctx.fillRect(-width / 2, -6, width, 12);
    ctx.fillStyle = "#966b41";
    ctx.fillRect(-width / 2 + 3, -4, width - 6, 8);
    ctx.fillStyle = "rgba(24, 15, 9, 0.92)";
    ctx.beginPath();
    ctx.ellipse(-width / 2 + 4, 0, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#654425";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(width / 2 - 2, -4);
    ctx.moveTo(-5, 0);
    ctx.lineTo(width / 2, 0);
    ctx.moveTo(-2, 4);
    ctx.lineTo(width / 2 - 4, 4);
    ctx.stroke();
    ctx.restore();
  }

  const mistLevel = getUpgrade("mist")?.level ?? 0;
  const mistPaused = mistLevel >= 8 && state.mistPauseTimer > 0;
  ctx.fillStyle = "#4d5a48";
  ctx.fillRect(170, 24, 34, 10);
  ctx.fillRect(182, 30, 10, 12);
  ctx.strokeStyle = "rgba(242,248,255,0.92)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(187, 40);
  ctx.bezierCurveTo(184, 58, 182, 74, 180, 90);
  ctx.stroke();
  ctx.strokeStyle = "rgba(220,235,245,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(188, 40);
  ctx.bezierCurveTo(185, 58, 183, 74, 181, 90);
  ctx.stroke();
  ctx.fillStyle = "rgba(245,250,255,0.96)";
  ctx.beginPath();
  ctx.arc(180, 92, 3, 0, Math.PI * 2);
  ctx.fill();
  if (!mistPaused) {
    for (let i = 0; i < mistLevel * 2; i += 1) {
      ctx.fillStyle = "rgba(220,240,255,0.20)";
      ctx.fillRect(166 - i * 4, 24 + (i % 3) * 4, 4, 8);
    }
    for (let i = 0; i < 4 + mistLevel * 8; i += 1) {
      const drift = ((state.tick * 7) + i * 10) % (44 + mistLevel * 6);
      const spread = 10 + mistLevel * 4;
      const puffX = 180 - drift * 0.72;
      const puffY = 92 + Math.sin((state.tick * 0.8) + i) * 4 + (i % 3) * 5;
      const radius = 4 + mistLevel * 0.5;
      ctx.fillStyle = `rgba(235,245,238,${0.10 + mistLevel * 0.015})`;
      ctx.beginPath();
      ctx.arc(puffX, puffY, radius, 0, Math.PI * 2);
      ctx.arc(puffX - spread * 0.18, puffY + 2, radius - 1, 0, Math.PI * 2);
      ctx.arc(puffX - spread * 0.34, puffY - 2, Math.max(2, radius - 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (!mistPaused && mistLevel > 0 && state.mistBurstTimer > 52) {
    const mistProgress = Math.min(1, (60 - state.mistBurstTimer) / 8);
    const nozzleX = 180;
    const nozzleY = 92;
    const plumeSize = 42 + mistLevel * 10;
    const plume = ctx.createRadialGradient(nozzleX, nozzleY + 2, 2, nozzleX - 34, nozzleY + 8, plumeSize);
    plume.addColorStop(0, `rgba(235,245,238,${(0.16 + mistLevel * 0.03) * mistProgress})`);
    plume.addColorStop(1, "rgba(235,245,238,0)");
    ctx.fillStyle = plume;
    ctx.fillRect(106, 70, 110, 72);
    ctx.fillStyle = `rgba(235,245,238,${(0.08 + mistLevel * 0.015) * mistProgress})`;
    ctx.fillRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48);
  }

  const glassSheen = ctx.createLinearGradient(28, 28, 110, 120);
  glassSheen.addColorStop(0, "rgba(255,255,255,0.16)");
  glassSheen.addColorStop(0.35, "rgba(255,255,255,0.04)");
  glassSheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glassSheen;
  ctx.fillRect(30, 30, 52, 132);

  ctx.fillStyle = "rgba(190,230,255,0.08)";
  ctx.fillRect(26, 26, WORLD_SIZE - 52, 6);
  ctx.fillRect(26, 26, 6, WORLD_SIZE - 52);
  ctx.fillStyle = "rgba(10,16,22,0.18)";
  ctx.fillRect(24, 24, WORLD_SIZE - 48, 4);

  for (let i = 0; i < 8; i += 1) {
    drawPixelCircle(40 + i * 20, 34 + (i % 2) * 4, 1.6, "rgba(255,255,255,0.18)");
  }
}

function drawFrog(frog) {
  const x = Math.round(frog.x);
  const paletteShift = Math.abs(Math.floor((frog.x + frog.y) % 5));
  const palettes = [
    { dark: "#1d6a39", mid: "#3ecf67", light: "#8af29e", belly: "#dff6c8", stripe: "#0f2d18" },
    { dark: "#0e4f7a", mid: "#23a4e0", light: "#7edfff", belly: "#d7f3ff", stripe: "#06263d" },
    { dark: "#8c3a14", mid: "#ff7a2f", light: "#ffb066", belly: "#fff0d6", stripe: "#4a1f0a" },
    { dark: "#6f1d1d", mid: "#e63f3f", light: "#ff8c8c", belly: "#ffe0d1", stripe: "#351010" },
    { dark: "#6b5a10", mid: "#d6bf2f", light: "#f3e37a", belly: "#f8f2c8", stripe: "#342c08" }
  ];
  const palette = palettes[paletteShift];
  const bodyDark = palette.dark;
  const bodyMid = palette.mid;
  const bodyLight = palette.light;
  const belly = palette.belly;
  const stripe = palette.stripe;
  const crouchWave = frog.jumpPhase === "crouch" ? Math.sin((1 - frog.crouchTimer) * Math.PI * 0.5) : 0;
  const jumpWave = Math.sin(frog.jumpArc * Math.PI);
  const lift = jumpWave * 18;
  const squash = frog.jumpPhase === "crouch"
    ? 1 - crouchWave * 0.24
    : frog.jumping
      ? 1 - jumpWave * 0.18
      : 1;
  const stretch = frog.jumpPhase === "crouch"
    ? 1 + crouchWave * 0.08
    : frog.jumping
      ? 1 + jumpWave * 0.24
      : 1;
  const y = Math.round(frog.y - lift + crouchWave * 3);
  const spread = Math.round(frog.jumpPhase === "crouch"
    ? 5 + crouchWave * 3
    : frog.jumping
      ? 3 + jumpWave * 4
      : 1);
  const faceDir = frog.facing >= 0 ? 1 : -1;
  const tongueBaseX = x + (faceDir > 0 ? 11 : 1);
  const tongueBaseY = y + 6;
  const bodyW = Math.max(12, Math.round(14 * stretch));
  const bodyH = Math.max(9, Math.round(10 * squash));

  if (frog.jumpArc > 0.05) {
    drawPixelRect(x + 2, Math.round(frog.y + 11), 10, 2, "rgba(30,20,10,0.16)", "transparent");
  }

  if (frog.tongueTimer > 0.01) {
    const targetX = Math.round(frog.tongueTargetX);
    const targetY = Math.round(frog.tongueTargetY);
    const phase = frog.tongueTimer > 0.5 ? (1 - frog.tongueTimer) / 0.5 : frog.tongueTimer / 0.5;
    const eased = Math.max(0, Math.min(1, phase));
    const tipX = Math.round(tongueBaseX + (targetX - tongueBaseX) * eased);
    const tipY = Math.round(tongueBaseY + (targetY - tongueBaseY) * eased);
    drawPixelRect(Math.min(tongueBaseX, tipX), Math.min(tongueBaseY, tipY), Math.max(2, Math.abs(tipX - tongueBaseX) + 2), 2, "#f58aa0", "transparent");
    drawPixelRect(tipX, tipY, 2, 2, "#ffd1da", "transparent");
  }

  drawPixelRect(x, y + 1, bodyW, Math.max(7, bodyH - 1), bodyDark, "transparent");
  drawPixelRect(x + 1, y, Math.max(10, bodyW - 2), bodyH, bodyMid, "#2f6f2a");
  drawPixelRect(x + 2, y + 1, Math.max(8, bodyW - 4), Math.max(4, bodyH - 4), bodyLight, "transparent");
  drawPixelRect(x + 3, y + 3, Math.max(6, bodyW - 8), 2, bodyLight, "transparent");
  if (paletteShift >= 1) {
    drawPixelRect(x + 4, y + 2, Math.max(4, bodyW - 10), 1, stripe, "transparent");
  }
  if (paletteShift === 2 || paletteShift === 4) {
    drawPixelRect(x + 2, y + 5, 2, 2, stripe, "transparent");
    drawPixelRect(x + Math.max(8, bodyW - 4), y + 5, 2, 2, stripe, "transparent");
  }

  drawPixelRect(x + 2, y - 2, 3, 3, "#d6ffbf", "transparent");
  drawPixelRect(x + Math.max(7, bodyW - 6), y - 2, 3, 3, "#d6ffbf", "transparent");
  drawPixelRect(x + 2, y - 1, 2, 2, "#8fef74", "transparent");
  drawPixelRect(x + Math.max(8, bodyW - 5), y - 1, 2, 2, "#8fef74", "transparent");

  drawPixelRect(faceDir > 0 ? x + Math.max(9, bodyW - 3) : x + 1, y + 4, 2, 2, "#102313", "transparent");
  drawPixelRect(x + Math.max(4, Math.floor(bodyW / 2) - 1), y + Math.max(5, bodyH - 3), 3, 2, belly, "transparent");
  drawPixelRect(faceDir > 0 ? x + Math.max(9, bodyW - 3) : x + 1, y + 4, 1, 1, "#f8fbff", "transparent");

  drawPixelRect(x - spread, y + Math.max(7, bodyH - 1), 3 + spread, 2, "#5bb04a", "transparent");
  drawPixelRect(x + Math.max(9, bodyW - 2), y + Math.max(7, bodyH - 1), 3 + spread, 2, "#5bb04a", "transparent");
  drawPixelRect(x + 1, y + Math.max(6, bodyH - 2), 2, 3, "#4ea049", "transparent");
  drawPixelRect(x + Math.max(10, bodyW - 1), y + Math.max(6, bodyH - 2), 2, 3, "#4ea049", "transparent");
}

function drawCricket(cricket) {
  const x = cricket.x;
  const y = cricket.y;
  ctx.fillStyle = "#392d25";
  ctx.beginPath();
  ctx.ellipse(x + 2.2, y + 2.1, 2.4, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6c5641";
  ctx.beginPath();
  ctx.arc(x + 4.5, y + 2.1, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8d7760";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 1);
  ctx.lineTo(x, y - 1);
  ctx.moveTo(x + 3, y + 1);
  ctx.lineTo(x + 2, y - 1);
  ctx.stroke();
}

function drawPillBug(pillBug) {
  const x = pillBug.x;
  const y = pillBug.y;
  const scale = pillBug.stage === "juvenile" ? 0.62 : 1;
  ctx.fillStyle = "#55504a";
  ctx.beginPath();
  ctx.ellipse(x + 4 * scale, y + 4.2 * scale, 4.2 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a645d";
  ctx.beginPath();
  ctx.ellipse(x + 4 * scale, y + 3.4 * scale, 4.1 * scale, 2.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8e867c";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + (4 + i) * scale, y + 1.5 * scale);
    ctx.lineTo(x + (4 + i) * scale, y + 5.3 * scale);
    ctx.stroke();
  }
  ctx.fillStyle = "#d8d0c4";
  ctx.beginPath();
  ctx.arc(x + 4 * scale, y + 2.8 * scale, 0.9 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawDroppingsAndFungus() {
  for (const egg of state.frogEggs) {
    ctx.fillStyle = "rgba(220,255,240,0.88)";
    ctx.beginPath();
    ctx.arc(egg.x, egg.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(150,205,180,0.55)";
    ctx.beginPath();
    ctx.arc(egg.x, egg.y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const tadpole of state.tadpoles) {
    ctx.fillStyle = "#34322c";
    ctx.beginPath();
    ctx.ellipse(tadpole.x, tadpole.y, 2.2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4d493f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tadpole.x + 2, tadpole.y);
    ctx.lineTo(tadpole.x + 5, tadpole.y + Math.sin(tadpole.wiggle) * 1.5);
    ctx.stroke();
  }

  for (const egg of state.pillBugEggs) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(egg.x, egg.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const dropping of state.droppings) {
    ctx.fillStyle = "#4b321d";
    ctx.beginPath();
    ctx.ellipse(dropping.x, dropping.y, 2.8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a4728";
    ctx.beginPath();
    ctx.arc(dropping.x + 0.6, dropping.y - 0.5, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const fungus of state.fungusPatches) {
    ctx.strokeStyle = "#f7f0dc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fungus.x, fungus.y + fungus.size * 0.1);
    ctx.lineTo(fungus.x, fungus.y + fungus.size * 0.75);
    ctx.stroke();

    ctx.fillStyle = "#cf2e2e";
    ctx.beginPath();
    ctx.arc(fungus.x, fungus.y, fungus.size * 0.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff7ea";
    ctx.beginPath();
    ctx.arc(fungus.x - fungus.size * 0.16, fungus.y - 1, 0.9, 0, Math.PI * 2);
    ctx.arc(fungus.x + fungus.size * 0.1, fungus.y - 2, 0.8, 0, Math.PI * 2);
    ctx.arc(fungus.x + fungus.size * 0.26, fungus.y - 0.2, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCreatures() {
  const frogUpgradeLevel = getUpgrade("frog")?.level ?? state.frogs.length;
  const pillBugUpgradeLevel = getUpgrade("pillbug")?.level ?? state.pillBugs.length;

  for (const cricket of state.crickets) {
    drawCricket(cricket);
  }
  for (const pillBug of state.pillBugs) {
    drawPillBug(pillBug);
    if (pillBugUpgradeLevel >= 5) {
      ctx.fillStyle = "rgba(220,220,220,0.25)";
      ctx.beginPath();
      ctx.arc(pillBug.x + 4, pillBug.y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const frog of state.frogs) {
    if (frog.inHide) continue;
    if (frog.stage === "froglet") {
      ctx.fillStyle = "#8fe77c";
      ctx.beginPath();
      ctx.ellipse(frog.x + 4, frog.y + 4, 4.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d9ffc8";
      ctx.beginPath();
      ctx.arc(frog.x + 3, frog.y + 2.8, 1.2, 0, Math.PI * 2);
      ctx.arc(frog.x + 5.4, frog.y + 2.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    drawFrog(frog);
    if (frogUpgradeLevel >= 8) {
      ctx.fillStyle = "rgba(255,245,180,0.16)";
      ctx.beginPath();
      ctx.ellipse(frog.x + 7, frog.y + 10, 6, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWaste() {
  const wastePatches = Math.floor(state.waste / 8);
  for (let i = 0; i < wastePatches; i += 1) {
    const x = 46 + ((i * 29) % 132);
    const y = 118 + ((i * 19) % 58);
    drawPixelRect(x, y, 6, 6, "rgba(92, 62, 29, 0.58)", "transparent");
    drawPixelRect(x + 2, y + 1, 2, 2, "rgba(130, 94, 55, 0.45)", "transparent");
    drawPixelRect(x + 1, y + 4, 3, 1, "rgba(70, 44, 20, 0.35)", "transparent");
  }
}

function renderHabitat() {
  const width = elements.canvas.width;
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, width, width);

  const scale = width / WORLD_SIZE;
  ctx.save();
  ctx.scale(scale, scale);

  drawHabitatBase();
  drawWaste();
  drawDroppingsAndFungus();
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

function renderPopups() {
  if (!elements.tankFx) return;
  const rect = elements.canvas.getBoundingClientRect();
  const scale = rect.width / WORLD_SIZE;
  elements.tankFx.innerHTML = state.popups.map((popup) => {
    const x = popup.x * scale;
    const y = (popup.y - popup.age * 18) * scale;
    const opacity = Math.max(0, 1 - popup.age / 1.4);
    return `<div class="float-popup" style="left:${x}px; top:${y}px; opacity:${opacity};">${popup.text}</div>`;
  }).join("");
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

  const mainStatItems = [
    { label: "COIN", value: `${Math.floor(state.coins)}` },
    { label: "HUM", value: `${Math.floor(state.humidity)}%` },
    { label: "CLEAN", value: `${Math.floor(state.cleanliness)}%` },
    { label: "FROGS", value: `${state.frogs.length}` },
    { label: "BUGS", value: `${state.pillBugs.length}` },
    { label: "CRICK", value: `${state.crickets.length}` }
  ];

  if (elements.tankLiveReadout) {
    elements.tankLiveReadout.innerHTML = mainStatItems.map((item) => `
      <article class="tank-live-card">
        <div class="tank-live-label">${item.label}</div>
        <div class="tank-live-value">${item.value}</div>
      </article>
    `).join("");
  }

  if (elements.statusGrid) {
    elements.statusGrid.innerHTML = "";
  }

  const milestoneData = [
    { title: "First Frog", done: state.frogs.length >= 1, text: "Buy your first frog for 5 coins." },
    { title: "Cleanup Crew", done: state.pillBugs.length >= 2, text: "Add 2 pill bugs to eat waste." },
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
    const buyLabel = upgrade.id === "frog" ? "ADOPT" : upgrade.id === "crickets" ? "DROP" : upgrade.id === "pillbug" ? "ADD" : upgrade.level >= upgrade.maxLevel ? "MAX" : "BUY";
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

  renderCricketFarm();

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
      } else if (upgrade.id === "pillbug") {
        if (state.pillBugs.length >= MAX_PILL_BUGS) return;
        state.pillBugs.push(spawnPillBug());
        pushEvent("Cleanup crew", "A pill bug joined the habitat floor.");
      } else if (upgrade.id === "decor") {
        state.decorationsPlaced += 1;
        upgrade.level += 1;
        pushEvent("Pretty hide added", "The habitat looks nicer and safer.");
      } else {
        upgrade.level += 1;
        pushEvent("Upgrade bought", `${upgrade.name} upgraded to level ${upgrade.level}.`);
      }

      if (upgrade.id === "frog" || upgrade.id === "crickets" || upgrade.id === "pillbug") {
        upgrade.level += 1;
      }

      renderHud();
    });
  });
}

function renderCricketFarm() {
  if (!elements.cricketFarmPanel || !elements.cricketFarmBoxes || !elements.toggleFarmButton) return;
  elements.cricketFarmPanel.hidden = !state.cricketFarmOpen;
  elements.toggleFarmButton.textContent = state.cricketFarmOpen ? "Hide Breeder Boxes" : "Open Breeder Boxes";

  elements.cricketFarmBoxes.innerHTML = state.cricketFarm.boxes.map((box) => {
    const isFull = box.crickets >= 100;
    const minimized = box.minimized || isFull;
    const previewDots = Array.from({ length: Math.min(24, Math.max(2, Math.ceil(box.crickets / 5))) }, (_, index) => {
      const left = 6 + ((index * 17) % 88);
      const floor = box.type === "pillbug" ? 58 : 48;
      const hop = box.type === "pillbug" ? Math.sin(state.tick * 1.4 + index) * 1.5 : Math.abs(Math.sin(state.tick * 4 + index * 1.2)) * 10;
      const top = box.type === "pillbug"
        ? Math.max(56, Math.min(66, floor + hop))
        : Math.max(8, Math.min(58, floor - hop));
      const klass = box.type === "pillbug" ? "pillbug-dot" : "cricket-dot";
      return `<span class="${klass}" style="left:${left}%; top:${top}%"></span>`;
    }).join("");
    const carrotVisual = box.type === "cricket" && state.cricketFarm.carrots > 0 ? `<span class="farm-food farm-food-carrot"></span>` : "";
    const potatoVisual = state.cricketFarm.potatoes > 0 ? `<span class="farm-food farm-food-potato"></span>` : "";
    const label = box.type === "pillbug" ? "Pill Bug Box" : "Cricket Box";
    const countLabel = box.type === "pillbug" ? "Pill Bugs" : "Crickets";
    return `
      <article class="farm-box ${minimized ? "minimized" : ""}" data-box-id="${box.id}">
        <div class="farm-box-header">
          <strong>${label} ${box.id}</strong>
          <button class="multi-buy-tab" data-farm-toggle="${box.id}" type="button">${minimized ? "Open" : "Minimize"}</button>
        </div>
        <div class="farm-box-stats">
          <div>${countLabel}: ${box.crickets} / 100</div>
          <div>Feed: ${state.cricketFarm.carrots} carrots · ${state.cricketFarm.potatoes} potatoes</div>
        </div>
        <div class="cricket-box-preview ${box.type === "pillbug" ? "pillbug-box-preview" : ""}">${previewDots}${carrotVisual}${potatoVisual}</div>
        ${minimized ? `<div class="farm-box-actions"><button class="pixel-button action-feed" data-release-box="${box.id}" type="button">Release 100</button></div>` : `
          <div class="farm-box-actions">
            <button class="pixel-button action-feed" data-feed-box="${box.id}" data-feed-type="carrot" type="button">Use Carrot</button>
            <button class="pixel-button action-pillbug" data-feed-box="${box.id}" data-feed-type="potato" type="button">Use Potato</button>
            <button class="pixel-button action-collect" data-release-box="${box.id}" type="button">Release Box</button>
          </div>
        `}
      </article>
    `;
  }).join("");

  elements.cricketFarmBoxes.querySelectorAll("[data-farm-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const box = state.cricketFarm.boxes.find((entry) => entry.id === Number(button.dataset.farmToggle));
      if (!box) return;
      box.minimized = !box.minimized;
      renderCricketFarm();
    });
  });

  elements.cricketFarmBoxes.querySelectorAll("[data-feed-box]").forEach((button) => {
    button.addEventListener("click", () => {
      const box = state.cricketFarm.boxes.find((entry) => entry.id === Number(button.dataset.feedBox));
      if (!box || box.crickets >= 100) return;
      if (button.dataset.feedType === "carrot") {
        if (state.cricketFarm.carrots <= 0) return;
        state.cricketFarm.carrots -= 1;
        box.crickets = Math.min(100, box.crickets + (box.type === "pillbug" ? 5 : 8));
      } else {
        if (state.cricketFarm.potatoes <= 0) return;
        state.cricketFarm.potatoes -= 1;
        box.crickets = Math.min(100, box.crickets + (box.type === "pillbug" ? 8 : 12));
      }
      renderCricketFarm();
    });
  });

  elements.cricketFarmBoxes.querySelectorAll("[data-release-box]").forEach((button) => {
    button.addEventListener("click", () => {
      const box = state.cricketFarm.boxes.find((entry) => entry.id === Number(button.dataset.releaseBox));
      if (!box || box.crickets <= 0) return;
      const releaseCount = Math.min(100, box.crickets);
      for (let i = 0; i < releaseCount; i += 1) {
        if (box.type === "pillbug") {
          if (state.pillBugs.length >= MAX_PILL_BUGS) break;
          state.pillBugs.push(spawnPillBug());
        } else {
          state.crickets.push(spawnCricket());
        }
      }
      box.crickets = Math.max(0, box.crickets - releaseCount);
      box.minimized = false;
      pushEvent("Farm release", `Released ${releaseCount} ${box.type === "pillbug" ? "pill bugs" : "crickets"} from box ${box.id}.`);
      renderCricketFarm();
      renderHud();
    });
  });
}

function renderQuickActionPrices() {
  if (elements.buyFrogPrice) elements.buyFrogPrice.textContent = `${FROG_COST * state.multiBuyAmount} coins`;
  if (elements.feedPrice) elements.feedPrice.textContent = `${CRICKET_COST * state.multiBuyAmount} coins`;
  if (elements.buyPillBugPrice) elements.buyPillBugPrice.textContent = `${PILL_BUG_COST * state.multiBuyAmount} coins`;
  if (elements.sellFrogPrice) elements.sellFrogPrice.textContent = `5 frogs → 100 coins`;
  if (elements.cleanPrice) elements.cleanPrice.textContent = `free`;
  if (elements.boostPrice) elements.boostPrice.textContent = `3 coins`;
  if (elements.buyCarrotPrice) elements.buyCarrotPrice.textContent = `${1 * state.multiBuyAmount} coin${state.multiBuyAmount === 1 ? "" : "s"}`;
  if (elements.buyPotatoPrice) elements.buyPotatoPrice.textContent = `${1 * state.multiBuyAmount} coin${state.multiBuyAmount === 1 ? "" : "s"}`;
  if (elements.addCricketBoxPrice) {
    const cricketBoxes = state.cricketFarm.boxes.filter((box) => box.type !== "pillbug").length;
    const singleCost = 10 + cricketBoxes * 5;
    elements.addCricketBoxPrice.textContent = `${singleCost * state.multiBuyAmount} coins`;
  }
  if (elements.addPillbugBoxPrice) {
    const pillbugBoxes = state.cricketFarm.boxes.filter((box) => box.type === "pillbug").length;
    const singleCost = 10 + pillbugBoxes * 5;
    elements.addPillbugBoxPrice.textContent = `${singleCost * state.multiBuyAmount} coins`;
  }
}

function bindUi() {
  elements.toggleFarmButton?.addEventListener("click", () => {
    state.cricketFarmOpen = !state.cricketFarmOpen;
    renderCricketFarm();
  });

  elements.buyCarrotButton?.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
      if (!spendCoins(1)) break;
      state.cricketFarm.carrots += 1;
      bought += 1;
    }
    if (!bought) {
      pushEvent("Need coins", "You need 1 coin per carrot.");
      renderHud();
      return;
    }
    spawnPopup(182, 48, `+${bought} carrot${bought === 1 ? "" : "s"}`);
    renderCricketFarm();
    renderQuickActionPrices();
  });

  elements.buyPotatoButton?.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
      if (!spendCoins(1)) break;
      state.cricketFarm.potatoes += 1;
      bought += 1;
    }
    if (!bought) {
      pushEvent("Need coins", "You need 1 coin per potato slice.");
      renderHud();
      return;
    }
    spawnPopup(190, 56, `+${bought} potato${bought === 1 ? "" : "es"}`);
    renderCricketFarm();
    renderQuickActionPrices();
  });

  elements.addCricketBoxButton?.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
      const cricketBoxes = state.cricketFarm.boxes.filter((box) => box.type !== "pillbug").length;
      const cost = 10 + cricketBoxes * 5;
      if (!spendCoins(cost)) break;
      state.cricketFarm.boxes.push({ id: state.cricketFarm.boxes.length + 1, type: "cricket", crickets: 0, minimized: false, breedingTimer: 0 });
      bought += 1;
    }
    if (!bought) {
      const cricketBoxes = state.cricketFarm.boxes.filter((box) => box.type !== "pillbug").length;
      const cost = 10 + cricketBoxes * 5;
      pushEvent("Need coins", `You need ${cost} coins to add another cricket box.`);
      renderHud();
      return;
    }
    spawnPopup(198, 64, `+${bought} cricket box${bought === 1 ? "" : "es"}`);
    pushEvent("New box", `${bought} new cricket breeder box${bought === 1 ? "" : "es"} added.`);
    renderCricketFarm();
    renderQuickActionPrices();
    renderHud();
  });

  elements.addPillbugBoxButton?.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
      const pillbugBoxes = state.cricketFarm.boxes.filter((box) => box.type === "pillbug").length;
      const cost = 10 + pillbugBoxes * 5;
      if (!spendCoins(cost)) break;
      state.cricketFarm.boxes.push({ id: state.cricketFarm.boxes.length + 1, type: "pillbug", crickets: 0, minimized: false, breedingTimer: 0 });
      bought += 1;
    }
    if (!bought) {
      const pillbugBoxes = state.cricketFarm.boxes.filter((box) => box.type === "pillbug").length;
      const cost = 10 + pillbugBoxes * 5;
      pushEvent("Need coins", `You need ${cost} coins to add another pill bug box.`);
      renderHud();
      return;
    }
    spawnPopup(198, 72, `+${bought} pill bug box${bought === 1 ? "" : "es"}`);
    pushEvent("New box", `${bought} new pill bug breeder box${bought === 1 ? "" : "es"} added.`);
    renderCricketFarm();
    renderQuickActionPrices();
    renderHud();
  });

  elements.multiBuyTabs?.querySelectorAll("[data-multibuy]").forEach((button) => {
    button.addEventListener("click", () => {
      state.multiBuyAmount = Number(button.dataset.multibuy) || 5;
      elements.multiBuyTabs.querySelectorAll("[data-multibuy]").forEach((tab) => tab.classList.toggle("active", tab === button));
      renderQuickActionPrices();
    });
  });

  elements.buyFrogButton.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
      if (!spendCoins(FROG_COST)) break;
      state.frogs.push(spawnFrog());
      const frogUpgrade = getUpgrade("frog");
      if (frogUpgrade) frogUpgrade.level += 1;
      bought += 1;
    }
    if (!bought) {
      pushEvent("Need coins", `You need ${FROG_COST} coins per frog.`);
      renderHud();
      return;
    }
    spawnPopup(120, 120, `+${bought} frog${bought === 1 ? "" : "s"}`);
    pushEvent("New frogs", `${bought} tree frog${bought === 1 ? "" : "s"} joined the habitat.`);
    renderHud();
  });

  elements.sellFrogButton.addEventListener("click", () => {
    const sellable = state.frogs.filter((frog) => frog.stage !== "froglet");
    if (sellable.length < 5) {
      pushEvent("Need frogs", "You need 5 grown frogs to sell.");
      renderHud();
      return;
    }
    let removed = 0;
    state.frogs = state.frogs.filter((frog) => {
      if (frog.stage === "froglet") return true;
      if (removed < 5) {
        removed += 1;
        return false;
      }
      return true;
    });
    state.coins += 100;
    spawnPopup(120, 120, "+100 coins");
    pushEvent("Frogs sold", "Sold 5 frogs for 100 coins.");
    renderHud();
  });

  elements.buyPillBugButton.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
      if (state.pillBugs.length >= MAX_PILL_BUGS) break;
      if (!spendCoins(PILL_BUG_COST)) break;
      state.pillBugs.push(spawnPillBug());
      const pillBugUpgrade = getUpgrade("pillbug");
      if (pillBugUpgrade) pillBugUpgrade.level += 1;
      bought += 1;
    }
    if (!bought) {
      pushEvent("Need coins", `You need ${PILL_BUG_COST} coin per pill bug.`);
      renderHud();
      return;
    }
    spawnPopup(132, 144, `+${bought} pill bug${bought === 1 ? "" : "s"}`);
    pushEvent("Cleanup crew", `${bought} pill bug${bought === 1 ? "" : "s"} joined the habitat floor.`);
    renderHud();
  });

  elements.feedButton.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
      if (!spendCoins(CRICKET_COST)) break;
      state.crickets.push(spawnCricket());
      bought += 1;
    }
    if (!bought) {
      pushEvent("Need coins", `You need ${CRICKET_COST} coin per cricket.`);
      renderHud();
      return;
    }
    spawnPopup(182, 82, `+${bought} crickets`);
    pushEvent("Crickets released", `${bought} feeder cricket${bought === 1 ? "" : "s"} were added.`);
    renderHud();
  });

  elements.cleanButton.addEventListener("click", () => {
    state.cleanliness = clamp(state.cleanliness + 18, 0, 100);
    state.waste = clamp(state.waste - 16, 0, 100);
    spawnPopup(118, 164, "cleaned");
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
    spawnPopup(150, 38, "sun lamp");
    pushEvent("Sun lamp", "Warm light brightens the terrarium for 20 seconds.");
    renderHud();
  });

  elements.albumButton.addEventListener("click", openAlbum);
  elements.closeAlbumButton.addEventListener("click", closeAlbum);
  elements.saveButton.addEventListener("click", saveGame);
  elements.resetButton.addEventListener("click", openResetConfirm);
  elements.confirmResetButton.addEventListener("click", resetGame);
  elements.cancelResetButton.addEventListener("click", closeResetConfirm);
}

function tick() {
  simulate(1 / 20);
  renderHabitat();
  renderHud();
  renderPopups();
  if (state.cricketFarmOpen) {
    renderCricketFarm();
  }
  if (Math.floor(state.tick) % 15 === 0 && Math.abs(state.tick % 15) < 0.051) {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      tick: state.tick,
      coins: state.coins,
      humidity: state.humidity,
      cleanliness: state.cleanliness,
      groundCover: state.groundCover,
      waste: state.waste,
      level: state.level,
      lampTimer: state.lampTimer,
      mistPauseTimer: state.mistPauseTimer,
      decorationsPlaced: state.decorationsPlaced,
      events: state.events,
      upgrades: state.upgrades,
      frogs: state.frogs,
      frogEggs: state.frogEggs,
      tadpoles: state.tadpoles,
      crickets: state.crickets,
      pillBugs: state.pillBugs,
      pillBugEggs: state.pillBugEggs,
      droppings: state.droppings,
      fungusPatches: state.fungusPatches
    }));
  }
  requestAnimationFrame(tick);
}

loadGame();
state.frogs = Array.isArray(state.frogs) ? state.frogs : [];
state.frogEggs = Array.isArray(state.frogEggs) ? state.frogEggs : [];
state.tadpoles = Array.isArray(state.tadpoles) ? state.tadpoles : [];
state.crickets = Array.isArray(state.crickets) ? state.crickets : [];
state.pillBugs = Array.isArray(state.pillBugs) ? state.pillBugs : [];
state.pillBugEggs = Array.isArray(state.pillBugEggs) ? state.pillBugEggs : [];
state.droppings = Array.isArray(state.droppings) ? state.droppings : [];
state.fungusPatches = Array.isArray(state.fungusPatches) ? state.fungusPatches : [];
bindUi();
closeAlbum();
closeResetConfirm();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
renderHud();
renderQuickActionPrices();
renderCricketFarm();
renderHabitat();
requestAnimationFrame(tick);
