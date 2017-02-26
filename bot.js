//var Bot = require('slackbots');
var epimetheus = require('./data');
var dotenv = require('dotenv');
	dotenv.load();

var slack = require('slack');
var bot = slack.rtm.client();

var slackToken = process.env.SLACK_TOKEN || '';
var slackBotToken = process.env.SLACK_BOT_TOKEN || '';
var slackBotName  = process.env.SLACK_BOT_NAME  || '';

slack.auth.test({token: slackBotToken}, (err, data) => {
	//console.log(err, data)
});

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
	params.token = slackBotToken;
	params.as_user = true;
	/*{
		token: slackToken,
		channel: 'metrics',
		text: `I heard: ${message.text}`,
		as_user: true
	}*/
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

bot.started((payload) => {
	console.log('Bot started.');
});

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
		else if(message.text.indexOf('How did the demo impact users') > -1){
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

bot.listen({token: slackToken});