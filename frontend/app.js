/* ─────────────────────────────────────────────────────────────
   CHEF — Smart Food Assistant — Frontend Logic
   Vanilla JS SPA — no build tools, no framework
   ───────────────────────────────────────────────────────────── */

const API = '';  // same origin — backend serves frontend

// ── Navigation ────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        // Update nav
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Show page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) {
            target.classList.add('active');
        }
        // Load saved recipes when switching to that tab
        if (page === 'saved') loadSavedRecipes();
    });
});


// ── Status Bar ────────────────────────────────────────────────
function showStatus(msg, type = 'info') {
    const bar = document.getElementById('status-bar');
    const text = document.getElementById('status-text');
    text.textContent = msg;
    bar.className = 'status-bar visible ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
    clearTimeout(bar._timeout);
    bar._timeout = setTimeout(() => {
        bar.className = 'status-bar';
    }, 3500);
}


// ── API Helpers ───────────────────────────────────────────────
async function apiPost(path, body) {
    const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
    }
    return res.json();
}

async function apiGet(path) {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
    }
    return res.json();
}

async function apiDelete(path) {
    const res = await fetch(`${API}${path}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
    }
    return res.json();
}

function setLoading(btn, loading) {
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}


// ═══════════════════════════════════════════════════════════════
// INGREDIENTS PAGE
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-parse').addEventListener('click', async () => {
    const text = document.getElementById('ingredient-input').value.trim();
    if (!text) {
        showStatus('Please enter some ingredients first', 'error');
        return;
    }

    const btn = document.getElementById('btn-parse');
    setLoading(btn, true);

    try {
        const data = await apiPost('/api/ingredients/parse', { text });
        renderIngredientResults(data);
        showStatus(`Parsed ${data.ingredients.length} ingredient(s)`, 'success');
    } catch (e) {
        showStatus(e.message, 'error');
    } finally {
        setLoading(btn, false);
    }
});

function renderIngredientResults(data) {
    const container = document.getElementById('parse-results');
    if (!data.ingredients.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🤷</span>
                <p>No ingredients found. Try something like "2 cups flour, 3 eggs"</p>
            </div>`;
        return;
    }

    let html = `
        <table class="ingredient-table">
            <thead>
                <tr>
                    <th>Ingredient</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Raw Text</th>
                </tr>
            </thead>
            <tbody>`;

    for (const ing of data.ingredients) {
        html += `
                <tr>
                    <td class="ingredient-name">${esc(ing.name)}</td>
                    <td>${ing.quantity !== null ? ing.quantity : '—'}</td>
                    <td>${ing.unit ? esc(ing.unit) : '—'}</td>
                    <td>${esc(ing.raw_text)}</td>
                </tr>`;
    }

    html += `
            </tbody>
        </table>`;

    if (data.ingredient_names.length) {
        html += `
        <div class="search-from-parsed">
            <button class="btn-secondary" onclick="searchFromParsed()">
                🍽️ Find recipes with these ingredients
            </button>
        </div>`;
    }

    container.innerHTML = html;

    // Store for recipe search
    window._parsedIngredients = data.ingredient_names;
}

function searchFromParsed() {
    if (!window._parsedIngredients?.length) return;
    // Switch to recipes page
    document.getElementById('nav-recipes').click();
    // Fill in ingredients
    document.getElementById('recipe-ingredients').value = window._parsedIngredients.join(', ');
    // Trigger search
    document.getElementById('btn-search').click();
}


// ═══════════════════════════════════════════════════════════════
// RECIPES PAGE
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-search').addEventListener('click', async () => {
    const raw = document.getElementById('recipe-ingredients').value.trim();
    if (!raw) {
        showStatus('Enter some ingredients to search', 'error');
        return;
    }

    const ingredients = raw.split(',').map(s => s.trim()).filter(Boolean);
    const diet = document.getElementById('filter-diet').value || null;
    const maxCalRaw = document.getElementById('filter-max-cal').value;
    const maxTimeRaw = document.getElementById('filter-max-time').value;
    const max_calories = maxCalRaw ? parseInt(maxCalRaw) : null;
    const max_time = maxTimeRaw ? parseInt(maxTimeRaw) : null;

    const btn = document.getElementById('btn-search');
    setLoading(btn, true);

    try {
        const body = { ingredients, max_results: 10 };
        if (diet) body.diet = diet;
        if (max_calories) body.max_calories = max_calories;
        if (max_time) body.max_time = max_time;

        const data = await apiPost('/api/recipes/search', body);
        renderRecipeResults(data);
        const constraintMsg = data.constraints_applied?.length
            ? ` (constraints: ${data.constraints_applied.join(', ')})`
            : '';
        showStatus(`Found ${data.total} recipe(s) from ${data.source} data${constraintMsg}`, 'success');
    } catch (e) {
        showStatus(e.message, 'error');
    } finally {
        setLoading(btn, false);
    }
});

