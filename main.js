// Global Kitchen Sim — engine + UI wiring. No build step, no backend.
// Loads /*.json content next to this file and drives the screens declared in index.html.

const SAVE_KEY = 'gk_active_save_v1';
const SKILL_KEYS = ['knife', 'sauce', 'workflow', 'hygiene', 'timing', 'plating', 'butchery', 'pastry', 'seasoning'];
const CLAMP_PATHS = new Set([
  'team.morale', 'team.fatigue', 'team.reputation', 'team.cohesion', 'team.risk', 'team.readiness',
]);

const ARCHETYPES = [
  { id: 'prodigy', name: 'The Prodigy', traits: ['high_potential', 'volatile'], conflict_tags: ['clash:ego'],
    base_skills: { knife: 65, sauce: 55, workflow: 50, hygiene: 50, timing: 60, plating: 60, butchery: 45, pastry: 40, seasoning: 60 } },
  { id: 'station_rock', name: 'The Station Rock', traits: ['reliable', 'low_drama'], conflict_tags: [],
    base_skills: { knife: 55, sauce: 50, workflow: 65, hygiene: 65, timing: 60, plating: 45, butchery: 55, pastry: 40, seasoning: 50 } },
  { id: 'artist', name: 'The Artist', traits: ['creative', 'structure_averse'], conflict_tags: ['clash:hierarchy'],
    base_skills: { knife: 50, sauce: 55, workflow: 40, hygiene: 45, timing: 45, plating: 70, butchery: 35, pastry: 55, seasoning: 55 } },
  { id: 'classicist', name: 'The Classicist', traits: ['tradition', 'critique_heavy'], conflict_tags: ['clash:communication'],
    base_skills: { knife: 60, sauce: 65, workflow: 55, hygiene: 55, timing: 50, plating: 50, butchery: 55, pastry: 50, seasoning: 60 } },
  { id: 'grinder', name: 'The Grinder', traits: ['hard_worker', 'fatigue_risk'], conflict_tags: [],
    base_skills: { knife: 55, sauce: 50, workflow: 60, hygiene: 55, timing: 55, plating: 45, butchery: 50, pastry: 45, seasoning: 50 } },
  { id: 'influencer', name: 'The Influencer', traits: ['brand', 'ego_risk'], conflict_tags: ['clash:ego'],
    base_skills: { knife: 45, sauce: 45, workflow: 50, hygiene: 45, timing: 50, plating: 60, butchery: 35, pastry: 45, seasoning: 50 } },
];

// No rubrics/*.json ships in this content pack; rubric_standard is defined here per 04_Content-Schemas.md's shape.
const RUBRIC_STANDARD = {
  id: 'rubric_standard',
  scale: 100,
  criteria: [
    { key: 'taste', weight: 0.25 },
    { key: 'technique', weight: 0.20 },
    { key: 'workflow', weight: 0.15 },
    { key: 'hygiene', weight: 0.10 },
    { key: 'presentation', weight: 0.15 },
    { key: 'timing', weight: 0.15 },
  ],
};
const CRITERIA_SKILLS = {
  taste: ['seasoning'],
  technique: ['knife', 'butchery', 'sauce'],
  workflow: ['workflow'],
  hygiene: ['hygiene'],
  presentation: ['plating'],
  timing: ['timing'],
};

const ROUTE_IDS = ['AU', 'FR', 'JP', 'US'];

const DATA = { routes: {}, missions: {}, events: {}, catalog: null, circuits: null, formats: null, profiles: null, roles: null, sessions: null, season: null };

let rng = Math.random;
let gameState = null;
let pendingDraftRoute = null;
let pendingPicks = new Set();

