(function () {
    var APP_ID = localStorage.getItem('APP_ID');
    let token = localStorage.getItem('authToken');
    let CURRENCY;
    let SLIDE_SIDE = 'right';

   let previousPrice = null;
   let symbol = 'R_10';
   let decimal_length = 0;
   let evenCount = 0;
   let oddCount = 0;
   let riseCount = 0,
      fallCount = 0;
   const digitCounts = Array(10).fill(0);
   let tickCount = 1000;

   let risefall_array = [];
   let matches_array = [];
   let overunder_array = [];
   let evenodd_array = [];

   var isrunning = false;
   var status = null;
   var total_runs = 0;
   var total_stake = 0;
   var total_payout = 0;
   var total_lost = 0;
   var total_won = 0;
   var total_profit = 0;

   var what_to_trade = 'OVERUNDER';
   var barrier = 0;
   var contract_type;
   // Check if settings are stored in localStorage
   var duration = localStorage.getItem('ticks');
   var initial_stake = localStorage.getItem('stake');
   var martingale = localStorage.getItem('martingale');
   var stake = initial_stake;
   if (!stake) {stake = 1;}

   const wsUrl = 'wss://ws.binaryws.com/websockets/v3?app_id=' + APP_ID;
   let socket;
   
   try {
       const colorMapping = {
      0: '#B2EBF2',
      1: '#FFCDD2',
      2: '#C5E1A5',
      3: '#FFF59D',
      4: '#FFEB3B',
      5: '#B39DDB',
      6: '#80CBC4',
      7: '#C8E6C9',
      8: '#F8BBD0',
      9: '#FF7043'
   };

   function startConnection() {
      previousPrice = null;
      decimal_length = 0;
      evenCount = 0;
      oddCount = 0;
      riseCount = 0;
      fallCount = 0;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
         console.log('WebSocket connection established');
         tickCount = parseInt(document.getElementById("tickCount").value, 10);
         socket.send(JSON.stringify({
            "ticks_history": symbol,
            "adjust_start_time": 1,
            "count": 100,
            "end": "latest",
            "start": 1,
            "style": "ticks",
            "req_id": 3000
         }))
         authorize();
      };

      socket.onmessage = (event) => {
         const data = JSON.parse(event.data);
         if (data) {
            var req_id = data.echo_req.req_id;
            var error = data.error;
            if (error) {
              isrunning = false;
              var ms = error.message;
              console.log(data);
            }
            else {
              if (req_id === 3111) {
                console.log('authorised...');
                getBalance();
              }
              if (req_id === 2112) {
                  CURRENCY = data.balance.currency;
              }
              else if (req_id === 3000) {
                 const history = data.history;
                 const prices = history.prices;

                 var prev = 0;
                 for (let i = 0; i < prices.length; i++) {
                    const price = parseFloat(prices[i]);
                    if (price > prev) {
                       riseCount++;
                    } else {
                       fallCount++;
                    }
                    prev = price;

                    const dec_size = getDecimalLength(prices);
                    decimal_length = dec_size;

                    const priceStr = price.toFixed(decimal_length); // Keeps trailing 0s
                    const decimalPart = priceStr.split('.')[1];

                    if (decimalPart) {
                       const lastDigitChar = decimalPart.slice(-1);
                       const lastDigit = parseInt(lastDigitChar);

                       if (!isNaN(lastDigit)) {
                          digitCounts[lastDigit]++;

                          if (lastDigit % 2 === 0) {
                             evenCount++;
                          } else {
                             oddCount++;
                          }
                       }
                    }
                 }

                 // Total digits used
                 const totalDigits = digitCounts.reduce((sum, count) => sum + count, 0);

                 // Percentages per digit
                 const digitPercentages = digitCounts.map(count =>
                    ((count / totalDigits) * 100).toFixed(2)
                 );

                 // Optional destructuring of digit percentages
                 const [
                    percent0, percent1, percent2, percent3, percent4,
                    percent5, percent6, percent7, percent8, percent9
                 ] = digitPercentages;

                 const circleElements = document.querySelectorAll('.circle');
                 digitPercentages.forEach((percent, index) => {
                    if (circleElements[index]) {
                       circleElements[index].setAttribute('data-value', parseFloat(percent).toFixed(2));
                    }
                 });


                 //tick
                 socket.send(JSON.stringify({
                    ticks: symbol,
                    "req_id": 3001
                 }));
              } 
              else if (req_id === 3001) {
                  //OVER|UNDER
                  let overNum;
                  let overSide;
                  let overDigit;
                  let overContract;
                  if (document.getElementById("overNum")) { //for over under
                    overNum = Number(document.getElementById("overNum").value);  //12345...
                    overSide = document.getElementById("overSide").value; //> | <
                    overDigit = Number(document.getElementById("overDigit").value); // 0 to 9
                    overContract = document.getElementById("overContract").value; //OVER | UNDER
                  }
                  //EVEN|ODD
                  let evenNum;
                  let evenSide;
                  let evenContract;
                  if (document.getElementById("evenNum")) { 
                    evenNum = Number(document.getElementById("evenNum").value);  //12345...
                    evenSide = document.getElementById("evenSide").value; //EVEN | ODD
                    evenContract = document.getElementById("evenContract").value; //EVEN | ODD
                  }
                  //RISE|FALL
                  let riseNum;
                  let riseSide;
                  let riseContract;
                  if (document.getElementById("riseNum")) { 
                    riseNum = Number(document.getElementById("riseNum").value);
                    riseSide = document.getElementById("riseSide").value; 
                    risenContract = document.getElementById("riseContract").value;
                  }

                 if (data.tick && data.tick.quote !== undefined) {
                    const price = data.tick.quote;
                    const priceStr = price.toFixed(decimal_length);

                    const lastDigit = parseInt(priceStr.split('.')[1].slice(-1));
                    overunder_array.push(lastDigit);
                    if (overunder_array.length > overNum) {
                      overunder_array.shift();
                    }
                    
                    matches_array.push(lastDigit);

                    if (previousPrice) {
                      const chnge = price - previousPrice;
                      var szi = 'F';
                      if (chnge > 0) {
                        szi = 'R';
                      }
                      risefall_array.push(szi);
                    }
                    if (risefall_array.length > riseNum) {
                      risefall_array.shift();
                    }

                    if (lastDigit % 2 === 0) {
                       evenCount++;
                       evenodd_array.push('E');
                    } else {
                       oddCount++;
                       evenodd_array.push('O');
                    }

                    if (evenodd_array.length > evenNum) {
                      evenodd_array.shift();
                    }

                    digitCounts[lastDigit]++;
                    const totalDigits = digitCounts.reduce((sum, count) => sum + count, 0);
                    const digitPercentages = digitCounts.map(count =>
                       ((count / totalDigits) * 100).toFixed(2)
                    );
                    const circleElements = document.querySelectorAll('.circle');
                    digitPercentages.forEach((percent, index) => {
                       if (circleElements[index]) {
                          circleElements[index].setAttribute('data-value', percent);
                       }
                    });

                    // Find min and max percentage values
                    const percentagesAsNumbers = digitPercentages.map(Number);
                    const maxPercent = Math.max(...percentagesAsNumbers);
                    const minPercent = Math.min(...percentagesAsNumbers);

                    // Loop through circles and update classes
                    circleElements.forEach((circle, index) => {
                       circle.classList.remove('highest', 'lowest'); // Clear previous states

                       const percent = Number(circle.getAttribute('data-value'));

                       if (percent === maxPercent) {
                          circle.classList.add('highest');
                       } else if (percent === minPercent) {
                          circle.classList.add('lowest');
                       }
                    });


                    document.querySelector('.price').textContent = `PRICE ${priceStr}`;
                    updateTradeGrid(lastDigit);
                    updateEvenOddGrid(lastDigit);
                    updateRiseFallGrid(price);
                    highlightActiveCircle(lastDigit);

                    if (price > previousPrice) {
                       riseCount++;
                    } else {
                       fallCount++;
                    }
                    previousPrice = price;

                    // Even/Odd percentages
                    const evenPercentage = ((evenCount / totalDigits) * 100).toFixed(2);
                    const oddPercentage = ((oddCount / totalDigits) * 100).toFixed(2);
                    updateEvenOddProgress(evenPercentage, oddPercentage);

                    // rise/fall percentages
                    const totalRisefall = riseCount + fallCount;
                    const risePerecentage = ((riseCount / totalRisefall) * 100).toFixed(2);
                    const fallPercentage = ((fallCount / totalRisefall) * 100).toFixed(2);
                    updateRisefallProgress(risePerecentage, fallPercentage);

                    //trade
                    if (isrunning) {
                      if (!status && document.getElementById("bot-status")) {
                        //analysis
                        document.getElementById("bot-status").textContent = 'analyzing...';
                        const dots = document.querySelectorAll(".dot");
                        const progressLine = document.querySelector(".progress-line");
                        dots.forEach((dot, index) => {
                          dot.style.backgroundColor = "#666";
                          dot.classList.remove("glow");
                        });
                        var dot = document.getElementById('dot1');
                        dot.classList.add("glow");
                        progressLine.style.width = "0%";
                        dot.style.backgroundColor = "orange";

                        //OVER|UNDER
                        var isoverunder = true;
                        if (overunder_array.length >= overNum) {
                          for (var i = 0; i < overunder_array.length; i++) {
                              if (overSide === '>') {
                                if (overunder_array[i] <= overDigit) {
                                  isoverunder = false;
                                }
                              }
                              else {
                                if (overunder_array[i] >= overDigit) {
                                  isoverunder = false;
                                }
                              }
                          }
                        }

                        //EVEN|ODD
                        var isodd = true;
                        var iseven = true;
                        var isevenodd = false;
                        if (evenodd_array.length >= evenNum) {
                          for (var i = 0; i < evenodd_array.length; i++) {
                            if (evenodd_array[i] !== 'E') {
                              iseven = false;
                            }
                            if (evenodd_array[i] !== 'O') {
                              isodd = false;
                            }
                          }

                          if (evenSide === 'EVEN' && iseven) {
                            isevenodd = true;
                          }
                          if (evenSide === 'ODD' && isodd) {
                            isevenodd = true;
                          }
                        }

                        //RISE|FALL
                        var isrisefall = false;
                        if (risefall_array.length >= riseNum) {
                          const increasing = risefall_array.every(val => val === "R");
                          const decreasing = risefall_array.every(val => val === "F");

                          if (riseSide === 'RISE' && increasing) {
                            isrisefall = true;
                          }
                          if (riseSide === 'FALL' && decreasing) {
                            isrisefall = true;
                          }
                        }

                        var istrad = false;
                        if (what_to_trade === 'OVERUNDER') {
                          if (isoverunder) {
                            barrier = overDigit;
                            if (overContract === 'DIGITOVER') {
                              contract_type = 'DIGITOVER';
                            }
                            else {
                              contract_type = 'DIGITUNDER';
                            }
                             istrad = true;
                          }
                        }
                        else if (what_to_trade === 'ODDEVEN') {
                          if (isevenodd) {
                            barrier = null;
                            if (evenContract === 'DIGITODD') {
                              contract_type = 'DIGITODD';
                            }
                            else {
                              contract_type = 'DIGITEVEN';
                            }
                             istrad = true;
                          }
                        }
                        else if (what_to_trade === 'RISEFALL') {
                          if (isrisefall) {
                            barrier = null;
                            if (riseContract === 'RISE') {
                              contract_type = 'CALL';
                            }
                            else {
                              contract_type = 'PUT';
                            }
                             istrad = true;
                          }
                        }
                        else {
                          console.log('what_to_trade', what_to_trade)
                        }

                        //trade
                        if (istrad) {
                          openContract();
                        }
                      }
                    }

                 }
              }
              else if (req_id === 3002) {
                const buy = data.buy;
                const open = data.proposal_open_contract;

                const dots = document.querySelectorAll(".dot");
                const progressLine = document.querySelector(".progress-line");
        
                dots.forEach((dot, index) => {
                  dot.style.backgroundColor = "#666";
                  dot.classList.remove("glow");
                });

                if (isrunning) {
                  if (buy) {
                    status = 'buy';
                    document.getElementById("bot-status").textContent = 'in-contract...';
                    //first dot
                    var dot = document.getElementById('dot1');
                    progressLine.style.width = "0%";
                    dot.style.backgroundColor = "orange";
                    dot.classList.add("glow");
                  }
                  else if (open) {
                    status = open.status;
                    var longcode = open.longcode;
                    if(document.getElementById('bot-status')) {
                        if (status === 'open') {
                          progressLine.style.width = "50%";
                          var dot1 = document.getElementById('dot1');
                          var dot2 = document.getElementById('dot2');
                          dot1.style.backgroundColor = "orange";
                          dot2.style.backgroundColor = "orange";
                          dot2.classList.add("glow");
                        }
                        else {
                          document.getElementById("bot-status").textContent = 'closing...';
                          progressLine.style.width = "100%";
                          var dot = document.getElementById('dot3');
                          dots.forEach(dot => dot.style.backgroundColor = "orange");
                          dot3.classList.add("glow");
                          //sumary
                          total_runs ++;
                          total_stake += Number(open.buy_price);
                          total_payout += Number(open.payout);
                          
                          //table
                          const date = new Date(open.date_start * 1000); // Convert seconds to milliseconds
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          const seconds = date.getSeconds().toString().padStart(2, '0');
                          const newRow = {
                            time: hours + ":" + minutes,
                            asset: open.display_name,
                            stake: open.buy_price,
                            payout: open.profit
                          };
                          const tr = createRow(newRow);
                          const tbody1 = document.getElementById("bot-table-body");
                          tbody1.insertBefore(tr, tbody1.firstChild);
    
                          // Check if settings are stored in localStorage
                          martingale = Number(localStorage.getItem('martingale'));
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
                          updateSummaries();
                          //reenter
                          if (isrunning) {
                            status = null;
                          }
                        }
                    }
                  }
                }
              }
            }
         }
      };
   }
   startConnection();

   function authorize() {
        const msg = JSON.stringify({
            authorize: token,
            req_id: 3111
        });
        socket.send(msg);
    }
    function getBalance() {
        const msg = JSON.stringify({
            balance: 1,
            req_id: 2112
        });
        if (socket.readyState !== WebSocket.CLOSED) {
            socket.send(msg);
        }
    }

    function getDecimalLength(prices) {
      let xxx = 0;
      for (var i = 0; i < prices.length; i++) {
        var sz = (prices[i] + '').split('.')[1];
        var xx = 0;
        if (sz) {
           xx = sz.length;
        }
        if (xx > xxx) {
           xxx = xx;
        }
      }

      return xxx;
    }

   function updateTradeGrid(lastDigit) {
      const buttons = document.querySelectorAll('.panel:nth-child(2) .button-grid button');
      for (let i = 0; i < buttons.length - 1; i++) {
         buttons[i].textContent = buttons[i + 1].textContent;
         buttons[i].style.backgroundColor = buttons[i + 1].style.backgroundColor;
      }
      buttons[buttons.length - 1].textContent = lastDigit;
      buttons[buttons.length - 1].style.backgroundColor = colorMapping[lastDigit];
   }

   function updateEvenOddGrid(lastDigit) {
      const isEven = lastDigit % 2 === 0;
      const symbol = isEven ? 'E' : 'O';
      const buttons = document.querySelectorAll('.panel:nth-child(3) .button-grid button');
      for (let i = 0; i < buttons.length - 1; i++) {
         buttons[i].textContent = buttons[i + 1].textContent;
         buttons[i].style.backgroundColor = buttons[i + 1].style.backgroundColor;
      }
      buttons[buttons.length - 1].textContent = symbol;
      buttons[buttons.length - 1].style.backgroundColor = isEven ? '#81D4FA' : '#FFCDD2';
   }

   function updateRiseFallGrid(currentPrice) {
      const isRise = previousPrice !== null && currentPrice > previousPrice;
      const symbol = isRise ? 'R' : 'F';
      const buttons = document.querySelectorAll('.panel:nth-child(4) .button-grid button');
      for (let i = 0; i < buttons.length - 1; i++) {
         buttons[i].textContent = buttons[i + 1].textContent;
         buttons[i].style.backgroundColor = buttons[i + 1].style.backgroundColor;
      }
      buttons[buttons.length - 1].textContent = symbol;
      buttons[buttons.length - 1].style.backgroundColor = isRise ? '#81D4FA' : '#FFCDD2'; // Light blue for Rise, Light red for Fall
   }

   function updateEvenOddProgress(evenPercentage, oddPercentage) {
      const evenProgress = document.querySelector('.even-odd-bar + .progress .green');
      const oddProgress = document.querySelector('.even-odd-bar + .progress .red');

      // Set the width of each progress bar
      evenProgress.style.width = evenPercentage + '%';
      oddProgress.style.width = oddPercentage + '%';

      const evenDiv = document.querySelector('.even-odd-bar div:nth-child(1)');
      const oddDiv = document.querySelector('.even-odd-bar div:nth-child(2)');

      // Update the text content of Even and Odd
      evenDiv.textContent = `Even ${evenPercentage}%`;
      oddDiv.textContent = `Odd ${oddPercentage}%`;
   }

   function updateRisefallProgress(rise, fall) {
      const riseProgress = document.querySelector('.rise-fall-bar + .progress .green');
      const fallProgress = document.querySelector('.rise-fall-bar + .progress .red');

      // Set the width of each progress bar
      riseProgress.style.width = rise + '%';
      fallProgress.style.width = fall + '%';

      const riseDiv = document.querySelector('.rise-fall-bar div:nth-child(1)');
      const fallDiv = document.querySelector('.rise-fall-bar div:nth-child(2)');

      // Update the text content of Even and Odd
      riseDiv.textContent = `Rise ${rise}%`;
      fallDiv.textContent = `Fall ${fall}%`;
   }

   function highlightActiveCircle(digit) {
      const circles = document.querySelectorAll('.circle');
      circles.forEach((circle, index) => {
         if (index === digit) {
            circle.style.backgroundColor = '#f44336'; // red
            circle.style.color = '#fff';
         } else {
            circle.style.backgroundColor = '#121212'; // default background
            circle.style.color = 'white'; // reset text color
         }
      });
   }

   document.getElementById('symbolSelector').addEventListener('change', function () {
      const selectedSymbol = this.value;
      console.log('Selected Symbol:', selectedSymbol);

      // Optional: update global symbol variable
      symbol = selectedSymbol;
      if (socket) {
         socket.close();
      }

      // Open a new WebSocket connection
      startConnection();
   });

   //count
   document.getElementById("tickCount").addEventListener("input", () => {
      tickCount = parseInt(document.getElementById("tickCount").value, 10);
      if (tickCount > 0) {
         startConnection();
      }
   });

   // Function to toggle Smart Analysis visibility
   function toggleSmartAnalysis() {
      const section = document.getElementById('smartAnalysisSection');
      section.classList.toggle('hidden');
   }

   // Function to open the settings dialog
   const settingbtn = document.querySelectorAll("[data-open-settings]");
   settingbtn.forEach(btn => {
      btn.addEventListener("click", openSettings);
   });

   const playbtn = document.querySelectorAll("[data-play_button]");
   playbtn.forEach((btn, index) => {
      btn.addEventListener("click", () => {
          what_to_trade = btn.getAttribute('data-contract');
         // Check if settings are stored in localStorage
         const ticks = localStorage.getItem('ticks');
         const stake = localStorage.getItem('stake');
         const martingale = localStorage.getItem('martingale');

         //slide side
         SLIDE_SIDE = 'left';
         if (index % 2 === 0) {
          SLIDE_SIDE = 'right';
         }

         const icon = btn.querySelector('i');
         if (ticks) {
            if (isrunning) {
              updateButtons(btn, icon, 'stop');
              getThebot();
            }
            else {
              updateButtons(btn, icon, 'run');
              getThebot();
            }
         } else {
            // If no settings, show the dialog to configure them
            document.getElementById('settingsDialog').style.display = 'block';
            updateButtons(btn, icon, 'stop');
         }
      });
   });

   function updateButtons(btn, icon, sta) {
    if (sta === 'run') {
      icon.classList.remove('fa-play');
      icon.classList.add('fa-stop');
      btn.style.backgroundColor = 'red';
      isrunning = true;
    }
    else {
      icon.classList.remove('fa-stop');
      icon.classList.add('fa-play');
      btn.style.backgroundColor = ''; // resets to default
      isrunning = false;
    }
   }

   function openSettings() {
      const dialog = document.getElementById("settingsDialog");
      if (dialog) {
         dialog.style.display = "block";
      }
   }

   if (document.getElementById('save')) {
     document.getElementById('save').addEventListener('click', () => {
        saveSettings();
     });
   }

   // Function to save settings and show snackbar
   function saveSettings() {
      // Get input values
      const ticks = document.getElementById('ticksInput').value;
      const stake = document.getElementById('stakeInput').value;
      const martingale = document.getElementById('martingaleInput').value;

      // Save values (You can use localStorage or any state management)
      // Save to localStorage
      localStorage.setItem('ticks', ticks);
      localStorage.setItem('stake', stake);
      localStorage.setItem('martingale', martingale);

      // Close the dialog
      document.getElementById('settingsDialog').style.display = 'none';

      // Show snackbar notification
      const snackbar = document.getElementById('snackbar');
      snackbar.className = 'snackbar show';
      setTimeout(function () {
         snackbar.className = snackbar.className.replace('show', '');
      }, 3000); // Hide snackbar after 3 seconds
   }

   function getThebot() {
      token = localStorage.getItem('authToken');
      const slider = document.getElementById("slider"); // now happens when function is called
      if (!slider) {
         console.log("Slider element not found!");
         return;
      }

      if (isrunning) {
         slider.style.display = 'block'; // Show slider
      } else {
         slider.style.display = 'none'; // Hide slider
      }

      if (isrunning) {
        async function loadSliderContent() {
            total_runs = 0;
            total_stake = 0;
            total_payout = 0;
            total_won = 0;
            total_lost = 0;
            total_profit = 0;

            updateSummaries();
            startTrading();
        }

        let currentSide = null;

        function toggleSlider() {
           if (currentSide) {
              slider.classList.remove(`open-${currentSide}`);
           }

           if (SLIDE_SIDE === 'right') {
              slider.classList.remove('right');
              slider.classList.add('left');
           } else {
              slider.classList.remove('left');
              slider.classList.add('right');
           }

           if (currentSide === SLIDE_SIDE) {
              currentSide = null;
           } else {
              slider.classList.add(`open-${SLIDE_SIDE}`);
              currentSide = SLIDE_SIDE;
              loadSliderContent();
           }
        }

        toggleSlider();
      }
   }

   function startTrading() {
      let blinkInterval;
      buttonsTwo(blinkInterval);

      if (isrunning) {
        //stop the bot
        status = null;
        document.getElementById('run-button').addEventListener('click', () => {
          isrunning = false;
          const playbtn = document.querySelectorAll("[data-play_button]");
            playbtn.forEach(btn => {
              const icon = btn.querySelector('i');
              updateButtons(btn, icon, 'stop');
              window.scrollTo(0, 0);
              getThebot();
            });
        });
      } 
      else {
        buttonsTwo(blinkInterval);
      }
   }

   function buttonsTwo(blinkInterval) {
      const runButton = document.getElementById("run-button");
      const buttonIcon = document.getElementById("button-icon");
      const botStatus = document.getElementById("bot-status");

     if (!isrunning) {
        runButton.style.backgroundColor = "orange";
        buttonIcon.style.borderLeft = "10px solid black";
        buttonIcon.style.width = "0";
        buttonIcon.style.height = "0";
        buttonIcon.style.backgroundColor = "transparent";
        botStatus.textContent = "Bot is not running";
        botStatus.style.color = "#ffcc99";
        progressLine.style.width = "0%";

        if (blinkInterval) {
          clearInterval(blinkInterval);
        }
        dots.forEach((dot, index) => {
          dot.style.backgroundColor = "#666";
          dot.classList.remove("glow");
        });
     }
     else {
        runButton.style.backgroundColor = "red";
        buttonIcon.style.borderLeft = "none";
        buttonIcon.style.width = "10px";
        buttonIcon.style.height = "10px";
        buttonIcon.style.backgroundColor = "black";
        botStatus.textContent = "Bot is running";
        botStatus.style.color = "#00ff99";
     }
   }

   function updateSummaries() {
     document.getElementById("tstake").textContent = total_stake.toFixed(2) + " " + CURRENCY;
     document.getElementById("tpayout").textContent = total_payout.toFixed(2) + " " + CURRENCY;
     document.getElementById("truns").textContent = total_runs;
     document.getElementById("tlost").textContent = total_lost;
     document.getElementById("twon").textContent = total_won;
     document.getElementById("tploss").textContent = total_profit.toFixed(2) + " " + CURRENCY;
   }

    function createRow(row) {
      const tr = document.createElement("tr");
      const payoutClass = row.payout >= 0 ? 'payout-positive' : 'payout-negative';
      tr.innerHTML = `
        <td>${row.time}</td>
        <td>${row.asset}</td>
        <td>${row.stake + ' ' + CURRENCY}</td>
        <td class="${payoutClass}">${row.payout} ${CURRENCY}</td>
      `;
      return tr;
    }

   function openContract() {
    // Check if settings are stored in localStorage
    duration = localStorage.getItem('ticks');
    initial_stake = localStorage.getItem('stake');
    martingale = localStorage.getItem('martingale');
    stake = Number(Number(stake).toFixed(2));

    let params;
    if (what_to_trade === 'OVERUNDER') {
      params = {
          "buy": 1,
          "parameters": {
            "amount": stake,
            "barrier": barrier,
            "basis": "stake",
            "contract_type": contract_type,
            "duration": duration,
            "duration_unit": 't',
            "symbol": symbol,
            "currency": CURRENCY,
          },
          "price": stake,
          "subscribe": 1,
          "req_id": 3002
       }
    }

    if (what_to_trade === 'ODDEVEN' | what_to_trade === 'RISEFALL') {
      params = {
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
          "req_id": 3002
       }
    }

     if (params) {
      socket.send(JSON.stringify(params));
     }
   }
    } catch (err) {
        isrunning = false;
      console.error('❌ Caught error:', err);
    }

    document.getElementById('resetBtn').addEventListener('click', function () {
      document.getElementById("tstake").textContent = '';
      document.getElementById("tpayout").textContent = '';
      document.getElementById("truns").textContent = '';
      document.getElementById("tlost").textContent = '';
      document.getElementById("twon").textContent = '';
      document.getElementById("tploss").textContent = '';
      alert('reset done!')
    });
})();

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


