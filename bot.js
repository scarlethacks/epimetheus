var epimetheus = require('./data');
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

var isConversing = (data) => {
	var dts = convertTime(data.ts);
	var msg = data.type === 'message';
	var other = !data.bot_id;
	var ts = dts > liveTime;
	return (msg && other && ts);
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
	switch(range){
		case 'today':
			var now = Date.now();
			from = now - (now % DAY);
			to = from + DAY;
			break;
		case 'yesterday':
		var now = Date.now();
			from = (now - (now % DAY)) - DAY;
			to = now - (now % DAY);
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
	return [from, to];
}


bot.calculations = {
	countUsers: {
		question: 'How many fun users were active {in date range}?',
		type: 'count',
		aggregator: (visits) => {
			return 1;
		},
		response: (res) => {
			return `I counted ${res} users and no pandas.`;
		}
	}
}

bot.init = () => {
	slack.auth.test({token: slackBotToken}, (err, data) => {});
	bot.started((payload) => {
		console.log('Bot started.');
	});
	bot.listen({token: slackToken});
	bot.message((message) => {
		if(isConversing(message)){
			slack.postTo({
				channel: slackChannel,
				text: 'Let me check...'
			});
			for(var cid in bot.calculations){
				var calc = bot.calculations[cid];
				var trigger = calc.question.split('{in date range}?')[0];
				var range = parseDateRange(message.text, trigger);
				if(message.text.indexOf(trigger) > -1){
					var fn = epimetheus[calc.type]
					fn({
						cid: cid,
						aggregator: calc.aggregator,
						response: calc.response,
						from: range[0],
						to: range[1]
					}).then((res) => {
						slack.postTo({
							channel: slackChannel,
							text: res.text
						});
					});
					break;
				}
			}
		}
	})
}

bot.init();


bot.addCalculation = () => {
	if(message.text.indexOf('How many users were active') > -1){
		slack.postTo({
			channel: 'metrics',
			text: 'Let me check...'
		});
		epimetheus.countActiveUsers(message.text).then((res) => {
			slack.postTo({
				channel: 'metrics',
				text: res.text
			});
		});
	}	
}

bot.message((message) => {
	if(isConversing(message)){
		if(message.text.indexOf('How many users were active') > -1){
			slack.postTo({
				channel: 'metrics',
				text: 'Let me check...'
			});
			epimetheus.countActiveUsers(message.text).then((res) => {
				slack.postTo({
					channel: 'metrics',
					text: res.text
				});
			});
		}
		else if(message.text.indexOf('How many meetings were created') > -1){
			slack.postTo({
				channel: 'metrics',
				text: 'Let me check...'
			});
			epimetheus.countCreatedMeetings(message.text).then((res) => {
				slack.postTo({
					channel: 'metrics',
					text: res.text
				});
			});
		}
		else if(message.text.indexOf('Who were the top creators') > -1){
			slack.postTo({
				channel: 'metrics',
				text: 'Let me check...'
			});
			epimetheus.topTenCreators(message.text).then((res) => {
				slack.postTo({
					channel: 'metrics',
					text: res.text
				});
			});
		}
		else if(message.text.indexOf('How did the demo page convert') > -1){
			slack.postTo({
				channel: 'metrics',
				text: 'Let me check...'
			});
			epimetheus.demoAnalysis(message.text).then((res) => {
				slack.postTo({
					channel: 'metrics',
					text: res.text
				});
			});
		}
		else{
			var msg = `I heard: ${message.text}.`;
			slack.postTo('metrics', msg);
		}
	}
});

