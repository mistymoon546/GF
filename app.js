/**
 * app.js v3.0 — 탭 전환 + 토글 관리 + 시뮬레이션 오케스트레이터
 */

// ====== 토글 상태 (전역) ======
const TOGGLE_STATE = {
  regulation: false,
  coolingEff:  false,
  renewable:   false,
  acceptance:  false,
};
let _toggleConfirmed = false; // unlock 클릭 여부
let currentSeason = 'spring';
let isRunning = false;
let selectedRegion = null;

// ====== 앱 초기화 ======
document.addEventListener('DOMContentLoaded', () => {
  initBackground();
  initTabNavigation();
  initMap();
  initSliders();
  initSeasonTabs();
  initMatrix();
  initDecision();
  initComparison();
  updateFooterClock();
  setInterval(updateFooterClock, 1000);
});

// ====== 탭 전환 ======
function initTabNavigation() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === tabId));
  if (tabId === 'tab-matrix' && powerChartInstance) setTimeout(() => powerChartInstance.resize(), 80);
  if (tabId === 'tab-decision') renderDecision();
  if (tabId === 'tab-compare') renderComparison();
}

// ====== 토글 시스템 ======
function toggleCondition(key) {
  TOGGLE_STATE[key] = !TOGGLE_STATE[key];
  const card  = document.getElementById(`tc-${key}`);
  const state = document.getElementById(`tst-${key}`);
  const on    = TOGGLE_STATE[key];

  card?.classList.toggle('on', on);
  if (state) { state.textContent = on ? 'ON' : 'OFF'; state.className = `tc-state ${on ? 'on' : 'off'}`; }

  // unlock 버튼 스타일 업데이트 (항상 클릭 가능, 설정 후 강조)
  const anySet = Object.values(TOGGLE_STATE).some((_, i, a) => true); // 항상 true
  document.getElementById('unlockBtn')?.classList.add('ready');

  // 이미 unlock된 경우 즉시 시뮬 재실행
  if (_toggleConfirmed) runSimulation();
}

function unlockSliders() {
  _toggleConfirmed = true;
  document.getElementById('slidersWrap')?.classList.remove('locked');
  runSimulation();
}

// ====== 시뮬레이션 ======
function runSimulation() {
  if (isRunning) return;
  isRunning = true;
  const btn = document.getElementById('runBtn');
  if (btn) { btn.classList.add('running'); btn.textContent = '⏳ 분석 중...'; }

  const params = getParams();
  setTimeout(() => {
    const scores = calculateScores(params, currentSeason);
    window._lastScores = scores;
    updateMapColors(scores);
    updateRankingList(scores);
    const checks  = evaluateChecklist(params, currentSeason);
    const warns   = generateWarnings(params, currentSeason);
    updateChecklist(checks);
    updateWarnings(warns);
    if (selectedRegion) showRegionDetail(selectedRegion);

    if (btn) { btn.classList.remove('running'); btn.textContent = '▶ 시뮬레이션 실행'; }
    isRunning = false;
  }, 300);
}

function getParams() {
  return {
    temperature:    parseInt(document.getElementById('tempSlider')?.value   ?? 33),
    coolingLevel:   parseInt(document.getElementById('coolingSlider')?.value ?? 3),
    noiseDB:        parseInt(document.getElementById('noiseSlider')?.value   ?? 75),
    powerDemand:    parseInt(document.getElementById('powerSlider')?.value   ?? 200),
    renewRatio:     parseInt(document.getElementById('renewSlider')?.value   ?? 30),
    heatIntegration:parseInt(document.getElementById('heatSlider')?.value    ?? 0),
    toggles: { ...TOGGLE_STATE },
  };
}

// ====== 슬라이더 바인딩 ======
function initSliders() {
  bindSlider('tempSlider',    'tempLabel',    v => `${v}°C`);
  bindSlider('coolingSlider', 'coolingLabel', v => COOLING_LABELS[v] || v);
  bindSlider('noiseSlider',   'noiseLabel',   v => `${v} dB`);
  bindSlider('powerSlider',   'powerLabel',   v => `${v} MW`);
  bindSlider('renewSlider',   'renewLabel',   v => `${v}%`);
  bindSlider('heatSlider',    'heatLabel',    v => HEAT_LABELS[v] || v);

  document.querySelectorAll('#slidersWrap .slider').forEach(s => {
    s.addEventListener('input', () => { updateSliderGradient(s); debounce(runSimulation, 350)(); });
    updateSliderGradient(s);
  });
}

function bindSlider(id, labelId, fmt) {
  const s = document.getElementById(id), l = document.getElementById(labelId);
  if (!s || !l) return;
  const upd = () => { l.textContent = fmt(s.value); };
  s.addEventListener('input', upd); upd();
}

function updateSliderGradient(slider) {
  const pct = ((+slider.value - +slider.min) / (+slider.max - +slider.min)) * 100;
  slider.style.background = `linear-gradient(to right,#38bdf8 0%,#3b82f6 ${pct}%,rgba(255,255,255,0.12) ${pct}%)`;
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ====== 계절 탭 ======
function initSeasonTabs() {
  document.querySelectorAll('.season-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSeason = btn.dataset.season;
      document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSeasonStats();
      if (_toggleConfirmed) runSimulation();
    });
  });
  updateSeasonStats();
}

