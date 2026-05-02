/* INDEX dashboard frontend.
   Hero summary card up top, form hidden by default. Results grouped by
   decision_stage; each criterion card collapses to a single row. */

const state = {
    routes: [],
    selectedRouteId: null,
    exampleCandidate: null,
    rawJsonVisible: false,
    formVisible: false,
    lastRun: null,
};

const STAGE_ORDER = ["eligibility", "validity", "suitability", "decision", "post_decision"];

const els = {};
function $(id) { return document.getElementById(id); }

async function init() {
    Object.assign(els, {
        routeList: $("route-list"), routeTitle: $("route-title"), routeSubtitle: $("route-subtitle"),
        profileForm: $("profile-form"), profileHero: $("profile-hero"),
        heroName: $("hero-name"), heroSummary: $("hero-summary"),
        btnLoadExample: $("btn-load-example"),
        btnScore: $("btn-score"), btnNew: $("btn-new"),
        btnToggleForm: $("btn-toggle-form"), btnCloseForm: $("btn-close-form"),
        btnToggleJson: $("btn-toggle-json"), jsonPanel: $("json-panel"), jsonOutput: $("json-output"),
        search: $("search"), results: $("results-area"),
    });
    bindEvents();
    await Promise.all([loadRoutes(), loadExample()]);
    fillFormFromCandidate(state.exampleCandidate);
    updateHero();
    const firstLive = state.routes.find((r) => r.enabled && r.criteria_count > 0)
        || state.routes.find((r) => r.enabled)
        || state.routes[0];
    if (firstLive) selectRoute(firstLive.id);
    renderRouteList();
    renderEmptyResults();
}

