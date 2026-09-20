/**
 * decision.js v3.0 — 의사결정 모델: 현황(좌) vs 개선 시나리오(우) 비교
 */

// 지역별 운영 레벨·적합성 데이터
const REGION_DECISION = {
  jeonnam: {
    name: '전라남도',
    opLevel: 'L4 워크로드 Shifting',
    strengths: ['국내 최고 재생에너지 잠재력', '다도해 해수 냉각 가능', '낮은 인구밀도'],
    weaknesses: ['폐열 수요처 거리 있음', '전력계통 본선 거리'],
    baseMetrics: {
      gridScore:  78, coolingScore: 85, popScore: 80, renewScore: 88, heatScore: 62, total: 82
    },
    benefits: ['재생에너지 잉여 AI 훈련으로 흡수', '다도해 어업·온실 폐열 연계', '지역 일자리 창출'],
  },
  gangwon: {
    name: '강원특별자치도',
    opLevel: 'L4 워크로드 Shifting',
    strengths: ['풍부한 자연 냉각원(계곡수)', '낮은 인구밀도', '풍력·수력 잠재력'],
    weaknesses: ['원거리 송전 손실', '폐열 수요처 부족'],
    baseMetrics: {
      gridScore: 72, coolingScore: 85, popScore: 85, renewScore: 80, heatScore: 60, total: 79
    },
    benefits: ['풍력 직접 연결', 'AI 연구 특화 클러스터', '동계 리조트 난방 연계 가능'],
  },
  gyeonggi: {
    name: '경기도',
    opLevel: 'L3 Thermal Flexibility',
    strengths: ['지역난방망 인프라 완비', '통신 인프라 최고', '인력 접근성'],
    weaknesses: ['수도권 전력망 포화', '인구밀도 극도로 높음', '님비 리스크 최고'],
    baseMetrics: {
      gridScore: 35, coolingScore: 55, popScore: 10, renewScore: 30, heatScore: 48, total: 34
    },
    benefits: ['지역난방 폐열 연계 효과 최대', '주민 난방비 절감으로 님비 완화', '스마트시티 연계'],
  },
  ulsan: {
    name: '울산광역시',
    opLevel: 'L3 Thermal Flexibility',
    strengths: ['산업단지 전력 인프라', '동해 해수 냉각', '산업 폐열 교환 기반'],
    weaknesses: ['재생에너지 중간 수준', '산업지구 특성상 입지 경쟁'],
    baseMetrics: {
      gridScore: 70, coolingScore: 82, popScore: 48, renewScore: 50, heatScore: 65, total: 65
    },
    benefits: ['산업 폐열 맞교환 가능', '동해 해상풍력 PPA', '제조업 DX 지원 인프라'],
  },
  chungnam: {
    name: '충청남도',
    opLevel: 'L3 Thermal Flexibility',
    strengths: ['서해 해상풍력 최적', '당진 전력 허브 인접', '서해안 냉각수'],
    weaknesses: ['지역난방 인프라 미비', '입지 분산'],
    baseMetrics: {
      gridScore: 65, coolingScore: 70, popScore: 60, renewScore: 70, heatScore: 58, total: 67
    },
    benefits: ['서해 해상풍력 직접 PPA', '농업 온실 폐열 공급', '지역 에너지 자급 기여'],
  },
  jeonbuk: {
    name: '전북특별자치도',
    opLevel: 'L4 워크로드 Shifting',
    strengths: ['새만금 재생에너지 단지', '전력망 여유', '낮은 인구밀도'],
    weaknesses: ['인프라 구축 중', '폐열 수요처 거리'],
    baseMetrics: {
      gridScore: 72, coolingScore: 65, popScore: 72, renewScore: 75, heatScore: 55, total: 72
    },
    benefits: ['새만금 태양광 직접 연결', '재생에너지 출력제한 감소 기여', '농생명 산업 연계'],
  },
};

// 토글 ON 시 각 메트릭 부스트
const TOGGLE_BOOST = {
  regulation: { gridScore: 15, coolingScore: 0,  popScore: 5,  renewScore: 0,  heatScore: 0 },
  coolingEff:  { gridScore: 0,  coolingScore: 18, popScore: 0,  renewScore: 5,  heatScore: 5 },
  renewable:   { gridScore: 5,  coolingScore: 0,  popScore: 0,  renewScore: 20, heatScore: 5 },
  acceptance:  { gridScore: 0,  coolingScore: 0,  popScore: 22, renewScore: 0,  heatScore: 8 },
};

function initDecision() {
  renderDecision();
}

