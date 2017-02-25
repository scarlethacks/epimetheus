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

	countActiveUsers: () => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: countActiveUsers');
			var from = new Date('2/24/2017').getTime();
			var to = new Date('2/25/2017').getTime();
			var ref = db.ref('prometheus/users');
			var query = ref.orderByChild('lastVisit').startAt(from).endAt(to);
			query.once('value', (snapshot) => {
				var val = snapshot.val();
				var userCount = Object.keys(val).length;
				console.log(`Counted ${userCount} users.`)
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = `I counted ${userCount} users.`;
				resolve({
					text: res
				});
			}).catch(reject);
		});
	}

}