// ---------- utils ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = val;
}
function incPath(state, path, value) {
  const cur = Number(getPath(state, path)) || 0;
  let next = cur + value;
  if (CLAMP_PATHS.has(path)) next = clamp(next, 0, 100);
  if (path === 'team.budget' || path === 'team.available_hours') next = Math.max(0, next);
  setPath(state, path, Math.round(next * 100) / 100);
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
async function fetchJSONSafe(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ---------- content loading ----------

async function loadStaticData() {
  const [au, fr, jp, us, catalog, circuits, formats, profiles, roles, sessions, season] = await Promise.all([
    fetchJSONSafe('./AU.json'), fetchJSONSafe('./FR.json'), fetchJSONSafe('./JP.json'), fetchJSONSafe('./US.json'),
    fetchJSONSafe('./catalog.json'), fetchJSONSafe('./circuits.json'), fetchJSONSafe('./formats.json'),
    fetchJSONSafe('./profiles.json'), fetchJSONSafe('./roles.json'), fetchJSONSafe('./sessions.json'),
    fetchJSONSafe('./2026_open_calendar.json'),
  ]);
  DATA.routes = { AU: au, FR: fr, JP: jp, US: us };
  DATA.catalog = catalog; DATA.circuits = circuits; DATA.formats = formats;
  DATA.profiles = profiles; DATA.roles = roles; DATA.sessions = sessions; DATA.season = season;
}

async function loadMission(missionId) {
  if (DATA.missions[missionId]) return DATA.missions[missionId];
  const suffix = missionId.replace(/^[A-Z]{2}_/, '');
  const candidates = [`${missionId}.json`, `${suffix}.json`, `FR_${suffix}.json`, `JP_${suffix}.json`, `US_${suffix}.json`, `AU_${suffix}.json`];
  const tried = new Set();
  for (const c of candidates) {
    if (tried.has(c)) continue;
    tried.add(c);
    const data = await fetchJSONSafe('./' + c);
    if (data) { DATA.missions[missionId] = data; return data; }
  }
  return null;
}
async function loadEvent(eventId) {
  if (DATA.events[eventId]) return DATA.events[eventId];
  const data = await fetchJSONSafe('./' + eventId.toLowerCase() + '.json');
  if (data) DATA.events[eventId] = data;
  return data;
}
async function primeRouteContent(route) {
  await Promise.all(route.content.missions.map((id) => loadMission(id)));
  await Promise.all(route.content.events.map((id) => loadEvent(id)));
}

// ---------- career setup ----------

function draftTeam(route, archetypeIds) {
  const ids = archetypeIds && archetypeIds.length ? archetypeIds : shuffle(ARCHETYPES.map((a) => a.id), rng).slice(0, 4);
  return ids.map((id, i) => {
    const a = ARCHETYPES.find((x) => x.id === id);
    return {
      id: `${a.id}_${i}`,
      name: a.name,
      archetype: a.id,
      traits: a.traits,
      conflict_tags: a.conflict_tags,
      role: null,
      secondary_roles: [],
      skills: Object.fromEntries(Object.entries(a.base_skills).map(([k, v]) => [k, clamp(v + Math.round((rng() - 0.5) * 12), 20, 90)])),
    };
  });
}

function seedRelationships(state) {
  const members = state.members;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i], b = members[j];
      const sharedClash = (a.conflict_tags || []).some((t) => (b.conflict_tags || []).includes(t));
      const stabilizer = a.archetype === 'station_rock' || b.archetype === 'station_rock';
      let score = 15 + Math.round((rng() - 0.5) * 20);
      if (sharedClash) score -= 25;
      if (stabilizer) score += 8;
      state.relationships[[a.id, b.id].sort().join('|')] = { score: clamp(score, -100, 100), tags: sharedClash ? ['clash'] : [] };
    }
  }
}
function avgRelationshipScore(state) {
  const vals = Object.values(state.relationships).map((r) => r.score);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

async function startCareer(routeId, archetypeIds) {
  const route = DATA.routes[routeId];
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  rng = mulberry32(seed);
  const members = draftTeam(route, archetypeIds);
  const state = {
    version: 'v1', seed, route_id: routeId, week: 1, chapter: 'CH1_TRYOUTS', flags: [],
    team: {
      budget: route.starting_resources.budget,
      reputation: route.starting_resources.reputation,
      available_hours: route.starting_resources.weekly_hours_per_member * members.length,
      morale: 60, fatigue: 15, cohesion: 60, risk: 10, readiness: 40, workflow_bonus: 0,
    },
    members,
    relationships: {},
    completed_missions: [],
    fired_events: [],
    log: [],
    pending_event: null,
    current_mission_id: null,
  };
  seedRelationships(state);
  await primeRouteContent(route);
  addLog(state, `New career started on the ${route.name}.`);
  await advance(state);
  return state;
}

// ---------- flags / log ----------

function addFlag(state, flag) { if (!state.flags.includes(flag)) state.flags.push(flag); }
function removeFlag(state, flag) { state.flags = state.flags.filter((f) => f !== flag); }
function addLog(state, text) { state.log.push({ week: state.week, text }); }

// ---------- effects engine ----------

function applyEffect(state, eff) {
  switch (eff.op) {
    case 'inc': incPath(state, eff.path, eff.value); break;
    case 'set': setPath(state, eff.path, eff.value); break;
    case 'set_flag': addFlag(state, eff.value); break;
    case 'clear_flag': removeFlag(state, eff.value); break;
    case 'addMember': {
      const a = ARCHETYPES.find((x) => x.id === eff.value);
      if (a) state.members.push({ id: `${a.id}_${state.members.length}`, name: a.name, archetype: a.id, traits: a.traits, conflict_tags: a.conflict_tags, role: null, secondary_roles: [], skills: { ...a.base_skills } });
      break;
    }
    case 'incSkill': {
      const m = state.members.find((x) => x.id === eff.memberId);
      if (m) m.skills[eff.skill] = clamp((m.skills[eff.skill] || 0) + eff.value, 0, 100);
      break;
    }
    case 'incRelationship': {
      const key = [eff.a, eff.b].sort().join('|');
      const rel = state.relationships[key] || { score: 0, tags: [] };
      rel.score = clamp(rel.score + eff.value, -100, 100);
      state.relationships[key] = rel;
      break;
    }
    case 'assign_role': {
      const m = state.members.find((x) => x.id === eff.member_id);
      if (m) { if (eff.slot === 'secondary') { m.secondary_roles = m.secondary_roles || []; m.secondary_roles.push(eff.role_id); } else m.role = eff.role_id; }
      break;
    }
    case 'clear_role': {
      const m = state.members.find((x) => x.id === eff.member_id);
      if (m) { if (eff.slot === 'secondary') m.secondary_roles = (m.secondary_roles || []).filter((r) => r !== eff.role_id); else m.role = null; }
      break;
    }
    case 'set_station_map': state.station_map = Object.assign(state.station_map || {}, eff.value || {}); break;
    default: break;
  }
}

// ---------- mission requirements + checks ----------

function meetsRequirements(state, req) {
  if (!req) return true;
  const flagsAll = req.flags_all || [];
  const flagsNone = req.flags_none || [];
  const minRep = req.min_reputation || 0;
  if (!flagsAll.every((f) => state.flags.includes(f))) return false;
  if (flagsNone.some((f) => state.flags.includes(f))) return false;
  if (state.team.reputation < minRep) return false;
  return true;
}
function sumMods(mods) {
  if (!mods) return 0;
  return mods.reduce((s, m) => s + (typeof m === 'number' ? m : (m.value || 0)), 0);
}
function resolveCheck(state, check) {
  const statVal = Number(getPath(state, check.stat)) || 0;
  const roll = statVal + sumMods(check.success_mods) + (Math.floor(rng() * 31) - 15);
  return roll >= check.difficulty;
}
function resolveChoice(state, choice) {
  const success = (choice.checks || []).every((c) => resolveCheck(state, c));
  const outcome = success ? choice.outcomes.success : choice.outcomes.fail;
  (outcome.effects || []).forEach((e) => applyEffect(state, e));
  (outcome.set_flags || []).forEach((f) => addFlag(state, f));
  return { success, text: outcome.text };
}

function getNextMission(state) {
  const route = DATA.routes[state.route_id];
  const list = route.content.missions
    .map((id) => ({ id, data: DATA.missions[id] }))
    .filter((x) => x.data)
    .filter((x) => !state.completed_missions.includes(x.id))
    .filter((x) => meetsRequirements(state, x.data.requirements))
    .sort((a, b) => a.data.week - b.data.week);
  return list[0] || null;
}

// ---------- weekly tick + events ----------

function recomputeReadiness(state) {
  const t = state.team;
  const avgSkill = state.members.length
    ? state.members.reduce((s, m) => s + SKILL_KEYS.reduce((a, k) => a + (m.skills[k] || 0), 0) / SKILL_KEYS.length, 0) / state.members.length
    : 0;
  const readiness = avgSkill + t.morale * 0.15 + t.cohesion * 0.15 + t.reputation * 0.10 - t.fatigue * 0.25 - t.risk * 0.10 + (t.workflow_bonus || 0);
  t.readiness = clamp(Math.round(readiness), 0, 100);
}
function weeklyTick(state) {
  const recover = Math.round(10 * (1 + (state.team.cohesion - 50) / 200));
  incPath(state, 'team.fatigue', -recover);
  incPath(state, 'team.cohesion', Math.round(avgRelationshipScore(state) / 12));
  recomputeReadiness(state);
}
function evalConditions(state, all) {
  return (all || []).every((cond) => {
    if (cond.flag) return state.flags.includes(cond.flag);
    if (cond.relationship) return true;
    const val = getPath(state, cond.path);
    if (cond.gte !== undefined) return val >= cond.gte;
    if (cond.lte !== undefined) return val <= cond.lte;
    return true;
  });
}
function computeChance(state, trigger) {
  let chance = trigger.base_chance || 0;
  (trigger.modifiers || []).forEach((m) => { if (evalConditions(state, [m.if])) chance += m.add || 0; });
  return chance;
}
function maybeTriggerEvent(state) {
  const route = DATA.routes[state.route_id];
  const conditional = [];
  const rolled = [];
  for (const id of route.content.events) {
    const ev = DATA.events[id];
    if (!ev) continue;
    if (ev.trigger.type === 'conditional') {
      if (evalConditions(state, ev.trigger.all)) conditional.push(id);
    } else if (ev.trigger.type === 'weekly_roll') {
      if (rng() < computeChance(state, ev.trigger)) rolled.push(id);
    }
  }
  const pickId = conditional[0] || (rolled.length ? rolled[Math.floor(rng() * rolled.length)] : null);
  if (!pickId) return null;
  state.fired_events.push(pickId);
  return { id: pickId, data: DATA.events[pickId] };
}

async function advance(state) {
  let next = getNextMission(state);
  if (!next && state.completed_missions.length > 0 && !state.flags.some((f) => f.startsWith('FLAG_CIRCUIT_'))) {
    // A failed circuit-commitment roll leaves no path forward; the season forces a default choice.
    addFlag(state, 'FLAG_CIRCUIT_SOLO');
    addLog(state, 'Indecision has a deadline. The season defaults you onto the Solo Circuit.');
    next = getNextMission(state);
  }
  if (next && next.data.week > state.week) {
    weeklyTick(state);
    state.week = next.data.week;
  }
  if (next) state.chapter = next.data.chapter;
  recomputeReadiness(state);
  const ev = maybeTriggerEvent(state);
  state.current_mission_id = next ? next.id : null;
  state.pending_event = ev;
  save(state);
}

// ---------- competitions ----------

function eligibleCompetitions(state, teamSize) {
  if (!DATA.catalog) return [];
  return DATA.catalog.competitions.filter((c) => {
    const g = c.gates || {};
    if (g.min_reputation && state.team.reputation < g.min_reputation) return false;
    if (g.min_team_size && teamSize < g.min_team_size) return false;
    if (g.requires_flag_any && !g.requires_flag_any.some((f) => state.flags.includes(f))) return false;
    return true;
  });
}

function simulateCompetition(state, compId) {
  const comp = DATA.catalog.competitions.find((c) => c.id === compId);
  const format = DATA.formats.formats.find((f) => f.id === comp.format_id);
  const profile = DATA.profiles.rubric_profiles.find((p) => p.id === comp.rubric_profile_id);
  const route = DATA.routes[state.route_id];

  function teamAvg(keys) {
    if (!state.members.length) return 40;
    return state.members.reduce((s, m) => s + keys.reduce((a, k) => a + (m.skills[k] || 0), 0) / keys.length, 0) / state.members.length;
  }

  const breakdown = [];
  let raw = 0;
  RUBRIC_STANDARD.criteria.forEach((cri) => {
    const base = teamAvg(CRITERIA_SKILLS[cri.key]);
    const mult = (format.format_multipliers?.[cri.key] || 1) * (profile.criteria_multipliers?.[cri.key] || 1) * (route.rubric_bias?.[cri.key] || 1);
    const val = clamp(base * mult, 0, 100);
    raw += val * cri.weight;
    breakdown.push({ key: cri.key, base: Math.round(base), mult: Number(mult.toFixed(2)), value: Math.round(val), weight: cri.weight });
  });

  const readinessFactor = 0.7 + 0.3 * (state.team.readiness / 100);
  let score = raw * readinessFactor + (Math.floor(rng() * 13) - 6);

  const penaltiesApplied = [];
  (format.penalty_overrides || []).forEach((p) => {
    let chance = 0.12 + state.team.risk / 250;
    if (state.flags.includes('FLAG_RUSHED_PREP')) chance += 0.15;
    if (rng() < chance) { score += p.points; penaltiesApplied.push(p); }
  });

  let dq = false;
  if (state.team.risk > 85 && rng() < 0.06) { dq = true; score = 0; }
  score = Math.round(clamp(score, 0, 140));

  let tier = 'none', factor = 0;
  if (!dq) {
    if (score >= 82) { tier = 'gold'; factor = 1; }
    else if (score >= 68) { tier = 'silver'; factor = 0.5; }
    else if (score >= 54) { tier = 'bronze'; factor = 0.25; }
  }
  const repGain = Math.round((comp.stakes?.reputation_gain_win || 0) * factor);
  const budgetGain = Math.round((comp.stakes?.budget_gain_win || 0) * factor);
  incPath(state, 'team.reputation', repGain);
  incPath(state, 'team.budget', budgetGain);
  incPath(state, 'team.fatigue', 15);
  if (factor === 0) incPath(state, 'team.morale', -4);

  if (tier === 'gold' && DATA.circuits) {
    for (const circuit of DATA.circuits.circuits) {
      const stage = circuit.stages.find((s) => s.competition_id === comp.id);
      if (stage) (stage.on_win_set_flags || []).forEach((f) => addFlag(state, f));
    }
  }
  recomputeReadiness(state);
  addLog(state, `[Week ${state.week}] Competed in ${comp.name}: ${dq ? 'DISQUALIFIED' : tier.toUpperCase()} (score ${score}).`);
  save(state);
  return { comp, format, profile, breakdown, score, tier, dq, penaltiesApplied, repGain, budgetGain };
}

// ---------- save / load ----------

function save(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 'v1', state })); } catch (e) { /* storage unavailable */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).state || null;
  } catch (e) { return null; }
}

