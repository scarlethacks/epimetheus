var firebase = require('firebase');
var dotenv = require('dotenv');
	dotenv.load();

var config = {
	apiKey: process.env.FIREBASE_API_KEY,
	databaseURL: process.env.FIREBASE_DATABASE_URL
};
firebase.initializeApp(config);
var db = firebase.database();


var USER_MAP = {};

var getVisitsByUser = (params) => {
	return new Promise((resolve, reject) => {
		var ref = db.ref('prometheus/visits/' + params.uid);
		var query = ref.orderByChild('meta/datetime/timestamp').startAt(params.from).endAt(params.to);
		query.once('value', (snapshot) => {
			var nodes = snapshot.val();
			var size = 0;
			if(nodes){
				size = Object.keys(nodes).length;
			}
			//console.log(`Resolved for ${params.uid} with ${size} nodes.`);
			resolve({
				uid: params.uid,
				from: params.from,
				to: params.to,
				visits: nodes
			});
		}).catch(reject);
	});
}

var getVisits = (params) => {
	return new Promise((resolve, reject) => {
		var ref = db.ref('prometheus/users');
		var query = ref.orderByChild('lastVisit').startAt(params.from).endAt(Date.now()); // Because more recent users can still have relevant visits
		query.once('value', (snapshot) => {
			var promises = [];
			var userMap = snapshot.val();
			//console.log(`Retrieved ${Object.keys(userMap).length} users in date range.`);
			if(userMap['ANONYMOUS_USER']){
				delete userMap['ANONYMOUS_USER'];
			}
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
						//console.log(`Full promise sent for ${uid}`);
					}
					else if(needOlder){
						var p = getVisitsByUser({
							uid: uid,
							from: params.from,
							to: entry.from
						});
						promises.push(p);
						//console.log(`Partial promise sent for ${uid}`);
					}
					else if(needNewer){
						var p = getVisitsByUser({
							uid: uid,
							from: entry.to,
							to: params.to
						});
						promises.push(p);
						//console.log(`Partial promise sent for ${uid}`);
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
					//console.log(`Full promise sent for ${uid}`);
				}
			}
			var prom = Promise.all(promises);
			//console.log(prom);
			prom.then((requests) => {
				//console.log(`All ${requests.length} promises received.`);
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
					if(userMap[uid]){
						if(userMap[uid].profile){
							USER_MAP[uid].profile = userMap[uid].profile || {};
						}
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

var uniqueList = (list) => {
	return [...new Set(list)];
}

var getVisitsInRange = (params) => {
	return Object.keys(USER_MAP[params.uid].visits).map((vid) => {
		return USER_MAP[params.uid].visits[vid];
	}).filter((visit) => {
		var keep = false;
		var lo = visit.meta.datetime.timestamp >= params.from;
		var hi = visit.meta.datetime.timestamp <= params.to;
		if(lo && hi){
			keep = true;
		}
		return keep;
	}).sort((a, b) => {
		return a.meta.datetime.timestamp - b.meta.datetime.timestamp;
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
				//console.log(`Counted ${userCount} users.`)
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = `I counted ${userCount} users.`;
				resolve({
					text: res
				});
			}).catch(reject);
		});
	},

	count: (params) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: ' + params.cid);
			getVisits({
				from: params.from,
				to: params.to
			}).then((res) => {
				var count = 0;
				for(var uid in USER_MAP){
					var visits = getVisitsInRange({
						uid: uid,
						from: params.from,
						to: params.to
					});
					count += params.aggregator(visits);
				}
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = params.response(count);
				resolve({
					text: res
				});
			}).catch(reject);
		});
	},

	countCreatedMeetings: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: countCreatedMeetings');
			var range = parseDateRange(message, 'created ');
			var from = range[0];
			var to = range[1];
			getVisits({
				from: from,
				to: to
			}).then((res) => {

				var meetingCount = 0;
				for(var uid in USER_MAP){
					var visits = getVisitsInRange({
						uid: uid,
						from: from,
						to: to
					});
					meetingCount += visits.filter((data) => {
						return data.visit.type === 'CREATE_MEETING';
					}).length;
				}

				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = `I counted ${meetingCount} created meetings.`;
				resolve({
					text: res
				});
			}).catch(reject);

		});
	},

	topTenCreators: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: topTenCreators');
			var range = parseDateRange(message, 'creators ');
			var from = range[0];
			var to = range[1];
			getVisits({
				from: from,
				to: to
			}).then((res) => {
				//console.log(res);

				var leaderboard = {};
				for(var uid in USER_MAP){
					var visits = getVisitsInRange({
						uid: uid,
						from: from,
						to: to
					});
					var meetingCount = visits.filter((data) => {
						return data.visit.type === 'CREATE_MEETING';
					}).length;
					leaderboard[uid] = {
						uid: uid,
						count: meetingCount
					}
				}
				var top = Object.keys(leaderboard).map((uid) => {
					return leaderboard[uid];
				}).filter((u) => {
					return u.count > 0;
				}).sort((a, b) => {
					return b.count - a.count;
				}).slice(0, 10).map((leader) => {
					var entry = USER_MAP[leader.uid];
					leader.name = USER_MAP[leader.uid].profile.name || 'No Name';
					return leader;
				});

				var leaderRes = top.map((x, i) => {return `${i+1}. ${x.name} (${x.count} meetings)`}).join('\n');

				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = `Here they are!\n${leaderRes}`;
				resolve({
					text: res
				});
			}).catch(reject);

		});
	},

	demoAnalysis: (message) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: demoAnalysis');
			var range = parseDateRange(message, 'convert ');
			var from = range[0];
			var to = range[1];

			getVisits({
				from: from,
				to: to
			}).then((res) => {
				//console.log('Visits:', res);

				var count = {};
				var total = 0;

				for(var uid in USER_MAP){
					var entry = USER_MAP[uid];
					var visits = getVisitsInRange({
						uid: uid,
						from: from,
						to: to
					});

					var status = false;

					for(var v = 0; v < visits.length; v++){
						var visit = visits[v].visit;
						if(visit.mid){
							if(visit.mid === 'sample'){
								status = true;
								break;
							}
						}
					}

					if(!count[status]){
						count[status] = 0;
					}

					if(visits.length > 0){
						count[status]++;
						total++;
					}
				}

				var res = `Conversion rates for demo page:\n`;
				var cat = {
					true: 'Tried Demo',
					false: 'Did not try Demo'
				}
				for(var s in {true: 1, false: 1}){
					var avg = (count[s] / total) * 100;
					res += `${cat[s]}: ${avg.toFixed(2)}%\n`;
				}

				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				resolve({
					text: res
				});
			}).catch(reject);

		});
	}

}