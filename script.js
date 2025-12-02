/* Quiz App - fully functional with:
   - sounds via WebAudio
   - categories and question sets
   - timer, progress, next logic
   - highest score saved in localStorage per category
   - celebration confetti + result animation
   - clear inline comments for learning
*/

document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------
     Element references
     --------------------------- */
  const startBtn = document.getElementById("start-btn");
  const categorySelect = document.getElementById("category");
  const progressBar = document.getElementById("progress-bar");
  const questionArea = document.getElementById("question-area");
  const questionText = document.getElementById("question-text");
  const optionsBox = document.getElementById("options");
  const timerEl = document.getElementById("timer");
  const nextBtn = document.getElementById("next-btn");
  const scoreEl = document.getElementById("score");
  const qcountEl = document.getElementById("qcount");
  const resultBox = document.getElementById("result-box");
  const scoreText = document.getElementById("score-text");
  const percentText = document.getElementById("percent-text");
  const bestText = document.getElementById("best-text");
  const highscoreLabel = document.getElementById("highscore");
  const retryBtn = document.getElementById("retry-btn");
  const changeBtn = document.getElementById("change-btn");
  const confettiWrap = document.getElementById("confetti-wrap");
  const pickOption = document.getElementById("pick");

  /* ---------------------------
     Questions by category
     Add/remove category objects here
     --------------------------- */
  const QUESTION_BANK = {
    general: [
      {
        question: "What is the capital of France?",
        choices: ["Paris", "London", "Berlin", "Rome"],
        answer: "Paris",
      },
      {
        question: "Which language runs in a web browser?",
        choices: ["Java", "C#", "JavaScript", "Python"],
        answer: "JavaScript",
      },
      {
        question: "HTML stands for?",
        choices: [
          "HyperText Markup Language",
          "HighText",
          "HyperTrain",
          "HyperTool",
        ],
        answer: "HyperText Markup Language",
      },
      {
        question: "Which day is celebrated as World Earth Day?",
        choices: ["April 22", "May 1", "June 5", "March 20"],
        answer: "April 22",
      },
    ],
    science: [
      {
        question: "What planet is known as the Red Planet?",
        choices: ["Mars", "Venus", "Jupiter", "Neptune"],
        answer: "Mars",
      },
      {
        question: "Water's chemical formula?",
        choices: ["H2O", "CO2", "O2", "H2"],
        answer: "H2O",
      },
      {
        question: "The powerhouse of the cell?",
        choices: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"],
        answer: "Mitochondria",
      },
      {
        question: "Light speed approx?",
        choices: [
          "300,000 km/s",
          "150,000 km/s",
          "1,000,000 km/s",
          "30,000 km/s",
        ],
        answer: "300,000 km/s",
      },
    ],
    history: [
      {
        question: "Who discovered America (commonly credited)?",
        choices: [
          "Christopher Columbus",
          "Vasco da Gama",
          "Leif Erikson",
          "Magellan",
        ],
        answer: "Christopher Columbus",
      },
      {
        question: "Which year did WW2 end?",
        choices: ["1945", "1939", "1918", "1950"],
        answer: "1945",
      },
      {
        question: "The Great Pyramid is in which country?",
        choices: ["Egypt", "Mexico", "Peru", "Iraq"],
        answer: "Egypt",
      },
      {
        question: "Which empire was ruled by Julius Caesar?",
        choices: [
          "Roman Empire",
          "Mongol Empire",
          "Ottoman Empire",
          "Persian Empire",
        ],
        answer: "Roman Empire",
      },
    ],
  };

  /* ---------------------------
     State variables
     --------------------------- */
  let questions = [];
  let shuffled = [];
  let currentIndex = 0;
  let score = 0;
  let timer = null;
  let timeLeft = 25; // seconds per question
  const PER_QUESTION_TIME = 25;

  /* ---------------------------
     WebAudio simple tones for feedback (no external assets)
     --------------------------- */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;

  function playTone(freq, duration = 150, type = "sine") {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    o.start();
    setTimeout(() => {
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02);
      o.stop(audioCtx.currentTime + 0.03);
    }, duration);
  }
  function soundCorrect() {
    playTone(880, 220, "sine");
  }
  function soundWrong() {
    playTone(220, 220, "sawtooth");
  }
  function soundClick() {
    playTone(520, 100, "triangle");
  }

  /* ---------------------------
     Helpers: localStorage highscore by category
     --------------------------- */
  function getHighScore(cat) {
    const raw = localStorage.getItem(`quiz_high_${cat}`);
    return raw ? JSON.parse(raw) : null;
  }
  function setHighScore(cat, value) {
    localStorage.setItem(`quiz_high_${cat}`, JSON.stringify(value));
  }
  function updateHighscoreLabel(cat) {
    const hs = getHighScore(cat);
    highscoreLabel.textContent = hs ? `High: ${hs}` : `High: —`;
  }

  /* ---------------------------
     Start / Init
     --------------------------- */
  startBtn.addEventListener("click", () => {
    soundClick();

    // ---- SUBJECT PICK VALIDATION ----
    if (categorySelect.value === "pick") {
      pickOption.textContent = "— Select subject —";
      categorySelect.classList.add("warning");

      setTimeout(() => {
        categorySelect.classList.remove("warning");
        pickOption.textContent = "pick a subject"; // reset text
      }, 2000);

      // Remove warning after 2 seconds
      setTimeout(() => {
        if (categorySelect.value !== "pick") {
          categorySelect.classList.remove("warning");
          pickOption.textContent = "pick a subject";
        }
      }, 2000);

      return; // stop start
    }
    // ---------------------------------

    initQuiz(categorySelect.value);
  });

  categorySelect.addEventListener("change", () => {
    if (categorySelect.value !== "pick") {
      categorySelect.classList.remove("warning");
      pickOption.textContent = "pick a subject";
    }
  });

  // retry and change
  retryBtn.addEventListener("click", () => {
    soundClick();
    initQuiz(categorySelect.value);
  });
  changeBtn.addEventListener("click", () => {
    soundClick();
    // show header controls so user can change category
    questionArea.classList.add("hidden");
    resultBox.classList.add("hidden");
    document.getElementById("start-btn").classList.remove("hidden");
  });

  /* ---------------------------
     Initialize quiz for selected category
     --------------------------- */
  function initQuiz(category) {
    // load questions for category and shuffle

    questions = QUESTION_BANK[category] ? [...QUESTION_BANK[category]] : [];
    shuffled = questions.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    score = 0;
    // show highscore for selected category
    updateHighscoreLabel(category);

    // UI toggles
    document.getElementById("start-btn").classList.add("hidden");
    questionArea.classList.remove("hidden");
    resultBox.classList.add("hidden");

    // update UI
    scoreEl.textContent = `Score: ${score}`;
    qcountEl.textContent = `${currentIndex + 1} / ${shuffled.length}`;
    progressBar.style.width = "0%";

    // show first question
    showQuestion();
  }

  /* ---------------------------
     Show question & choices
     --------------------------- */
  function showQuestion() {
    // reset option list and next button
    nextBtn.classList.add("hidden");
    optionsBox.innerHTML = "";

    const qObj = shuffled[currentIndex];
    questionText.textContent = qObj.question;

    // create option elements
    qObj.choices.forEach((choice) => {
      const li = document.createElement("li");
      li.className = "option";
      li.setAttribute("role", "option");
      li.setAttribute("tabindex", "0");
      li.textContent = choice;

      // click handler (and keyboard Enter)
      li.addEventListener("click", () => handleChoice(li, choice));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") handleChoice(li, choice);
      });

      optionsBox.appendChild(li);
    });

    // update progress & counters
    qcountEl.textContent = `${currentIndex + 1} / ${shuffled.length}`;
    progressBar.style.width = `${(currentIndex / shuffled.length) * 100}%`;

    // start per-question timer
    startTimer();
  }

  /* ---------------------------
     Timer logic (per question)
     --------------------------- */
  function startTimer() {
    // clear any existing timer
    clearInterval(timer);
    timeLeft = PER_QUESTION_TIME;
    timerEl.textContent = `${timeLeft}s`;

    timer = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `${timeLeft}s`;

      if (timeLeft <= 0) {
        clearInterval(timer);
        // lock options and show correct
        revealCorrect(shuffled[currentIndex].answer);
        lockOptions();
        nextBtn.classList.remove("hidden");
        // small wrong sound because time up
        soundWrong();
      }
    }, 1000);
  }

  /* ---------------------------
     Handle choice selection
     - disable further clicks
     - mark correct / wrong
     - update score
     --------------------------- */
  function handleChoice(optionEl, chosenText) {
    // prevent double clicks if already locked
    if (optionEl.classList.contains("locked")) return;

    // stop timer immediately
    clearInterval(timer);

    const current = shuffled[currentIndex];
    const correct = current.answer;

    // lock all immediately
    lockOptions();

    // mark chosen option
    if (chosenText === correct) {
      optionEl.classList.add("correct");
      score++;
      soundCorrect();
    } else {
      optionEl.classList.add("wrong");
      soundWrong();
    }

    // reveal correct one visually (in case user picked wrong)
    revealCorrect(correct);

    // show next button (unless it's last: then show result on next click)
    nextBtn.classList.remove("hidden");
    scoreEl.textContent = `Score: ${score}`;
  }

  /* ---------------------------
     Disable options and style correct one
     --------------------------- */
  function lockOptions() {
    const opts = optionsBox.querySelectorAll(".option");
    opts.forEach((o) => {
      o.classList.add("locked");
      o.style.pointerEvents = "none";
    });
  }

  function revealCorrect(correctText) {
    const opts = optionsBox.querySelectorAll(".option");
    opts.forEach((o) => {
      if (o.textContent === correctText) o.classList.add("correct");
    });
  }

  /* ---------------------------
     Next button -> move forward or finish
     --------------------------- */
  nextBtn.addEventListener("click", () => {
    soundClick();
    currentIndex++;
    if (currentIndex < shuffled.length) {
      showQuestion();
    } else {
      finishQuiz();
    }
  });

  /* ---------------------------
     Finish quiz
     - show result
     - save high score per category
     - celebrate
     --------------------------- */
  function finishQuiz() {
    clearInterval(timer);
    questionArea.classList.add("hidden");
    progressBar.style.width = "100%";
    resultBox.classList.remove("hidden");

    const total = shuffled.length;
    scoreText.textContent = `${score} / ${total}`;
    const percent = Math.round((score / total) * 100);
    percentText.textContent = `${percent}%`;

    // highscore logic
    const cat = categorySelect.value;
    const prevBest = getHighScore(cat) || 0;
    if (score > prevBest) {
      setHighScore(cat, score);
      bestText.textContent = `New best for ${cat}: ${score}`;
    } else {
      bestText.textContent = `Best for ${cat}: ${prevBest || "—"}`;
    }
    updateHighscoreLabel(cat);

    // small celebratory animation if percent >= 60 (you can change)
    if (percent >= 60) {
      celebrate();
      document.getElementById("final-title").textContent = "Great job!";
    } else {
      const tryAgain = document.getElementById("final-title");
      tryAgain.textContent = "Nice attempt!, You can do better!";
      tryAgain.style.color = "red";
      tryAgain.style.fontStyle = "italic";
    }
  }

  /* ---------------------------
     Confetti celebration (creates many small elements animated with CSS)
     --------------------------- */
  function celebrate() {
    // generate 40 confetti pieces
    const colors = [
      "#ff3b30",
      "#ff9500",
      "#ffd60a",
      "#32d74b",
      "#5ac8fa",
      "#5856d6",
      "#ff2d55",
    ];
    const pieces = 40;
    for (let i = 0; i < pieces; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      // random horizontal start
      el.style.left = Math.random() * 100 + "vw";
      el.style.top = -(Math.random() * 10 + 5) + "vh";
      // random size
      const s = 6 + Math.random() * 14;
      el.style.width = `${s}px`;
      el.style.height = `${Math.max(8, s * 1.2)}px`;
      // random duration & delay
      const dur = 2500 + Math.random() * 2500;
      el.style.animationDuration = `${dur}ms`;
      el.style.opacity = 0.95;
      confettiWrap.appendChild(el);
      // remove after animation
      setTimeout(() => el.remove(), dur + 200);
    }
  }

  /* ---------------------------
     utility: show initial highscore label
     --------------------------- */
  updateHighscoreLabel(categorySelect.value);

  /* ---------------------------
     Small accessibility: allow starting with Enter on select
     --------------------------- */
  categorySelect.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startBtn.click();
  });

  /* ---------------------------
     Optional: when page loads, hide boxes
     --------------------------- */
  questionArea.classList.add("hidden");
  resultBox.classList.add("hidden");

  /* -----------------------------------------
   GLOBAL ENTER KEY HANDLER
   ----------------------------------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return; // Only respond to ENTER

    // 1. If quiz hasn't started → ENTER = Start quiz
    if (!startBtn.classList.contains("hidden")) {
      startBtn.click();
      return;
    }

    // 2. If question screen is visible
    if (!questionArea.classList.contains("hidden")) {
      // If next button is visible → ENTER = go to next question
      if (!nextBtn.classList.contains("hidden")) {
        nextBtn.click();
        return;
      }
    }
  });
});