function bindEvents() {
    els.btnLoadExample.addEventListener("click", () => {
        fillFormFromCandidate(state.exampleCandidate);
        updateHero();
        refreshJsonPreview();
    });
    els.profileForm.addEventListener("submit", (e) => { e.preventDefault(); runScoring(); });
    els.profileForm.addEventListener("input", () => { updateHero(); refreshJsonPreview(); });
    els.profileForm.addEventListener("change", () => { updateHero(); refreshJsonPreview(); });
    els.btnScore.addEventListener("click", runScoring);
    els.btnNew.addEventListener("click", () => {
        renderEmptyResults();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.btnToggleForm.addEventListener("click", () => setFormVisible(!state.formVisible));
    els.btnCloseForm.addEventListener("click", () => setFormVisible(false));
    els.btnToggleJson.addEventListener("click", () => {
        state.rawJsonVisible = !state.rawJsonVisible;
        els.jsonPanel.hidden = !state.rawJsonVisible;
        els.btnToggleJson.textContent = state.rawJsonVisible ? "Hide raw JSON" : "View raw JSON";
        if (state.rawJsonVisible) refreshJsonPreview();
    });
    els.search.addEventListener("input", renderRouteList);
}

function setFormVisible(v) {
    state.formVisible = v;
    els.profileForm.hidden = !v;
    els.btnToggleForm.textContent = v ? "Hide profile editor" : "Edit profile";
    if (v) els.profileForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadRoutes() {
    const r = await fetch("/api/routes");
    state.routes = await r.json();
}

async function loadExample() {
    const r = await fetch("/api/candidate/example");
    state.exampleCandidate = await r.json();
}

/* form <-> candidate ---------------------------------------------- */

function fillFormFromCandidate(candidate) {
    if (!candidate) return;
    const flat = flatten(candidate);
    for (const [key, value] of Object.entries(flat)) {
        const el = els.profileForm.querySelector(`[name="${cssEscape(key)}"]`);
        if (!el) continue;
        if (el.type === "checkbox") el.checked = !!value;
        else if (value == null) el.value = "";
        else el.value = String(value);
    }
    const fullName = els.profileForm.querySelector('[name="full_name"]');
    if (fullName) fullName.value = candidate.full_name || "";
}

function buildCandidateFromForm() {
    return {
        candidate_id: state.exampleCandidate?.candidate_id || `web-${Date.now()}`,
        full_name: getValue("full_name") || "Applicant",
        intended_route: getValue("intended_route") || state.selectedRouteId,
        endorsement: {
            endorsing_body: getValue("endorsement.endorsing_body") || null,
            letter_issued_date: getValue("endorsement.letter_issued_date") || null,
            letter_received_application_date: getValue("endorsement.letter_received_application_date") || null,
            withdrawn: getChecked("endorsement.withdrawn"),
            endorsement_path: getValue("endorsement.endorsement_path") || null,
            endorsement_letter_states_innovative_viable_scalable: getChecked("endorsement.endorsement_letter_states_innovative_viable_scalable"),
            endorsement_letter_describes_how_requirements_met: getChecked("endorsement.endorsement_letter_describes_how_requirements_met"),
        },
        business: {
            stage: getValue("business.stage") || null,
            founded: getValue("business.founded") || null,
            applicant_role: getValue("business.applicant_role") || null,
            applicant_active_in_day_to_day_management: getChecked("business.applicant_active_in_day_to_day_management"),
            investment_to_date_gbp: getNumber("business.investment_to_date_gbp"),
            annual_revenue_gbp: getNumber("business.annual_revenue_gbp"),
            customers_count: getNumber("business.customers_count"),
            ip_filings: getNumber("business.ip_filings"),
            full_time_jobs_for_settled_workers: getNumber("business.full_time_jobs_for_settled_workers"),
        },
        english_language: {
            level: getValue("english_language.level") || null,
            evidence_type: getValue("english_language.evidence_type") || null,
            score_overall: getNumber("english_language.score_overall"),
            test_date: getValue("english_language.test_date") || null,
        },
        finance: {
            personal_funds_gbp: getNumber("finance.personal_funds_gbp"),
            held_for_at_least_28_days: getChecked("finance.held_for_at_least_28_days"),
        },
        documents_in_english_or_welsh: getChecked("documents_in_english_or_welsh"),
        absences_from_uk_days_last_12_months: getNumber("absences_from_uk_days_last_12_months"),
        suitability_concerns: state.exampleCandidate?.suitability_concerns ?? null,
        previous_visa_history: state.exampleCandidate?.previous_visa_history ?? [],
    };
}

function getValue(name) { const el = els.profileForm.querySelector(`[name="${cssEscape(name)}"]`); return el ? el.value : ""; }
function getNumber(name) { const v = getValue(name); if (v === "" || v == null) return null; const n = Number(v); return Number.isNaN(n) ? null : n; }
function getChecked(name) { const el = els.profileForm.querySelector(`[name="${cssEscape(name)}"]`); return !!(el && el.checked); }

function flatten(obj, prefix = "") {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
        else out[key] = v;
    }
    return out;
}
function cssEscape(s) { return String(s).replace(/(["\\])/g, "\\$1"); }

function refreshJsonPreview() {
    if (!state.rawJsonVisible) return;
    els.jsonOutput.value = JSON.stringify(buildCandidateFromForm(), null, 2);
}

/* hero summary ---------------------------------------------------- */

function updateHero() {
    const c = buildCandidateFromForm();
    els.heroName.textContent = c.full_name || "Applicant";

    const facts = [];
    if (c.endorsement?.endorsing_body) {
        const path = c.endorsement.endorsement_path === "same_business" ? "Same business" : "New business";
        facts.push(`Endorsed by <strong>${escapeHtml(c.endorsement.endorsing_body)}</strong> · ${escapeHtml(path)}`);
    } else {
        facts.push(`<span style="color:var(--pill-low-fg)">No endorsement</span>`);
    }

    const businessBits = [];
    if (c.business?.stage) businessBits.push(escapeHtml(c.business.stage.replace("_", " ")));
    if (c.business?.applicant_role) businessBits.push(escapeHtml(c.business.applicant_role));
    if (c.business?.investment_to_date_gbp != null) businessBits.push(`£${c.business.investment_to_date_gbp.toLocaleString()} invested`);
    if (c.business?.customers_count != null) businessBits.push(`${c.business.customers_count} customers`);
    if (businessBits.length) facts.push(businessBits.join(" · "));

    if (c.english_language?.level) {
        const lvl = c.english_language.level === "native" ? "Native English" : c.english_language.level;
        const score = c.english_language.score_overall != null ? ` (IELTS ${c.english_language.score_overall})` : "";
        facts.push(`English ${escapeHtml(lvl)}${score}`);
    }
    if (c.finance?.personal_funds_gbp != null) {
        facts.push(`Personal funds £${c.finance.personal_funds_gbp.toLocaleString()}`);
    }

    els.heroSummary.innerHTML = facts.map((f) => `<span class="hero-fact">${f}</span>`).join('<span class="hero-divider">·</span>');
}

/* sidebar / routing ----------------------------------------------- */

function renderRouteList() {
    const q = els.search.value.trim().toLowerCase();
    els.routeList.innerHTML = "";
    state.routes
        .filter((r) => !q || r.name.toLowerCase().includes(q))
        .forEach((r) => {
            const live = r.enabled && r.criteria_count > 0;
            const btn = document.createElement("button");
            btn.className =
                "route-item"
                + (r.id === state.selectedRouteId ? " active" : "")
                + (!r.enabled ? " disabled" : "")
                + (live ? " live" : "");
            btn.disabled = !r.enabled;
            const meta = live ? `${r.criteria_count} criteria · ${r.document_version || "version unknown"}` : (r.enabled ? "no criteria yet" : "coming soon");
            btn.innerHTML = `
                <span class="pill">${live ? "live" : (r.enabled ? "ready" : "soon")}</span>
                <span class="route-name">${escapeHtml(r.name)}</span>
                <span class="route-meta">${escapeHtml(meta)}</span>
            `;
            if (r.enabled) btn.addEventListener("click", () => selectRoute(r.id));
            els.routeList.appendChild(btn);
        });
}

function selectRoute(routeId) {
    state.selectedRouteId = routeId;
    const r = state.routes.find((x) => x.id === routeId);
    if (!r) return;
    els.routeTitle.textContent = r.name;
    els.routeSubtitle.textContent = r.document_version
        ? `Live caseworker guidance · ${r.document_version} · ${r.criteria_count} assessable criteria`
        : "No documents stored for this route yet.";
    renderRouteList();
}

/* scoring --------------------------------------------------------- */

async function runScoring() {
    if (!state.selectedRouteId) { renderError("Pick a route from the sidebar first."); return; }
    const candidate = buildCandidateFromForm();
    els.btnScore.disabled = true;
    els.btnScore.textContent = "Scoring…";
    try {
        await streamScoring(candidate);
    } catch (e) {
        renderError("Scoring failed: " + e.message);
    } finally {
        els.btnScore.disabled = false;
        els.btnScore.textContent = "Run assessment →";
    }
}

async function streamScoring(candidate) {
    const resp = await fetch("/api/score/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_id: state.selectedRouteId, candidate }),
    });
    if (!resp.ok) {
        const detail = await safeJson(resp);
        throw new Error(detail?.detail || `HTTP ${resp.status}`);
    }
    const collected = [];
    let total = 0, cached = 0, cold = 0, summary = null;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    initStreamingUI();
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line);
            if (ev.event === "start") {
                total = ev.total; cached = ev.cached; cold = ev.cold;
                state.lastRun = { total, cached, cold, startedAt: Date.now() };
                updateProgress(0, total, cold);
            } else if (ev.event === "result") {
                collected.push(ev.result);
                updateProgress(collected.length, total, cold);
            } else if (ev.event === "end") {
                summary = ev.summary;
            }
        }
    }
    finalizeStreamingUI(collected, summary);
}

function initStreamingUI() {
    els.results.innerHTML = `
        <div class="scoring-progress" id="progress">
            <span class="spinner"></span>
            <span id="progress-text">Starting…</span>
        </div>`;
    els.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateProgress(done, total, coldCount) {
    const t = $("progress-text");
    if (!t) return;
    if (done >= total) {
        t.textContent = `Scored ${total} criteria.`;
    } else {
        const note = coldCount === 0 ? "from cache" : `${coldCount} live with Claude`;
        t.textContent = `Scored ${done} of ${total} (${note})…`;
    }
}

function finalizeStreamingUI(results, summary) {
    const progress = $("progress");
    if (progress) progress.remove();

    const route = state.routes.find((r) => r.id === state.selectedRouteId);
    const candidate = buildCandidateFromForm();
    const generatedDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

    // Insert print-only header at the very top of the workspace, footer at the bottom.
    // This places them outside results-area so the cover comes BEFORE the profile.
    const wsInner = document.querySelector(".workspace-inner");
    wsInner.querySelectorAll(":scope > .print-header, :scope > .print-footer").forEach((n) => n.remove());

    const header = document.createElement("div");
    header.className = "print-header print-only";
    header.innerHTML = `
        <div class="print-brand">
            <svg class="print-logo" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="3" fill="#1F5BD9"/>
                <path d="M9 16a7 7 0 0 1 14 0" stroke="#1F5BD9" stroke-width="2" fill="none" stroke-linecap="round"/>
                <path d="M5 16a11 11 0 0 1 22 0" stroke="#4A8DEE" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
            </svg>
            <span class="print-wordmark">index</span>
            <span class="print-powered">POWERED BY glomotec®</span>
        </div>
        <div class="print-meta">
            <div class="print-meta-row"><span>Assessment</span><strong>${escapeHtml(route?.name || "")}</strong></div>
            <div class="print-meta-row"><span>Applicant</span><strong>${escapeHtml(candidate.full_name || "Applicant")}</strong></div>
            <div class="print-meta-row"><span>Source</span><strong>${escapeHtml(route?.document_version || "")}</strong></div>
            <div class="print-meta-row"><span>Generated</span><strong>${escapeHtml(generatedDate)}</strong></div>
        </div>`;
    wsInner.insertBefore(header, wsInner.firstChild);

    const footer = document.createElement("div");
    footer.className = "print-footer print-only";
    footer.innerHTML = `
        <div class="print-footer-brand">
            <svg class="print-footer-logo" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="3" fill="#1F5BD9"/>
                <path d="M9 16a7 7 0 0 1 14 0" stroke="#1F5BD9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            </svg>
            <span>glomotec INDEX</span>
        </div>
        <div class="print-footer-text">
            Generated from live UK Home Office caseworker guidance. This is a probabilistic triage assessment, not immigration advice.
        </div>`;
    wsInner.appendChild(footer);

    const verdictHtml = renderVerdictCard(results, summary);
    const breakdownHtml = renderStageBreakdown(results);
    const insightsHtml = renderInsightsPanel(results);
    const filterHtml = renderFilterBar(results);
    const groupedHtml = renderGroupedResults(results);
    const tabsHtml = renderTabs(results);
    els.results.innerHTML = verdictHtml + tabsHtml + `
        <div class="tab-panel" data-panel="summary">
            ${insightsHtml}
            ${breakdownHtml}
        </div>
        <div class="tab-panel" data-panel="criteria" hidden>
            ${filterHtml}
            ${groupedHtml}
        </div>`;

    bindCardToggles();
    bindFilterChips();
    bindInsightLinks();
    bindTabs();
    runCounterUps();
    const printBtn = document.getElementById("btn-print-assessment");
    if (printBtn) printBtn.addEventListener("click", () => {
        document.querySelectorAll(".criterion-card").forEach((c) => c.classList.add("open"));
        window.print();
    });
}

function runCounterUps() {
    const elements = document.querySelectorAll('.counter-up[data-target]');
    elements.forEach((el) => {
        const target = parseInt(el.dataset.target, 10) || 0;
        if (target === 0) { el.textContent = "0"; return; }
        const duration = 700;
        const startTime = performance.now();
        const step = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = String(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });
}

function renderTabs(results) {
    const valid = results.filter((r) => !r.error).length;
    const total = results.length;
    return `
        <nav class="tabs" role="tablist">
            <button class="tab active" data-tab="summary" role="tab">Summary</button>
            <button class="tab" data-tab="criteria" role="tab">All criteria<span class="tab-count">${total}</span></button>
        </nav>`;
}

function bindTabs() {
    const tabs = document.querySelectorAll('.tabs .tab');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach((t) => t.classList.toggle('active', t === tab));
            panels.forEach((p) => { p.hidden = p.dataset.panel !== target; });
            window.scrollTo({ top: document.querySelector('.tabs').offsetTop - 16, behavior: 'smooth' });
        });
    });
}

