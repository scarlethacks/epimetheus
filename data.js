var firebase = require('firebase');
var dotenv = require('dotenv');
	dotenv.load();

var config = {
	apiKey: process.env.FIREBASE_API_KEY,
	databaseURL: process.env.FIREBASE_DATABASE_URL
};
firebase.initializeApp(config);
var db = firebase.database();

var MINUTE = 1000 * 60;
var HOUR = MINUTE * 60;
var DAY = HOUR *24;

module.exports = {

	countActiveUsers: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: countActiveUsers');
			var from = false;
			var to = false;
			var range = message.split('active ')[1].split('?')[0];
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
						from = new Date('2/24/2017').getTime();
						to = new Date('2/25/2017').getTime();
					}
					break;
			}
			console.log(new Date(from), '-->', new Date(to));
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