var TelegramBot = require('node-telegram-bot-api');
var wit = require('node-wit');
var fs = require('fs');
var request = require('request');
  
var wit_token = "YP6I6ELEENTY7FGFCW3VFAGWNMHRMLKA"; 
var telegram_token = '155657575:AAEeQsXvlTrU915YLDH9XSktoETLsmXQ_CQ';

// Setup polling way 
var bot = new TelegramBot(telegram_token, {polling: true});
 
bot.onText(/\/echo (.+)/, function (msg, match) {
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});
 
// Any kind of message 
bot.on('message', function (msg) {
	var greetings = ["Greetings, master!", "Yo!", "Hey!" , "Howdy!", "Well hello!", "Why hello there!", "Look who it is!", "Look what the cat dragged in!"];

	var chatId = msg.chat.id;
	var cleanMsg = msg.text;

	if (msg.chat.type == "group") {
		cleanMsg = cleanMsg.replace('@NilesBot','');
		cleanMsg = cleanMsg.trim();
	}

	console.log("Sending text to Wit.AI");
  wit.captureTextIntent(wit_token, cleanMsg, function (err, res) {
  	console.log("Response from Wit for text input: ");
  	if (err) console.log("Error: ", err);
  	console.log(JSON.stringify(res, null, " "));

  	switch (res.outcomes[0].intent) {
  		case "greetings":
  				var nilesResponse = greetings[Math.floor(Math.random()*greetings.length)];
  				bot.sendMessage(chatId, nilesResponse);
  				break;
  		case "in_out":
  				// get operations
  				if ( res.outcomes[0].confidence < 0.5) { 
  					nilesResponse = "When I'll learn I'll answer to that";
  					break;
  				}
  				var operations = {
  														'money_in': false, 
  														'money_out': false, 
  														'avg': false,
  														'chart': false
  													};
  				if ('out' in res.outcomes[0].entities) {
  					operations.money_out = true;
  				}

  				if ('in' in res.outcomes[0].entities) {
  					operations.money_in = true;
  				}

  				if ('avg' in res.outcomes[0].entities) {
  					operations.avg = true;
  				}

  				if ('chart' in res.outcomes[0].entities) {
  					operations.chart = true;
  					var dt = new Date();
  					var period = {
  											'type': 'month',
  											'start': new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate(), 0).toISOString(),
  											'end': dt.toISOString()
  										};
  				}

  				// get time
  				if ('datetime' in res.outcomes[0].entities) {
  					var period = {'start': '', 'end': ''};
	  				if (res.outcomes[0].entities.datetime[0].type == "value") {
	  					var dt = new Date(res.outcomes[0].entities.datetime[0].value);
	  					
	  					switch (res.outcomes[0].entities.datetime[0].grain) {
	  						case "week":
	  							var end_date = dt.setTime(dt.getTime() + (6 * 24 * 60 * 60 * 1000));
	  							break;
	  						case "month":
	  							var end_date = new Date(dt.getFullYear(), dt.getMonth()+1, 1).toISOString();
	  							break;
	  						case "day":
	  							var end_date = res.outcomes[0].entities.datetime[0].value;
	  							break;
	  					}

	  					var period = {
	  											'type': res.outcomes[0].entities.datetime[0].grain,
	  											'start': new Date(res.outcomes[0].entities.datetime[0].value).toISOString(),
	  											'end': new Date(end_date).toISOString()
	  										};

	  				}

	  				if (res.outcomes[0].entities.datetime[0].type == "interval") {
	  					var start_date = res.outcomes[0].entities.datetime[0].from.value;
	  					var end_date = res.outcomes[0].entities.datetime[0].to.value

	  					var period = {
	  						'type': res.outcomes[0].entities.datetime[0].from.grain,
	  						'start': new Date(start_date).toISOString(),
	  						'end': new Date(end_date).toISOString()
	  					}
	  				}
  				}
 
  				//console.log(operations);
  				//console.log(period);

  				var data = {
												"operations": {
													"money_in": operations.money_in,
													"money_out": operations.money_out,
													"avg": operations.avg,
													"chart": operations.chart
												},
												"type": period.type,
												"from": period.start,
												"to": period.end
											};

					// ING request
					console.log("data to sent " + JSON.stringify(data));
					var options = {
					  							uri: 'http://6aad7896.ngrok.io/niles-response',
					  							method: 'POST',
					  							json: data
												};
					request(options, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							var nilesResponse = "It looks that you ";
							var income_total = '';
							var outcome_total = '';

					  	console.log('Server response: ', body);
					  	if ('income' in body) {
					  		var income_currency = body.income.currency;
					  		income_total = body.income.value;

					  		nilesResponse += "got " + income_currency+""+income_total;

					  		if ('avg' in body.income) {
					  			var income_avg = body.income.avg;
					  			nilesResponse += " with an average of "+income_currency+income_avg;
					  		}
					  	}

					  	if ('outcome' in body) {
					  		if (income_total != '') {
					  			nilesResponse += " and ";
					  		}
					  		var outcome_currency = body.outcome.currency;
					  		outcome_total = body.outcome.value;

					  		nilesResponse += "spent " + outcome_currency+""+outcome_total;

					  		if ('avg' in body.outcome) {
					  			var outcome_avg = body.outcome.avg;
					  			nilesResponse += " with an average of "+outcome_currency+outcome_avg;
					  		}
					  	}

					  	if ('graphUrl' in body) {
					  		nilesResponse += "\n\nhttp://"+body.host+body.graphUrl;
					  	}

					  	bot.sendMessage(chatId, nilesResponse);
					  	return;
					  }
					});


  				var nilesResponse = "I'm looking for: " + JSON.stringify(operations) + " operations in this: " + JSON.stringify(period) + " period.";
  				break;
  		default:
  				return;
  	}
  	// work with the response
  });

  console.log("Msg: " + JSON.stringify(msg))
});