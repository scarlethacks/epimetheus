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


var parseDateRange = (message, delimiter) => {
	var from = false;
	var to = false;
	var range = message.split(delimiter)[1].split('?')[0];
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

var USER_MAP = {};

var getVisitsByUser = (params) => {
	return new Promise((resolve, reject) => {
		var ref = db.ref('prometheus/visits/' + params.uid);
		var query = ref.orderByChild('meta/datetime/timestamp').startAt(params.from).endAt(params.to);
		query.once('value', (snapshot) => {
			var nodes = snapshot.val();
			resolve({
				uid: params.uid,
				from: params.from,
				to: params.to,
				visits: nodes
			});
		}).catch(nodes);
	});
}

var getVisits = (params) => {
	return new Promise((resolve, reject) => {
		var ref = db.ref('prometheus/users');
		var query = ref.orderByChild('lastVisit').startAt(params.from).endAt(Date.now()); // Because more recent users can still have relevant visits
		query.once('value', (snapshot) => {
			var promises = [];
			var userMap = snapshot.val();
			for(var uid in userMap){
				if(USER_MAP[uid]){
					var entry = USER_MAP[uid];
					var needOlder = entry.from > params.from;
					var needNewer = entry.to < params.to;
					if(needNewer && needOlder){
						var p = getVisitsByUser({
							uid: uid,
							from: params.from,
							to: params.to
						});
						promises.push(p);
					}
					else if(needOlder){
						var p = getVisitsByUser({
							uid: uid,
							from: params.from,
							to: entry.from
						});
						promises.push(p);
					}
					else if(needNewer){
						var p = getVisitsByUser({
							uid: uid,
							from: entry.to,
							to: params.to
						});
						promises.push(p);
					}
					else{
						// Sufficient data
					}
				}
				else{
					var p = getVisitsByUser({
						uid: uid,
						from: params.from,
						to: params.to
					});
					promises.push(p);
				}
			}
			Promise.all(promises).then((requests) => {
				for(var r = 0; r < requests.length; r++){
					var req = requests[r];
					var uid = req.uid;
					var visits = req.visits;
					if(!USER_MAP[uid]){
						USER_MAP[uid] = {
							from: req.from,
							to: req.to,
							visits: {}
						}
					}
					if(USER_MAP[uid].from > req.from){
						USER_MAP[uid].from = req.from;
					}
					if(USER_MAP[uid].to < req.to){
						USER_MAP[uid].to = req.to;
					}
					for(var vid in visits){
						USER_MAP[uid].visits[vid] = visits[vid];
					}
				}
				resolve({
					ready: true
				});
			}).catch(reject);
		}).catch(reject);
	});
}

module.exports = {

	countActiveUsers: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: countActiveUsers');
			var range = parseDateRange(message, 'active ');
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
	},

	countCreatedMeetings: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: countActiveUsers');
			var range = parseDateRange(message, 'created ');
			var from = range[0];
			var to = range[1];
			getVisits({
				from: from,
				to: to
			}).then((res) => {
				console.log(res);
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Fetched in ${dur.toFixed(1)} sec.`);


				var res = `I counted ${meetingCount} created meetings.`;
				resolve({
					text: res
				});

			}).catch(reject);

		});
	}

}