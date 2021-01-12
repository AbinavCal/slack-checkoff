require('dotenv').config()
var express = require('express');
var request = require('request');
var app = express();

app.get('/auth', (req, res) =>{
	res.sendFile(__dirname + '/add_to_slack.html')
});

app.get('/auth/redirect', (req, res) =>{
  console.log(process.env.CLIENT_ID);
  console.log(process.env.CLIENT_SECRET);
  var options = {
  		uri: 'https://slack.com/api/oauth.v2.access?code='
  			+req.query.code+
  			'&client_id='+process.env.CLIENT_ID+
  			'&client_secret='+process.env.CLIENT_SECRET,
		method: 'GET'
  	}
  	request(options, (error, response, body) => {
  		var JSONresponse = JSON.parse(body)
  		if (!JSONresponse.ok){
  			console.log(JSONresponse)
  			res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
  		}else{
  			console.log(JSONresponse)
  			res.send("Success!")
  		}
  	})
})

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