// ---------- rendering ----------

const $ = (id) => document.getElementById(id);

function renderRouteCards() {
  const el = $('routes');
  el.innerHTML = '';
  ROUTE_IDS.forEach((id) => {
    const route = DATA.routes[id];
    if (!route) return;
    const btn = document.createElement('button');
    btn.className = 'routeCard' + (gameState && gameState.route_id === id ? ' active' : '');
    btn.innerHTML = `<div class="rname">${route.name}</div>
      <div class="rmeta">Budget ${route.starting_resources.budget} · Reputation ${route.starting_resources.reputation} · ${route.starting_resources.weekly_hours_per_member}h/wk per member</div>
      <div class="rmeta">${route.learning_outcomes.map((o) => `<span class="badge">${o.replace(/_/g, ' ')}</span>`).join('')}</div>`;
    btn.addEventListener('click', () => onSelectRoute(id));
    el.appendChild(btn);
  });
}

function renderState(state) {
  const kv = $('stateKv');
  if (!state) { kv.innerHTML = '<div class="hint">Choose a route to start a career.</div>'; $('flagsOut').textContent = ''; return; }
  const t = state.team;
  const rows = [
    ['Route', DATA.routes[state.route_id]?.name || state.route_id],
    ['Week / Chapter', `${state.week} · ${state.chapter}`],
    ['Budget', t.budget],
    ['Reputation', t.reputation],
    ['Morale', t.morale],
    ['Fatigue', t.fatigue],
    ['Cohesion', t.cohesion],
    ['Risk', t.risk],
    ['Readiness', t.readiness],
    ['Available Hours', t.available_hours],
  ];
  kv.innerHTML = rows.map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  $('flagsOut').textContent = JSON.stringify(state.flags, null, 2);
}

