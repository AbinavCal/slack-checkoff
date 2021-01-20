const { App, ExpressReceiver } = require('@slack/bolt');
const { google } = require('googleapis');

const config = require("./config.json");
const expressReceiver = new ExpressReceiver({
  signingSecret: config.SLACK_SIGNING_SECRET
});

const app = new App({
  token: config.SLACK_BOT_TOKEN,
  receiver: expressReceiver
});
const expressApp = expressReceiver.app;


///// AUTH SETUP FUNCTIONS /////
function getJwt() {
  var credentials = require("./credentials.json");
  return new google.auth.JWT(
    credentials.client_email, null, credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function getApiKey() {
  return config.key;
}

///// BOLT.JS LISTENERS FOR SLACK EVENTS /////
const sheet = config.sheet;
const TAs = config.TAs;

app.command('/checkoff', async ({ command, ack, client, respond }) => {
  try {
    await ack();
    const args = command.text.split(' ');
    let cid = "";
    let pos = "";
    if (args.length < 3) {
      await respond({"text": "Checkoff failed: Provide SID/pos/TA"});
      return;
    } else if (args.length > 1) {
      pos = args[1];
      cid = args[2].substring(2, args[2].indexOf('|'));
      if (!TAs.includes(cid)) {
        await respond({"text": "Checkoff failed: Invalid request recipient (not a OH TA)"});
        return;
      }
      if (pos != "RD" && pos != "AI") {
        await respond({"text": "Checkoff failed: Invalid position; put 'RD' if you're a reader, put 'AI' if you're an AI. "});
        return;
      }
    }
    const SID = args[0];
    await respond({"response_type": "in_channel", "text": `Asking <@${cid}> to check you off...`});
    await client.chat.postMessage({
      "channel": cid,
      "text": `Checkoff request from <@${command.user_id}>`,
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `<@${command.user_id}> would like to get checked off!`
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "emoji": true,
                "text": "Approve"
              },
              "style": "primary",
              "value": `${SID} ${command.user_id} ${pos}`,
              "action_id": "checkoff_yes"
            },
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "emoji": true,
                "text": "Deny"
              },
              "style": "danger",
              "value": `${command.user_id}`,
              "action_id": "checkoff_no"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.log(error);
  }
});

app.action('checkoff_yes', async({ body, ack, client }) => {
  try {
    await ack();
    const rets = body.actions[0].value.split(' ');
    const SID = rets[0];
    const sender_id = rets[1];
    const pos = rets[2];
    await client.chat.postMessage({
      "channel": sender_id,
      "text": `<@${body.user.id}> confirmed your checkoff!`
    });
    await client.chat.update({
      "channel": body.container.channel_id,
      "ts": body.container.message_ts,
      "text": "Done!",
      "blocks": body.message.blocks.slice(0, 1).concat({
          "type": "context",
          "elements": [{
             "type": "mrkdwn",
             "text": "✔️ Thanks."
          }]
       })
    });
    const email = (await client.users.info({"user": body.user.id})).user.profile.email;
    const name =  (await client.users.info({"user": sender_id})).user.real_name;
    var current = new Date();
    const stamp = current.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }).replace(',','');
    var jwt = getJwt();
    var apiKey = getApiKey();
    writeSID(jwt, apiKey, sheet, [stamp, email, name, SID,
      pos == "RD" ? "Reader" : "Academic Intern",
      pos == "RD" ? "Office Hour" : "Discussion"]);
  } catch (error) {
    console.log(error);
  }
});

app.action('checkoff_no', async ({ body, ack, client }) => {
  try {
    await ack();
    const sender_id = body.actions[0].value;
    await client.chat.postMessage({
      "channel": sender_id,
      "text": `<@${body.user.id}> denied your checkoff.`
    });
    await client.chat.update({
      "channel": body.container.channel_id,
      "ts": body.container.message_ts,
      "text": "Done!",
      "blocks": body.message.blocks.slice(0, 1).concat({
          "type": "context",
          "elements": [{
             "type": "mrkdwn",
             "text": "❌ Thanks."
          }]
       })
    });
  } catch (error) {
    console.log(error);
  }
});

///// UPDATE CHECKOFF COUNT IN GOOGLE SHEET /////
function writeSID(jwt, apiKey, sheet, data) {
  const sheets = google.sheets({version: 'v4'});

  sheets.spreadsheets.values.append({
    spreadsheetId: sheet,
    range: 'A1',
    auth: jwt,
    key: apiKey,
    valueInputOption: 'USER_ENTERED',
    resource: {values: [data]}
  }, (err, res) => {
    (err) ? console.log(err) : console.log("Successful data append");
  });


  // let [cell_row, cells] = [-1, [SID, 1]]
  // sheets.spreadsheets.values.get({
  //   spreadsheetId: sheet,
  //   range: 'A2:B',
  //   auth: jwt,
  //   key: apiKey
  // }, (err, res) => {
  //   if (err) return console.log('The API returned an error: ' + err);
  //   const rows = res.data.values;
  //   if (rows.length) {
  //     cell_row = rows.findIndex((row) => row[0] == cells[0]);
  //     if (cell_row > -1) {
  //       console.log("update");
  //       cells[1] = parseInt(rows[cell_row][1]) + 1;
  //       sheets.spreadsheets.values.update({
  //         spreadsheetId: sheet,
  //         range: `A${cell_row+2}`,
  //         auth: jwt,
  //         key: apiKey,
  //         valueInputOption: 'USER_ENTERED',
  //         resource: {values: [cells]}
  //       }, (err, res) => {
  //         if (err) return console.log('The API returned an error: ' + err);
  //         console.log('%d cells updated.', res.data.updatedCells);
  //       });
  //     } else {
  //       console.log("append");
  //       sheets.spreadsheets.values.append({
  //         spreadsheetId: sheet,
  //         range: `A1`,
  //         auth: jwt,
  //         key: apiKey,
  //         valueInputOption: 'USER_ENTERED',
  //         resource: {values: [cells]}
  //       }, (err, res) => {
  //         if (err) return console.log('The API returned an error: ' + err);
  //         console.log('%d cells appended.', res.data.updatedCells);
  //       });
  //     }
  //   } else {
  //     console.log('No data found.');
  //   }
  // });
}

///// POS JS DATE FORMATIING /////
const leadingZero = (num) => `0${num}`.slice(-2);

const formatTime = (date) =>
  [date.getHours(), date.getMinutes(), date.getSeconds()]
  .map(leadingZero)
  .join(':');
///// EXPORT CLOUD FUNCTION /////
function isOnGoogleCloud() {
  // https://cloud.google.com/functions/docs/env-var#nodejs_10_and_subsequent_runtimes
  return process.env.K_SERVICE && process.env.K_REVISION;
}

if (!isOnGoogleCloud()) {
  // Running on your local machine
  (async () => {
    // Start your app
    expressApp.listen(config.SLACK_APP_PORT || 3000);
    console.log('⚡️ Slack app is running!');
  })();
}

exports.checkoff = function (req, res) {
  console.log(`Got a request: ${JSON.stringify(req.headers)}`);
  expressApp(req, res);
};
