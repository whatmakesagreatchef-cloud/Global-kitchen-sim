/* Menu Planner — vanilla JS, no build step, persists to localStorage. */

const STORAGE_KEY = 'menuPlannerData_v1';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

let state = loadState();
let currentWeekStart = getMonday(new Date());
let activeTab = 'plan';
let recipeSearchTerm = '';
let recipeCategoryFilterVal = '';

// ---------- persistence ----------

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load saved data, starting fresh.', e);
  }
  return seedState();
}

function seedState() {
  return {
    recipes: [
      {
        id: uid('rec'), name: 'Veggie Omelette', category: 'Breakfast', servings: 2,
        tags: ['vegetarian', 'quick'],
        ingredients: [
          { name: 'Eggs', qty: '4', unit: '' },
          { name: 'Bell pepper', qty: '1', unit: '' },
          { name: 'Spinach', qty: '1', unit: 'cup' },
          { name: 'Cheddar cheese', qty: '50', unit: 'g' }
        ],
        notes: ''
      },
      {
        id: uid('rec'), name: 'Chicken Stir-fry', category: 'Dinner', servings: 4,
        tags: ['weeknight'],
        ingredients: [
          { name: 'Chicken breast', qty: '500', unit: 'g' },
          { name: 'Broccoli', qty: '2', unit: 'cups' },
          { name: 'Soy sauce', qty: '3', unit: 'tbsp' },
          { name: 'Garlic', qty: '3', unit: 'cloves' },
          { name: 'Rice', qty: '2', unit: 'cups' }
        ],
        notes: 'Great with jasmine rice.'
      },
      {
        id: uid('rec'), name: 'Caprese Salad', category: 'Lunch', servings: 2,
        tags: ['vegetarian', 'no-cook'],
        ingredients: [
          { name: 'Tomatoes', qty: '3', unit: '' },
          { name: 'Mozzarella', qty: '200', unit: 'g' },
          { name: 'Basil', qty: '1', unit: 'bunch' },
          { name: 'Olive oil', qty: '2', unit: 'tbsp' }
        ],
        notes: ''
      },
      {
        id: uid('rec'), name: 'Hummus & Veggies', category: 'Snack', servings: 4,
        tags: ['vegan'],
        ingredients: [
          { name: 'Hummus', qty: '1', unit: 'cup' },
          { name: 'Carrots', qty: '3', unit: '' },
          { name: 'Cucumber', qty: '1', unit: '' }
        ],
        notes: ''
      }
    ],
    plans: {},
    extras: {},
    checked: {}
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- date / week helpers ----------

function pad2(n) { return String(n).padStart(2, '0'); }

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun - 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatWeekRangeLabel(monday) {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startLabel = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = sunday.toLocaleDateString(
    undefined,
    sameMonth ? { day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }
  );
  return `${startLabel} – ${endLabel}`;
}

// ---------- misc utils ----------

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function getRecipe(id) {
  return state.recipes.find((r) => r.id === id);
}

function formatIngredient(i) {
  return [i.qty, i.unit, i.name].filter(Boolean).join(' ');
}

// ---------- tabs ----------

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  setActiveTab(btn.dataset.tab);
});

function setActiveTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('is-active', p.id === 'tab-' + tab));
  renderActiveTab();
}

function renderActiveTab() {
  if (activeTab === 'plan') renderPlan();
  else if (activeTab === 'recipes') renderRecipes();
  else if (activeTab === 'shopping') renderShopping();
}

// ---------- plan tab ----------

function getWeekPlan(key) {
  if (!state.plans[key]) state.plans[key] = {};
  return state.plans[key];
}

function getSlotEntries(weekKeyStr, day, slot) {
  const plan = state.plans[weekKeyStr];
  if (!plan || !plan[day] || !plan[day][slot]) return [];
  return plan[day][slot];
}

function addSlotEntry(weekKeyStr, day, slot, recipeId, servings) {
  const plan = getWeekPlan(weekKeyStr);
  if (!plan[day]) plan[day] = {};
  if (!plan[day][slot]) plan[day][slot] = [];
  plan[day][slot].push({ recipeId, servings });
  saveState();
}