function renderTeam(state) {
  const el = $('teamList');
  if (!state) { el.innerHTML = ''; return; }
  el.innerHTML = state.members.map((m) => {
    const skills = Object.entries(m.skills).map(([k, v]) => `${k} ${v}`).join(' · ');
    return `<div class="member"><div class="mname"><span>${m.name}</span><span class="mrole">${m.role || 'unassigned'}</span></div><div class="mskills">${skills}</div></div>`;
  }).join('');
}

function renderRelationships(state) {
  const el = $('relOut');
  if (!state || !Object.keys(state.relationships).length) { el.innerHTML = '<span class="hint">No relationship data yet.</span>'; return; }
  el.innerHTML = Object.entries(state.relationships).map(([key, rel]) => {
    const [aId, bId] = key.split('|');
    const a = state.members.find((m) => m.id === aId);
    const b = state.members.find((m) => m.id === bId);
    if (!a || !b) return '';
    const cls = rel.score <= -10 ? 'relTense' : (rel.score >= 25 ? 'relGood' : '');
    return `<div class="relRow"><span>${a.name} ↔ ${b.name}</span><span class="${cls}">${Math.round(rel.score)}${rel.tags.includes('clash') ? ' · clash' : ''}</span></div>`;
  }).join('');
}

const CIRCUIT_FORMAT_UNLOCKS = {
  FLAG_CIRCUIT_BOCUSE: ['bocuse_style'],
  FLAG_CIRCUIT_TEAM_GLOBAL: ['team_relay', 'team_cold_display'],
  FLAG_CIRCUIT_PASTRY: ['pastry_showpiece'],
};
function renderTraining(state) {
  const card = $('trainingCard');
  if (!state) { card.style.display = 'none'; return; }
  card.style.display = '';
  $('trainMember').innerHTML = state.members.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');
  const unlockedFormats = new Set();
  Object.entries(CIRCUIT_FORMAT_UNLOCKS).forEach(([flag, formats]) => { if (state.flags.includes(flag)) formats.forEach((f) => unlockedFormats.add(f)); });
  const sessions = (DATA.sessions?.sessions || []).filter((s) => !s.requires_format || unlockedFormats.has(s.requires_format));
  $('trainSession').innerHTML = sessions.map((s) => `<option value="${s.id}">${s.name} (${s.hours_cost}h, +${s.fatigue} fatigue)</option>`).join('');
}

