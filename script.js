// ==========================================
//  JUNIOR+ 完全版 script.js
//  (絵文字削除 + 全モード保存対応)
// ==========================================

let quiz_data = { textbook_pages: {}, quizzes: [], kakomon: [] };
let currentQuizList = [];
let currentQuizIndex = 0;
let correctCount = 0;
let startTime = 0;
let wrongQuestions = [];
let isReviewMode = false;
let pendingQuizMode = 'normal'; 
let pendingQuestionLimit = 50;
let isDataLoaded = false; 

// DOM要素
const canvas = document.getElementById('opening-canvas');
const ctx = canvas.getContext('2d');

const titleScreen = document.getElementById('title-screen');
const menuScreen = document.getElementById('menu-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const historyScreen = document.getElementById('history-screen');
const ruleModal = document.getElementById('rule-modal');
const randomModal = document.getElementById('random-modal');
const pastModal = document.getElementById('past-modal');

const titleStartBtn = document.getElementById('title-start-btn');
const resumeBtn = document.getElementById('resume-btn'); 
const startQuizBtn = document.getElementById('start-quiz-btn');
const randomMenuBtn = document.getElementById('random-menu-btn');
const pastMenuBtn = document.getElementById('past-menu-btn'); 
const randomOptBtns = document.querySelectorAll('.random-opt-btn');
const pastOptBtns = document.querySelectorAll('.past-opt-btn'); 
const reviewModeBtn = document.getElementById('review-mode-btn');
const historyBtn = document.getElementById('history-btn');
const closeHistoryBtn = document.getElementById('close-history-btn');
const ruleStartBtn = document.getElementById('rule-start-btn');
const closeRuleBtn = document.getElementById('close-rule-btn');
const closeRandomBtn = document.getElementById('close-random-btn');
const closePastBtn = document.getElementById('close-past-btn'); 
const quitQuizBtn = document.getElementById('quit-quiz-btn');
const retryBtn = document.getElementById('retry-btn');
const retryWrongBtn = document.getElementById('retry-wrong-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const nextBtn = document.getElementById('next-btn');

const questionArea = document.getElementById('question-area');
const processingArea = document.getElementById('processing-area');
const answerArea = document.getElementById('answer-area');
const questionNumberEl = document.getElementById('question-number');
const questionTextEl = document.getElementById('question-text');
const optionBtns = document.querySelectorAll('.option-btn');
const hintContainer = document.getElementById('hint-container');
const hintToggleBtn = document.getElementById('hint-toggle-btn');
const hintAreaEl = document.getElementById('hint-area');
const hintPageInfoEl = document.getElementById('hint-page-info');
const hintTextEl = document.getElementById('hint-text');
const feedbackEl = document.getElementById('feedback');
const actionBar = document.getElementById('action-bar');
const progressBar = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

const resultRankEl = document.getElementById('result-rank');
const resultScoreEl = document.getElementById('result-score');
const passFailTextEl = document.getElementById('pass-fail-text');
const resultAccuracyEl = document.getElementById('result-accuracy');
const resultTimeEl = document.getElementById('result-time');
const resultSpeedEl = document.getElementById('result-speed');
const wrongAnswerSection = document.getElementById('wrong-answer-section');
const wrongAnswerList = document.getElementById('wrong-answer-list');
const historyList = document.getElementById('history-list');

const loaderEl = document.querySelector('.colorful-loader');
if (loaderEl) { loaderEl.style.width = '200px'; loaderEl.style.height = '200px'; loaderEl.style.borderWidth = '16px'; }

// ==========================================
//  0. データ読み込み
// ==========================================
async function fetchAllData() {
    try {
        const [textbookRes, mondaiRes, kakomonRes] = await Promise.all([
            fetch('./data.json'),
            fetch('./mondai.json'),
            fetch('./kakomon.json').catch(() => ({ ok: false }))
        ]);

        if (!textbookRes.ok || !mondaiRes.ok) throw new Error("読込失敗");
        
        const textbookData = await textbookRes.json();
        const mondaiData = await mondaiRes.json();
        let kakomonData = [];
        if (kakomonRes.ok) kakomonData = await kakomonRes.json();

        quiz_data.textbook_pages = textbookData.textbook_pages || textbookData;
        quiz_data.quizzes = mondaiData.quizzes || mondaiData;
        quiz_data.kakomon = kakomonData.quizzes || kakomonData;

        isDataLoaded = true;
        
        checkSavedReviewData(); 
        checkInterruptedSession(); 
        initAnimation();
    } catch (error) {
        console.error("エラー:", error);
        canvas.style.display = 'none'; titleScreen.classList.remove('hidden');
        alert("データ読込エラー。\nLive Serverで実行していますか？");
    }
}
document.addEventListener('DOMContentLoaded', fetchAllData);

function checkSavedReviewData() {
    if (!reviewModeBtn) return;
    const savedWrongIds = JSON.parse(localStorage.getItem('junior_review_queue') || '[]');
    if (savedWrongIds.length > 0) {
        reviewModeBtn.classList.remove('hidden');
        reviewModeBtn.innerHTML = `間違えた問題を復習 (${savedWrongIds.length}問)`;
    } else {
        reviewModeBtn.classList.add('hidden');
    }
}

function checkInterruptedSession() {
    const savedSession = localStorage.getItem('junior_quiz_session');
    if (savedSession && resumeBtn) {
        resumeBtn.classList.remove('hidden');
    } else if (resumeBtn) {
        resumeBtn.classList.add('hidden');
    }
}

// ==========================================
//  1. オープニングアニメーション
// ==========================================
const logoImage = new Image(); logoImage.src = 'image.png'; 
let particles = []; let animationPhase = 'fadein'; let zoomScale = 0.5; let logoOpacity = 0; let waitStartTime = null;
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.size = Math.random() * 20 + 5; 
        const angle = Math.atan2(y - canvas.height / 2, x - canvas.width / 2);
        const speed = Math.random() * 20 + 10; 
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.color = color; this.rotation = Math.random() * Math.PI;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3; this.life = 1.0; 
    }
    update() { this.x += this.vx; this.y += this.vy; this.rotation += this.rotationSpeed; this.life -= 0.02; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.fillStyle = this.color; ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size); ctx.restore();
    }
}
function animate(timestamp) {
    if (animationPhase === 'done') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2; const centerY = canvas.height / 2;
    if (animationPhase === 'fadein') {
        logoOpacity += 0.03; if (logoOpacity >= 1) { logoOpacity = 1; animationPhase = 'wait'; waitStartTime = timestamp; }
        ctx.save(); ctx.globalAlpha = logoOpacity;
        const drawW = logoImage.width * zoomScale; const drawH = logoImage.height * zoomScale;
        ctx.drawImage(logoImage, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH); ctx.restore();
    } else if (animationPhase === 'wait') {
        if (timestamp - waitStartTime > 600) animationPhase = 'zoom';
        const drawW = logoImage.width * zoomScale; const drawH = logoImage.height * zoomScale;
        ctx.drawImage(logoImage, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    } else if (animationPhase === 'zoom') {
        zoomScale *= 1.05; const drawW = logoImage.width * zoomScale; const drawH = logoImage.height * zoomScale;
        ctx.drawImage(logoImage, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
        if (drawW > canvas.width * 3) {
            createExplosion(); animationPhase = 'explode';
            canvas.style.background = 'transparent'; canvas.style.pointerEvents = 'none'; 
            titleScreen.classList.remove('hidden');
        }
    } else if (animationPhase === 'explode') {
        let activeParticles = false;
        particles.forEach(p => { p.update(); if (p.life > 0) { p.draw(); activeParticles = true; } });
        if (!activeParticles) { animationPhase = 'done'; canvas.style.display = 'none'; }
    }
    requestAnimationFrame(animate);
}
function createExplosion() {
    const colors = ['#ff9900', '#333333', '#ffffff', '#ffffff', '#ffcc80']; 
    const particleCount = window.innerWidth < 600 ? 400 : 1000; 
    for (let i = 0; i < particleCount; i++) {
        const x = canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.8;
        const y = canvas.height / 2 + (Math.random() - 0.5) * canvas.height * 0.8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color));
    }
}
function initAnimation() {
    if (logoImage.complete && logoImage.naturalWidth !== 0) { requestAnimationFrame(animate); }
    else { logoImage.onload = () => { requestAnimationFrame(animate); }; logoImage.onerror = () => { canvas.style.display = 'none'; titleScreen.classList.remove('hidden'); }; }
}

