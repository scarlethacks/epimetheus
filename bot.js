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

bot.knownUsers = {};

var main = () => {

	console.log('Bot started.');

	bot.on('message', (data) => {
		try{
			if(data.type === 'user_typing'){
				if(!bot.knownUsers[data.user]){
					bot._api('users_info', {user: data.user}).then((userData) => {
						userData.user.last = '';
						bot.knownUsers[userData.user.id] = userData.user;
					});
				}
			}
			else if(data.type === 'message' && data.username !== 'Epimetheus'){
				console.log(data);
				bot.postTo('metrics', 'Sorry for the problems.');
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