var APP_ID = localStorage.getItem('APP_ID');
let token = localStorage.getItem('authToken');
let CURRENCY;
setProgress(0);

let size = 100; //data size
// define parameters
let fast_period = 10;
let slow_period = 46;
let signal_period = 9;
let rsi_period = 14;
let prices = [];
let INDICATOR = 'MACD';

let ws1; //ddd
if (ws1) {
    ws1.close();
    ws1 = undefined;
}
var isrunning = false;
const tbody = document.getElementById("bot-table-body");
const dots = document.querySelectorAll(".dot");

var total_stake = 0; 
var total_lost = 0;
var total_won = 0;
var total_profit = 0;
var stake = 1;
var duration = 5;
var incontract = false;

let contract_type = 'CALL';
let symbol = 'R_100';

try {
  async function runWeb() {
        token = localStorage.getItem('authToken');
        dots.forEach((dot, index) => {
          dot.style.backgroundColor = "#666";
          dot.classList.remove("glow");
        });
    
       //settings
       let initial_stake = Number(document.getElementById("init-stake").value);
       let tp = Number(document.getElementById("tp").value);
       let sl = Number(document.getElementById("sl").value);
       let martingale = Number(document.getElementById("plier").value);
       let max_stake = Number(document.getElementById("maxstake").value);
       let max_runs = Number(document.getElementById("maxruns").value);
       //sets
       stake = initial_stake;
       if (!stake) {stake = 1;}
       if (!duration) {duration = 1;}
       if (!martingale) {martingale = 1.20}
    
       ws1 = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=' + APP_ID)
        
        ws1.addEventListener("open", () => {
            incontract = false;
            authorize(); 
        });
    
        ws1.addEventListener("close", (eve) => {
            //console.dir(eve);
        });
    
        ws1.addEventListener("error", (err) => {
            //console.dir(err);
        });
    
        ws1.addEventListener('message', function(data) { 
            let ms = JSON.parse(data.data);
    
            let req = ms.echo_req;
            var req_id = req.req_id;
            const error = ms.error;
            if (error) {
              console.log(ms)
              const mss = error.message;
              isrunning = false;
              updateRunbtn() 
              alert(mss);
            }
            else {
              if (req_id === 2111) {
                  console.log('authorized');
                  getBalance();
              }

              if (req_id === 2112) {
                  CURRENCY = ms.balance.currency;
                  if (CURRENCY) {
                    tickHistory();
                  }
                  else {
                    console.log('currency not found')
                  }
              }
    
              if (req_id === 2000) {
                  var open = ms.proposal_open_contract;
                  var buy = ms.buy;
                  if (open) {
                    var status = open.status;
                    var longcode = open.longcode;
                    
                    setProgress(50);
                    dots.forEach((dot, index) => {
                      dot.style.backgroundColor = "#666";
                      dot.classList.remove("glow");
                    });
                    document.getElementById('dot1').style.backgroundColor = "orange";
                    document.getElementById('dot2').style.backgroundColor = "orange";
                    document.getElementById('dot2').classList.add("glow");

                    if (status === 'open') {
                      document.getElementById("status").textContent = 'incontract...';
                    }
    
                    if (status !== 'open') {
                      document.getElementById("status").textContent = 'trade ' + status;
                      incontract = false;
                      total_stake += Number(open.buy_price);
    
                      if (status === 'won') {
                        total_won ++;
                        stake /= martingale;
                        if (stake < Number(initial_stake)) {stake = initial_stake;}
                      }
                      else {
                        total_lost ++;
                        stake *= martingale;
                      }
                      total_profit += Number(open.profit);
                      updateSummaries(total_stake, total_lost, total_won, total_profit);
                      //table
                      const date = new Date(open.date_start * 1000); // Convert seconds to milliseconds
                      const hours = date.getHours().toString().padStart(2, '0');
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      const seconds = date.getSeconds().toString().padStart(2, '0');
                      const newRow = {
                        time: hours + ":" + minutes,
                        asset: open.display_name,
                        trade: open.contract_type,
                        stake: open.buy_price,
                        payout: open.profit
                      };
                      const tr = createRow(newRow);
                      tbody.insertBefore(tr, tbody.firstChild);
    
                      document.getElementById('dot1').style.backgroundColor = "orange";
                      document.getElementById('dot2').style.backgroundColor = "orange";
                      document.getElementById('dot3').style.backgroundColor = "orange";
                      document.getElementById('dot2').classList.remove("glow");
                      setProgress(100);
                      document.getElementById('dot3').classList.add("glow");
                      //check stops
                      if (total_profit >= tp) {
                        isrunning = false;
                        updateRunbtn() 
                        alert('Take profit was hit');
                      }
                      if (total_profit <= -sl) {
                        isrunning = false;
                        updateRunbtn() 
                        alert('Stoploss was hit');
                      }
                      if ((total_won + total_lost) >= max_runs) {
                        isrunning = false;
                        updateRunbtn() 
                        alert('Maximum trades was hit');
                      }
                    }
                  }
              }

              if (req_id === 2001) {
                prices = ms.history.prices;
                getTicks();
              }

              if (req_id === 2002) {
                var tick = ms.tick;
                var bid = tick.bid;
                prices.shift();
                prices.push(bid);
                if (prices) {
                  let signal = 0;
                  if (INDICATOR === 'MACD') {
                    const macdInput = {
                      values: prices,   
                      fastPeriod: fast_period,       
                      slowPeriod: slow_period,       
                      signalPeriod: signal_period,      
                      SimpleMAOscillator: false,  
                      SimpleMASignal: false       
                    };

                    const macdResult = calculateMACD(macdInput);
                    const macdData = macdResult.macdLine.map((v, i) => {
                    const signal = macdResult.signalLine[i - (macdResult.macdLine.length - macdResult.signalLine.length)];
                      return v !== undefined && signal !== undefined
                        ? { MACD: v, signal: signal }
                        : null;
                    }).filter(Boolean);

                    signal = getLatestMACDSignal(macdData);
                  }

                  if (INDICATOR === 'RSI') {
                    const latestRSI = calculateRSI(prices);
                    signal = getRSISignal(latestRSI);
                  }

                  if (INDICATOR === 'MACD-RSI') {
                    const macdInput = {
                      values: prices,   
                      fastPeriod: fast_period,       
                      slowPeriod: slow_period,       
                      signalPeriod: signal_period,      
                      SimpleMAOscillator: false,  
                      SimpleMASignal: false       
                    };

                    const macdResult = calculateMACD(macdInput);
                    const macdData = macdResult.macdLine.map((v, i) => {
                    const signal = macdResult.signalLine[i - (macdResult.macdLine.length - macdResult.signalLine.length)];
                      return v !== undefined && signal !== undefined
                        ? { MACD: v, signal: signal }
                        : null;
                    }).filter(Boolean);

                    signal = getLatestMACDSignal(macdData);
                    var store = signal;

                    const latestRSI = calculateRSI(prices);
                    signal = getRSISignal(latestRSI);

                    if (signal !== store) {
                      signal = 0; //no signal
                    }
                  }

                  //entry
                  if (isrunning && !incontract) {
                    if (signal !== 0) {
                      if (signal === -1) {
                        contract_type = 'PUT';
                      }
                      else {
                        contract_type = 'CALL';
                      }
                      incontract = true;
                      openContract();
                    }
                    else {
                      document.getElementById("status").textContent = 'analyzing...';
                      setProgress(0);
                      dots.forEach((dot, index) => {
                        dot.style.backgroundColor = "#666";
                        dot.classList.remove("glow");
                      });
                      document.getElementById('dot1').style.backgroundColor = "orange";
                      document.getElementById('dot1').classList.add("glow");
                    }
                  }
                  else {
                    updateRunbtn();
                  }
                }
              }
            }
        });
    
        function authorize() {
            const msg = JSON.stringify({
                authorize: token,
                req_id: 2111
            });
            if (ws1.readyState !== WebSocket.CLOSED) {
                ws1.send(msg);
            }
        }
        function getBalance() {
            const msg = JSON.stringify({
                balance: 1,
                req_id: 2112
            });
            if (ws1.readyState !== WebSocket.CLOSED) {
                ws1.send(msg);
            }
        }

        function tickHistory(argument) {
            const msg = JSON.stringify({
              "ticks_history": symbol,
              "adjust_start_time": 1,
              "count": size,
              "end": "latest",
              "start": 1,
              "style": "ticks",
              "req_id": 2001
            });
            if (ws1.readyState !== WebSocket.CLOSED) {
                ws1.send(msg);
            }
        }

        function getTicks(argument) {
            const msg = JSON.stringify({
              "ticks": symbol,
              "subscribe": 1,
              "req_id": 2002
            });
            if (ws1.readyState !== WebSocket.CLOSED) {
                ws1.send(msg);
            }
        }
    }
    
    function openContract() {
        dots.forEach((dot, index) => {
          dot.style.backgroundColor = "#666";
          dot.classList.remove("glow");
        });
        document.getElementById('dot1').style.backgroundColor = "orange";
        document.getElementById('dot1').classList.add("glow");
        setProgress(0);
        stake = Number(Number(stake).toFixed(2));
        const msg = JSON.stringify({
          "buy": 1,
          "parameters": {
            "amount": stake,
            "basis": "stake",
            "contract_type": contract_type,
            "duration": duration,
            "duration_unit": 't',
            "symbol": symbol,
            "currency": CURRENCY,
          },
          "price": stake,
          "subscribe": 1,
          "req_id": 2000
        });
        ws1.send(msg);
    }
    
    document.getElementById('run-btn').addEventListener('click', () => {
        if (!isrunning) {
          isrunning = true;
          if (INDICATOR) {
            document.getElementById("status").textContent = 'starting...';
            runWeb();
          }
          else {
            isrunning = false;
            alert('Select indicator please');
          }
        }
        else {
          isrunning = false;
        }
        updateRunbtn();
    });
    
    function updateRunbtn() {
        var txt = 'Stop';
        var color = 'red';
        if (!isrunning) {
          txt = 'Run';
          color = 'orange';
          document.getElementById("status").textContent = 'bot not running';
        }
        document.getElementById("run-btn").style.backgroundColor = color;
        document.getElementById("run-btn").textContent = txt;
    }
    
    function updateSummaries(total_stake, total_lost, total_won, total_profit) {
       document.getElementById("total-stake").textContent = total_stake.toFixed(2) + " " + CURRENCY;
       document.getElementById("total-lost").textContent = total_lost;
       document.getElementById("total-won").textContent = total_won;
       document.getElementById("profit-loss").textContent = total_profit.toFixed(2) + " " + CURRENCY;
    }
    
    function createRow(row) {
      const tr = document.createElement("tr");

      // Determine if payout is positive or negative
      const payoutClass = row.payout >= 0 ? 'payout-positive' : 'payout-negative';

      tr.innerHTML = `
        <td>${row.time}</td>
        <td>${row.asset}</td>
        <td>${row.trade}</td>
        <td>${row.stake} ${CURRENCY}</td>
        <td class="${payoutClass}">${row.payout} ${CURRENCY}</td>
      `;
      
      return tr;
    }

} catch (err) {
    isrunning = false;
  console.error('❌ Caught error:', err);
}

