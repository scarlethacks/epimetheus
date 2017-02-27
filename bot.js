var dataAnalysis = require('./data');
var dotenv = require('dotenv');
	dotenv.load();

var slack = require('slack');
var bot = slack.rtm.client();

var slackToken = process.env.SLACK_TOKEN || '';
var slackBotToken = process.env.SLACK_BOT_TOKEN || '';
var slackBotName  = process.env.SLACK_BOT_NAME  || '';

var slackChannel = process.env.SLACK_CHANNEL || '';

var liveTime = Date.now() / 1000;

var convertTime = (timestamp) => {
	var ft = parseFloat(timestamp, 10);
	return ft;
}

var isConversing = (data, botData) => {
	var tagAt = `<@${botData.user_id}>`;
	var tagged = data.text.indexOf(tagAt) > -1;
	console.log(tagged, data, botData)
	var dts = convertTime(data.ts);
	var msg = data.type === 'message';
	var other = !data.bot_id;
	var ts = dts > liveTime;
	return (tagged && msg && other && ts);
}

slack.postTo = (params) => {
	params.token = slackBotToken;
	params.as_user = true;
	slack.chat.postMessage(params, (err, data) => {
		if(err){
			if(err.message.indexOf('chat:write:bot') > -1){
				//console.log('Error suppressed.');
			}
			else{
				console.error(err);
			}
		}
	});
}

var MINUTE = 1000 * 60;
var HOUR = MINUTE * 60;
var DAY = HOUR *24;

var parseDateRange = (message, delimiter) => {
	var from = false;
	var to = false;
	var range = message.split(delimiter)[1].split('?')[0];
	var date = new Date();
	var now = date.getTime();
	switch(range){
		case 'today':
			from = now - (now % DAY);
			to = from + DAY;
			break;
		case 'yesterday':
			from = (now - (now % DAY)) - DAY;
			to = now - (now % DAY);
			break;
		case 'this month':
			from = new Date(date.getFullYear(), date.getMonth()).getTime();
			to = now;
			break;
		case 'last month':
			var y = date.getFullYear();
			var m = date.getMonth();
			var ny = y;
			var nm = m - 1;
			if(nm < 0){
				nm = 11;
				ny--;
			}
			from = new Date(ny, nm).getTime();
			to = new Date(y, m).getTime();
			break;
		default:
			var dates = range.split('between ')[1].split(' and ');
			try{
				from = new Date(dates[0]).getTime();
				to = new Date(dates[1]).getTime();
			}
			catch(e){
				console.log(dates);
			}
			if(!(from && to)){
				from = now - (now % DAY);
				to = from + DAY;
			}
			break;
	}
	//console.log(new Date(from), '-->', new Date(to));
	return [from, to];
}

var main = (botData) => {
	bot.started((payload) => {
		console.log('Bot started.');
		slack.postTo({
			channel: slackChannel,
			text: 'Let\'s get started!'
		});
	});
	bot.listen({token: slackToken});
	bot.message((message) => {
		if(isConversing(message, botData)){
			var found = false;
			for(var cid in bot.calculations){
				var calc = bot.calculations[cid];
				var trigger = calc.question.split('{in date range}?')[0];
				if(message.text.indexOf(trigger) > -1){
					var range = parseDateRange(message.text, trigger);
					var fn = dataAnalysis[calc.type]
					calc.cid = cid;
					calc.from = range[0];
					calc.to = range[1];
					slack.postTo({
						channel: slackChannel,
						text: 'Let me check...'
					});
					fn(calc).then((res) => {
						slack.postTo({
							channel: slackChannel,
							text: res.text
						});
					});
					found = true;
					break;
				}
			}
			if(!found){
				slack.postTo({
					channel: slackChannel,
					text: 'Not sure how to figure that out.'
				});
			}
		}
	});
}

bot.init = () => {
	slack.auth.test({token: slackBotToken}, (err, data) => {
		if(err){
			console.error(err);
		}
		else{
			main(data);
		}
	});
}

module.exports = bot;