function activateTab(name) {
    const tab = document.querySelector(`.tabs .tab[data-tab="${name}"]`);
    if (tab && !tab.classList.contains('active')) tab.click();
}

function renderInsightsPanel(results) {
    const valid = results.filter((r) => !r.error);
    if (!valid.length) return "";

    const strengths = valid
        .filter((r) => (r.probability_meets || 0) >= 0.85)
        .sort((a, b) => (b.probability_meets || 0) - (a.probability_meets || 0))
        .slice(0, 3);

    const risks = valid
        .filter((r) => (r.probability_meets || 0) < 0.85)
        .sort((a, b) => (a.probability_meets || 0) - (b.probability_meets || 0))
        .slice(0, 3);

    const strengthRows = strengths.map((r) => {
        const pct = Math.round((r.probability_meets || 0) * 100);
        return `<button class="insight-row" data-cid="${escapeHtml(r.criterion_id)}">
            <span class="insight-icon strength">✓</span>
            <span class="insight-title">${escapeHtml(humanizeCriterionTitle(r))}</span>
            <span class="insight-pct">${pct}%</span>
        </button>`;
    }).join("");

    const riskRows = risks.length ? risks.map((r) => {
        const pct = Math.round((r.probability_meets || 0) * 100);
        const band = r.confidence_level || "below_threshold";
        return `<button class="insight-row" data-cid="${escapeHtml(r.criterion_id)}">
            <span class="insight-icon risk ${band}">!</span>
            <span class="insight-title">${escapeHtml(humanizeCriterionTitle(r))}</span>
            <span class="insight-pct">${pct}%</span>
        </button>`;
    }).join("") : `<div class="insight-empty">Nothing below 85% — every criterion is on solid ground.</div>`;

    return `
        <section class="insights-panel">
            <div class="insight-col">
                <div class="insight-header">
                    <span class="insight-eyebrow">Strengths</span>
                    <span class="insight-meta">${strengths.length ? `top ${strengths.length}` : "none yet"}</span>
                </div>
                <div class="insight-list">${strengthRows || `<div class="insight-empty">No criteria above 85% yet.</div>`}</div>
            </div>
            <div class="insight-col">
                <div class="insight-header">
                    <span class="insight-eyebrow">Needs attention</span>
                    <span class="insight-meta">${risks.length ? `${risks.length} below 85%` : "all clear"}</span>
                </div>
                <div class="insight-list">${riskRows}</div>
            </div>
        </section>`;
}