const select = document.getElementById('market-select');
select.addEventListener('change', function () {
    symbol = this.value;
});

function setProgress(percent) {
  const minRight = 16.66; // 0% progress
  const maxRight = 83.33; // 100% progress

  const totalRange = maxRight - minRight;
  const currentRight = maxRight - (percent / 100) * totalRange;

  const container = document.querySelector('.dots-container');
  container.style.setProperty('--progress-right', `calc(${currentRight}% + 5px)`);
}

//EMA calculator
function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const emaArray = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  let ema = sum / period;
  emaArray[period - 1] = ema;

  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    emaArray[i] = ema;
  }

  return emaArray;
}

//MACD calculator
function calculateMACD(input) {
  const { values, fastPeriod, slowPeriod, signalPeriod } = input;

  const fastEMA = calculateEMA(values, fastPeriod);
  const slowEMA = calculateEMA(values, slowPeriod);

  const macdLine = values.map((_, i) => {
    if (fastEMA[i] !== undefined && slowEMA[i] !== undefined) {
      return fastEMA[i] - slowEMA[i];
    }
    return undefined;
  });

  const validMACD = macdLine.filter(v => v !== undefined);
  const signalLine = calculateEMA(validMACD, signalPeriod);

  const histogram = macdLine.map((v, i) => {
    const signalIdx = i - (macdLine.length - signalLine.length);
    if (v !== undefined && signalLine[signalIdx] !== undefined) {
      return v - signalLine[signalIdx];
    }
    return undefined;
  });

  return { macdLine, signalLine, histogram };
}