// ==========================================
//  2. クイズ機能コア
// ==========================================

function formatHintText(text) { return text ? text.replace(/\n/g, '<br>') : ''; }
function formatPageNum(pageStr) { return pageStr ? pageStr.replace('p', '') : ""; }

function openRandomModal() { if (!isDataLoaded) { alert("準備中です"); return; } randomModal.classList.remove('hidden'); }
function openPastModal() { if (!isDataLoaded) { alert("準備中です"); return; } pastModal.classList.remove('hidden'); }

function selectRandomCount(count) {
    pendingQuestionLimit = parseInt(count);
    randomModal.classList.add('hidden');
    triggerStartQuiz('random');
}
function selectPastCount(count) {
    pendingQuestionLimit = parseInt(count);
    pastModal.classList.add('hidden');
    triggerStartQuiz('kakomon');
}

function triggerStartQuiz(mode = 'normal') {
    if (!isDataLoaded) { alert("準備中です"); return; }
    pendingQuizMode = mode;
    if (mode === 'normal' || mode === 'review') pendingQuestionLimit = 50;
    ruleModal.classList.remove('hidden');
}

function startQuiz() {
    ruleModal.classList.add('hidden');
    localStorage.removeItem('junior_quiz_session');
    if (resumeBtn) resumeBtn.classList.add('hidden');

    isReviewMode = (pendingQuizMode === 'review');
    
    if (pendingQuizMode === 'review') {
        const savedIds = JSON.parse(localStorage.getItem('junior_review_queue') || '[]');
        currentQuizList = quiz_data.quizzes.filter(q => savedIds.includes(q.id)).sort(() => Math.random() - 0.5);
    } else if (pendingQuizMode === 'random') {
        const shuffled = [...quiz_data.quizzes].sort(() => Math.random() - 0.5);
        currentQuizList = shuffled.slice(0, pendingQuestionLimit);
    } else if (pendingQuizMode === 'kakomon') {
        if (!quiz_data.kakomon || quiz_data.kakomon.length === 0) {
            alert("過去問データがありません");
            menuScreen.classList.remove('hidden');
            return;
        }
        const shuffled = [...quiz_data.kakomon].sort(() => Math.random() - 0.5);
        currentQuizList = shuffled.slice(0, pendingQuestionLimit);
    } else {
        currentQuizList = [...quiz_data.quizzes]; 
    }

    if (currentQuizList.length === 0) { alert("問題がありません！"); return; }

    currentQuizIndex = 0; correctCount = 0; wrongQuestions = []; startTime = Date.now();
    
    menuScreen.classList.add('hidden'); resultScreen.classList.add('hidden'); quizScreen.classList.remove('hidden');
    loadQuiz();
}

