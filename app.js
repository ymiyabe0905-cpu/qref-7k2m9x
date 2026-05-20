/* ===== 疑義照会プロトコル検索 - iPad向け ===== */

const state = {
  data: null,
  searchQuery: '',
  selectedCategoryId: null,
  selectedInstitutionId: null,
  selectedProtocolId: null,
};

const $ = (sel) => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch (err) {
    $('#matrixTable').innerHTML =
      `<tr><td class="error">data.json の読み込みに失敗しました：${err.message}</td></tr>`;
    return;
  }

  $('#metaInfo').textContent =
    `${state.data.institutions.length} 施設 / ${state.data.categories.length} カテゴリ / ${state.data.protocols.length} プロトコル（更新 ${state.data.lastUpdated}）`;

  bindEvents();
  renderChips();
  renderMatrix();
}

function bindEvents() {
  const input = $('#searchInput');
  const clearBtn = $('#clearBtn');

  input.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    clearBtn.classList.toggle('show', state.searchQuery !== '');
    renderMatrix();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    state.searchQuery = '';
    clearBtn.classList.remove('show');
    renderMatrix();
    input.focus();
  });

  $('#closeDetailBtn').addEventListener('click', () => {
    state.selectedProtocolId = null;
    renderDetail();
    renderMatrix();
  });
}

/* ===== Chips ===== */

function renderChips() {
  const cats = state.data.categories;
  const insts = state.data.institutions;

  $('#categoryChips').innerHTML = chipHtml('', state.selectedCategoryId, 'すべて')
    + cats.map(c => chipHtml(c.id, state.selectedCategoryId, c.name)).join('');

  $('#institutionChips').innerHTML = chipHtml('', state.selectedInstitutionId, 'すべて')
    + insts.map(i => chipHtml(i.id, state.selectedInstitutionId, i.shortName || i.name)).join('');

  $('#categoryChips').querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.selectedCategoryId = chip.dataset.id || null;
      renderChips();
      renderMatrix();
    });
  });

  $('#institutionChips').querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.selectedInstitutionId = chip.dataset.id || null;
      renderChips();
      renderMatrix();
    });
  });
}