// Step 5: Detect latest MACD signal
function getLatestMACDSignal(macdData) {
  if (macdData.length < 2) return null;

  const prev = macdData[macdData.length - 2];
  const curr = macdData[macdData.length - 1];

  if (prev.MACD < prev.signal && curr.MACD > curr.signal) return 1;
  if (prev.MACD > prev.signal && curr.MACD < curr.signal) return -1;
  return 0;
}

// ------------------------------RSI-----------------------------
function calculateRSI(prices) {
  const gains = [];
  const losses = [];
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  const averageGain = gains.slice(0, rsi_period).reduce((a, b) => a + b, 0) / rsi_period;
  const averageLoss = losses.slice(0, rsi_period).reduce((a, b) => a + b, 0) / rsi_period;

  const rs = averageGain / averageLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

function getRSISignal(rsiValue) {
  if (rsiValue < 30) return 1;  // Buy signal
  if (rsiValue > 70) return -1; // Sell signal
  return 0; // No signal
}
// -------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  const indicatorSelect = document.getElementById("indicator-select");

  const fastEMA = document.getElementById("fastema").closest(".input-wrapper");
  const slowEMA = document.getElementById("slowema").closest(".input-wrapper");
  const signalPeriod = document.getElementById("period").closest(".input-wrapper");
  const buy = document.getElementById("buy").closest(".input-wrapper");
  const sell = document.getElementById("sell").closest(".input-wrapper");

  function toggleInputs() {
    const value = indicatorSelect.value;
    INDICATOR = value;

    if (value === "MACD") {
      fastEMA.style.display = "block";
      slowEMA.style.display = "block";
      signalPeriod.style.display = "block";
      buy.style.display = "none";
      sell.style.display = "none";
    } else if (value === "RSI") {
      fastEMA.style.display = "none";
      slowEMA.style.display = "none";
      signalPeriod.style.display = "none";
      buy.style.display = "block";
      sell.style.display = "block";
    }
    else {
      fastEMA.style.display = "block";
      slowEMA.style.display = "block";
      signalPeriod.style.display = "block";
      buy.style.display = "block";
      sell.style.display = "block";
    }
  }

  indicatorSelect.addEventListener("change", toggleInputs);

  // Optionally call it on page load if a default is selected
  toggleInputs();
});

//future errors
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Error caught globally:");
    console.error(`Message: ${message}`);
    console.error(`Source: ${source}`);
    console.error(`Line: ${lineno}`);
    console.error(`Column: ${colno}`);
    console.error(`Error object:`, error);
    
    isrunning = false;
    return true;
};



