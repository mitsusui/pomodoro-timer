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
    phase = PHASE.WORK_PAUSED;
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