// Allow Enter key to trigger search
document.getElementById('recipe-ingredients').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-search').click();
});

function renderRecipeResults(data) {
    const container = document.getElementById('recipe-results');
    if (!data.recipes.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🍳</span>
                <p>No matching recipes found. Try different ingredients or relax your constraints.</p>
            </div>`;
        return;
    }

    let badgesHtml = `<span class="source-badge">Source: ${esc(data.source)} data · ${data.total} result(s)</span>`;
    if (data.constraints_applied?.length) {
        badgesHtml += data.constraints_applied.map(c =>
            `<span class="constraints-badge">⚙️ ${esc(c)}</span>`
        ).join('');
    }

    let html = `${badgesHtml}<div class="recipe-grid">`;

    for (const recipe of data.recipes) {
        const matchPct = Math.round(recipe.match_score * 100);
        const cal = recipe.nutrition?.calories ? `${recipe.nutrition.calories} kcal` : '';
        const time = recipe.ready_in_minutes ? `${recipe.ready_in_minutes} min` : '';
        const servings = recipe.servings ? `${recipe.servings} servings` : '';
        const dietTags = (recipe.diets || []).map(d =>
            `<span class="diet-tag">${esc(d)}</span>`
        ).join('');

        html += `
            <div class="recipe-card" style="animation-delay: ${data.recipes.indexOf(recipe) * 0.06}s">
                ${recipe.image_url ? `<img class="recipe-image" src="${esc(recipe.image_url)}" alt="${esc(recipe.title)}" loading="lazy" onerror="this.style.display='none'">` : ''}
                <div class="recipe-info">
                    <div class="recipe-title">${esc(recipe.title)}</div>
                    ${recipe.summary ? `<div class="recipe-summary">${esc(recipe.summary)}</div>` : ''}
                    ${dietTags ? `<div class="diet-tags">${dietTags}</div>` : ''}
                    <div class="recipe-meta">
                        ${matchPct > 0 ? `<span class="match-badge">${matchPct}% match</span>` : ''}
                        ${time ? `<span class="recipe-meta-item">⏱️ <span class="value">${time}</span></span>` : ''}
                        ${cal ? `<span class="recipe-meta-item">🔥 <span class="value">${cal}</span></span>` : ''}
                        ${servings ? `<span class="recipe-meta-item">🍽️ <span class="value">${servings}</span></span>` : ''}
                    </div>
                    <div class="recipe-actions">
                        <button class="btn-secondary" onclick='showRecipeDetail(${esc(JSON.stringify(recipe), true)})'>View Details</button>
                        <button class="btn-secondary" onclick='saveRecipe(${esc(JSON.stringify(recipe), true)})'>💾 Save</button>
                    </div>
                </div>
            </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function showRecipeDetail(recipe) {
    const ingList = (recipe.ingredients || []).map(i => `<li>${esc(i)}</li>`).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            <h2 class="modal-title">${esc(recipe.title)}</h2>
            ${recipe.summary ? `<p style="color:var(--text-secondary);font-size:14px">${esc(recipe.summary)}</p>` : ''}

            ${ingList ? `
            <div class="modal-section">
                <h3>Ingredients</h3>
                <ul>${ingList}</ul>
            </div>` : ''}

            ${recipe.instructions ? `
            <div class="modal-section">
                <h3>Instructions</h3>
                <p class="instructions-text">${esc(recipe.instructions)}</p>
            </div>` : ''}

            ${recipe.nutrition ? `
            <div class="modal-section">
                <h3>Nutrition</h3>
                <div class="nutrition-grid" style="margin-top:8px">
                    <div class="nutrient-box">
                        <div class="nutrient-value calories">${recipe.nutrition.calories}<span class="nutrient-unit"> kcal</span></div>
                        <div class="nutrient-label">Calories</div>
                    </div>
                    <div class="nutrient-box">
                        <div class="nutrient-value">${recipe.nutrition.protein_g}<span class="nutrient-unit">g</span></div>
                        <div class="nutrient-label">Protein</div>
                    </div>
                    <div class="nutrient-box">
                        <div class="nutrient-value">${recipe.nutrition.carbs_g}<span class="nutrient-unit">g</span></div>
                        <div class="nutrient-label">Carbs</div>
                    </div>
                    <div class="nutrient-box">
                        <div class="nutrient-value">${recipe.nutrition.fat_g}<span class="nutrient-unit">g</span></div>
                        <div class="nutrient-label">Fat</div>
                    </div>
                </div>
            </div>` : ''}
        </div>`;

    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
}

async function saveRecipe(recipe) {
    try {
        await apiPost('/api/recipes/save', {
            title: recipe.title,
            image_url: recipe.image_url || null,
            summary: recipe.summary || null,
            ingredients: (recipe.ingredients || []).join(', '),
            instructions: recipe.instructions || null,
            calories: recipe.nutrition?.calories || null,
            protein_g: recipe.nutrition?.protein_g || null,
            carbs_g: recipe.nutrition?.carbs_g || null,
            fat_g: recipe.nutrition?.fat_g || null,
            ready_in_minutes: recipe.ready_in_minutes || null,
            servings: recipe.servings || null,
        });
        showStatus(`"${recipe.title}" saved!`, 'success');
    } catch (e) {
        showStatus(e.message, 'error');
    }
}


// ═══════════════════════════════════════════════════════════════
// NUTRITION PAGE
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-nutrition').addEventListener('click', async () => {
    const food = document.getElementById('nutrition-food').value.trim();
    if (!food) {
        showStatus('Enter a food item to analyze', 'error');
        return;
    }
    const qty = parseFloat(document.getElementById('nutrition-qty').value) || 1;
    const btn = document.getElementById('btn-nutrition');
    setLoading(btn, true);

    try {
        const data = await apiPost('/api/nutrition/analyze', { food_item: food, quantity: qty });
        renderNutritionResults(data);
    } catch (e) {
        showStatus(e.message, 'error');
    } finally {
        setLoading(btn, false);
    }
});

document.getElementById('nutrition-food').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-nutrition').click();
});

function renderNutritionResults(data) {
    const container = document.getElementById('nutrition-results');
    container.innerHTML = `
        <div class="nutrition-card">
            <div class="nutrition-header">${esc(data.food_item)}</div>
            <div class="nutrition-source">
                ${data.quantity} ${esc(data.unit)} · Source: ${esc(data.source)}
            </div>
            <div class="nutrition-grid">
                <div class="nutrient-box">
                    <div class="nutrient-value calories">${data.calories}<span class="nutrient-unit"> kcal</span></div>
                    <div class="nutrient-label">Calories</div>
                </div>
                <div class="nutrient-box">
                    <div class="nutrient-value">${data.protein_g}<span class="nutrient-unit">g</span></div>
                    <div class="nutrient-label">Protein</div>
                </div>
                <div class="nutrient-box">
                    <div class="nutrient-value">${data.carbs_g}<span class="nutrient-unit">g</span></div>
                    <div class="nutrient-label">Carbs</div>
                </div>
                <div class="nutrient-box">
                    <div class="nutrient-value">${data.fat_g}<span class="nutrient-unit">g</span></div>
                    <div class="nutrient-label">Fat</div>
                </div>
                ${data.fiber_g !== null ? `
                <div class="nutrient-box">
                    <div class="nutrient-value">${data.fiber_g}<span class="nutrient-unit">g</span></div>
                    <div class="nutrient-label">Fiber</div>
                </div>` : ''}
                ${data.sugar_g !== null ? `
                <div class="nutrient-box">
                    <div class="nutrient-value">${data.sugar_g}<span class="nutrient-unit">g</span></div>
                    <div class="nutrient-label">Sugar</div>
                </div>` : ''}
            </div>
        </div>`;
}


// ═══════════════════════════════════════════════════════════════
// DETECTION PAGE
// ═══════════════════════════════════════════════════════════════

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('detection-file');
const btnDetect = document.getElementById('btn-detect');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        onFileSelected();
    }
});

fileInput.addEventListener('change', onFileSelected);

function onFileSelected() {
    const file = fileInput.files[0];
    if (file) {
        document.getElementById('selected-file').textContent = `Selected: ${file.name}`;
        btnDetect.disabled = false;
    }
}

btnDetect.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    setLoading(btnDetect, true);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API}/api/detect/image`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`Detection failed (${res.status})`);
        const data = await res.json();
        renderDetectionResults(data);
        showStatus(data.message, data.detected_foods.length ? 'success' : 'info');
    } catch (e) {
        showStatus(e.message, 'error');
    } finally {
        setLoading(btnDetect, false);
    }
});

