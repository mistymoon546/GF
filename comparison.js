/**
 * comparison.js v3.0 — 도입 효과 비교: 기존 DC vs Grid-Interactive DC
 */

// 비교 메트릭 정의 (기존 DC 기준값은 고정, Grid-Interactive는 지역에 따라 조정)
const COMPARISON_METRICS = [
  {
    id: 'grid_burden',
    label: '전력망 부담',
    icon: '⚡',
    conventional: { val: 85, desc: '계통과 무관하게 최대 소비', tag: 'bad' },
    gi_base:       { val: 35, desc: '계통 신호에 따라 자동 감축', tag: 'good' },
    unit: '%',
    lowerBetter: true,
  },
  {
    id: 'co2',
    label: 'CO₂ 배출량',
    icon: '🌿',
    conventional: { val: 100, desc: '화석연료 의존 냉각·전력', tag: 'bad' },
    gi_base:       { val: 45,  desc: '재생에너지 연계로 절감', tag: 'good' },
    unit: '%',
    lowerBetter: true,
  },
  {
    id: 'waste_heat',
    label: '폐열 활용률',
    icon: '♨️',
    conventional: { val: 5,  desc: '폐열 대기 방출', tag: 'bad' },
    gi_base:       { val: 70, desc: '지역난방·농업 공급', tag: 'good' },
    unit: '%',
    lowerBetter: false,
  },
  {
    id: 'renew_abs',
    label: '재생에너지 흡수율',
    icon: '☀️',
    conventional: { val: 10, desc: '계통 현황과 무관한 운영', tag: 'bad' },
    gi_base:       { val: 75, desc: '잉여 재생에너지 AI 훈련으로 흡수', tag: 'good' },
    unit: '%',
    lowerBetter: false,
  },
  {
    id: 'nimby',
    label: '님비 저항도',
    icon: '🤝',
    conventional: { val: 80, desc: '일방적 전력 소비 → 주민 반발', tag: 'bad' },
    gi_base:       { val: 30, desc: '편익 공유로 저항 대폭 감소', tag: 'good' },
    unit: '%',
    lowerBetter: true,
  },
  {
    id: 'flex',
    label: '운영 유연성',
    icon: '🔀',
    conventional: { val: 10, desc: '고정 부하, 유연성 없음', tag: 'bad' },
    gi_base:       { val: 85, desc: '워크로드·냉각·BESS 복합 조정', tag: 'good' },
    unit: '%',
    lowerBetter: false,
  },
];

// 지역별 Grid-Interactive 보정
const REGION_GI_BOOST = {
  jeonnam:  { waste_heat:  5, renew_abs: 15, nimby:  -5 },
  gangwon:  { renew_abs: 10, co2: -10 },
  gyeonggi: { waste_heat: 20, nimby: -15 },
  ulsan:    { waste_heat: 10, renew_abs: 5 },
  chungnam: { renew_abs: 12, co2: -8 },
  jeonbuk:  { renew_abs: 18, co2: -12 },
};

// 지역별 요약 편익
const REGION_IMPROVEMENTS = {
  jeonnam:  ['재생에너지 출력제한 70% 감소', '다도해 어업·온실 폐열 연계', '지역 일자리 500+ 창출 가능', '탄소 배출 55% 절감'],
  gangwon:  ['풍력 잉여전력 100% 흡수', '연구단지 AI 인프라 제공', '동계 스키장 난방 연계', '탄소 배출 60% 절감'],
  gyeonggi: ['지역난방 폐열 공급으로 주민 수용성 ↑', '계통 피크 부담 50% 감소', '스마트시티 연계', '난방비 절감 효과'],
  ulsan:    ['산업 폐열 교환으로 운영비 절감', '동해 해상풍력 직접 연계', '제조업 DX 지원', '탄소 배출 50% 절감'],
  chungnam: ['서해 해상풍력 잉여전력 흡수', '농업 온실 폐열 공급', '지역 에너지 자급 기여', '탄소 배출 52% 절감'],
  jeonbuk:  ['새만금 재생에너지 직접 연결', '농생명 산업 연계 폐열 공급', '지역 데이터 인프라 확충', '탄소 배출 58% 절감'],
};