function removeSlotEntry(weekKeyStr, day, slot, index) {
  const plan = state.plans[weekKeyStr];
  if (!plan || !plan[day] || !plan[day][slot]) return;
  plan[day][slot].splice(index, 1);
  saveState();
}

function renderPlan() {
  const key = weekKey(currentWeekStart);
  document.getElementById('weekLabel').textContent = formatWeekRangeLabel(currentWeekStart);
  const table = document.getElementById('planGrid');

  let html = '<thead><tr><th></th>';
  DAYS.forEach((day, i) => {
    const date = addDays(currentWeekStart, i);
    html += `<th>${day} <span style="font-weight:400;color:var(--ink-soft)">${formatDateLabel(date)}</span></th>`;
  });
  html += '</tr></thead><tbody>';

  SLOTS.forEach((slot) => {
    html += `<tr><td class="slot-label">${slot}</td>`;
    DAYS.forEach((day) => {
      const entries = getSlotEntries(key, day, slot);
      html += '<td class="day-cell">';
      entries.forEach((entry, idx) => {
        const recipe = getRecipe(entry.recipeId);
        const name = recipe ? recipe.name : '(deleted recipe)';
        html += `<div class="meal-chip">
          <span class="chip-name">${escapeHtml(name)}${entry.servings ? ` <small>(${escapeHtml(String(entry.servings))})</small>` : ''}</span>
          <button class="remove-entry" data-day="${day}" data-slot="${slot}" data-idx="${idx}" title="Remove">&times;</button>
        </div>`;
      });
      html += `<button class="add-slot-btn" data-day="${day}" data-slot="${slot}">+ Add</button>`;
      html += '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody>';
  table.innerHTML = html;
}

document.getElementById('planGrid').addEventListener('click', (e) => {
  const addBtn = e.target.closest('.add-slot-btn');
  if (addBtn) {
    openRecipePicker(addBtn.dataset.day, addBtn.dataset.slot);
    return;
  }
  const removeBtn = e.target.closest('.remove-entry');
  if (removeBtn) {
    const key = weekKey(currentWeekStart);
    removeSlotEntry(key, removeBtn.dataset.day, removeBtn.dataset.slot, Number(removeBtn.dataset.idx));
    renderPlan();
  }
});

document.getElementById('prevWeek').addEventListener('click', () => {
  currentWeekStart = addDays(currentWeekStart, -7);
  renderPlan();
});
document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  renderPlan();
});
document.getElementById('todayWeek').addEventListener('click', () => {
  currentWeekStart = getMonday(new Date());
  renderPlan();
});

function openRecipePicker(day, slot) {
  if (state.recipes.length === 0) {
    openModal(`
      <h2>No recipes yet</h2>
      <p>Add a recipe first in the Recipes tab, then come back to plan your ${escapeHtml(slot.toLowerCase())}.</p>
      <div class="modal-actions"><button class="btn" data-close>Close</button></div>
    `);
    return;
  }
  const options = state.recipes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => `<option value="${r.id}">${escapeHtml(r.name)} (${escapeHtml(r.category)})</option>`)
    .join('');
  openModal(`
    <h2>Add to ${escapeHtml(day)} – ${escapeHtml(slot)}</h2>
    <form id="pickerForm">
      <div class="form-row">
        <label for="pickerRecipe">Recipe</label>
        <select id="pickerRecipe">${options}</select>
      </div>
      <div class="form-row">
        <label for="pickerServings">Servings</label>
        <input type="number" id="pickerServings" min="1" step="1" value="2" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Add</button>
      </div>
    </form>
  `);
  document.getElementById('pickerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const recipeId = document.getElementById('pickerRecipe').value;
    const servings = Number(document.getElementById('pickerServings').value) || 1;
    addSlotEntry(weekKey(currentWeekStart), day, slot, recipeId, servings);
    closeModal();
    renderPlan();
  });
}

// ---------- recipes tab ----------

document.getElementById('recipeSearch').addEventListener('input', (e) => {
  recipeSearchTerm = e.target.value.toLowerCase();
  renderRecipes();
});
document.getElementById('recipeCategoryFilter').addEventListener('change', (e) => {
  recipeCategoryFilterVal = e.target.value;
  renderRecipes();
});
document.getElementById('newRecipeBtn').addEventListener('click', () => openRecipeForm());

