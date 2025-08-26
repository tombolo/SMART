var APP_ID = localStorage.getItem('APP_ID');

const progress = document.getElementById("progress");
const countdownEl = document.getElementById("countdown");
const signalDurationEl = document.getElementById("signal-duration");

let totalTime = 120;
let elapsed = 0;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

setInterval(() => {
  const percent = (elapsed / totalTime) * 100;
  progress.style.width = percent + "%";
  countdownEl.textContent = formatTime(totalTime - elapsed);
  signalDurationEl.textContent = formatTime(elapsed);

  elapsed++;
  if (elapsed > totalTime) {
    elapsed = 0;
  }
}, 1000);

document.getElementById("market-select").addEventListener("change", function(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const marketName = selectedOption.text;
    const marketCode = selectedOption.value;

    console.log("Selected:", marketCode); // e.g., "R_10"
    document.getElementById('market-name').textContent = marketName;
});


//
document.getElementById('market-name').textContent = 'Volatility 10 Index';
document.getElementById('entry-point').textContent = '...';
document.getElementById('recommended-ticks').textContent = '5';
document.getElementById('prediction').textContent = 'Rise';
document.getElementById('signal-duration').textContent = '0:35';



//future errors
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Error caught globally:");
    console.error(`Message: ${message}`);
    console.error(`Source: ${source}`);
    console.error(`Line: ${lineno}`);
    console.error(`Column: ${colno}`);
    console.error(`Error object:`, error);
    
    return true;
};