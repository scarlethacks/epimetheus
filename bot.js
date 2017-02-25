var Bot = require('slackbots');
var Epimetheus = require('./data');
var dotenv = require('dotenv');
	dotenv.load();

var slackBotToken = process.env.SLACK_BOT_TOKEN || '';
var slackBotName  = process.env.SLACK_BOT_NAME  || '';

var bot = new Bot({
	token: slackBotToken,
	name : slackBotName
});

var liveTime = Date.now() / 100;
bot.knownUsers = {};

var convertTime = (timestamp) => {
	var ft = parseFloat(timestamp, 10);
	var t = 10 * ft;
	return t;
}

var isConversing = (data) => {
	var dts = convertTime(data.ts);
	var msg = data.type === 'message';
	var other = data.username !== 'Epimetheus';
	var ts = dts > liveTime;
	return (msg && other && ts);
}

var main = () => {

	console.log('Bot started.');

	bot.on('message', (data) => {
		try{
			if(isConversing(data)){
				var msg = `I heard: ${data.text}.`;
				bot.postTo('metrics', msg);
			}
		}
		catch(e){
			console.error(e);
		}
	});

}

main();

/*bot.knownUsers = {};

bot.on('start', function() {
	console.log('[BOT] Started');
});

bot.on('message', function(data) {
    try {

        if ('user_typing' == data.type) {
            if (!bot.knownUsers[data.user]) {
                bot._api('users.info', {'user': data.user}).then(function(userData) {
                    userData.user.last               = '';
                    bot.knownUsers[userData.user.id] = userData.user;
                });
            }

        } else if ('message' == data.type) {
            var user = bot.knownUsers[data.user];
            if (user && user.is_bot == false) {
                //console.log('[BOT] User Object', user);
                //console.log('[BOT] Data Object', data);
                bot.postMessageToUser(user.name, data.text);
            }

        }

    } catch (e) {}
});*/