function renderRecipes() {
  const list = document.getElementById('recipeList');
  let recipes = state.recipes.slice().sort((a, b) => a.name.localeCompare(b.name));
  if (recipeCategoryFilterVal) recipes = recipes.filter((r) => r.category === recipeCategoryFilterVal);
  if (recipeSearchTerm) {
    recipes = recipes.filter(
      (r) => r.name.toLowerCase().includes(recipeSearchTerm) || r.tags.some((t) => t.toLowerCase().includes(recipeSearchTerm))
    );
  }
  if (recipes.length === 0) {
    list.innerHTML = `<div class="empty-state">${
      state.recipes.length === 0 ? 'No recipes yet. Add your first recipe to get started.' : 'No recipes match your search.'
    }</div>`;
    return;
  }
  list.innerHTML = recipes
    .map(
      (r) => `
    <div class="recipe-card">
      <h3>${escapeHtml(r.name)}</h3>
      <div class="recipe-meta">${escapeHtml(r.category)} · serves ${escapeHtml(String(r.servings))}</div>
      ${r.tags.length ? `<div class="recipe-tags">${r.tags.map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <ul class="recipe-ingredients">
        ${r.ingredients.slice(0, 4).map((i) => `<li>${escapeHtml(formatIngredient(i))}</li>`).join('')}
        ${r.ingredients.length > 4 ? `<li>+ ${r.ingredients.length - 4} more</li>` : ''}
      </ul>
      <div class="recipe-card-actions">
        <button class="btn edit-recipe" data-id="${r.id}">Edit</button>
        <button class="btn btn-danger delete-recipe" data-id="${r.id}">Delete</button>
      </div>
    </div>
  `
    )
    .join('');
}

document.getElementById('recipeList').addEventListener('click', (e) => {
  const editBtn = e.target.closest('.edit-recipe');
  if (editBtn) {
    openRecipeForm(getRecipe(editBtn.dataset.id));
    return;
  }
  const delBtn = e.target.closest('.delete-recipe');
  if (delBtn) {
    const recipe = getRecipe(delBtn.dataset.id);
    if (recipe && confirm(`Delete "${recipe.name}"? This won't remove it from weeks it's already planned in.`)) {
      state.recipes = state.recipes.filter((r) => r.id !== recipe.id);
      saveState();
      renderRecipes();
    }
  }
});

function openRecipeForm(recipe) {
  const isEdit = Boolean(recipe);
  const data = recipe || {
    name: '', category: 'Dinner', servings: 2, tags: [], ingredients: [{ name: '', qty: '', unit: '' }], notes: ''
  };

  openModal(`
    <h2>${isEdit ? 'Edit Recipe' : 'New Recipe'}</h2>
    <form id="recipeForm">
      <div class="form-row">
        <label for="rName">Name</label>
        <input type="text" id="rName" required value="${escapeHtml(data.name)}" />
      </div>
      <div class="form-row-inline">
        <div class="form-row">
          <label for="rCategory">Category</label>
          <select id="rCategory">
            ${CATEGORIES.map((c) => `<option value="${c}" ${c === data.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label for="rServings">Base servings</label>
          <input type="number" id="rServings" min="1" step="1" value="${escapeHtml(String(data.servings || 1))}" />
        </div>
      </div>
      <div class="form-row">
        <label for="rTags">Tags (comma separated)</label>
        <input type="text" id="rTags" value="${escapeHtml((data.tags || []).join(', '))}" placeholder="vegetarian, quick" />
      </div>
      <div class="form-row">
        <label>Ingredients</label>
        <div id="ingredientRows"></div>
        <button type="button" id="addIngredientRow" class="btn btn-ghost" style="align-self:flex-start;">+ Add ingredient</button>
      </div>
      <div class="form-row">
        <label for="rNotes">Notes</label>
        <textarea id="rNotes" rows="2">${escapeHtml(data.notes || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  `);

  const rowsWrap = document.getElementById('ingredientRows');
  let ingredientRows = (data.ingredients && data.ingredients.length ? data.ingredients : [{ name: '', qty: '', unit: '' }]).map((i) => ({
    ...i
  }));

  function renderIngredientRows() {
    rowsWrap.innerHTML = ingredientRows
      .map(
        (ing, idx) => `
      <div class="ingredient-row" data-idx="${idx}">
        <input type="text" class="ing-name" placeholder="Ingredient" value="${escapeHtml(ing.name)}" />
        <input type="text" class="ing-qty" placeholder="Qty" value="${escapeHtml(ing.qty)}" />
        <input type="text" class="ing-unit" placeholder="Unit" value="${escapeHtml(ing.unit)}" />
        <button type="button" class="remove-ingredient" title="Remove">&times;</button>
      </div>
    `
      )
      .join('');
  }

  function syncRowsFromDom() {
    const domRows = rowsWrap.querySelectorAll('.ingredient-row');
    domRows.forEach((row, idx) => {
      ingredientRows[idx] = {
        name: row.querySelector('.ing-name').value,
        qty: row.querySelector('.ing-qty').value,
        unit: row.querySelector('.ing-unit').value
      };
    });
  }

  renderIngredientRows();

  rowsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-ingredient');
    if (!btn) return;
    syncRowsFromDom();
    const idx = Number(btn.closest('.ingredient-row').dataset.idx);
    ingredientRows.splice(idx, 1);
    if (ingredientRows.length === 0) ingredientRows.push({ name: '', qty: '', unit: '' });
    renderIngredientRows();
  });

  document.getElementById('addIngredientRow').addEventListener('click', () => {
    syncRowsFromDom();
    ingredientRows.push({ name: '', qty: '', unit: '' });
    renderIngredientRows();
  });

  document.getElementById('recipeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    syncRowsFromDom();
    const name = document.getElementById('rName').value.trim();
    if (!name) return;
    const ingredients = ingredientRows
      .map((i) => ({ name: i.name.trim(), qty: i.qty.trim(), unit: i.unit.trim() }))
      .filter((i) => i.name);
    const tags = document
      .getElementById('rTags')
      .value.split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      name,
      category: document.getElementById('rCategory').value,
      servings: Number(document.getElementById('rServings').value) || 1,
      tags,
      ingredients,
      notes: document.getElementById('rNotes').value.trim()
    };
    if (isEdit) {
      Object.assign(recipe, payload);
    } else {
      state.recipes.push({ id: uid('rec'), ...payload });
    }
    saveState();
    closeModal();
    renderRecipes();
  });
}

