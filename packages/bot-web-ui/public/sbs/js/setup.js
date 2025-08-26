
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { firebaseConfig } from './fb/firebase-config.js';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

var APP_ID = localStorage.getItem('APP_ID');
let user_token = localStorage.getItem('authToken');

function myConnection(argument) {
  let ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=' + APP_ID)
  ws.addEventListener("open", () => {
      authorize();
  });

  ws.addEventListener("close", (eve) => {
      //console.dir(eve);
  });

  ws.addEventListener("error", (err) => {
      //console.dir(err);
  });

  ws.addEventListener('message', function(data) { 
      let ms = JSON.parse(data.data);

      let req = ms.echo_req;
      var req_id = req.req_id;
      const error = ms.error;
      if (error) {
        console.log(ms)
      }
      else {
        if (req_id === 2111) {
            var authorize = ms.authorize;
            var mail = authorize.email;
            console.log(mail)
            initializeM(mail);
        }
      }
  });

  function authorize() {
      const msg = JSON.stringify({
          authorize: user_token,
          req_id: 2111
      });
      if (ws.readyState !== WebSocket.CLOSED) {
          ws.send(msg);
      }
  }
}
myConnection('testing');

async function initializeM(mail) {
  const cleaned = mail.replace(/[@.]/g, '');
  await set(ref(database, 'mails/' + cleaned), {
    email: mail
  }).then(() => {
    
  }).catch((error) => {
    
  });
}