function resumeQuiz() {
    const session = JSON.parse(localStorage.getItem('junior_quiz_session'));
    if (!session) return;
    
    let sourceData = quiz_data.quizzes;
    if (session.mode === 'kakomon') sourceData = quiz_data.kakomon;
    
    currentQuizList = session.quizIds.map(id => sourceData.find(q => q.id === id)).filter(q => q);
    currentQuizIndex = session.index;
    correctCount = session.correct;
    wrongQuestions = session.wrongIds.map(id => sourceData.find(q => q.id === id)).filter(q => q);
    pendingQuizMode = session.mode;
    isReviewMode = (session.mode === 'review');
    pendingQuestionLimit = session.limit;
    
    startTime = Date.now() - session.elapsed;

    titleScreen.classList.add('hidden'); quizScreen.classList.remove('hidden');
    loadQuiz();
}

function saveSession() {
    const elapsedTime = Date.now() - startTime;
    const sessionData = {
        quizIds: currentQuizList.map(q => q.id),
        index: currentQuizIndex,
        correct: correctCount,
        wrongIds: wrongQuestions.map(q => q.id),
        mode: pendingQuizMode,
        limit: pendingQuestionLimit,
        elapsed: elapsedTime
    };
    localStorage.setItem('junior_quiz_session', JSON.stringify(sessionData));
    checkInterruptedSession();
}