function bindInsightLinks() {
    document.querySelectorAll('.insight-row[data-cid]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const cid = btn.dataset.cid;
            activateTab('criteria');
            const card = document.querySelector(`.criterion-card[data-cid="${CSS.escape(cid)}"]`);
            if (!card) return;
            const allChip = document.querySelector('.filter-chips .chip[data-filter="all"]');
            if (allChip && !allChip.classList.contains('active')) allChip.click();
            card.classList.add('open', 'highlight');
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 80);
            setTimeout(() => card.classList.remove('highlight'), 1800);
        });
    });
}

function renderFilterBar(results) {
    const counts = { all: results.length, high: 0, medium: 0, low: 0, below_threshold: 0, error: 0 };
    for (const r of results) {
        if (r.error) { counts.error++; continue; }
        counts[r.confidence_level || "below_threshold"]++;
    }
    const chip = (key, label, n) => n > 0 || key === "all"
        ? `<button class="chip${key === "all" ? " active" : ""}" data-filter="${key}"><span class="chip-dot ${key}"></span>${label}<span class="chip-count">${n}</span></button>`
        : "";
    return `
        <div class="results-toolbar">
            <div class="filter-chips" id="filter-chips">
                ${chip("all", "All", counts.all)}
                ${chip("high", "Strong", counts.high)}
                ${chip("medium", "Likely", counts.medium)}
                ${chip("low", "Weak", counts.low)}
                ${chip("below_threshold", "At risk", counts.below_threshold)}
                ${counts.error ? chip("error", "Errors", counts.error) : ""}
            </div>
            <div class="toolbar-actions">
                <button class="btn-link" id="btn-expand-all">Expand all</button>
                <span class="toolbar-sep">·</span>
                <button class="btn-link" id="btn-collapse-all">Collapse all</button>
            </div>
        </div>`;
}

