export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function createTimer(onTick) {
  let elapsed = 0;
  let intervalId = null;
  let running = false;
  let wasRunning = false;

  function tick() {
    elapsed++;
    onTick(elapsed);
  }

  function start() {
    elapsed = 0;
    running = false;
    intervalId = null;
    resume();
  }

  function resume() {
    if (running) return;
    running = true;
    intervalId = setInterval(tick, 1000);
  }

  function pause() {
    if (!running) return;
    clearInterval(intervalId);
    intervalId = null;
    running = false;
  }

  function stop() {
    pause();
  }

  function reset() {
    stop();
    elapsed = 0;
  }

  function getElapsed() {
    return elapsed;
  }

  function isRunning() {
    return running;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasRunning = running;
      pause();
    } else if (wasRunning) {
      resume();
    }
  });

  return { start, pause, resume, stop, reset, getElapsed, isRunning };
}