function initComparison() {
  renderComparison();
}

function renderComparison() {
  // 선택된 지역 (의사결정 탭 기준)
  const regionId = document.getElementById('decisionRegion')?.value || 'jeonnam';
  const rd = REGION_DECISION[regionId];
  const boost = REGION_GI_BOOST[regionId] || {};

  // 지역명 표시
  const infoEl = document.getElementById('compareRegionInfo');
  if (infoEl) infoEl.textContent = `📍 선택 지역: ${rd?.name || '전라남도'} · ${rd?.opLevel || 'L4 워크로드 Shifting'}`;

  let leftHtml = '';
  let rightHtml = '';

  COMPARISON_METRICS.forEach(m => {
    const conv = m.conventional;
    const giVal = Math.max(0, Math.min(100, m.gi_base.val + (boost[m.id] || 0)));

    const colorConv = m.lowerBetter
      ? (conv.val >= 70 ? '#f87171' : conv.val >= 40 ? '#fb923c' : '#34d399')
      : (conv.val >= 70 ? '#34d399' : conv.val >= 40 ? '#fb923c' : '#f87171');
    const colorGI = m.lowerBetter
      ? (giVal <= 30 ? '#34d399' : giVal <= 60 ? '#38bdf8' : '#fb923c')
      : (giVal >= 70 ? '#34d399' : giVal >= 40 ? '#38bdf8' : '#fb923c');

    const barConv = m.lowerBetter ? (100 - conv.val) : conv.val;
    const barGI   = m.lowerBetter ? (100 - giVal) : giVal;

    leftHtml += `
      <div class="metric-card">
        <div class="mc-label">${m.icon} ${m.label}</div>
        <div class="mc-val" style="color:${colorConv}">${conv.val}<small style="font-size:12px;color:var(--text2)">${m.unit}</small></div>
        <div class="mc-bar"><div class="mc-fill" style="width:${barConv}%;background:${colorConv}"></div></div>
        <div class="mc-desc">${conv.desc}</div>
        <span class="mc-tag ${conv.tag}">${conv.tag === 'bad' ? '개선 필요' : '양호'}</span>
      </div>`;

    const improvePct = m.lowerBetter ? Math.round(conv.val - giVal) : Math.round(giVal - conv.val);
    rightHtml += `
      <div class="metric-card" style="border-color:rgba(52,211,153,0.25)">
        <div class="mc-label">${m.icon} ${m.label}</div>
        <div class="mc-val" style="color:${colorGI}">${giVal}<small style="font-size:12px;color:var(--text2)">${m.unit}</small>
          <span style="font-size:11px;color:var(--green);margin-left:6px">▲ +${improvePct}%p 개선</span>
        </div>
        <div class="mc-bar"><div class="mc-fill" style="width:${barGI}%;background:${colorGI}"></div></div>
        <div class="mc-desc">${m.gi_base.desc}</div>
        <span class="mc-tag good">개선됨</span>
      </div>`;
  });

  document.getElementById('compareLeft').innerHTML  = leftHtml;
  document.getElementById('compareRight').innerHTML = rightHtml;

  // 요약 카드
  const improvements = REGION_IMPROVEMENTS[regionId] || [];
  document.getElementById('improvementSummary').innerHTML = `
    <div class="is-title">✅ Grid-Interactive DC 도입 시 주요 개선 효과</div>
    <div class="is-grid">
      ${improvements.map((imp, i) => `
        <div class="is-item">
          <div class="is-icon">${['⚡','🌿','♨️','💰'][i] || '✅'}</div>
          <div class="is-val">${imp}</div>
        </div>
      `).join('')}
    </div>
  `;
}