function bindFilterChips() {
    const chips = document.querySelectorAll('.filter-chips .chip');
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            chips.forEach((c) => c.classList.remove('active'));
            chip.classList.add('active');
            applyFilter(chip.dataset.filter);
        });
    });
    document.querySelectorAll('.vstat[data-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            activateTab('criteria');
            const chip = document.querySelector(`.filter-chips .chip[data-filter="${filter}"]`);
            if (chip) chip.click();
            setTimeout(() => {
                const toolbar = document.querySelector('.results-toolbar');
                if (toolbar) toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        });
    });
    const expandBtn = document.getElementById('btn-expand-all');
    const collapseBtn = document.getElementById('btn-collapse-all');
    if (expandBtn) expandBtn.addEventListener('click', () => {
        document.querySelectorAll('.criterion-card:not([hidden])').forEach((c) => c.classList.add('open'));
    });
    if (collapseBtn) collapseBtn.addEventListener('click', () => {
        document.querySelectorAll('.criterion-card').forEach((c) => c.classList.remove('open'));
    });
}

function applyFilter(filter) {
    document.querySelectorAll('.criterion-card').forEach((card) => {
        const match = filter === 'all'
            || (filter === 'error' && card.classList.contains('error'))
            || card.classList.contains(filter);
        card.hidden = !match;
    });
    document.querySelectorAll('.result-group').forEach((group) => {
        const visible = group.querySelectorAll('.criterion-card:not([hidden])').length;
        group.hidden = visible === 0;
        const countEl = group.querySelector('.result-group-header .count');
        if (countEl) countEl.textContent = `${visible} criteria`;
    });
}

