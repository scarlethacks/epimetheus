//var Bot = require('slackbots');
var epimetheus = require('./data');
var dotenv = require('dotenv');
	dotenv.load();

var slack = require('slack');
var bot = slack.rtm.client();

var slackToken = process.env.SLACK_TOKEN || '';
var slackBotToken = process.env.SLACK_BOT_TOKEN || '';
var slackBotName  = process.env.SLACK_BOT_NAME  || '';

var liveTime = Date.now() / 1000;

var convertTime = (timestamp) => {
	var ft = parseFloat(timestamp, 10);
	return ft;
}

var isConversing = (data) => {
	var dts = convertTime(data.ts);
	var msg = data.type === 'message';
	var other = data.subtype !== 'bot_message';
	var ts = dts > liveTime;
	return (msg && other && ts);
}

slack.postTo = (params) => {
	params.token = slackToken;
	/*{
		token: slackToken,
		channel: 'metrics',
		text: `I heard: ${message.text}`
	}*/
	slack.chat.postMessage(params, (err, data) => {
		if(err){
			console.error(err);
		}
	});
}

bot.started((payload) => {
	//console.log('Payload: ', payload);
	console.log('Bot started.');
});

bot.message((message) => {
	//console.log(message);
	if(isConversing(message)){
		if(message.text === 'How many users were active today?'){
			slack.postTo({
				channel: 'metrics',
				text: 'Let me check...'
			});
			epimetheus.countActiveUsers().then((res) => {
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

bot.listen({token: slackToken});