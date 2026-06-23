/* ============================================
   声愈 Resonance - 交互逻辑
   ============================================ */

(function () {
  'use strict';

  // ==================== 状态管理 ====================
  const state = {
    currentMonth: 6,    // 1-12，初始 6月
    currentYear: 2026,
    healedCount: 0,     // 本月已完成疗愈次数
    maxHealCount: 5,
    currentTab: 'plan', // monthly | plan | report
    isPlaying: false,
    playerTimer: null,
    playerSeconds: 0,
    playerSimSeconds: 30,     // 模拟总时长（秒），演示用
    playerDisplayTotal: 1800, // 显示的处方时长（秒），如30分钟=1800秒
    selectedPlanIndex: 0,
    addedPlans: [],     // AI 加入的今日计划
  };

  // ==================== DOM 缓存 ====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // 月份
  const monthTitle = $('#monthTitle');
  const monthPrev = $('#monthPrev');
  const monthNext = $('#monthNext');

  // 统计
  const monthlyCost = $('#monthlyCost');
  const healingHours = $('#healingHours');

  // 进度
  const completedCount = $('#completedCount');
  const progressFill = $('#progressFill');
  const progressLabel = $('#progressLabel');
  const completedDesc = $('#completedDesc');

  // 分段导航
  const segmentBtns = $$('.segment-btn');
  const tabMonthly = $('#tabMonthly');
  const tabPlan = $('#tabPlan');
  const tabReport = $('#tabReport');

  // 报告
  const reportPeriod = $('#reportPeriod');
  const reportCompleted = $('#reportCompleted');
  const trendText = $('#trendText');
  const trendBar = $('#trendBar');
  const aiSummary = $('#aiSummary');

  // 播放器
  const playerOverlay = $('#playerOverlay');
  const playerClose = $('#playerClose');
  const playerPrescription = $('#playerPrescription');
  const playerType = $('#playerType');
  const playerReason = $('#playerReason');
  const playerPlayBtn = $('#playerPlayBtn');
  const playerDisc = $('#playerDisc');
  const playerProgressFill = $('#playerProgressFill');
  const playerCurrentTime = $('#playerCurrentTime');
  const playerTotalTime = $('#playerTotalTime');
  const btnComplete = $('#btnComplete');

  // AI
  const aiFab = $('#aiFab');
  const aiDrawerOverlay = $('#aiDrawerOverlay');
  const aiDrawer = $('#aiDrawer');
  const aiDrawerClose = $('#aiDrawerClose');
  const aiChatBody = $('#aiChatBody');
  const aiQuickBtns = $('#aiQuickBtns');

  // Toast
  const toast = $('#toast');

  // 今日计划容器
  const planCards = $('#planCards');
  const todayDate = $('#todayDate');

  // ==================== 工具函数 ====================
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function showToast(msg, duration = 1800) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  function updateTodayDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    todayDate.textContent = `${y}年${m}月${d}日`;
  }

  // ==================== 月份导航 ====================
  function updateMonthDisplay() {
    monthTitle.textContent = `${state.currentYear}年${state.currentMonth}月`;
    reportPeriod.textContent = `${state.currentYear}年${state.currentMonth}月`;
  }

  monthPrev.addEventListener('click', () => {
    if (state.currentMonth === 1) {
      state.currentMonth = 12;
      state.currentYear--;
    } else {
      state.currentMonth--;
    }
    updateMonthDisplay();
    // 切换月份后重置演示数据
    if (state.currentMonth !== 6) {
      state.healedCount = 0;
      updateAllProgress();
      monthlyCost.textContent = '0';
      healingHours.textContent = '0';
    } else {
      state.healedCount = 0;
      updateAllProgress();
      monthlyCost.textContent = '250';
      healingHours.textContent = '2.1';
    }
  });

  monthNext.addEventListener('click', () => {
    if (state.currentMonth === 12) {
      state.currentMonth = 1;
      state.currentYear++;
    } else {
      state.currentMonth++;
    }
    updateMonthDisplay();
    if (state.currentMonth !== 6) {
      state.healedCount = 0;
      updateAllProgress();
      monthlyCost.textContent = '0';
      healingHours.textContent = '0';
    } else {
      state.healedCount = 0;
      updateAllProgress();
      monthlyCost.textContent = '250';
      healingHours.textContent = '2.1';
    }
  });

  // ==================== 进度更新 ====================
  function updateAllProgress() {
    const pct = (state.healedCount / state.maxHealCount) * 100;
    completedCount.textContent = state.healedCount;
    progressFill.style.width = pct + '%';
    completedDesc.textContent = state.healedCount;

    if (state.healedCount === 0) {
      progressLabel.textContent = '已完成';
      progressLabel.style.color = 'var(--text-muted)';
    } else if (state.healedCount >= state.maxHealCount) {
      progressLabel.textContent = '全部完成 🎉';
      progressLabel.style.color = 'var(--success)';
    } else {
      progressLabel.textContent = '进行中';
      progressLabel.style.color = 'var(--primary)';
    }

    // 更新报告
    reportCompleted.textContent = `${state.healedCount} / ${state.maxHealCount}`;

    // 更新趋势和AI总结
    if (state.healedCount >= 3) {
      trendText.style.display = 'none';
      trendBar.style.display = 'flex';
    } else {
      trendText.style.display = 'block';
      trendBar.style.display = 'none';
    }

    // 更新月度消费和时长
    const costPerHeal = 50;
    const hoursPerHeal = 0.42;
    monthlyCost.textContent = String(250 + state.healedCount * costPerHeal);
    healingHours.textContent = (2.1 + state.healedCount * hoursPerHeal).toFixed(1);
  }

  // ==================== 分段导航 ====================
  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  function switchTab(tab) {
    state.currentTab = tab;

    segmentBtns.forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.segment-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    tabMonthly.style.display = tab === 'monthly' ? 'block' : 'none';
    tabPlan.style.display = tab === 'plan' ? 'block' : 'none';
    tabReport.style.display = tab === 'report' ? 'block' : 'none';

    // 切换到报告时更新数据
    if (tab === 'report') {
      updateReportData();
    }
  }

  function updateReportData() {
    reportCompleted.textContent = `${state.healedCount} / ${state.maxHealCount}`;

    if (state.healedCount >= 3) {
      trendText.style.display = 'none';
      trendBar.style.display = 'flex';
    } else {
      trendText.style.display = 'block';
      trendBar.style.display = 'none';
    }

    // 动态 AI 总结
    if (state.healedCount === 0) {
      aiSummary.textContent = '本月尚未开始疗愈练习。建议从"深睡眠修复"处方开始，睡前30分钟使用低频舒缓音乐，帮助改善入睡质量和夜间焦虑。';
    } else if (state.healedCount < 3) {
      aiSummary.textContent = `本月已完成 ${state.healedCount} 次疗愈练习。你的主要问题集中在睡眠质量下降和夜间焦虑。建议继续使用深睡眠修复处方，并在下午增加一次短时焦虑舒缓练习。`;
    } else {
      aiSummary.textContent = `本月已完成 ${state.healedCount} 次疗愈练习，疗愈参与度良好！睡眠评分有改善趋势，建议继续保持当前频率，下周可尝试增加专注力提升处方。`;
    }
  }

  // ==================== 音乐播放器 ====================
  const planData = [
    {
      name: '深睡眠修复处方',
      type: '睡眠 / 低频 / 呼吸放松',
      reason: '基于您近期的夜间焦虑指标和入睡困难情况，此处方专为改善睡眠质量设计。使用低频环境音结合呼吸引导，帮助身体从高唤醒状态逐步过渡到放松状态。',
    },
    {
      name: '午后焦虑舒缓处方',
      type: '焦虑缓解 / 钢琴 / 环境音',
      reason: '针对您午后时段的焦虑指标，此处方选用轻柔钢琴与自然环境音，帮助平复午后焦虑情绪，恢复内心平静。',
    },
    {
      name: '专注力提升处方',
      type: '专注 / 白噪音 / 稳定节拍',
      reason: '基于您近期的专注力需求，此处方使用稳定节拍和白噪音背景，帮助大脑进入专注状态，适合学习与工作场景。',
    },
  ];

  function openPlayer(planIndex) {
    state.selectedPlanIndex = planIndex;
    const data = planData[planIndex];
    playerPrescription.textContent = data.name;
    playerType.textContent = data.type;
    playerReason.textContent = '💡 推荐原因：' + data.reason;

    // 重置播放状态
    state.isPlaying = false;
    state.playerSeconds = 0;
    playerPlayBtn.textContent = '▶';
    playerDisc.classList.remove('playing');
    playerProgressFill.style.width = '0%';
    playerCurrentTime.textContent = '00:00';
    playerTotalTime.textContent = formatTime(state.playerDisplayTotal);
    btnComplete.textContent = '完成本次疗愈';
    btnComplete.disabled = false;

    clearInterval(state.playerTimer);
    state.playerTimer = null;

    playerOverlay.classList.add('active');
  }

  function closePlayer() {
    clearInterval(state.playerTimer);
    state.playerTimer = null;
    state.isPlaying = false;
    playerDisc.classList.remove('playing');
    playerOverlay.classList.remove('active');
  }

  playerClose.addEventListener('click', closePlayer);
  playerOverlay.addEventListener('click', (e) => {
    if (e.target === playerOverlay) closePlayer();
  });

  // 播放/暂停
  playerPlayBtn.addEventListener('click', () => {
    if (state.isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  });

  function startPlayback() {
    state.isPlaying = true;
    playerPlayBtn.textContent = '⏸';
    playerDisc.classList.add('playing');

    state.playerTimer = setInterval(() => {
      state.playerSeconds++;
      const pct = (state.playerSeconds / state.playerSimSeconds) * 100;
      playerProgressFill.style.width = Math.min(pct, 100) + '%';

      // 显示时间按比例映射到显示总时长
      const displaySec = Math.floor((state.playerSeconds / state.playerSimSeconds) * state.playerDisplayTotal);
      playerCurrentTime.textContent = formatTime(Math.min(displaySec, state.playerDisplayTotal));

      if (state.playerSeconds >= state.playerSimSeconds) {
        pausePlayback();
        playerCurrentTime.textContent = formatTime(state.playerDisplayTotal);
        playerProgressFill.style.width = '100%';
        btnComplete.textContent = '✅ 疗愈已完成 — 点击确认';
      }
    }, 1000);
  }

  function pausePlayback() {
    state.isPlaying = false;
    playerPlayBtn.textContent = '▶';
    playerDisc.classList.remove('playing');
    clearInterval(state.playerTimer);
    state.playerTimer = null;
  }

  // 完成疗愈
  btnComplete.addEventListener('click', () => {
    if (state.healedCount >= state.maxHealCount) {
      showToast('本月疗愈计划已全部完成 🎉');
      closePlayer();
      return;
    }

    state.healedCount++;
    updateAllProgress();
    closePlayer();

    // 模拟数据联动：更新消费和时长
    monthlyCost.textContent = String(250 + state.healedCount * 50);
    healingHours.textContent = (2.1 + state.healedCount * 0.42).toFixed(1);

    showToast(`✨ 本次疗愈已完成！(${state.healedCount}/${state.maxHealCount})`);
  });

  // 计划卡片"开始疗愈"按钮
  planCards.addEventListener('click', (e) => {
    const startBtn = e.target.closest('.btn-start-healing');
    if (!startBtn) return;
    const card = startBtn.closest('.plan-card');
    if (!card) return;
    const planIndex = parseInt(card.dataset.plan, 10);
    openPlayer(planIndex);
  });

  // "添加反馈"按钮
  planCards.addEventListener('click', (e) => {
    const fbBtn = e.target.closest('.btn-add-feedback');
    if (!fbBtn) return;
    const card = fbBtn.closest('.plan-card');
    const name = card ? card.querySelector('.plan-name').textContent : '该处方';
    showToast(`📝 已记录"${name}"的反馈，AI 将在下次推荐时参考`);
  });

  // ==================== AI 聊天抽屉 ====================
  function openAiDrawer() {
    aiDrawerOverlay.classList.add('active');
    aiDrawer.classList.add('active');
  }

  function closeAiDrawer() {
    aiDrawerOverlay.classList.remove('active');
    aiDrawer.classList.remove('active');
  }

  aiFab.addEventListener('click', openAiDrawer);
  aiDrawerClose.addEventListener('click', closeAiDrawer);
  aiDrawerOverlay.addEventListener('click', closeAiDrawer);

  // 快捷需求按钮
  const quickReplies = {
    '我今晚睡不着': {
      user: '我今晚睡不着，想要一个睡前疗愈方案。',
      bot: '我会为你生成一套 30 分钟的<strong>深睡眠修复音乐处方</strong>。根据你的夜间压力指数和近期睡眠质量，建议选择<strong>低频环境音、慢速钢琴和呼吸引导音轨</strong>，帮助身体从高唤醒状态逐渐进入放松状态。',
      prescription: {
        name: '深睡眠修复处方',
        suitable: '入睡困难、思绪过多、夜间焦虑',
        bpm: '60-70',
        tone: '低频环境音、柔和钢琴、呼吸引导',
        duration: '30分钟',
        advice: '睡前30分钟，关闭强光，佩戴耳机或低音量外放',
      },
    },
    '我现在有点焦虑': {
      user: '我现在有点焦虑，想通过音乐放松一下。',
      bot: '理解你的感受。我为你准备了一套<strong>午后焦虑舒缓音乐处方</strong>。结合你的压力指数（72/100），建议使用<strong>轻柔钢琴、自然环境音和渐进式肌肉放松引导</strong>，帮助你快速平复焦虑情绪。',
      prescription: {
        name: '午后焦虑舒缓处方',
        suitable: '轻度焦虑、午后疲惫、情绪波动',
        bpm: '60-75',
        tone: '轻柔钢琴、溪流环境音、渐进放松引导',
        duration: '15分钟',
        advice: '找个安静的角落，闭上眼睛，跟随音乐深呼吸',
      },
    },
    '我需要学习专注': {
      user: '我需要专注学习，有什么音乐推荐吗？',
      bot: '专注力提升方案来了！根据<strong>白噪音和稳定节拍</strong>对注意力维持的积极影响，我为你定制了一套<strong>专注力提升音乐处方</strong>，帮助大脑进入高效专注状态。',
      prescription: {
        name: '专注力提升处方',
        suitable: '学习、工作、阅读、需要长时间专注',
        bpm: '70-85',
        tone: '白噪音基底、稳定节拍、轻电子氛围',
        duration: '30分钟',
        advice: '在工作/学习开始时播放，配合番茄钟效果更佳',
      },
    },
    '我想放松情绪': {
      user: '我想放松一下情绪，最近压力比较大。',
      bot: '情绪放松是音乐疗愈的重要应用方向。我为你推荐一套<strong>情绪舒缓音乐处方</strong>，融合<strong>自然声景、温和弦乐和正念冥想引导</strong>，帮你释放积压的情绪压力。',
      prescription: {
        name: '情绪舒缓处方',
        suitable: '情绪低落、压力积累、需要情感释放',
        bpm: '55-65',
        tone: '自然声景、温和弦乐、正念冥想引导',
        duration: '25分钟',
        advice: '找一个舒适的姿势，允许自己完全放松，不需刻意控制情绪',
      },
    },
    '不知道听什么，让 AI 推荐': {
      user: '我不确定自己需要什么类型的音乐，你能根据我的数据推荐吗？',
      bot: '好的！根据你的<strong>月度健康数据</strong>：HRV 42ms（轻度压力）、睡眠评分 68/100、压力指数 72/100，我判断你目前最需要的是<strong>睡眠质量和压力管理</strong>。建议优先使用<strong>深睡眠修复处方</strong>，并在午后补充一次焦虑舒缓练习。这是为你推荐的方案：',
      prescription: {
        name: 'AI 综合推荐处方',
        suitable: '睡眠质量差、轻度压力、需要综合调理',
        bpm: '60-72',
        tone: '低频环境音、钢琴、呼吸引导、自然声景',
        duration: '30分钟',
        advice: '睡前30分钟使用，配合规律作息，每周至少进行3次',
      },
    },
  };

  aiQuickBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('.ai-quick-btn');
    if (!btn) return;

    const key = btn.textContent.trim();
    const data = quickReplies[key];
    if (!data) return;

    // 添加用户消息
    addChatMessage('user', data.user);

    // 模拟AI思考延迟
    setTimeout(() => {
      addChatMessage('bot', data.bot, data.prescription);
      // 滚动到底部
      aiChatBody.scrollTop = aiChatBody.scrollHeight;
    }, 800);
  });

  function addChatMessage(type, text, prescription) {
    const div = document.createElement('div');
    div.className = `ai-message ai-message-${type}`;

    if (type === 'bot') {
      div.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-bubble">
          <p>${text}</p>
          ${prescription ? `
            <div class="ai-prescription-card">
              <h4>📋 ${prescription.name}</h4>
              <div class="rx-item"><strong>适用状态：</strong>${prescription.suitable}</div>
              <div class="rx-item"><strong>音乐元素：</strong></div>
              <div class="rx-item" style="padding-left:8px;">· BPM：${prescription.bpm}</div>
              <div class="rx-item" style="padding-left:8px;">· 音色：${prescription.tone}</div>
              <div class="rx-item" style="padding-left:8px;">· 时长：${prescription.duration}</div>
              <div class="rx-item"><strong>使用建议：</strong>${prescription.advice}</div>
              <button class="btn-primary btn-generate-rx">生成音乐处方</button>
              <button class="btn-secondary btn-add-to-plan" style="display:none; margin-top:8px; width:100%;">➕ 加入今日计划</button>
            </div>
          ` : ''}
        </div>
      `;

      // 绑定"生成音乐处方"按钮
      setTimeout(() => {
        const genBtn = div.querySelector('.btn-generate-rx');
        const addBtn = div.querySelector('.btn-add-to-plan');
        if (genBtn) {
          genBtn.addEventListener('click', () => {
            genBtn.style.display = 'none';
            if (addBtn) addBtn.style.display = 'block';
            showToast('🎵 音乐处方已生成');
          });
        }
        if (addBtn) {
          addBtn.addEventListener('click', () => {
            addAiPlanToToday(prescription);
          });
        }
      }, 100);

    } else {
      div.innerHTML = `
        <div class="ai-avatar">😊</div>
        <div class="ai-bubble">
          <p>${text}</p>
        </div>
      `;
    }

    aiChatBody.appendChild(div);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
  }

  function addAiPlanToToday(prescription) {
    const planName = 'AI生成：' + prescription.name;
    state.addedPlans.push({
      name: planName,
      type: prescription.tone || 'AI 定制处方',
      reason: prescription.suitable,
    });

    // 创建新处方卡片
    const card = document.createElement('div');
    card.className = 'glass-card plan-card ai-added-plan';
    card.style.animation = 'messageIn 0.4s ease';
    card.innerHTML = `
      <div class="plan-card-top">
        <span class="plan-scene">🤖 AI 定制</span>
        <span class="plan-time">灵活安排</span>
      </div>
      <h3 class="plan-name">${planName}</h3>
      <div class="plan-tags">
        <span>AI处方</span><span>个性化</span><span>${prescription.duration || '30分钟'}</span>
      </div>
      <p class="plan-scene-desc">🏠 适用：${prescription.suitable}</p>
      <div class="plan-actions">
        <button class="btn-primary btn-start-healing">开始疗愈</button>
      </div>
    `;

    // 为新卡片绑定开始疗愈事件
    card.querySelector('.btn-start-healing').addEventListener('click', () => {
      openAiPlayer(prescription);
    });

    planCards.appendChild(card);
    showToast('✅ 已加入今日疗愈计划');

    // 滚动到新卡片
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function openAiPlayer(prescription) {
    playerPrescription.textContent = prescription.name;
    playerType.textContent = prescription.tone || 'AI 定制处方';
    playerReason.textContent = '💡 推荐原因：' + (prescription.suitable || 'AI 根据您的多模态评估数据定制');

    // 根据处方时长动态设置显示时长
    const durMap = { '30分钟': 1800, '15分钟': 900, '25分钟': 1500 };
    state.playerDisplayTotal = durMap[prescription.duration] || 1800;
    state.playerSimSeconds = 30; // 演示模拟保持30秒

    state.isPlaying = false;
    state.playerSeconds = 0;
    playerPlayBtn.textContent = '▶';
    playerDisc.classList.remove('playing');
    playerProgressFill.style.width = '0%';
    playerCurrentTime.textContent = '00:00';
    playerTotalTime.textContent = formatTime(state.playerDisplayTotal);
    btnComplete.textContent = '完成本次疗愈';
    btnComplete.disabled = false;

    clearInterval(state.playerTimer);
    state.playerTimer = null;

    playerOverlay.classList.add('active');
  }

  // ==================== 订阅卡片 ====================
  const subscribeCards = $$('.subscribe-card');
  subscribeCards.forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.planName;
      showToast(`✨ 已选择：${name}`);
      // 高亮选中
      subscribeCards.forEach(c => c.style.outline = 'none');
      card.style.outline = '2px solid var(--accent)';
      card.style.outlineOffset = '2px';
      setTimeout(() => {
        card.style.outline = 'none';
        card.style.outlineOffset = '0';
      }, 2000);
    });
  });

  // ==================== 初始化 ====================
  function init() {
    updateTodayDate();
    updateMonthDisplay();
    updateAllProgress();
    switchTab('plan');
  }

  init();

  // ==================== 键盘辅助 ====================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (aiDrawer.classList.contains('active')) {
        closeAiDrawer();
      } else if (playerOverlay.classList.contains('active')) {
        closePlayer();
      }
    }
  });

})();