function renderVerdictCard(results, summary) {
    const total = results.length || 1;
    const probs = results.filter((r) => !r.error).map((r) => r.probability_meets || 0);
    const avg = probs.reduce((a, b) => a + b, 0) / Math.max(probs.length, 1);
    const overallPct = Math.round(avg * 100);

    const high = summary?.high || 0;
    const medium = summary?.medium || 0;
    const low = summary?.low || 0;
    const below = summary?.below_threshold || 0;
    const errors = summary?.error || 0;

    const route = state.routes.find((r) => r.id === state.selectedRouteId);
    const routeMeta = route?.document_version || "live caseworker guidance";
    const lr = state.lastRun;
    let cacheNote = "";
    if (lr && lr.cached >= 0 && lr.cold >= 0) {
        if (lr.cold === 0) cacheNote = `${lr.cached} from cache`;
        else if (lr.cached === 0) cacheNote = `${lr.cold} live with Claude`;
        else cacheNote = `${lr.cached} cached · ${lr.cold} live`;
    }
    const metaLine = [`Scored just now`, `${total} criteria`, escapeHtml(routeMeta), cacheNote].filter(Boolean).join(" · ");

    let verdict, verdictClass, verdictBlurb;
    if (overallPct >= 85 && low + below === 0) {
        verdict = "Strong match";
        verdictClass = "high";
        verdictBlurb = `This applicant looks well-positioned across all ${total} requirements. ${high} criteria show strong evidence; the rest are likely.`;
    } else if (overallPct >= 70 && below === 0) {
        verdict = "Mostly there";
        verdictClass = "medium";
        verdictBlurb = `Strong on ${high} criteria, with ${medium + low} that need stronger evidence before a confident decision.`;
    } else if (overallPct >= 50) {
        verdict = "Mixed";
        verdictClass = "medium";
        verdictBlurb = `${high} criteria are on solid ground, but ${low + below} need attention before this is a credible application.`;
    } else {
        verdict = "Not yet ready";
        verdictClass = "low";
        verdictBlurb = `Only ${high} of ${total} criteria are solidly met. Significant work needed on ${low + below} criteria before this is fileable.`;
    }

    const errorTag = errors > 0 ? `<span class="verdict-warning">${errors} criteria failed to score, see cards below.</span>` : "";

    return `
        <section class="verdict-card ${verdictClass}">
            <div class="verdict-left">
                <div class="verdict-eyebrow">Overall assessment</div>
                <div class="verdict-headline">${escapeHtml(verdict)}</div>
                <div class="verdict-blurb">${escapeHtml(verdictBlurb)}</div>
                ${errorTag}
            </div>
            <div class="verdict-meter">
                <div class="verdict-meter-num"><span class="counter-up" data-target="${overallPct}">0</span><span>%</span></div>
                <div class="verdict-meter-label">average likelihood</div>
                <div class="verdict-meter-bar"><div class="verdict-meter-fill ${verdictClass}" style="width:${overallPct}%"></div></div>
            </div>
            <div class="verdict-stats">
                <button class="vstat high" data-filter="high"><span class="vstat-num counter-up" data-target="${high}">0</span><span class="vstat-label">Strong</span></button>
                <button class="vstat medium" data-filter="medium"><span class="vstat-num counter-up" data-target="${medium}">0</span><span class="vstat-label">Likely</span></button>
                <button class="vstat low" data-filter="low"><span class="vstat-num counter-up" data-target="${low}">0</span><span class="vstat-label">Weak</span></button>
                <button class="vstat below_threshold" data-filter="below_threshold"><span class="vstat-num counter-up" data-target="${below}">0</span><span class="vstat-label">At risk</span></button>
            </div>
            <div class="verdict-actions">
                <div class="verdict-meta-line">${metaLine}</div>
                <button class="btn-ghost btn-print" id="btn-print-assessment">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Save as PDF
                </button>
            </div>
        </section>
        <div class="bandkey print-hidden">
            <span class="bandkey-item"><span class="bandkey-dot high"></span><strong>High</strong> ≥ 85%</span>
            <span class="bandkey-item"><span class="bandkey-dot medium"></span><strong>Medium</strong> 60–85%</span>
            <span class="bandkey-item"><span class="bandkey-dot low"></span><strong>Low</strong> 40–60%</span>
            <span class="bandkey-item"><span class="bandkey-dot below_threshold"></span><strong>Below threshold</strong> &lt; 40%</span>
        </div>
        <div class="summary-row print-hidden">
            <div class="stat high"><div class="stat-label">High confidence</div><div class="stat-value">${high}</div></div>
            <div class="stat medium"><div class="stat-label">Medium</div><div class="stat-value">${medium}</div></div>
            <div class="stat low"><div class="stat-label">Low</div><div class="stat-value">${low}</div></div>
            <div class="stat below_threshold"><div class="stat-label">Below threshold</div><div class="stat-value">${below}</div></div>
        </div>`;
}

function renderMissingInputs(results) {
    const groups = new Map();
    for (const r of results) {
        if (r.error || !r.missing_inputs?.length) continue;
        for (const m of r.missing_inputs) {
            if (!groups.has(m)) groups.set(m, []);
            groups.get(m).push(humanizeCriterionTitle(r));
        }
    }
    if (!groups.size) return "";
    const rows = [...groups.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([field, titles]) => `
            <li class="missing-row">
                <span class="missing-field">${escapeHtml(field)}</span>
                <span class="missing-where">affects ${titles.length} criteria: ${escapeHtml(titles.slice(0, 3).join(", "))}${titles.length > 3 ? `, +${titles.length - 3} more` : ""}</span>
            </li>`).join("");
    return `
        <section class="missing-card">
            <div class="missing-header">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9A6500" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/></svg>
                <div>
                    <div class="missing-title">Information that would strengthen this assessment</div>
                    <div class="missing-subtitle">Adding these would let INDEX score with higher confidence.</div>
                </div>
            </div>
            <ul class="missing-rows">${rows}</ul>
        </section>`;
}

