var Bot = require('slackbots');
var Data = require('./data');
var dotenv = require('dotenv');
	dotenv.load();

var slackBotToken = process.env.SLACK_BOT_TOKEN || '';
var slackBotName  = process.env.SLACK_BOT_NAME  || '';

var bot = new Bot({
	token: slackBotToken,
	name : slackBotName
});

var main = (userMap) => {

	console.log('Bot started.');
	//console.log(userMap);
	var userCount = Object.keys(userMap).length;
	console.log(`Prometheus counted ${userCount} users.`);

	bot.on('message', (data) => {
		try{
			//console.log(data);
		}
		catch(e){
			console.error(e);
		}
	});

}

Data.init().then((userMap) => {
	main(userMap);
});

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