// ---------- shopping list tab ----------

function parseQty(qty) {
  if (!qty) return null;
  const str = String(qty).trim();
  if (/^\d+\/\d+$/.test(str)) {
    const [a, b] = str.split('/').map(Number);
    return b ? a / b : null;
  }
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const a = Number(mixed[2]);
    const b = Number(mixed[3]);
    return b ? whole + a / b : null;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function formatQtyNumber(n) {
  return String(Math.round(n * 100) / 100);
}

function buildShoppingItems(weekKeyStr) {
  const plan = state.plans[weekKeyStr] || {};
  const aggregated = new Map();

  DAYS.forEach((day) => {
    SLOTS.forEach((slot) => {
      const entries = (plan[day] && plan[day][slot]) || [];
      entries.forEach((entry) => {
        const recipe = getRecipe(entry.recipeId);
        if (!recipe) return;
        const scale = entry.servings && recipe.servings ? entry.servings / recipe.servings : 1;
        recipe.ingredients.forEach((ing) => {
          const unit = (ing.unit || '').trim();
          const key = 'r:' + ing.name.trim().toLowerCase() + '|' + unit.toLowerCase();
          const parsed = parseQty(ing.qty);
          if (!aggregated.has(key)) {
            aggregated.set(key, { key, name: ing.name.trim(), unit, qty: 0, hasNumeric: false, textParts: [], sources: new Set() });
          }
          const item = aggregated.get(key);
          item.sources.add(recipe.name);
          if (parsed !== null) {
            item.qty += parsed * scale;
            item.hasNumeric = true;
          } else if (ing.qty) {
            item.textParts.push(ing.qty.trim());
          }
        });
      });
    });
  });

  const extras = state.extras[weekKeyStr] || [];
  extras.forEach((extra) => {
    const parsed = parseQty(extra.qty);
    aggregated.set('e:' + extra.id, {
      key: 'e:' + extra.id,
      name: extra.name,
      unit: extra.unit || '',
      qty: parsed || 0,
      hasNumeric: parsed !== null,
      textParts: parsed === null && extra.qty ? [extra.qty] : [],
      sources: new Set(['Added manually']),
      isExtra: true,
      extraId: extra.id
    });
  });

  return Array.from(aggregated.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function describeQty(item) {
  const parts = [];
  if (item.hasNumeric && item.qty > 0) parts.push(formatQtyNumber(item.qty) + (item.unit ? ' ' + item.unit : ''));
  if (item.textParts.length) parts.push(item.textParts.join(' + '));
  return parts.join(', ') || item.unit || '';
}

function renderShopping() {
  const key = weekKey(currentWeekStart);
  document.getElementById('shoppingWeekLabel').textContent = 'Shopping list for ' + formatWeekRangeLabel(currentWeekStart);
  const items = buildShoppingItems(key);
  const checkedMap = state.checked[key] || {};
  const list = document.getElementById('shoppingList');

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-state" style="border:none;">Nothing planned yet. Add meals in the Plan tab or extra items below.</li>';
    return;
  }

  list.innerHTML = items
    .map((item) => {
      const qtyLabel = describeQty(item);
      const isChecked = Boolean(checkedMap[item.key]);
      return `
      <li class="${isChecked ? 'checked' : ''}" data-key="${escapeHtml(item.key)}">
        <input type="checkbox" class="item-check" data-key="${escapeHtml(item.key)}" ${isChecked ? 'checked' : ''} />
        <span class="qty">${escapeHtml(qtyLabel)}</span>
        <span class="name">${escapeHtml(item.name)}</span>
        <span class="src">${item.isExtra ? 'manual' : escapeHtml(Array.from(item.sources).join(', '))}</span>
        ${item.isExtra ? `<button class="remove-extra" data-id="${item.extraId}" title="Remove item">&times;</button>` : ''}
      </li>
    `;
    })
    .join('');
}

document.getElementById('shoppingList').addEventListener('click', (e) => {
  const check = e.target.closest('.item-check');
  if (check) {
    const key = weekKey(currentWeekStart);
    if (!state.checked[key]) state.checked[key] = {};
    state.checked[key][check.dataset.key] = check.checked;
    saveState();
    check.closest('li').classList.toggle('checked', check.checked);
    return;
  }
  const removeBtn = e.target.closest('.remove-extra');
  if (removeBtn) {
    const key = weekKey(currentWeekStart);
    state.extras[key] = (state.extras[key] || []).filter((x) => x.id !== removeBtn.dataset.id);
    saveState();
    renderShopping();
  }
});

document.getElementById('addExtraForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const key = weekKey(currentWeekStart);
  const name = document.getElementById('extraName').value.trim();
  if (!name) return;
  const qty = document.getElementById('extraQty').value.trim();
  const unit = document.getElementById('extraUnit').value.trim();
  if (!state.extras[key]) state.extras[key] = [];
  state.extras[key].push({ id: uid('extra'), name, qty, unit });
  saveState();
  e.target.reset();
  renderShopping();
});

document.getElementById('clearCheckedBtn').addEventListener('click', () => {
  const key = weekKey(currentWeekStart);
  state.checked[key] = {};
  saveState();
  renderShopping();
});

document.getElementById('printListBtn').addEventListener('click', () => {
  const panel = document.getElementById('tab-shopping');
  panel.classList.add('print-target');
  window.print();
  setTimeout(() => panel.classList.remove('print-target'), 500);
});

// ---------- modal ----------

function openModal(innerHtml) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal">${innerHtml}</div></div>`;
  root.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
}

// ---------- export / import ----------

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `menu-planner-export-${weekKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.recipes)) throw new Error('Invalid file format');
      state = {
        recipes: parsed.recipes || [],
        plans: parsed.plans || {},
        extras: parsed.extras || {},
        checked: parsed.checked || {}
      };
      saveState();
      renderActiveTab();
      alert('Import complete.');
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ---------- init ----------

renderActiveTab();