function renderStageBreakdown(results) {
    const groups = new Map();
    for (const r of results) {
        const stage = r.criterion?.decision_stage || "other";
        if (!groups.has(stage)) groups.set(stage, []);
        groups.get(stage).push(r);
    }
    const sortedStages = [...groups.keys()].sort((a, b) => {
        const ai = STAGE_ORDER.indexOf(a); const bi = STAGE_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const rows = sortedStages.map((stage) => {
        const list = groups.get(stage);
        const counts = { high: 0, medium: 0, low: 0, below_threshold: 0, error: 0 };
        for (const r of list) {
            if (r.error) { counts.error++; continue; }
            counts[r.confidence_level || "below_threshold"]++;
        }
        const total = Math.max(list.length, 1);
        const parts = [];
        if (counts.high) parts.push(`<span class="cb-band high">${counts.high} strong</span>`);
        if (counts.medium) parts.push(`<span class="cb-band medium">${counts.medium} likely</span>`);
        if (counts.low) parts.push(`<span class="cb-band low">${counts.low} weak</span>`);
        if (counts.below_threshold) parts.push(`<span class="cb-band below">${counts.below_threshold} at risk</span>`);
        if (counts.error) parts.push(`<span class="cb-band err">${counts.error} error</span>`);
        const seg = (key, n) => n > 0
            ? `<div class="seg ${key}" style="--w: ${(n / total * 100).toFixed(2)}%"></div>`
            : "";
        const bar = `
            <div class="breakdown-bar" aria-hidden="true">
                ${seg("high", counts.high)}
                ${seg("medium", counts.medium)}
                ${seg("low", counts.low)}
                ${seg("below", counts.below_threshold)}
                ${seg("err", counts.error)}
            </div>`;
        return `
            <li class="cover-breakdown-row">
                <span class="cover-breakdown-stage">${escapeHtml(prettyStage(stage))}</span>
                <span class="cover-breakdown-count">${list.length}</span>
                ${bar}
                <span class="cover-breakdown-meta">${parts.join('<span class="cb-sep">·</span>')}</span>
            </li>`;
    }).join("");

    return `
        <section class="cover-breakdown">
            <div class="cover-breakdown-title">Section breakdown</div>
            <ul class="cover-breakdown-list">${rows}</ul>
        </section>`;
}

function renderGroupedResults(results) {
    const groups = new Map();
    for (const r of results) {
        const stage = r.criterion?.decision_stage || "other";
        if (!groups.has(stage)) groups.set(stage, []);
        groups.get(stage).push(r);
    }

    const sortedStages = [...groups.keys()].sort((a, b) => {
        const ai = STAGE_ORDER.indexOf(a); const bi = STAGE_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return sortedStages.map((stage) => {
        const list = groups.get(stage).slice().sort((a, b) => bandRank(a) - bandRank(b));
        const cards = list.map(renderCriterionCard).join("");
        return `
            <section class="result-group">
                <div class="result-group-header">
                    <span>${escapeHtml(prettyStage(stage))}</span>
                    <span class="count">${list.length} criteria</span>
                </div>
                <div class="result-group-cards">${cards}</div>
            </section>`;
    }).join("");
}

function prettyStage(s) {
    return ({
        eligibility: "Eligibility",
        validity: "Validity",
        suitability: "Suitability",
        decision: "Decision",
        post_decision: "Post-decision",
    })[s] || s.replace("_", " ");
}

const CRITERION_TITLE_OVERRIDES = {
    documents_english_language: "Documents in English",
    translation_requirements: "Translation requirements",
    translation_certification_in_uk: "Translations certified in the UK",
    fee_and_ihc: "Fee and Health Charge paid",
    not_on_immigration_bail: "Not on immigration bail",
    switching_prohibited_categories: "No prohibited switching",
    student_course_completion: "Student course completed",
    key_role_in_business: "Key role in the business",
    endorsement_required: "Endorsement from approved body",
    endorsement_letter: "Valid endorsement letter",
    biometrics_registered: "Biometrics registered",
    biometrics: "Biometrics provided",
    application_validity: "Valid application",
    identity_document: "Identity document provided",
    minimum_age: "Minimum age (18+)",
    scholarship_consent: "Scholarship consent provided",
};
const ABBREVS = { uk: "UK", ihc: "IHC", ielts: "IELTS", ip: "IP", us: "US" };
const SMALL_WORDS = new Set(["in", "of", "and", "or", "to", "for", "the", "a", "an", "on", "at"]);

function humanizeCriterionTitle(r) {
    const id = r.criterion_id || r.criterion?.id || "";
    const parts = id.split(".");
    const slug = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1];
    if (!slug) return id;
    if (CRITERION_TITLE_OVERRIDES[slug]) return CRITERION_TITLE_OVERRIDES[slug];
    return slug
        .split("_")
        .map((w, i) => {
            if (ABBREVS[w]) return ABBREVS[w];
            if (i > 0 && SMALL_WORDS.has(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(" ");
}

function humanizeField(field) {
    if (!field) return "";
    const last = String(field).split(".").pop();
    return last
        .split("_")
        .map((w, i) => {
            if (ABBREVS[w]) return ABBREVS[w];
            if (i > 0 && SMALL_WORDS.has(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(" ");
}

function bandIcon(band) {
    if (band === "high") return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    if (band === "medium") return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><circle cx="12" cy="16.5" r="0.4" fill="currentColor"/><circle cx="12" cy="12" r="9"/></svg>`;
    if (band === "low") return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.5" r="0.4" fill="currentColor"/><path d="M12 3l10 18H2L12 3z"/></svg>`;
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
}

function renderCriterionCard(r) {
    const title = humanizeCriterionTitle(r);

    if (r.error) {
        return `
        <div class="criterion-card error" data-cid="${escapeHtml(r.criterion_id)}">
            <div class="criterion-summary">
                <div class="criterion-text">
                    <div class="criterion-title">${escapeHtml(title)}</div>
                    <div class="criterion-explainer">Could not score this criterion: see details.</div>
                </div>
                <div class="probability-block"><span class="probability-value">—</span></div>
                <span class="confidence-pill error">${bandIcon("low")}error</span>
            </div>
            <div class="criterion-details">
                <div class="detail-label">Error</div>
                <div class="reasoning">${escapeHtml(r.error)}</div>
                <div class="detail-label" style="margin-top:14px">Criterion ID</div>
                <code class="criterion-id-mono">${escapeHtml(r.criterion_id)}</code>
            </div>
        </div>`;
    }

    const c = r.criterion || {};
    const probPct = Math.round((r.probability_meets || 0) * 100);
    const band = r.confidence_level || "below_threshold";
    const explainer = c.predicate_statement || c.section_heading || "—";
    const limitedData = !r.error
        && (r.probability_meets ?? 0) >= 0.40
        && (r.probability_meets ?? 0) <= 0.60
        && (r.supporting_evidence?.length || 0) === 0;

    const evidence = (r.supporting_evidence || []).map((ev) => `
        <li class="evidence-item">
            <span class="field">${escapeHtml(humanizeField(ev.field || ""))}</span>
            ${ev.matches ? `<span class="evidence-text">${escapeHtml(ev.matches)}</span>` : ""}
        </li>`).join("");

    const missing = (r.missing_inputs || []).map((m) => {
        return `<li class="missing-row-card">${escapeHtml(humanizeField(String(m)))}</li>`;
    }).join("");

    const tags = [c.modality, c.assessment_mechanism]
        .filter(Boolean)
        .map((t) => `<span class="tag">${escapeHtml(t.replace(/_/g, " "))}</span>`)
        .join("");

    const verbatim = c.verbatim_text;

    return `
        <div class="criterion-card ${band}${limitedData ? " limited" : ""}" data-cid="${escapeHtml(r.criterion_id)}">
            <div class="criterion-summary">
                <div class="criterion-text">
                    <div class="criterion-title">${escapeHtml(title)}${limitedData ? `<span class="limited-tag">profile lacks the data this rule needs</span>` : ""}</div>
                    <div class="criterion-explainer">${escapeHtml(explainer)}</div>
                </div>
                <div class="probability-block">
                    <span class="probability-value">${probPct}%</span>
                    <div class="bar"><div class="bar-fill ${band}" style="width:${probPct}%"></div></div>
                </div>
                <span class="confidence-pill ${band}">${bandIcon(band)}<span>${escapeHtml(bandLabel(band))}</span></span>
            </div>
            <div class="criterion-details">
                ${tags ? `<div class="tags">${tags}</div>` : ""}
                ${r.reasoning ? `<div class="detail-label">Scoring</div><div class="reasoning">${escapeHtml(r.reasoning)}</div>` : ""}
                ${evidence ? `<div class="detail-label">Evidence</div><ul class="evidence-list">${evidence}</ul>` : ""}
                ${missing ? `<div class="detail-label">Could be stronger with</div><ul class="missing-list-card">${missing}</ul>` : ""}
                ${verbatim ? `<div class="detail-label">Source rule</div><blockquote class="source-quote">${escapeHtml(verbatim)}</blockquote>` : ""}
                <div class="detail-footer">
                    <code class="criterion-id-mono">${escapeHtml(r.criterion_id)}</code>
                </div>
            </div>
        </div>`;
}

function bandLabel(b) {
    return ({ high: "Strong", medium: "Likely", low: "Weak", below_threshold: "At risk" })[b] || b.replace("_", " ");
}

function bindCardToggles() {
    document.querySelectorAll(".criterion-card .criterion-summary").forEach((s) => {
        s.addEventListener("click", () => {
            s.parentElement.classList.toggle("open");
        });
    });
}

function bandRank(r) {
    if (r.error) return 4;
    return { high: 0, medium: 1, low: 2, below_threshold: 3 }[r.confidence_level] ?? 3;
}

function renderEmptyResults() {
    els.results.innerHTML = `
        <div class="empty-state">
            Click <strong>Run assessment →</strong> above to score this applicant against the live caseworker guidance.
        </div>`;
}

function renderError(msg) {
    els.results.innerHTML = `<div class="error-banner">${escapeHtml(msg)}</div>`;
}

function escapeHtml(s) {
    return String(s == null ? "" : s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function safeJson(resp) { try { return await resp.json(); } catch { return null; } }

init();
