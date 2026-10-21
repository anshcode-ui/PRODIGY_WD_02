document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements: Readouts
  const dispHours = document.getElementById("dispHours");
  const dispMinutes = document.getElementById("dispMinutes");
  const dispSeconds = document.getElementById("dispSeconds");
  const dispMillis = document.getElementById("dispMillis");
  const currentLapDisplay = document.getElementById("currentLapDisplay");
  const avgLapDisplay = document.getElementById("avgLapDisplay");
  const bestLapDisplay = document.getElementById("bestLapDisplay");
  const worstLapDisplay = document.getElementById("worstLapDisplay");
  const spreadDisplay = document.getElementById("spreadDisplay");
  const lapCounterBadge = document.getElementById("lapCounterBadge");

  // DOM Elements: SVG Hands & Indicators
  const secondHandGroup = document.getElementById("secondHandGroup");
  const minuteHand = document.getElementById("minuteHand");
  const statusLed = document.getElementById("statusLed");
  const statusText = document.getElementById("statusText");

  // DOM Elements: Controls & Table
  const startStopBtn = document.getElementById("startStopBtn");
  const startStopLabel = document.getElementById("startStopLabel");
  const lapBtn = document.getElementById("lapBtn");
  const resetBtn = document.getElementById("resetBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const audioToggle = document.getElementById("audioToggle");
  const audioLed = document.getElementById("audioLed");
  const lapTableBody = document.getElementById("lapTableBody");

  // Chronometer State Variables
  let isRunning = false;
  let startTime = 0;
  let elapsedTime = 0;
  let lapStartTime = 0;
  let animationFrameId = null;
  let laps = [];
  let soundEnabled = true;

  // Web Audio Synthesizer for Realistic Mechanical Switch Clicks
  let audioCtx = null;

  const playMechanicalClick = (frequency = 1100, duration = 0.012) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  };

  // 1. Build Precision SVG Analog Dial Ticks on Startup
  const buildDialTicks = () => {
    const mainTicksGroup = document.getElementById("mainDialTicks");
    const subdialTicksGroup = document.getElementById("subdialTicks");
    const svgNS = "http://www.w3.org/2000/svg";

    // 60 Second Ticks & Numbers
    for (let i = 0; i < 60; i++) {
      const angle = i * 6;
      const isMajor = i % 5 === 0;
      const line = document.createElementNS(svgNS, "line");
      
      line.setAttribute("x1", "0");
      line.setAttribute("y1", isMajor ? "-106" : "-110");
      line.setAttribute("x2", "0");
      line.setAttribute("y2", "-118");
      line.setAttribute("class", isMajor ? "dial-tick-major" : "dial-tick-minor");
      line.setAttribute("transform", `rotate(${angle})`);
      mainTicksGroup.appendChild(line);

      if (isMajor) {
        const numValue = i === 0 ? 60 : i;
        const rad = ((angle - 90) * Math.PI) / 180;
        const radius = 91;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", x.toFixed(2));
        text.setAttribute("y", y.toFixed(2));
        text.setAttribute("class", "dial-number");
        text.textContent = numValue < 10 ? `0${numValue}` : `${numValue}`;
        mainTicksGroup.appendChild(text);
      }
    }

    // 30 Minute Sub-dial Ticks
    for (let j = 0; j < 30; j++) {
      const subAngle = j * 12;
      const isSubMajor = j % 5 === 0;
      const subLine = document.createElementNS(svgNS, "line");

      subLine.setAttribute("x1", "0");
      subLine.setAttribute("y1", isSubMajor ? "-26" : "-29");
      subLine.setAttribute("x2", "0");
      subLine.setAttribute("y2", "-33");
      subLine.setAttribute("class", isSubMajor ? "dial-tick-major" : "dial-tick-minor");
      subLine.setAttribute("transform", `rotate(${subAngle})`);
      subdialTicksGroup.appendChild(subLine);
    }
  };

  // 2. Time Formatting Utilities
  const parseTimeParts = (ms) => {
    const totalCentiseconds = Math.floor(ms / 10);
    const centiseconds = totalCentiseconds % 100;
    const totalSeconds = Math.floor(totalCentiseconds / 100);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      centiseconds: String(centiseconds).padStart(2, "0")
    };
  };

  const formatTimeString = (ms) => {
    const parts = parseTimeParts(ms);
    return `${parts.hours}:${parts.minutes}:${parts.seconds}.${parts.centiseconds}`;
  };

  // 3. Visual Display & 3D Analog Hand Updater
  const updateInstrumentReadout = (totalMs, currentLapMs) => {
    const parts = parseTimeParts(totalMs);
    dispHours.textContent = parts.hours;
    dispMinutes.textContent = parts.minutes;
    dispSeconds.textContent = parts.seconds;
    dispMillis.textContent = parts.centiseconds;

    currentLapDisplay.textContent = formatTimeString(currentLapMs);

    // Smooth 60Hz sweep rotation for second and minute hands
    const exactSeconds = (totalMs % 60000) / 1000;
    const secondDegrees = exactSeconds * 6;
    secondHandGroup.setAttribute("transform", `translate(130, 130) rotate(${secondDegrees.toFixed(2)})`);

    const exactMinutes = (totalMs / 60000) % 30;
    const minuteDegrees = exactMinutes * 12;
    minuteHand.setAttribute("transform", `rotate(${minuteDegrees.toFixed(2)})`);
  };

  // 4. High-Precision Animation Loop
  const tick = () => {
    if (!isRunning) return;
    const now = performance.now();
    const currentTotal = elapsedTime + (now - startTime);
    const currentLap = currentTotal - lapStartTime;

    updateInstrumentReadout(currentTotal, currentLap);
    animationFrameId = requestAnimationFrame(tick);
  };

  // 5. Core Operations: Start / Pause / Reset / Lap
  const toggleStartStop = () => {
    const now = performance.now();

    if (!isRunning) {
      // Engage Timer
      playMechanicalClick(1250, 0.014);
      startTime = now;
      isRunning = true;

      startStopBtn.classList.add("is-running");
      startStopLabel.textContent = "PAUSE";
      statusLed.className = "led-bulb running";
      statusText.textContent = "RUNNING";

      lapBtn.disabled = false;
      resetBtn.disabled = true;

      const currentLapNumber = String(laps.length + 1).padStart(2, "0");
      lapCounterBadge.textContent = `LAP ${currentLapNumber}`;

      animationFrameId = requestAnimationFrame(tick);
    } else {
      // Pause Timer
      playMechanicalClick(850, 0.016);
      elapsedTime += now - startTime;
      isRunning = false;
      cancelAnimationFrame(animationFrameId);

      updateInstrumentReadout(elapsedTime, elapsedTime - lapStartTime);

      startStopBtn.classList.remove("is-running");
      startStopLabel.textContent = "RESUME";
      statusLed.className = "led-bulb paused";
      statusText.textContent = "PAUSED";

      lapBtn.disabled = true;
      resetBtn.disabled = false;
    }
  };

  const recordLap = () => {
    if (!isRunning) return;
    playMechanicalClick(1500, 0.01);

    const now = performance.now();
    const totalElapsed = elapsedTime + (now - startTime);
    const splitTime = totalElapsed - lapStartTime;
    lapStartTime = totalElapsed;

    const prevSplit = laps.length > 0 ? laps[laps.length - 1].splitMs : splitTime;
    const deltaMs = splitTime - prevSplit;

    laps.push({
      lapNumber: laps.length + 1,
      splitMs: splitTime,
      totalMs: totalElapsed,
      deltaMs: laps.length === 0 ? 0 : deltaMs
    });

    const nextLapNumber = String(laps.length + 1).padStart(2, "0");
    lapCounterBadge.textContent = `LAP ${nextLapNumber}`;

    renderLapTelemetry();
  };

  const resetChronometer = () => {
    if (isRunning) return;
    playMechanicalClick(650, 0.018);

    cancelAnimationFrame(animationFrameId);
    startTime = 0;
    elapsedTime = 0;
    lapStartTime = 0;
    laps = [];

    updateInstrumentReadout(0, 0);

    startStopLabel.textContent = "START";
    statusLed.className = "led-bulb";
    statusText.textContent = "STANDBY";
    lapCounterBadge.textContent = "LAP 00";

    lapBtn.disabled = true;
    resetBtn.disabled = true;
    exportCsvBtn.disabled = true;

    avgLapDisplay.textContent = "00:00:00.00";
    bestLapDisplay.textContent = "--:--:--.--";
    worstLapDisplay.textContent = "--:--:--.--";
    spreadDisplay.textContent = "--:--:--.--";

    lapTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="4">NO INTERVAL DATA RECORDED. ENGAGE TIMER AND PRESS [LAP] TO LOG SPLITS.</td>
      </tr>
    `;
  };

  // 6. Render Lap Table & Statistical Telemetry
  const renderLapTelemetry = () => {
    if (laps.length === 0) return;

    exportCsvBtn.disabled = false;

    const splits = laps.map((l) => l.splitMs);
    const minSplit = Math.min(...splits);
    const maxSplit = Math.max(...splits);
    const sumSplits = splits.reduce((acc, val) => acc + val, 0);
    const avgSplit = sumSplits / laps.length;
    const spread = maxSplit - minSplit;

    avgLapDisplay.textContent = formatTimeString(avgSplit);
    bestLapDisplay.textContent = formatTimeString(minSplit);
    worstLapDisplay.textContent = formatTimeString(maxSplit);
    spreadDisplay.textContent = formatTimeString(spread);

    const rowsHtml = laps
      .slice()
      .reverse()
      .map((lap) => {
        let badgeHtml = "";
        if (laps.length >= 2) {
          if (lap.splitMs === minSplit) {
            badgeHtml = `<span class="tag-badge tag-fastest">FASTEST</span>`;
          } else if (lap.splitMs === maxSplit) {
            badgeHtml = `<span class="tag-badge tag-slowest">SLOWEST</span>`;
          }
        }

        let deltaFormatted = "BASELINE";
        if (lap.lapNumber > 1) {
          const sign = lap.deltaMs >= 0 ? "+" : "-";
          deltaFormatted = `${sign}${formatTimeString(Math.abs(lap.deltaMs))}`;
        }

        return `
          <tr>
            <td>#${String(lap.lapNumber).padStart(2, "0")}</td>
            <td>${formatTimeString(lap.splitMs)}</td>
            <td>${formatTimeString(lap.totalMs)}</td>
            <td>${deltaFormatted}${badgeHtml}</td>
          </tr>
        `;
      })
      .join("");

    lapTableBody.innerHTML = rowsHtml;
  };

  // 7. Export Lap Telemetry to CSV
  const exportToCsv = () => {
    if (laps.length === 0) return;
    playMechanicalClick(1200, 0.012);

    const headers = ["Lap Number", "Split Time", "Cumulative Time", "Split Milliseconds"];
    const rows = laps.map((l) => [
      l.lapNumber,
      formatTimeString(l.splitMs),
      formatTimeString(l.totalMs),
      l.splitMs.toFixed(2)
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "chrono_02_lap_telemetry.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 8. Event Listeners & Physical Keyboard Sync
  startStopBtn.addEventListener("click", toggleStartStop);
  lapBtn.addEventListener("click", recordLap);
  resetBtn.addEventListener("click", resetChronometer);
  exportCsvBtn.addEventListener("click", exportToCsv);

  audioToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    audioToggle.setAttribute("aria-pressed", String(soundEnabled));
    audioLed.classList.toggle("active", soundEnabled);
    audioToggle.querySelector(".switch-text").textContent = soundEnabled
      ? "ACOUSTIC CLICK: ON"
      : "ACOUSTIC CLICK: OFF";
    if (soundEnabled) playMechanicalClick(1300, 0.01);
  });

  // Keyboard shortcuts physically depress the 3D buttons on screen
  const triggerButtonVisualPress = (btnElement) => {
    if (btnElement.disabled) return;
    btnElement.classList.add("pressed");
    setTimeout(() => btnElement.classList.remove("pressed"), 100);
  };

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Space") {
      e.preventDefault();
      triggerButtonVisualPress(startStopBtn);
      toggleStartStop();
    } else if (e.code === "KeyL") {
      if (!lapBtn.disabled) {
        triggerButtonVisualPress(lapBtn);
        recordLap();
      }
    } else if (e.code === "KeyR") {
      if (!resetBtn.disabled) {
        triggerButtonVisualPress(resetBtn);
        resetChronometer();
      }
    }
  });

  // Initialize SVG Dial on load
  buildDialTicks();
});