function renderDetectionResults(data) {
    const container = document.getElementById('detection-results');

    if (!data.detected_foods.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <p>${esc(data.message)}</p>
            </div>`;
        return;
    }

    let html = `
        <div class="detection-card">
            <div style="margin-bottom:16px;font-size:13px;color:var(--text-muted)">
                Method: ${esc(data.method)}
            </div>`;

    for (const food of data.detected_foods) {
        const pct = Math.round(food.confidence * 100);
        html += `
            <div class="detection-item">
                <span style="font-size:24px">🥘</span>
                <span class="detection-label">${esc(food.label)}</span>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width:${pct}%"></div>
                </div>
                <span class="confidence-text">${pct}%</span>
            </div>`;
    }

    if (data.ingredients.length) {
        html += `
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-glass)">
                <button class="btn-secondary" onclick="searchDetectedIngredients(${esc(JSON.stringify(data.ingredients), true)})">
                    🍽️ Find recipes with ${data.ingredients.join(', ')}
                </button>
            </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function searchDetectedIngredients(ingredients) {
    document.getElementById('nav-recipes').click();
    document.getElementById('recipe-ingredients').value = ingredients.join(', ');
    document.getElementById('btn-search').click();
}


// ═══════════════════════════════════════════════════════════════
// SAVED RECIPES PAGE
// ═══════════════════════════════════════════════════════════════

async function loadSavedRecipes() {
    const container = document.getElementById('saved-results');
    try {
        const recipes = await apiGet('/api/recipes/saved');
        if (!recipes.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📚</span>
                    <p>No saved recipes yet. Search for recipes and save your favorites!</p>
                </div>`;
            return;
        }

        let html = '<div class="recipe-grid">';
        for (const r of recipes) {
            html += `
                <div class="recipe-card">
                    <div class="recipe-info">
                        <div class="recipe-title">${esc(r.title)}</div>
                        ${r.summary ? `<div class="recipe-summary">${esc(r.summary)}</div>` : ''}
                        <div class="recipe-meta">
                            ${r.calories ? `<span class="recipe-meta-item">🔥 <span class="value">${r.calories} kcal</span></span>` : ''}
                            ${r.ready_in_minutes ? `<span class="recipe-meta-item">⏱️ <span class="value">${r.ready_in_minutes} min</span></span>` : ''}
                        </div>
                        <div class="recipe-actions">
                            <button class="btn-danger" onclick="deleteSavedRecipe(${r.id})">🗑️ Remove</button>
                        </div>
                    </div>
                </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (e) {
        showStatus(e.message, 'error');
    }
}

async function deleteSavedRecipe(id) {
    try {
        await apiDelete(`/api/recipes/saved/${id}`);
        showStatus('Recipe removed', 'success');
        loadSavedRecipes();
    } catch (e) {
        showStatus(e.message, 'error');
    }
}


// ── Utility ───────────────────────────────────────────────────
function esc(str, forAttr = false) {
    if (typeof str !== 'string') str = String(str ?? '');
    const div = document.createElement('div');
    div.textContent = str;
    let result = div.innerHTML;
    if (forAttr) {
        result = result.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }
    return result;
}