function renderLog(state) {
  const el = $('logOut');
  if (!state) { el.innerHTML = ''; return; }
  el.innerHTML = state.log.slice().reverse().map((e) => `<div class="entry">W${e.week} — ${e.text}</div>`).join('');
}

function renderMission(state) {
  const meta = $('missionMeta'), intro = $('missionIntro'), choicesEl = $('missionChoices');
  if (!state) { meta.textContent = ''; intro.innerHTML = ''; choicesEl.innerHTML = ''; return; }
  if (!state.current_mission_id) {
    meta.textContent = `Week ${state.week} · ${state.chapter}`;
    const route = DATA.routes[state.route_id];
    intro.innerHTML = `<p><strong>No further story missions are eligible right now.</strong></p>
      <p>Head to Competition Day to keep competing, or wait for events to unlock the next step.</p>
      <p class="hint">Learning outcomes on this route: ${route.learning_outcomes.map((o) => o.replace(/_/g, ' ')).join(', ')}</p>`;
    choicesEl.innerHTML = '';
    return;
  }
  const mission = DATA.missions[state.current_mission_id];
  meta.textContent = `Week ${mission.week} · ${mission.chapter} · ${mission.title}`;
  intro.innerHTML = mission.intro.map((p) => `<p>${p}</p>`).join('');
  choicesEl.innerHTML = '';
  mission.choices.forEach((choice) => {
    const wrap = document.createElement('div');
    wrap.className = 'choice';
    const checkText = (choice.checks || []).map((c) => `${c.stat} ≥ ${c.difficulty}`).join(', ');
    wrap.innerHTML = `<div class="label">${choice.label}</div><div class="check">Check: ${checkText || 'none'}</div><div class="act"></div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Choose';
    btn.addEventListener('click', () => onChooseMission(choice.id));
    wrap.querySelector('.act').appendChild(btn);
    choicesEl.appendChild(wrap);
  });
}

function renderEvent(state) {
  const card = $('eventCard');
  if (!state || !state.pending_event) { card.style.display = 'none'; return; }
  card.style.display = '';
  const ev = state.pending_event.data;
  $('eventMeta').textContent = `Week ${state.week} · Random Event`;
  $('eventText').innerHTML = `<p><strong>${ev.title}</strong></p><p>${ev.text}</p>`;
  const choicesEl = $('eventChoices');
  choicesEl.innerHTML = '';
  ev.choices.forEach((choice, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'choice';
    wrap.innerHTML = `<div class="label">${choice.label}</div><div class="act"></div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Choose';
    btn.addEventListener('click', () => onChooseEvent(idx));
    wrap.querySelector('.act').appendChild(btn);
    choicesEl.appendChild(wrap);
  });
}