function chipHtml(id, selectedId, label) {
  const active = (id === '' && selectedId === null) || id === selectedId;
  return `<button class="chip ${active ? 'active' : ''}" data-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
}

/* ===== Matrix ===== */

function renderMatrix() {
  const { categories, institutions, protocols } = state.data;

  const visibleInsts = institutions.filter(matchesInstitution);
  const visibleCats  = categories.filter(matchesCategory);

  const visibleProtocols = protocols.filter(p => matchesSearch(p));
  const visibleProtocolSet = new Set(visibleProtocols.map(p => p.id));

  const protocolByKey = {};
  for (const p of protocols) {
    protocolByKey[`${p.institutionId}|${p.categoryId}`] = p;
  }

  if (visibleInsts.length === 0 || visibleCats.length === 0) {
    $('#matrixTable').innerHTML = '';
    $('#emptyState').hidden = false;
    return;
  }
  $('#emptyState').hidden = true;

  const thead = `<thead><tr>
    <th>医療機関</th>
    ${visibleCats.map(c => `<th title="${escapeHtml(c.description)}">${escapeHtml(c.name)}</th>`).join('')}
  </tr></thead>`;

  const tbody = `<tbody>
    ${visibleInsts.map(inst => {
      const cells = visibleCats.map(cat => {
        const p = protocolByKey[`${inst.id}|${cat.id}`];
        if (!p) {
          return `<td class="no-protocol"><span class="cell-empty">—</span></td>`;
        }
        const matchSearch = state.searchQuery === '' || visibleProtocolSet.has(p.id);
        if (!matchSearch) {
          return `<td class="no-protocol dimmed"><span class="cell-empty">—</span></td>`;
        }
        const selected = state.selectedProtocolId === p.id ? ' selected' : '';
        const badge = p.feedback === '必要'
          ? `<div class="cell-badge">報告必要</div>`
          : p.feedback === '不要'
          ? `<div class="cell-badge no-report">報告不要</div>`
          : '';
        return `<td class="has-protocol${selected}" data-pid="${escapeHtml(p.id)}">
          <span class="cell-mark">${escapeHtml(p.simplification || '○')}</span>
          ${badge}
        </td>`;
      }).join('');
      return `<tr>
        <th>${escapeHtml(inst.shortName || inst.name)}</th>
        ${cells}
      </tr>`;
    }).join('')}
  </tbody>`;

  $('#matrixTable').innerHTML = thead + tbody;

  $('#matrixTable').querySelectorAll('td.has-protocol').forEach(td => {
    td.addEventListener('click', () => {
      state.selectedProtocolId = td.dataset.pid;
      renderDetail();
      renderMatrix();
    });
  });
}

function matchesCategory(c) {
  if (!state.selectedCategoryId) return true;
  return c.id === state.selectedCategoryId;
}

function matchesInstitution(i) {
  if (!state.selectedInstitutionId) return true;
  return i.id === state.selectedInstitutionId;
}

function matchesSearch(p) {
  if (state.searchQuery === '') return true;
  const q = state.searchQuery.toLowerCase();
  const inst = state.data.institutions.find(i => i.id === p.institutionId);
  const cat  = state.data.categories.find(c => c.id === p.categoryId);
  const haystack = [
    inst?.name, inst?.shortName,
    cat?.name, cat?.description,
    p.conditions, p.exceptions, p.notes,
    p.contactDest, p.contactMethod, p.timing, p.requiredItems,
    p.sourceRef
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

/* ===== Detail ===== */

function renderDetail() {
  const container = $('#detailContent');
  const closeBtn  = $('#closeDetailBtn');

  if (!state.selectedProtocolId) {
    container.innerHTML = `<p class="placeholder">マトリクスのセル（○）をタップすると、簡素化条件・連絡先・元 PDF への参照が表示されます。</p>`;
    closeBtn.hidden = true;
    return;
  }

  const p    = state.data.protocols.find(x => x.id === state.selectedProtocolId);
  const inst = state.data.institutions.find(i => i.id === p.institutionId);
  const cat  = state.data.categories.find(c => c.id === p.categoryId);

  closeBtn.hidden = false;

  container.innerHTML = `
    <p class="detail-subtitle">${escapeHtml(inst.shortName || inst.name)} / ${escapeHtml(cat.name)}</p>
    <h2 class="detail-title">${escapeHtml(cat.name)}</h2>
    <div class="badge-row">
      <span class="badge badge-ok">簡素化 ${escapeHtml(p.simplification)}</span>
    </div>

    ${renderFeedbackCallout(p, inst)}

    ${section('簡素化の条件', p.conditions)}
    ${section('除外・例外', p.exceptions)}
    ${section('備考', p.notes)}

    <div class="detail-section">
      <h3>医療機関情報</h3>
      ${renderInstitutionContacts(inst)}
      ${inst.applicableScope ? `<div class="small">対象範囲: ${escapeHtml(inst.applicableScope)}</div>` : ''}
      ${inst.receptionHours ? `<div class="small">受付時間: ${escapeHtml(inst.receptionHours)}</div>` : ''}
      ${inst.notes ? `<div class="small">補足: ${escapeHtml(inst.notes)}</div>` : ''}
    </div>

    <div class="detail-section">
      <h3>原本参照</h3>
      ${p.sourceRef ? `<p>PDF 内の項目: <strong>${escapeHtml(p.sourceRef)}</strong></p>` : ''}
      ${p.sourcePdf ? `<div class="action-row"><a class="pdf-link" href="${escapeHtml(p.sourcePdf)}" target="_blank" rel="noopener">PDF を開く</a></div>` : ''}
    </div>
  `;
}

function section(title, body) {
  if (!body) return '';
  return `
    <div class="detail-section">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function renderFeedbackCallout(p, inst) {
  if (p.feedback !== '必要') {
    return `
      <div class="feedback-callout not-required">
        <div class="callout-header">
          <span class="callout-icon">✓</span>
          <span class="callout-title">事後報告 不要</span>
        </div>
        <p class="callout-body">このプロトコル使用時、医療機関への事後連絡は不要です。</p>
      </div>
    `;
  }

  const fields = [];
  if (p.contactMethod) {
    fields.push(`
      <div class="callout-field">
        <span class="field-label">報告方法</span>
        <span class="field-value strong">${escapeHtml(p.contactMethod)}</span>
      </div>
    `);
  }
  if (p.timing) {
    fields.push(`
      <div class="callout-field">
        <span class="field-label">タイミング</span>
        <span class="field-value strong">${escapeHtml(p.timing)}</span>
      </div>
    `);
  }
  if (p.contactDest) {
    fields.push(`
      <div class="callout-field full">
        <span class="field-label">送付先</span>
        <span class="field-value">${escapeHtml(p.contactDest)}</span>
      </div>
    `);
  }
  if (p.requiredItems) {
    fields.push(`
      <div class="callout-field full">
        <span class="field-label">記載事項</span>
        <span class="field-value">${escapeHtml(p.requiredItems)}</span>
      </div>
    `);
  }

  return `
    <div class="feedback-callout required">
      <div class="callout-header">
        <span class="callout-icon">!</span>
        <span class="callout-title">事後報告 必要</span>
      </div>
      <div class="callout-grid">${fields.join('')}</div>
      ${renderContactActions(p, inst)}
    </div>
  `;
}

function renderContactActions(p, inst) {
  const tels = collectPhones(inst).filter(Boolean);
  const faxes = collectFaxes(inst).filter(Boolean);
  if (tels.length === 0 && faxes.length === 0) return '';
  return `
    <div class="action-row">
      ${tels.map(t => `<a class="tel-link" href="tel:${t.replace(/[^\d+]/g,'')}">TEL ${escapeHtml(t)}</a>`).join('')}
      ${faxes.map(f => `<span class="fax-display">FAX ${escapeHtml(f)}</span>`).join('')}
    </div>
  `;
}

function renderInstitutionContacts(inst) {
  const wd = inst.contacts?.weekday || {};
  const blocks = [];
  for (const key of Object.keys(wd)) {
    const c = wd[key];
    if (!c) continue;
    const label = c.label || labelForContact(key);
    blocks.push(`
      <div class="contact-block">
        <div class="contact-label">${escapeHtml(label)}</div>
        <div class="contact-dept">${escapeHtml(c.dept || '')}</div>
        ${(c.tel || c.fax) ? `<div class="action-row">
          ${c.tel ? `<a class="tel-link" href="tel:${c.tel.replace(/[^\d+]/g,'')}">TEL ${escapeHtml(c.tel)}</a>` : ''}
          ${c.fax ? `<span class="fax-display">FAX ${escapeHtml(c.fax)}</span>` : ''}
        </div>` : ''}
        ${c.note ? `<div class="small">${escapeHtml(c.note)}</div>` : ''}
      </div>
    `);
  }
  const ah = inst.contacts?.afterHours || [];
  if (ah.length > 0) {
    blocks.push(`<div class="contact-block">
      <div class="contact-label">時間外</div>
      ${ah.map(c => `
        <div style="margin-bottom:6px">
          ${c.label ? `<div class="contact-dept" style="font-weight:700">${escapeHtml(c.label)}</div>` : ''}
          <div class="contact-dept">${escapeHtml(c.dept || '')}</div>
          <div class="action-row">
            ${c.tel ? `<a class="tel-link" href="tel:${c.tel.replace(/[^\d+]/g,'')}">TEL ${escapeHtml(c.tel)}</a>` : ''}
            ${c.fax ? `<span class="fax-display">FAX ${escapeHtml(c.fax)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`);
  }
  return blocks.join('');
}

function labelForContact(key) {
  const map = {
    rxInquiry: '処方内容の疑義照会',
    insuranceInquiry: '保険関連',
    protocolSupport: '運用問い合わせ',
  };
  return map[key] || key;
}

function collectPhones(inst) {
  const out = [];
  const wd = inst.contacts?.weekday || {};
  for (const k of Object.keys(wd)) if (wd[k]?.tel) out.push(wd[k].tel);
  return [...new Set(out)];
}

function collectFaxes(inst) {
  const out = [];
  const wd = inst.contacts?.weekday || {};
  for (const k of Object.keys(wd)) if (wd[k]?.fax) out.push(wd[k].fax);
  return [...new Set(out)];
}

/* ===== Util ===== */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