function renderDecision() {
  const regionId = document.getElementById('decisionRegion')?.value || 'jeonnam';
  const rd = REGION_DECISION[regionId];
  if (!rd) return;

  // 좌측: 현황 (전부 OFF)
  const base = rd.baseMetrics;

  // 우측: 개선 시나리오 (현재 toggle 상태 반영)
  const improved = { ...base };
  Object.entries(TOGGLE_STATE).forEach(([key, on]) => {
    if (on) {
      const boost = TOGGLE_BOOST[key];
      Object.entries(boost).forEach(([m, v]) => {
        improved[m] = Math.min(100, (improved[m] || 0) + v);
      });
    }
  });
  improved.total = Math.min(100, Math.round(
    improved.gridScore * 0.22 + improved.coolingScore * 0.22 +
    improved.popScore * 0.25 + improved.renewScore * 0.18 + improved.heatScore * 0.13
  ));

  const allOff = Object.values(TOGGLE_STATE).every(v => !v);

  // 렌더링
  document.getElementById('dcLeftContent').innerHTML  = buildMetricCards(base, rd, false);
  document.getElementById('dcRightContent').innerHTML = buildMetricCards(improved, rd, !allOff);

  // Flow 요약
  renderDecisionFlow(regionId, rd, improved);
}

function buildMetricCards(metrics, rd, isImproved) {
  const LABELS = {
    gridScore:    { label: '전력망 적합도',    icon: '⚡' },
    coolingScore: { label: '냉각 가용성',      icon: '❄️' },
    popScore:     { label: '사회적 수용성',    icon: '🤝' },
    renewScore:   { label: '재생에너지 연계',  icon: '☀️' },
    heatScore:    { label: '폐열 활용 가능성', icon: '♨️' },
    total:        { label: '종합 입지 점수',   icon: '🎯' },
  };
  const color = s => s >= 75 ? '#34d399' : s >= 55 ? '#38bdf8' : s >= 35 ? '#fb923c' : '#f87171';
  const tag   = s => s >= 75 ? ['최적','good'] : s >= 55 ? ['적합','mid'] : s >= 35 ? ['조건부','mid'] : ['부적합','bad'];

  let html = '';
  Object.entries(LABELS).forEach(([key, meta]) => {
    const val = metrics[key] || 0;
    const c   = color(val);
    const [t, tc] = tag(val);
    const isTotal = key === 'total';
    html += `
      <div class="metric-card" style="${isTotal ? 'border-color:rgba(56,189,248,0.4);background:rgba(56,189,248,0.05)' : ''}">
        <div class="mc-label">${meta.icon} ${meta.label}</div>
        <div class="mc-val" style="color:${c}">${val}<small style="font-size:13px;color:var(--text2)"> / 100</small></div>
        <div class="mc-bar"><div class="mc-fill" style="width:${val}%;background:${c}"></div></div>
        <span class="mc-tag ${tc}">${t}</span>
      </div>`;
  });

  if (isImproved) {
    html += `<div style="margin-top:8px;padding:10px;background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.2);border-radius:8px">
      <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:6px">🎯 추천 운영 레벨</div>
      <div style="font-size:12px;font-weight:700;margin-bottom:5px">${rd.opLevel}</div>
      ${rd.benefits.map(b => `<div style="font-size:10px;color:var(--text2);margin-bottom:3px">✅ ${b}</div>`).join('')}
    </div>`;
  } else {
    const issues = rd.weaknesses;
    html += `<div style="margin-top:8px;padding:10px;background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:8px">
      <div style="font-size:11px;font-weight:700;color:#fca5a5;margin-bottom:6px">⚠️ 현재 한계</div>
      ${issues.map(i => `<div style="font-size:10px;color:var(--text2);margin-bottom:3px">• ${i}</div>`).join('')}
    </div>`;
  }
  return html;
}

function renderDecisionFlow(regionId, rd, improved) {
  const el = document.getElementById('decisionFlow');
  if (!el) return;
  const activeToggles = Object.entries(TOGGLE_STATE).filter(([,v]) => v).length;
  el.innerHTML = `
    <div class="df-title">📍 ${rd.name} — 의사결정 플로우</div>
    <div class="df-steps">
      <div class="df-step">
        <div class="df-step-num">Step 1 · Place</div>
        <div class="df-step-name">입지 적합성</div>
        <div class="df-step-desc">강점: ${rd.strengths.slice(0,2).join(', ')}</div>
      </div>
      <div class="df-step">
        <div class="df-step-num">Step 2 · Operate</div>
        <div class="df-step-name">${rd.opLevel}</div>
        <div class="df-step-desc">활성 조건: ${activeToggles}개 ON · 종합 점수 ${improved.total}점</div>
      </div>
      <div class="df-step">
        <div class="df-step-num">Step 3 · Benefit</div>
        <div class="df-step-name">지역 편익 환원</div>
        <div class="df-step-desc">${rd.benefits[0]}</div>
      </div>
    </div>
  `;
}