function renderCompetitionSelect(state) {
  const sel = $('compSelect');
  sel.innerHTML = '';
  if (!state || !DATA.catalog) return;
  const teamSize = Number($('teamSize').value) || state.members.length;
  const comps = eligibleCompetitions(state, teamSize);
  if (!comps.length) {
    const opt = document.createElement('option');
    opt.textContent = 'No competitions available yet — build reputation first';
    opt.disabled = true;
    sel.appendChild(opt);
    return;
  }
  comps.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.type})`;
    sel.appendChild(opt);
  });
}

function render(state) {
  if (state) recomputeReadiness(state);
  renderRouteCards();
  renderState(state);
  renderTeam(state);
  renderRelationships(state);
  renderTraining(state);
  renderLog(state);
  renderEvent(state);
  renderMission(state);
  renderCompetitionSelect(state);
}

// ---------- event handlers ----------

function onSelectRoute(routeId) {
  if (loadSave() && !confirm('Start a new career on this route? Your current save will be overwritten.')) return;
  pendingDraftRoute = routeId;
  pendingPicks = new Set();
  $('draftCard').style.display = '';
  renderDraftPool();
  $('draftCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDraftPool() {
  const route = DATA.routes[pendingDraftRoute];
  $('draftRouteName').textContent = route.name;
  const pool = $('draftPool');
  pool.innerHTML = '';
  ARCHETYPES.forEach((a) => {
    const card = document.createElement('div');
    card.className = 'archCard' + (pendingPicks.has(a.id) ? ' picked' : '');
    card.innerHTML = `<div class="aname">${a.name}</div><div class="atraits">${a.traits.join(', ')}</div><div class="askills">${Object.entries(a.base_skills).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>`;
    card.addEventListener('click', () => toggleDraftPick(a.id));
    pool.appendChild(card);
  });
  updateDraftPreview();
}
function toggleDraftPick(id) {
  if (pendingPicks.has(id)) pendingPicks.delete(id);
  else { if (pendingPicks.size >= 5) return; pendingPicks.add(id); }
  renderDraftPool();
}
function updateDraftPreview() {
  const btn = $('btnConfirmDraft');
  const n = pendingPicks.size;
  btn.disabled = n < 3 || n > 5;
  const preview = $('draftPreview');
  if (!n) { preview.className = 'result'; preview.textContent = 'Pick 3–5 members to preview predicted cohesion.'; return; }
  const picked = [...pendingPicks].map((id) => ARCHETYPES.find((a) => a.id === id));
  let clashes = 0, pairs = 0;
  for (let i = 0; i < picked.length; i++) {
    for (let j = i + 1; j < picked.length; j++) {
      pairs++;
      if (picked[i].conflict_tags.some((t) => picked[j].conflict_tags.includes(t))) clashes++;
    }
  }
  const predictedCohesion = clamp(60 - clashes * 12 + (picked.some((p) => p.id === 'station_rock') ? 6 : 0), 0, 100);
  preview.className = 'result ' + (clashes > 0 ? 'bad' : 'good');
  preview.textContent = `${n} picked · predicted starting cohesion ≈ ${predictedCohesion} · ${clashes} personality clash${clashes === 1 ? '' : 'es'} detected across ${pairs} pairs.`;
}
async function onConfirmDraft() {
  if (pendingPicks.size < 3 || pendingPicks.size > 5) return;
  const routeId = pendingDraftRoute;
  const picks = [...pendingPicks];
  $('draftCard').style.display = 'none';
  $('resultBox').className = 'result';
  $('resultBox').textContent = 'Starting new career...';
  gameState = await startCareer(routeId, picks);
  pendingDraftRoute = null;
  pendingPicks = new Set();
  $('resultBox').textContent = '';
  render(gameState);
}
function onCancelDraft() {
  $('draftCard').style.display = 'none';
  pendingDraftRoute = null;
  pendingPicks = new Set();
}

function onTrain() {
  if (!gameState) return;
  const memberId = $('trainMember').value;
  const sessionId = $('trainSession').value;
  const session = (DATA.sessions?.sessions || []).find((s) => s.id === sessionId);
  const member = gameState.members.find((m) => m.id === memberId);
  const box = $('trainResult');
  if (!session || !member) return;
  if (gameState.team.available_hours < session.hours_cost) {
    box.className = 'result bad';
    box.textContent = `Not enough available hours (need ${session.hours_cost}, have ${gameState.team.available_hours}).`;
    return;
  }
  incPath(gameState, 'team.available_hours', -session.hours_cost);
  incPath(gameState, 'team.fatigue', session.fatigue);
  Object.entries(session.skill_gains || {}).forEach(([k, v]) => { member.skills[k] = clamp((member.skills[k] || 0) + v, 0, 100); });
  if (session.relationship_effect?.cohesion) incPath(gameState, 'team.cohesion', session.relationship_effect.cohesion);
  if (session.flags_risk && rng() < 0.25) session.flags_risk.forEach((f) => addFlag(gameState, f));
  addLog(gameState, `Training: ${member.name} ran "${session.name}".`);
  recomputeReadiness(gameState);
  save(gameState);
  box.className = 'result good';
  box.textContent = `${member.name} completed ${session.name}. Skills up, fatigue +${session.fatigue}, hours -${session.hours_cost}.`;
  render(gameState);
}

async function onChooseMission(choiceId) {
  if (!gameState || !gameState.current_mission_id) return;
  const mission = DATA.missions[gameState.current_mission_id];
  const choice = mission.choices.find((c) => c.id === choiceId);
  const result = resolveChoice(gameState, choice);
  gameState.completed_missions.push(gameState.current_mission_id);
  addLog(gameState, `${mission.title} — ${choice.label} → ${result.success ? 'SUCCESS' : 'SETBACK'}`);
  const box = $('resultBox');
  box.className = 'result ' + (result.success ? 'good' : 'bad');
  box.textContent = result.text;
  await advance(gameState);
  render(gameState);
}

async function onChooseEvent(idx) {
  if (!gameState || !gameState.pending_event) return;
  const ev = gameState.pending_event.data;
  const choice = ev.choices[idx];
  (choice.effects || []).forEach((e) => applyEffect(gameState, e));
  addLog(gameState, `EVENT: ${ev.title} — ${choice.label}`);
  gameState.pending_event = null;
  recomputeReadiness(gameState);
  save(gameState);
  render(gameState);
}

function onSimulate() {
  if (!gameState) return;
  const compId = $('compSelect').value;
  if (!compId) return;
  const result = simulateCompetition(gameState, compId);
  $('compOut').textContent = JSON.stringify({
    competition: result.comp.name, format: result.format.name, breakdown: result.breakdown,
    penalties: result.penaltiesApplied, score: result.score, tier: result.dq ? 'DQ' : result.tier,
  }, null, 2);
  const summary = $('compSummary');
  const tierClass = result.dq ? 'bad' : (result.tier === 'none' ? 'bad' : 'good');
  summary.className = 'result ' + tierClass;
  const tierLabel = result.dq ? 'DISQUALIFIED' : result.tier.toUpperCase();
  summary.innerHTML = `<span class="${result.tier}">${tierLabel}</span> — score ${result.score}. `
    + (result.repGain || result.budgetGain ? `Gained +${result.repGain} reputation, +${result.budgetGain} budget.` : 'No placement this time — regroup and try again.');
  render(gameState);
}

function showRaw(obj) { $('dataOut').textContent = JSON.stringify(obj, null, 2); }

function wireButtons() {
  $('btnReset').addEventListener('click', () => {
    if (!confirm('Reset your save and start over?')) return;
    localStorage.removeItem(SAVE_KEY);
    gameState = null;
    onCancelDraft();
    render(null);
  });
  $('btnSimulate').addEventListener('click', onSimulate);
  $('btnRefreshComps').addEventListener('click', () => renderCompetitionSelect(gameState));
  $('teamSize').addEventListener('change', () => renderCompetitionSelect(gameState));
  $('btnSeason').addEventListener('click', () => showRaw(DATA.season));
  $('btnCatalog').addEventListener('click', () => showRaw(DATA.catalog));
  $('btnRoles').addEventListener('click', () => showRaw(DATA.roles));
  $('btnTraining').addEventListener('click', () => showRaw(DATA.sessions));
  $('btnConfirmDraft').addEventListener('click', onConfirmDraft);
  $('btnCancelDraft').addEventListener('click', onCancelDraft);
  $('btnTrain').addEventListener('click', onTrain);
}

async function boot() {
  wireButtons();
  await loadStaticData();
  const existing = loadSave();
  if (existing) {
    rng = mulberry32(existing.seed);
    await primeRouteContent(DATA.routes[existing.route_id]);
    gameState = existing;
  }
  render(gameState);
}

document.addEventListener('DOMContentLoaded', boot);
