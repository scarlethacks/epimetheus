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


var parseDateRange = (message) => {
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
	//console.log(new Date(from), '-->', new Date(to));
	return [from, to];
}

var USER_MAP = false;

module.exports = {

	countActiveUsers: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: countActiveUsers');
			var range = parseDateRange(message);
			var from = range[0];
			var to = range[1];
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
	},

	mapUsers: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: mapUsers');
			var ref = db.ref('prometheus/visits');
			var query = ref.limitToLast(2000);
			query.on('child_added', (snapshot) => {
				var val = snapshot.val();
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(snapshot.key, 'Size: ' + Object.keys(val).length, dur + ' secs.');
				/*USER_MAP = val;
				var userCount = Object.keys(val).length;
				console.log(`Counted ${userCount} users.`)
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = `I counted ${userCount} users with visits.`;
				resolve({
					text: res
				});
				console.log(Object.keys(USER_MAP).length);*/
			}).catch(reject);
		});
	}

}