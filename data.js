var firebase = require('firebase');
var dotenv = require('dotenv');
	dotenv.load();

var config = {
	apiKey: process.env.FIREBASE_API_KEY,
	databaseURL: process.env.FIREBASE_DATABASE_URL
};
firebase.initializeApp(config);
var db = firebase.database();

module.exports = {

	init: () => {

		return new Promise((resolve, reject) => {

			var userMap = {};
			var prometheusRef = db.ref('prometheus');
			console.log('Send request.');
			prometheusRef.once('value', (snapshot) => {
				console.log('Start mapping.');
				var dataMap = snapshot.val();
				for(var uid in dataMap.users){
					if(uid !== 'ANONYMOUS_USER'){
						var visitList = Object.keys(dataMap.visits[uid]).map((vid) => {
							return dataMap.visits[uid][vid];
						}).filter((visit) => {
							return true;
						}).sort((a, b) => {
							return a.meta.datetime.timestamp - b.meta.datetime.timestamp;
						});
						userMap[uid] = {
							profile: dataMap.users[uid].profile,
							visits: visitList,
							lastVisit: dataMap.users[uid].lastVisit
						}
					}
				}
				console.log('Resolve request.');
				resolve(userMap);
			}).catch(reject);

		});

	}

}