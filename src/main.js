const WORLD_SIZE = 240;
const SAVE_KEY = "ecobox-save-v7";
const FROG_COST = 5;
const CRICKET_COST = 1;
const PILL_BUG_COST = 1;
const PILL_BUG_BITE_RANGE = 12;
const LOG_OBSTACLES = [
  { x: 86, y: 134, w: 50, h: 18 },
  { x: 118, y: 146, w: 24, h: 12 },
  { x: 70, y: 88, w: 44, h: 10 },
  { x: 150, y: 72, w: 28, h: 8 },
  { x: 56, y: 156, w: 16, h: 10 },
  { x: 164, y: 150, w: 14, h: 9 }
];
const FROG_HIDE_CAVES = [
  { x: 118, y: 148, w: 18, h: 10, exitX: 110, exitY: 144 },
  { x: 60, y: 154, w: 12, h: 8, exitX: 76, exitY: 150 }
];

const state = {
  tick: 0,
  coins: 10,
  humidity: 78,
  cleanliness: 86,
  groundCover: 18,
  waste: 4,
  level: 1,
  lampTimer: 0,
  mistBurstTimer: 60,
  decorationsPlaced: 0,
  frogs: [],
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
      { id: 1, crickets: 0, minimized: false, breedingTimer: 0 }
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

const elements = {
  canvas: document.getElementById("tank-canvas"),
  overlay: document.getElementById("tank-overlay"),
  tankFx: document.getElementById("tank-fx"),
  saveButton: document.getElementById("save-button"),
  toggleFarmButton: document.getElementById("toggle-farm-button"),
  cricketFarmPanel: document.getElementById("cricket-farm-panel"),
  cricketFarmBoxes: document.getElementById("cricket-farm-boxes"),
  buyCarrotButton: document.getElementById("buy-carrot-button"),
  buyCarrotPrice: document.getElementById("buy-carrot-price"),
  buyPotatoButton: document.getElementById("buy-potato-button"),
  buyPotatoPrice: document.getElementById("buy-potato-price"),
  addCricketBoxButton: document.getElementById("add-cricket-box-button"),
  addCricketBoxPrice: document.getElementById("add-cricket-box-price"),
  multiBuyTabs: document.getElementById("multi-buy-tabs"),
  buyFrogButton: document.getElementById("buy-frog-button"),
  buyFrogPrice: document.getElementById("buy-frog-price"),
  buyPillBugButton: document.getElementById("buy-pillbug-button"),
  buyPillBugPrice: document.getElementById("buy-pillbug-price"),
  collectButton: document.getElementById("collect-button"),
  collectPrice: document.getElementById("collect-price"),
  feedButton: document.getElementById("feed-button"),
  feedPrice: document.getElementById("feed-price"),
  cleanButton: document.getElementById("clean-button"),
  cleanPrice: document.getElementById("clean-price"),
  boostButton: document.getElementById("boost-button"),
  boostPrice: document.getElementById("boost-price"),
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
  state.events = state.events.slice(0, 18);
}

function spawnPopup(x, y, text) {
  state.popups.push({ x, y, text, age: 0 });
  state.popups = state.popups.slice(-10);
}

function spawnFrog() {
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
    inHide: false
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
    decorationsPlaced: state.decorationsPlaced,
    events: state.events,
    upgrades: state.upgrades,
    frogs: state.frogs,
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

  if (state.waste > 40) {
    state.cleanliness -= 0.2 * dt;
    state.humidity -= 0.08 * dt;
  }

  if (frogCount > 0 && Math.random() < 0.006 * frogCount * lampMultiplier) {
    state.coins += 1;
    pushEvent("Coins earned", "Visitors tipped you for the cute frog habitat.");
  }

  for (const frog of state.frogs) {
    if (frog.inHide) {
      frog.sleepTimer = Math.max(0, frog.sleepTimer - dt);
      if (frog.sleepTimer === 0) {
        const cave = FROG_HIDE_CAVES[Math.floor(Math.random() * FROG_HIDE_CAVES.length)];
        frog.inHide = false;
        frog.x = cave.exitX;
        frog.y = cave.exitY;
        frog.hunger = 8;
        frog.totalCricketsEaten = 0;
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
      state.droppings.push({ x: frog.x + rand(-4, 4), y: frog.y + rand(4, 8), age: 0 });
      frog.poopTimer = rand(18, 34);
      frog.digestedCrickets = 0;
      frog.digestedPillBugs = 0;
    }

    if (frog.totalCricketsEaten >= 10) {
      const cave = FROG_HIDE_CAVES[Math.floor(Math.random() * FROG_HIDE_CAVES.length)];
      frog.inHide = true;
      frog.sleepTimer = 30;
      frog.x = cave.x + cave.w / 2;
      frog.y = cave.y + cave.h / 2;
      spawnPopup(frog.x, frog.y - 8, "sleep");
      continue;
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

  for (const dropping of state.droppings) {
    dropping.age += dt;
  }

  for (let i = state.droppings.length - 1; i >= 0; i -= 1) {
    const dropping = state.droppings[i];
    if (dropping.age >= 30) {
      state.fungusPatches.push({ x: dropping.x, y: dropping.y, size: rand(4, 7) });
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

    if (pillBug.stage === "adult" && pillBug.age >= 160) {
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

    if (nearestDropping && nearestDist < 90) {
      const dx = nearestDropping.x - pillBug.x;
      const dy = nearestDropping.y - pillBug.y;
      pillBug.vx = clamp(Math.sign(dx) * 0.18, -0.18, 0.18);
      pillBug.vy = clamp(Math.sign(dy) * 0.12, -0.12, 0.12);
      pillBug.x += pillBug.vx * dt * 42;
      pillBug.y += pillBug.vy * dt * 42;
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
            for (let egg = 0; egg < 5; egg += 1) {
              state.pillBugEggs.push({ x: pillBug.x + rand(-4, 4), y: pillBug.y + rand(-2, 2), age: 0, hatchTimer: 5 });
            }
            pillBug.poopEaten = 0;
            pushEvent("Pill bug eggs", "A pair of pill bugs laid 5 eggs.");
          }
        }
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
      const juvenile = spawnPillBug("juvenile");
      juvenile.x = egg.x;
      juvenile.y = egg.y;
      state.pillBugs.push(juvenile);
      state.pillBugEggs.splice(e, 1);
    }
  }

  for (const box of state.cricketFarm.boxes) {
    box.breedingTimer += dt;
    if (box.breedingTimer >= 5 && box.crickets > 1 && box.crickets < 100 && (state.cricketFarm.carrots > 0 || state.cricketFarm.potatoes > 0)) {
      const growth = state.cricketFarm.potatoes > 0 ? 4 : 2;
      box.crickets = Math.min(100, box.crickets + growth);
      box.breedingTimer = 0;
      if (box.crickets >= 100) {
        box.minimized = true;
      }
    }
  }

  state.mistBurstTimer -= dt;
  if (state.mistBurstTimer <= 0) {
    state.mistBurstTimer = 60;
    spawnPopup(192, 72, "mist");
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
  const glow = ctx.createRadialGradient(92, 58, 10, 96, 64, 120);
  glow.addColorStop(0, "rgba(255, 244, 194, 0.16)");
  glow.addColorStop(1, "rgba(255, 244, 194, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

  const wallGrad = ctx.createLinearGradient(0, 0, 0, WORLD_SIZE);
  wallGrad.addColorStop(0, "#3f2f21");
  wallGrad.addColorStop(1, "#241910");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

  const canopyGrad = ctx.createLinearGradient(0, 30, 0, 92);
  canopyGrad.addColorStop(0, "#587740");
  canopyGrad.addColorStop(1, "#355028");
  ctx.fillStyle = canopyGrad;
  ctx.beginPath();
  ctx.ellipse(120, 52, 60, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  const floorGrad = ctx.createLinearGradient(0, 100, 0, WORLD_SIZE);
  floorGrad.addColorStop(0, "#7d613d");
  floorGrad.addColorStop(1, "#4a3621");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(24, 98, WORLD_SIZE - 48, WORLD_SIZE - 122);

  ctx.fillStyle = "#476534";
  ctx.beginPath();
  ctx.ellipse(70, 66, 20, 9, -0.12, 0, Math.PI * 2);
  ctx.ellipse(170, 64, 18, 8, 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7c5d3b";
  ctx.beginPath();
  ctx.ellipse(110, 154, 46, 16, -0.06, 0, Math.PI * 2);
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

  ctx.fillStyle = "#805b38";
  ctx.beginPath();
  ctx.ellipse(122, 150, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a744a";
  ctx.beginPath();
  ctx.ellipse(122, 147, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(22, 14, 9, 0.92)";
  ctx.beginPath();
  ctx.ellipse(122, 150, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4f31";
  ctx.fillRect(101, 145, 3, 12);
  ctx.fillRect(140, 145, 3, 12);

  ctx.fillStyle = "#7d5a39";
  ctx.beginPath();
  ctx.ellipse(66, 158, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#936f47";
  ctx.beginPath();
  ctx.ellipse(66, 156, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(22, 14, 9, 0.88)";
  ctx.beginPath();
  ctx.ellipse(66, 158, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#65472d";
  ctx.beginPath();
  ctx.ellipse(64, 160, 10, 5, 0.1, 0, Math.PI * 2);
  ctx.ellipse(170, 154, 8, 4.5, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7c5a38";
  ctx.fillRect(58, 155, 12, 4);
  ctx.fillRect(164, 150, 10, 4);

  const coverPatches = 6 + Math.floor(state.groundCover / 7);
  for (let i = 0; i < coverPatches; i += 1) {
    const x = 42 + ((i * 23) % 146);
    const y = 40 + ((i * 17) % 50);
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
    const leafX = 44 + (i * 14) % 154;
    const leafY = 118 + ((i % 4) * 10);
    ctx.fillStyle = i % 2 === 0 ? "#9f7d4d" : "#765636";
    ctx.beginPath();
    ctx.ellipse(leafX, leafY, 5, 2.3, (i % 3) * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 8; i += 1) {
    const fernX = 38 + i * 22;
    const fernY = 102 + (i % 2) * 8;
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
    ctx.strokeStyle = "#2c6633";
    ctx.lineWidth = 2;

    const segments = [];
    segments.push([[164, 44], [156, 62], [146, 84], [140, 104]]);
    if (plantLevel >= 2) segments.push([[140, 104], [134, 122], [126, 138], [118, 152]]);
    if (plantLevel >= 3) segments.push([[118, 152], [106, 160], [92, 166], [78, 170]]);
    if (plantLevel >= 4) segments.push([[140, 106], [152, 118], [166, 132], [178, 144]]);
    if (plantLevel >= 5) segments.push([[78, 170], [98, 173], [124, 175], [152, 176]]);

    for (const seg of segments) {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      ctx.bezierCurveTo(seg[1][0], seg[1][1], seg[2][0], seg[2][1], seg[3][0], seg[3][1]);
      ctx.stroke();
    }

    const leafClusters = [
      [158, 58], [149, 78], [142, 98], [136, 118],
      [128, 136], [118, 150], [104, 162], [88, 168],
      [154, 120], [168, 136], [96, 174], [126, 176], [150, 177]
    ].slice(0, 4 + plantLevel * 2);

    for (const [lx, ly] of leafClusters) {
      ctx.fillStyle = "#4d8f4d";
      ctx.beginPath();
      ctx.moveTo(lx - 5, ly + 2);
      ctx.lineTo(lx, ly - 2);
      ctx.lineTo(lx + 5, ly + 2);
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
  for (let i = 0; i < decorLevel * 2; i += 1) {
    const x = 132 + ((i * 18) % 46);
    const y = 142 + ((i * 12) % 28);
    ctx.fillStyle = i % 2 === 0 ? "#8d8377" : "#a39176";
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 4, 8, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c4a31";
    ctx.fillRect(x - 5, y + 6, 6, 3);
    ctx.fillStyle = i % 2 === 0 ? "#c2a16a" : "#8b5e35";
    ctx.fillRect(x + 3, y - 4, 3, 6);
    ctx.fillStyle = "#7adf7d";
    ctx.beginPath();
    ctx.ellipse(x + 10, y - 3, 3, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const mistLevel = getUpgrade("mist")?.level ?? 0;
  ctx.fillStyle = "#4d5a48";
  ctx.fillRect(182, 30, 24, 8);
  ctx.fillRect(194, 38, 4, 12);
  ctx.fillStyle = "rgba(245,250,255,0.85)";
  ctx.fillRect(195, 50, 2, 112);
  for (let i = 0; i < mistLevel * 2; i += 1) {
    ctx.fillStyle = "rgba(220,240,255,0.20)";
    ctx.fillRect(178 - i * 4, 32 + (i % 3) * 4, 4, 10);
  }
  for (let i = 0; i < 4 + mistLevel * 5; i += 1) {
    const drift = ((state.tick * 8) + i * 9) % 52;
    const puffX = 176 + (i % 5) * 8;
    const puffY = 46 + drift;
    ctx.fillStyle = "rgba(235,245,238,0.10)";
    ctx.beginPath();
    ctx.arc(puffX, puffY, 5, 0, Math.PI * 2);
    ctx.arc(puffX + 4, puffY + 2, 4, 0, Math.PI * 2);
    ctx.arc(puffX - 3, puffY + 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (mistLevel > 0 && state.mistBurstTimer > 52) {
    const mistProgress = Math.min(1, (60 - state.mistBurstTimer) / 8);
    ctx.fillStyle = `rgba(235,245,238,${0.10 * mistProgress})`;
    ctx.fillRect(24, 24, WORLD_SIZE - 48, WORLD_SIZE - 48);
  }

  for (let i = 0; i < 5; i += 1) {
    drawPixelCircle(48 + i * 28, 36 + (i % 2) * 6, 2, "rgba(255,255,255,0.22)");
  }
}

function drawFrog(frog) {
  const x = Math.round(frog.x);
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

  drawPixelRect(x, y + 1, bodyW, Math.max(7, bodyH - 1), "#3f8b3d", "transparent");
  drawPixelRect(x + 1, y, Math.max(10, bodyW - 2), bodyH, "#73d65f", "#2f6f2a");
  drawPixelRect(x + 2, y + 1, Math.max(8, bodyW - 4), Math.max(4, bodyH - 4), "#8dea76", "transparent");
  drawPixelRect(x + 3, y + 3, Math.max(6, bodyW - 8), 2, "#baf7a0", "transparent");

  drawPixelRect(x + 2, y - 2, 3, 3, "#d6ffbf", "transparent");
  drawPixelRect(x + Math.max(7, bodyW - 6), y - 2, 3, 3, "#d6ffbf", "transparent");
  drawPixelRect(x + 2, y - 1, 2, 2, "#8fef74", "transparent");
  drawPixelRect(x + Math.max(8, bodyW - 5), y - 1, 2, 2, "#8fef74", "transparent");

  drawPixelRect(faceDir > 0 ? x + Math.max(9, bodyW - 3) : x + 1, y + 4, 2, 2, "#102313", "transparent");
  drawPixelRect(x + Math.max(4, Math.floor(bodyW / 2) - 1), y + Math.max(5, bodyH - 3), 3, 2, "#e9f7d8", "transparent");

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
    ctx.fillStyle = "#d8c7ff";
    ctx.beginPath();
    ctx.arc(fungus.x, fungus.y, fungus.size * 0.45, 0, Math.PI * 2);
    ctx.arc(fungus.x + fungus.size * 0.4, fungus.y - 1, fungus.size * 0.3, 0, Math.PI * 2);
    ctx.arc(fungus.x - fungus.size * 0.35, fungus.y + 0.5, fungus.size * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9a86cf";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fungus.x, fungus.y);
    ctx.lineTo(fungus.x, fungus.y + fungus.size * 0.6);
    ctx.stroke();
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

  const statusItems = [
    { label: "Coins", value: state.coins, max: 40, suffix: "¢" },
    { label: "Humidity", value: state.humidity, max: 100, suffix: "%" },
    { label: "Cleanliness", value: state.cleanliness, max: 100, suffix: "%" },
    { label: "Frogs", value: state.frogs.length, max: 8, suffix: " frogs" },
    { label: "Pill Bugs", value: state.pillBugs.length, max: 10, suffix: " bugs" }
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
  elements.toggleFarmButton.textContent = state.cricketFarmOpen ? "Hide Cricket Farm" : "Open Cricket Farm";

  elements.cricketFarmBoxes.innerHTML = state.cricketFarm.boxes.map((box) => {
    const isFull = box.crickets >= 100;
    const minimized = box.minimized || isFull;
    const previewDots = Array.from({ length: Math.min(24, Math.max(2, Math.ceil(box.crickets / 5))) }, (_, index) => {
      const left = 6 + ((index * 17) % 88);
      const baseTop = 10 + ((index * 11) % 48);
      const hop = Math.sin(state.tick * 4 + index * 1.2) * 4;
      const top = Math.max(6, Math.min(58, baseTop - hop));
      return `<span class="cricket-dot" style="left:${left}%; top:${top}%"></span>`;
    }).join("");
    const carrotVisual = state.cricketFarm.carrots > 0 ? `<span class="farm-food farm-food-carrot"></span>` : "";
    const potatoVisual = state.cricketFarm.potatoes > 0 ? `<span class="farm-food farm-food-potato"></span>` : "";
    return `
      <article class="farm-box ${minimized ? "minimized" : ""}" data-box-id="${box.id}">
        <div class="farm-box-header">
          <strong>Cricket Box ${box.id}</strong>
          <button class="multi-buy-tab" data-farm-toggle="${box.id}" type="button">${minimized ? "Open" : "Minimize"}</button>
        </div>
        <div class="farm-box-stats">
          <div>Crickets: ${box.crickets} / 100</div>
          <div>Feed: ${state.cricketFarm.carrots} carrots · ${state.cricketFarm.potatoes} potatoes</div>
        </div>
        <div class="cricket-box-preview">${previewDots}${carrotVisual}${potatoVisual}</div>
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
        box.crickets = Math.min(100, box.crickets + 8);
      } else {
        if (state.cricketFarm.potatoes <= 0) return;
        state.cricketFarm.potatoes -= 1;
        box.crickets = Math.min(100, box.crickets + 12);
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
        state.crickets.push(spawnCricket());
      }
      box.crickets = Math.max(0, box.crickets - releaseCount);
      box.minimized = false;
      pushEvent("Farm release", `Released ${releaseCount} crickets from box ${box.id}.`);
      renderCricketFarm();
      renderHud();
    });
  });
}

function renderQuickActionPrices() {
  if (elements.buyFrogPrice) elements.buyFrogPrice.textContent = `${FROG_COST * state.multiBuyAmount} coins`;
  if (elements.feedPrice) elements.feedPrice.textContent = `${CRICKET_COST * state.multiBuyAmount} coins`;
  if (elements.buyPillBugPrice) elements.buyPillBugPrice.textContent = `${PILL_BUG_COST * state.multiBuyAmount} coins`;
  if (elements.collectPrice) elements.collectPrice.textContent = `free`;
  if (elements.cleanPrice) elements.cleanPrice.textContent = `free`;
  if (elements.boostPrice) elements.boostPrice.textContent = `3 coins`;
  if (elements.buyCarrotPrice) elements.buyCarrotPrice.textContent = `1 coin`;
  if (elements.buyPotatoPrice) elements.buyPotatoPrice.textContent = `1 coin`;
  if (elements.addCricketBoxPrice) elements.addCricketBoxPrice.textContent = `${10 + state.cricketFarm.boxes.length * 5} coins`;
}

function bindUi() {
  elements.toggleFarmButton?.addEventListener("click", () => {
    state.cricketFarmOpen = !state.cricketFarmOpen;
    renderCricketFarm();
  });

  elements.buyCarrotButton?.addEventListener("click", () => {
    if (!spendCoins(1)) {
      pushEvent("Need coins", "You need 1 coin to buy a carrot.");
      renderHud();
      return;
    }
    state.cricketFarm.carrots += 1;
    renderCricketFarm();
    renderQuickActionPrices();
  });

  elements.buyPotatoButton?.addEventListener("click", () => {
    if (!spendCoins(1)) {
      pushEvent("Need coins", "You need 1 coin to buy a potato slice.");
      renderHud();
      return;
    }
    state.cricketFarm.potatoes += 1;
    renderCricketFarm();
    renderQuickActionPrices();
  });

  elements.addCricketBoxButton?.addEventListener("click", () => {
    const cost = 10 + state.cricketFarm.boxes.length * 5;
    if (!spendCoins(cost)) {
      pushEvent("Need coins", `You need ${cost} coins to add another cricket box.`);
      renderHud();
      return;
    }
    state.cricketFarm.boxes.push({ id: state.cricketFarm.boxes.length + 1, crickets: 0, minimized: false, breedingTimer: 0 });
    pushEvent("New box", "A new cricket breeder box was added.");
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

  elements.buyPillBugButton.addEventListener("click", () => {
    let bought = 0;
    for (let i = 0; i < state.multiBuyAmount; i += 1) {
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

  elements.collectButton.addEventListener("click", () => {
    const gained = Math.max(1, state.frogs.length + Math.floor((getUpgrade("decor")?.level ?? 0) / 2));
    state.coins += gained;
    spawnPopup(60, 48, `+${gained} coins`);
    pushEvent("Coins collected", `You collected ${gained} coins from habitat visitors.`);
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

  elements.saveButton.addEventListener("click", saveGame);
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
      decorationsPlaced: state.decorationsPlaced,
      events: state.events,
      upgrades: state.upgrades,
      frogs: state.frogs,
      crickets: state.crickets,
      pillBugs: state.pillBugs,
      droppings: state.droppings,
      fungusPatches: state.fungusPatches
    }));
  }
  requestAnimationFrame(tick);
}

loadGame();
state.frogs = Array.isArray(state.frogs) ? state.frogs : [];
state.crickets = Array.isArray(state.crickets) ? state.crickets : [];
state.pillBugs = Array.isArray(state.pillBugs) ? state.pillBugs : [];
state.pillBugEggs = Array.isArray(state.pillBugEggs) ? state.pillBugEggs : [];
state.droppings = Array.isArray(state.droppings) ? state.droppings : [];
state.fungusPatches = Array.isArray(state.fungusPatches) ? state.fungusPatches : [];
bindUi();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
renderHud();
renderQuickActionPrices();
renderCricketFarm();
renderHabitat();
requestAnimationFrame(tick);