function loadQuiz() {
    if (currentQuizIndex >= currentQuizList.length) { finishQuiz(); return; }
    const currentQuiz = currentQuizList[currentQuizIndex];
    saveSession();
    questionArea.classList.remove('hidden'); processingArea.classList.add('hidden');
    answerArea.classList.add('hidden'); actionBar.classList.add('hidden');
    const originalParent = document.querySelector('#question-area');
    if(originalParent && hintContainer && !originalParent.contains(hintContainer)) { originalParent.appendChild(hintContainer); }
    hintContainer.classList.remove('hidden'); hintAreaEl.classList.add('hidden'); hintToggleBtn.textContent = 'ヒントを見る';
    optionBtns.forEach(btn => { btn.disabled = false; btn.classList.remove('correct', 'wrong'); });
    questionNumberEl.textContent = `Q.${currentQuizIndex + 1}`;
    questionTextEl.innerHTML = currentQuiz.question;
    const cleanPageNum = formatPageNum(currentQuiz.hint_page);
    hintPageInfoEl.textContent = `【教科書 P.${cleanPageNum}】`;
    hintTextEl.innerHTML = formatHintText(currentQuiz.hint_text);
    const progress = ((currentQuizIndex + 1) / currentQuizList.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${currentQuizIndex + 1} / ${currentQuizList.length}`;
    nextBtn.textContent = (currentQuizIndex === currentQuizList.length - 1) ? "結果を見る" : "次の問題へ";
}

function checkAnswer(selectedAnswer) {
    const currentQuiz = currentQuizList[currentQuizIndex];
    const isCorrect = selectedAnswer === currentQuiz.correct_answer;
    if (isCorrect) correctCount++;
    else wrongQuestions.push(currentQuiz);
    saveSession();
    questionArea.classList.add('hidden'); processingArea.classList.remove('hidden');
    setTimeout(() => {
        processingArea.classList.add('hidden'); answerArea.classList.remove('hidden'); actionBar.classList.remove('hidden');
        if (isCorrect) {
            feedbackEl.innerHTML = `<span class="result-big-text" style="color:#28a745;">⭕正解</span><div class="result-detail" style="font-size: 1.5rem;">素晴らしい！</div>`;
            if(hintContainer) hintContainer.classList.add('hidden'); 
        } else {
            feedbackEl.innerHTML = `<span class="result-big-text" style="color:#dc3545;">❌不正解</span><div class="result-detail">正解は「${currentQuiz.correct_answer}」です</div>`;
            if(hintContainer) {
                answerArea.appendChild(hintContainer);
                hintContainer.classList.remove('hidden'); hintAreaEl.classList.add('hidden'); hintToggleBtn.textContent = '解説を見る';
            }
        }
    }, 800);
}

function finishQuiz() {
    localStorage.removeItem('junior_quiz_session');
    checkInterruptedSession();
    const endTime = Date.now();
    const totalTimeMs = endTime - startTime;
    const totalSeconds = Math.floor(totalTimeMs / 1000);
    const questionCount = currentQuizList.length;
    const score = Math.round((correctCount / questionCount) * 100);
    let rank = 'D';
    const avgSpeed = totalSeconds / questionCount; 
    if (score >= 96 && avgSpeed <= 5) rank = 'S';
    else if (score >= 90) rank = 'A';
    else if (score >= 80) rank = 'B';
    else if (score >= 70) rank = 'C';
    else rank = 'D';

    if(resultScoreEl) resultScoreEl.textContent = score;
    if(resultRankEl) { resultRankEl.textContent = rank; resultRankEl.className = `rank-badge rank-${rank}`; }
    if(passFailTextEl) {
        passFailTextEl.textContent = score >= 70 ? "合格圏内です！" : "あと少し頑張りましょう";
        passFailTextEl.className = score >= 70 ? "pass-fail pass" : "pass-fail fail";
    }
    if(resultAccuracyEl) resultAccuracyEl.textContent = `${score}%`;
    if(resultTimeEl) resultTimeEl.textContent = `${Math.floor(totalSeconds / 60)}分${String(totalSeconds % 60).padStart(2, '0')}秒`;
    if(resultSpeedEl) resultSpeedEl.textContent = `${avgSpeed.toFixed(1)}秒`;

    if(wrongAnswerList) wrongAnswerList.innerHTML = '';
    if (wrongQuestions.length > 0) {
        if(wrongAnswerSection) wrongAnswerSection.classList.remove('hidden');
        wrongQuestions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'wrong-item';
            div.innerHTML = `
                <div class="wrong-question">Q.${q.id} ${q.question.substring(0, 20)}...</div>
                <div class="wrong-details">
                    <p><strong>正解:</strong> ${q.correct_answer}</p>
                    <p><strong>解説:</strong> ${formatHintText(q.hint_text)}</p>
                </div>
            `;
            div.querySelector('.wrong-question').addEventListener('click', () => div.classList.toggle('open'));
            wrongAnswerList.appendChild(div);
        });

        // ★保存ルール変更: どのモードでも間違えたら必ず保存（上書き）
        const wrongIds = wrongQuestions.map(q => q.id);
        localStorage.setItem('junior_review_queue', JSON.stringify(wrongIds));
        
    } else {
        if(wrongAnswerSection) wrongAnswerSection.classList.add('hidden');
        if(!isReviewMode && pendingQuizMode === 'normal') localStorage.removeItem('junior_review_queue');
    }

    saveHistory(rank, score, totalSeconds, questionCount);
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
}

function saveHistory(rank, score, time, qCount) {
    let modeText = '通常';
    if(isReviewMode) modeText = '復習';
    else if(pendingQuizMode === 'random') modeText = `ランダム(${qCount}問)`;
    else if(pendingQuizMode === 'kakomon') modeText = `過去問(${qCount}問)`;

    const historyData = {
        date: new Date().toLocaleString(),
        rank: rank, score: score, time: time,
        mode: modeText,
        wrongs: wrongQuestions.map(q => ({ id: q.id, q_text: q.question, ans: q.correct_answer, hint: q.hint_text }))
    };
    let history = JSON.parse(localStorage.getItem('junior_history') || '[]');
    history.unshift(historyData);
    if (history.length > 50) history.pop();
    localStorage.setItem('junior_history', JSON.stringify(history));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem('junior_history') || '[]');
    if(historyList) historyList.innerHTML = '';
    if (history.length === 0) {
        if(historyList) historyList.innerHTML = '<p class="no-data" style="text-align:center; margin-top:20px;">履歴はまだありません。</p>';
    } else {
        history.forEach(h => {
            const div = document.createElement('div');
            div.className = 'history-card';
            let html = `
                <div class="history-header">
                    <div>
                        <div class="h-date">${h.date} - ${h.mode}</div>
                        <div class="h-score">${h.score}点 <small>(${Math.floor(h.time/60)}分${h.time%60}秒)</small></div>
                    </div>
                    <div class="h-rank rank-${h.rank}">${h.rank}</div>
                </div>
            `;
            if (h.wrongs && h.wrongs.length > 0) {
                html += `<div class="history-details"><strong>間違えた問題 (${h.wrongs.length}問)</strong><br>`;
                h.wrongs.forEach(w => {
                    html += `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed #ccc;">
                        <small>Q.${w.id} ${w.q_text}</small><br>
                        <span style="color:#28a745;">正解: ${w.ans}</span>
                        <p style="font-size:0.9rem; margin-top:5px; color:#666;">${formatHintText(w.hint)}</p>
                    </div>`;
                });
                html += `</div>`;
            } else {
                html += `<div class="history-details">全問正解です！</div>`;
            }
            div.innerHTML = html;
            div.querySelector('.history-header').addEventListener('click', () => { div.classList.toggle('open'); });
            historyList.appendChild(div);
        });
    }
    menuScreen.classList.add('hidden');
    historyScreen.classList.remove('hidden');
}

// --- イベント設定 ---
if(titleStartBtn) titleStartBtn.addEventListener('click', () => { titleScreen.classList.add('hidden'); menuScreen.classList.remove('hidden'); checkSavedReviewData(); });
if(resumeBtn) resumeBtn.addEventListener('click', resumeQuiz);

if(randomMenuBtn) randomMenuBtn.addEventListener('click', openRandomModal);
randomOptBtns.forEach(btn => { btn.addEventListener('click', () => selectRandomCount(btn.dataset.count)); });

if(pastMenuBtn) pastMenuBtn.addEventListener('click', openPastModal);
if(pastOptBtns) pastOptBtns.forEach(btn => { btn.addEventListener('click', () => selectPastCount(btn.dataset.count)); });

if(startQuizBtn) startQuizBtn.addEventListener('click', () => triggerStartQuiz('normal'));
if(reviewModeBtn) reviewModeBtn.addEventListener('click', () => triggerStartQuiz('review'));
if(ruleStartBtn) ruleStartBtn.addEventListener('click', startQuiz);
if(closeRuleBtn) closeRuleBtn.addEventListener('click', () => ruleModal.classList.add('hidden'));
if(closeRandomBtn) closeRandomBtn.addEventListener('click', () => randomModal.classList.add('hidden'));
if(closePastBtn) closePastBtn.addEventListener('click', () => pastModal.classList.add('hidden'));

if(historyBtn) historyBtn.addEventListener('click', showHistory);
if(closeHistoryBtn) closeHistoryBtn.addEventListener('click', () => { historyScreen.classList.add('hidden'); menuScreen.classList.remove('hidden'); });
if(quitQuizBtn) quitQuizBtn.addEventListener('click', () => { 
    if(confirm('中断しますか？\n(データは保存され、次回タイトル画面から再開できます)')) { 
        quizScreen.classList.add('hidden'); titleScreen.classList.remove('hidden'); checkInterruptedSession();
    } 
});
if(retryBtn) retryBtn.addEventListener('click', () => { resultScreen.classList.add('hidden'); triggerStartQuiz('normal'); });
if(retryWrongBtn) retryWrongBtn.addEventListener('click', () => { resultScreen.classList.add('hidden'); triggerStartQuiz('review'); });
if(backToMenuBtn) backToMenuBtn.addEventListener('click', () => { resultScreen.classList.add('hidden'); menuScreen.classList.remove('hidden'); checkSavedReviewData(); });

if(optionBtns) optionBtns.forEach(btn => { btn.addEventListener('click', () => { checkAnswer(btn.dataset.answer); }); });
if(hintToggleBtn) hintToggleBtn.addEventListener('click', () => {
    const isHidden = hintAreaEl.classList.contains('hidden');
    if (isHidden) { hintAreaEl.classList.remove('hidden'); hintToggleBtn.textContent = '解説を閉じる'; }
    else { hintAreaEl.classList.add('hidden'); hintToggleBtn.textContent = '解説を見る'; }
});
if(nextBtn) nextBtn.addEventListener('click', () => {
    const originalParent = document.querySelector('#question-area');
    if(originalParent && hintContainer && !originalParent.contains(hintContainer)) { originalParent.appendChild(hintContainer); }
    currentQuizIndex++; loadQuiz();
});