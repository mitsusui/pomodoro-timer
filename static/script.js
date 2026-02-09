// Parameters
const workDuration = 25 * 60; // seconds
const restDuration = 5 * 60;
// 状態を定義する定数オブジェクト
const PHASE = {
    INIT: 'init',
    WORK: 'work',
    WORK_PAUSED: 'work-paused',
    REST: 'rest',
    REST_PAUSED: 'rest-paused'
};
let phase = PHASE.INIT; // init, work, work-paused, rest, rest-paused
let timer = null;
let startTimestamp = null;
let pausedSeconds = 0;
let leftSeconds = workDuration;
let showCongrats = false;

function pad(n) {
    return n < 10 ? '0'+n : n;
}

//
function renderCircle(progress=1, color='#526fff', bg='#2f3256') {
    const c = document.getElementById('timer-canvas');
    // context for 2d drawing(rendering)
    const ctx = c.getContext('2d');
    // eraser function of the context
    ctx.clearRect(0,0,c.width,c.height);

    // Draw BG arc
    ctx.beginPath();
    ctx.arc(c.width/2, c.height/2, c.width/2-26, -Math.PI/2, 3*Math.PI/2, false);
    ctx.strokeStyle = bg;
    ctx.lineWidth = 15;
    ctx.shadowColor = "rgba(50,60,120,.07)";
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw arc (if active timer) — move begin point to earse counter clock-wise
    if (progress < 1) {
        ctx.beginPath();
        const startAngle = 3*Math.PI/2 - progress*2*Math.PI;
        const endAngle = 3*Math.PI/2;
        ctx.arc(c.width/2, c.height/2, c.width/2-26, startAngle, endAngle, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = 15;
        ctx.lineCap = "round";
        ctx.stroke();
    }
}

// Add appropriate buttons in the button-row div
function renderButtons() {
    const row = document.getElementById('button-row');
    row.innerHTML = '';

    // default phase is init defined at the top
    if (phase === PHASE.INIT) {
        row.appendChild(makeButton('START', startWork, 'mod-btn'));
    } else if (phase === PHASE.WORK) {
        row.appendChild(makeButton('PAUSE', pauseWork, 'mod-btn'));
        row.appendChild(makeButton('FINISH', confirmFinish, 'mod-btn finish'));
    } else if (phase === PHASE.WORK_PAUSED) {
        row.appendChild(makeButton('RESUME', resumeWork, 'mod-btn'));
        row.appendChild(makeButton('FINISH', confirmFinish, 'mod-btn finish'));
    } else if (phase === PHASE.REST) {
        row.appendChild(makeButton('PAUSE', pauseBreak, 'mod-btn'));
        row.appendChild(makeButton('FINISH', confirmFinish, 'mod-btn finish'));
    } else if (phase === PHASE.REST_PAUSED) {
        row.appendChild(makeButton('RESUME', resumeBreak, 'mod-btn'));
        row.appendChild(makeButton('FINISH', confirmFinish, 'mod-btn finish'));
    }
}

// Make button heml element requested from renderButtons
function makeButton(label, handler, cls='') {
    const btn = document.createElement('button');
    btn.innerText = label;
    btn.className = cls;
    // handler represents other functions defined in this file
    btn.onclick = handler;
    return btn;
}

// Update main info and circle counter
function update() {
    // Control text, circle, ready-text and time
    const readyText = document.getElementById('ready-text');
    const t = document.getElementById('time-text');
    if (phase === PHASE.INIT) {
        leftSeconds = workDuration;
        t.innerText = "25:00";
        readyText.textContent = "Are you ready?";
        readyText.style.visibility = "visible";
        renderCircle(1, "#526fff", "#363a56");
    } else if (phase === PHASE.WORK || phase === WORK_PAUSED) {
        readyText.textContent = "Focus";
        readyText.style.visibility = "visible";
        let lsec = leftSeconds;
        t.innerText = `${pad(Math.floor(lsec/60))}:${pad(lsec%60)}`;
        const progress = leftSeconds / workDuration;
        renderCircle(progress, "#526fff", "#363a56");
    } else if (phase === PHASE.REST || phase === PHASE.REST_PAUSED) {
        readyText.textContent = "Relax";
        readyText.style.visibility = "visible";
        t.innerText = `${pad(Math.floor(leftSeconds/60))}:${pad(leftSeconds%60)}`;
        const progress = leftSeconds / restDuration;
        renderCircle(progress, "#1ec28d", "#363a56");
    }
}

// tick (counter process)
function tick() {
    if (phase === PHASE.WORK) {
        leftSeconds = workDuration - pausedSeconds - Math.floor((Date.now() - startTimestamp)/1000);
        if (leftSeconds <= 0) {
            leftSeconds = 0;
            startRest();
            return;
        }
    } else if (phase === PHASE.REST) {
        leftSeconds = restDuration - pausedSeconds - Math.floor((Date.now() - startTimestamp)/1000);
        if (leftSeconds <= 0) {
            finishCycle();
            return;
        }
    }
    update();
    // execute tick function every 1 sec
    timer = setTimeout(tick, 1000);
}

function startWork() {
    phase = PHASE.WORK;
    pausedSeconds = 0;
    leftSeconds = workDuration;
    startTimestamp = Date.now();
    renderButtons();
    update();
    // start counter
    tick();
}

function pauseWork() {
    pausedSeconds += Math.floor((Date.now() - startTimestamp)/1000);
    phase = PHASE.WORK_PAUSED;
    renderButtons();
    update();
    if (timer) clearTimeout(timer);
}

function resumeWork() {
    phase = PHASE.WORK;
    startTimestamp = Date.now();
    renderButtons();
    update();
    tick();
}

function startRest() {
    // record completion time when the statsus switches
    fetch('/notify', { method: 'POST' })
        .then(() => showCongratulationToast())
        .catch(() => {});
    phase = PHASE.REST;
    pausedSeconds = 0;
    leftSeconds = restDuration;
    startTimestamp = Date.now();
    renderButtons();
    update();
    tick();
}

function pauseBreak() {
    pausedSeconds += Math.floor((Date.now() - startTimestamp)/1000);
    phase = PHASE.REST_PAUSED;
    renderButtons();
    update();
    if (timer) clearTimeout(timer);
}

function resumeBreak() {
    phase = PHASE.REST;
    startTimestamp = Date.now();
    renderButtons();
    update();
    tick();
}

function finishCycle() {
    // Reset all
    phase = PHASE.INIT;
    pausedSeconds = 0;
    leftSeconds = workDuration;
    if (timer) clearTimeout(timer);
    renderButtons();
    update();
}

function confirmFinish() {
    if (window.confirm("タイマーを終了しますか？")) {
        finishAndNotify();
    }
}

// FINISH button: Reset timer without recording
function finishAndNotify() {
    phase = PHASE.INIT;
    if (timer) clearTimeout(timer);
    renderButtons();
    update();
}


function showCongratulationToast() {
    // Show simple JS banner as fallback
    if (window.Notification && Notification.permission === "granted") {
        new Notification("Congratulations!", {body: "Great job! You finished your Pomodoro."});
    } else {
        // fallback banner
        const div = document.createElement('div');
        div.innerText = '🎉 Congratulations!';
        div.style.position = 'fixed';
        div.style.bottom = '22px';
        div.style.left = '50%';
        div.style.transform = 'translateX(-50%)';
        div.style.background = '#526fff';
        div.style.color = '#fff';
        div.style.fontSize = '1.15rem';
        div.style.fontWeight = 'bold';
        div.style.padding = '18px 40px';
        div.style.borderRadius = '12px';
        div.style.boxShadow = '0 4px 14px #3359c655';
        div.style.zIndex = '9050';
        document.body.appendChild(div);
        setTimeout(()=>div.remove(), 2700);
    }
}

function renderLogs() {
    fetch('/logs')
        .then(res => res.json())
        .then(data => {
            document.getElementById('log-goal').textContent = '目標: ' + data.goal_rounds + '周のポモドーロ';
            const countEl = document.getElementById('log-count');
            const iconEl = document.getElementById('log-achieved-icon');
            const textEl = countEl.querySelector('.log-count-text');
            textEl.textContent = '完了: ' + data.completed_count + '回';
            if (data.completed_count >= data.goal_rounds && data.goal_rounds > 0) {
                iconEl.textContent = '🏆';
                iconEl.classList.add('is-visible');
            } else {
                iconEl.textContent = '';
                iconEl.classList.remove('is-visible');
            }
            const ul = document.getElementById('log-times');
            ul.innerHTML = '';
            data.completed_times.forEach((t, i) => {
                const li = document.createElement('li');
                li.textContent = (i + 1) + '回目: ' + t;
                ul.appendChild(li);
            });
        })
        .catch(() => {});
}

function closeRecordOverlay() {
    const section = document.getElementById('log-section');
    const btn = document.getElementById('log-toggle-btn');
    if (!section.classList.contains('is-hidden')) {
        section.classList.add('is-hidden');
        btn.textContent = 'Show Record';
        document.body.classList.remove('record-overlay-open');
    }
}

function toggleLogSection() {
    const section = document.getElementById('log-section');
    const btn = document.getElementById('log-toggle-btn');
    if (section.classList.contains('is-hidden')) {
        renderLogs();
        section.classList.remove('is-hidden');
        btn.textContent = 'Close Record';
        document.body.classList.add('record-overlay-open');
    } else {
        closeRecordOverlay();
    }
}

// --- Analysis section ---
let analysisYear = new Date().getFullYear();
let analysisMonth = new Date().getMonth() + 1;
let analysisChartType = 'bar';
let lastAnalysisData = { daily_counts: [], year: null, month: null };

function closeAnalysisOverlay() {
    const section = document.getElementById('analysis-section');
    const btn = document.getElementById('analysis-toggle-btn');
    if (!section.classList.contains('is-hidden')) {
        section.classList.add('is-hidden');
        btn.textContent = 'Show Results';
        document.body.classList.remove('analysis-overlay-open');
    }
}

function openAnalysisOverlay() {
    const section = document.getElementById('analysis-section');
    const btn = document.getElementById('analysis-toggle-btn');
    if (section.classList.contains('is-hidden')) {
        section.classList.remove('is-hidden');
        btn.textContent = 'Close Results';
        document.body.classList.add('analysis-overlay-open');
        loadAnalysisData();
    } else {
        closeAnalysisOverlay();
    }
}

function loadAnalysisData() {
    document.getElementById('analysis-month-label').textContent =
        analysisYear + '-' + String(analysisMonth).padStart(2, '0');
    fetch('/analysis?year=' + analysisYear + '&month=' + analysisMonth)
        .then(res => res.json())
        .then(data => {
            document.getElementById('analysis-total-count').textContent = data.total_count;
            const gap = data.goal_gap;
            document.getElementById('analysis-goal-gap').textContent =
                (gap >= 0 ? '+' : '') + gap;
            const h = Math.floor(data.total_minutes / 60);
            const m = data.total_minutes % 60;
            document.getElementById('analysis-total-time').textContent =
                h + 'h ' + String(m).padStart(2, '0') + 'm';
            document.getElementById('analysis-weekday-avg').textContent = data.weekday_avg;
            document.getElementById('analysis-weekend-avg').textContent = data.weekend_avg;
            document.getElementById('analysis-morning-count').textContent = data.morning_count;
            document.getElementById('analysis-afternoon-count').textContent = data.afternoon_count;
            document.getElementById('analysis-night-count').textContent = data.night_count;
            lastAnalysisData = { daily_counts: data.daily_counts, year: data.year, month: data.month };
            drawAnalysisGraph();
        })
        .catch(() => {
            document.getElementById('analysis-total-count').textContent = '0';
            document.getElementById('analysis-goal-gap').textContent = '0';
            document.getElementById('analysis-total-time').textContent = '0h 00m';
            document.getElementById('analysis-weekday-avg').textContent = '0';
            document.getElementById('analysis-weekend-avg').textContent = '0';
            document.getElementById('analysis-morning-count').textContent = '0';
            document.getElementById('analysis-afternoon-count').textContent = '0';
            document.getElementById('analysis-night-count').textContent = '0';
            lastAnalysisData = { daily_counts: [], year: analysisYear, month: analysisMonth };
            drawAnalysisGraph();
        });
}

const ANALYSIS_CHART_WIDTH = 620;
const ANALYSIS_CHART_HEIGHT = 220;

function drawAnalysisGraph() {
    const canvas = document.getElementById('analysis-graph');
    const cw = ANALYSIS_CHART_WIDTH;
    const ch = ANALYSIS_CHART_HEIGHT;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);
    const dailyCounts = lastAnalysisData.daily_counts || [];
    const n = dailyCounts.length;
    const padLeft = 28;
    const padRight = 12;
    const padTop = 8;
    const padBottom = 24;
    const chartW = cw - padLeft - padRight;
    const chartH = ch - padTop - padBottom;
    if (n === 0) {
        ctx.fillStyle = '#979dcf';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('データがありません', cw / 2, ch / 2);
        return;
    }
    const maxVal = Math.max(1, Math.max.apply(null, dailyCounts));
    const barGap = 1;
    const barW = Math.max(1, (chartW - (n - 1) * barGap) / n);
    const stepX = barW + barGap;
    const zeroY = padTop + chartH;
    if (analysisChartType === 'bar') {
        for (let i = 0; i < n; i++) {
            const x = padLeft + i * stepX;
            const rh = (dailyCounts[i] / maxVal) * chartH;
            const y = zeroY - rh;
            ctx.fillStyle = '#526fff';
            ctx.fillRect(x, y, barW, rh);
        }
    } else {
        ctx.beginPath();
        ctx.strokeStyle = '#526fff';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
            const x = padLeft + (i + 0.5) * stepX;
            const rh = (dailyCounts[i] / maxVal) * chartH;
            const y = zeroY - rh;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = '#526fff';
        for (let i = 0; i < n; i++) {
            const x = padLeft + (i + 0.5) * stepX;
            const rh = (dailyCounts[i] / maxVal) * chartH;
            const y = zeroY - rh;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.fillStyle = '#979dcf';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const labelStep = n <= 15 ? 1 : Math.ceil(n / 8);
    for (let i = 0; i < n; i += labelStep) {
        const x = padLeft + (i + 0.5) * stepX;
        ctx.fillText(i + 1, x, ch - 6);
    }
}

function setAnalysisChartType(type) {
    analysisChartType = type;
    document.getElementById('chart-type-bar').classList.toggle('active', type === 'bar');
    document.getElementById('chart-type-bar').setAttribute('aria-pressed', type === 'bar');
    document.getElementById('chart-type-line').classList.toggle('active', type === 'line');
    document.getElementById('chart-type-line').setAttribute('aria-pressed', type === 'line');
    drawAnalysisGraph();
}

function analysisPrevMonth() {
    analysisMonth -= 1;
    if (analysisMonth < 1) {
        analysisMonth = 12;
        analysisYear -= 1;
    }
    loadAnalysisData();
}

function analysisNextMonth() {
    analysisMonth += 1;
    if (analysisMonth > 12) {
        analysisMonth = 1;
        analysisYear += 1;
    }
    loadAnalysisData();
}

// Request notification permission on load
if (window.Notification && Notification.permission !== "granted") {
    Notification.requestPermission();
}


// Execute when window loaded
window.onload = function() {
    renderButtons();
    update();
    document.getElementById('log-toggle-btn').onclick = toggleLogSection;
    document.getElementById('log-close-btn').onclick = closeRecordOverlay;
    document.getElementById('log-overlay-backdrop').onclick = closeRecordOverlay;
    document.getElementById('analysis-toggle-btn').onclick = openAnalysisOverlay;
    document.getElementById('analysis-close-btn').onclick = closeAnalysisOverlay;
    document.getElementById('analysis-overlay-backdrop').onclick = closeAnalysisOverlay;
    document.getElementById('prev-month-btn').onclick = analysisPrevMonth;
    document.getElementById('next-month-btn').onclick = analysisNextMonth;
    document.getElementById('chart-type-bar').onclick = function() { setAnalysisChartType('bar'); };
    document.getElementById('chart-type-line').onclick = function() { setAnalysisChartType('line'); };
    // responsive canvas
    function resizeCanvas() {
        let canvas = document.getElementById('timer-canvas');
        let size = Math.min(300, window.innerWidth-32, window.innerHeight-200);
        canvas.width = size;
        canvas.height = size;
        update();
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
};
