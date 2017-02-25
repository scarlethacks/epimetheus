var Bot = require('slackbots');
var firebase = require('firebase');
var dotenv = require('dotenv');
	dotenv.load();

var config = {
	apiKey: process.env.FIREBASE_API_KEY,
	databaseURL: process.env.FIREBASE_DATABASE_URL
};
firebase.initializeApp(config);
var db = firebase.database();

var ref = db.ref('prometheus/users/catherine');
ref.once('value', (snapshot) => {
	var val = snapshot.val();
	console.log(val);
});

var slackBotToken = process.env.SLACK_BOT_TOKEN || '';
var slackBotName  = process.env.SLACK_BOT_NAME  || '';

var bot = new Bot({
	token: slackBotToken,
	name : slackBotName
});
bot.knownUsers = {};

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
});