function updateSeasonStats() {
  const s = SEASON_DATA[currentSeason];
  if (!s) return;
  document.getElementById('statTemp') ?.setAttribute && (document.getElementById('statTemp').textContent  = `${s.avgTemp}°C`);
  document.getElementById('statGrid') ?.setAttribute && (document.getElementById('statGrid').textContent  = `${s.gridLoad}%`);
  document.getElementById('statWater')?.setAttribute && (document.getElementById('statWater').textContent = s.waterAvail);
  document.getElementById('statRenew')?.setAttribute && (document.getElementById('statRenew').textContent = `${s.renewOutput}%`);
}

// ====== UI 업데이트 ======
function updateChecklist(results) {
  const map = { temp:'chkTemp', noise:'chkNoise', power:'chkPower', pop:'chkPop', renew:'chkRenew', heat:'chkHeat' };
  const icons = { checked:'✅', failed:'❌', warning:'⚠️' };
  Object.entries(map).forEach(([key, id]) => {
    const item = document.getElementById(id);
    const res  = results[key];
    if (!item || !res) return;
    item.className = `chk-item ${res.status}`;
    item.querySelector('.chk-icon').textContent = icons[res.status] || '⬜';
    const sub = document.getElementById(id + 'Msg');
    if (sub) sub.textContent = res.msg;
  });
}

function updateWarnings(warns) {
  const box = document.getElementById('warningsBox');
  if (!box) return;
  if (!warns.length) { box.innerHTML = '<div class="no-warn">경고 없음</div>'; return; }
  box.innerHTML = warns.map((w, i) => `
    <div class="warn-item ${w.level==='critical'?'warn-critical':'warn-moderate'}" style="animation-delay:${i*0.07}s">${w.msg}</div>
  `).join('');
}

function updateRankingList(scores) {
  const ranking = getRanking(scores);
  const list = document.getElementById('resultsList');
  if (!list) return;
  list.innerHTML = ranking.map((item, idx) => {
    const rrClass = ['rr1','rr2','rr3'][idx] || 'rrn';
    const color = item.score >= 75 ? '#34d399' : item.score >= 55 ? '#38bdf8' : item.score >= 35 ? '#fb923c' : '#f87171';
    return `
      <div class="result-item" onclick="selectRegion(REGIONS.find(r=>r.id==='${item.region.id}'))" style="animation-delay:${idx*0.06}s">
        <div class="rr ${rrClass}">${idx+1}</div>
        <div class="ri" style="flex:1">
          <div class="ri-name">${item.region.name}</div>
          <div class="ri-bar"><div class="ri-fill" style="width:${item.score}%;background:linear-gradient(90deg,${color}80,${color})"></div></div>
        </div>
        <span class="ri-score" style="color:${color}">${item.score}</span>
      </div>`;
  }).join('');
}

// ====== 보고서 / 초기화 ======
function exportReport() {
  const scores  = window._lastScores || {};
  const ranking = getRanking(scores);
  const params  = getParams();
  const season  = SEASON_DATA[currentSeason];
  const togglesOn = Object.entries(TOGGLE_STATE).filter(([,v])=>v).map(([k])=>({regulation:'제도완화',coolingEff:'냉각효율화',renewable:'재생에너지확대',acceptance:'사회적수용성'}[k]));

  const txt = `
[Korean Grid-Interactive DC Seasonal Operation Matrix]
글로벌 프론티어 연구팀 · ${new Date().toLocaleString('ko-KR')}

● 계절: ${season?.label}
● 활성 조건: ${togglesOn.length ? togglesOn.join(', ') : '없음 (현재 상황)'}
● 전력 수요: ${params.powerDemand} MW / 재생에너지: ${params.renewRatio}%

[입지 적합도 순위]
${ranking.map((r,i)=>`  ${i+1}. ${r.region.name} — ${r.score}점`).join('\n')}

※ 시뮬레이션 결과이며 실제 입지 결정 시 정밀 검토 필요
`.trim();

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], {type:'text/plain;charset=utf-8'}));
  a.download = `KGDC_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
}

function resetAll() {
  Object.keys(TOGGLE_STATE).forEach(k => {
    TOGGLE_STATE[k] = false;
    document.getElementById(`tc-${k}`)?.classList.remove('on');
    const st = document.getElementById(`tst-${k}`);
    if (st) { st.textContent = 'OFF'; st.className = 'tc-state off'; }
  });
  _toggleConfirmed = false;
  document.getElementById('slidersWrap')?.classList.add('locked');
  ['tempSlider:33','coolingSlider:3','noiseSlider:75','powerSlider:200','renewSlider:30','heatSlider:0'].forEach(s => {
    const [id,v] = s.split(':');
    const el = document.getElementById(id);
    if (el) { el.value = v; updateSliderGradient(el); }
  });
  initSliders();
}

function updateFooterClock() {
  const el = document.getElementById('footerClock');
  if (el) el.textContent = new Date().toLocaleTimeString('ko-KR');
}

document.addEventListener('keydown', e => {
  if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault(); if (_toggleConfirmed) runSimulation();
  }
});
