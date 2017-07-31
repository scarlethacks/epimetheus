var firebase = require('firebase');
var dotenv = require('dotenv');
	dotenv.load();

var config = {
	apiKey: process.env.FIREBASE_API_KEY,
	databaseURL: process.env.FIREBASE_DATABASE_URL
};
firebase.initializeApp(config);
firebase.auth().signInAnonymously();
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

var clone = (obj) => {
	return JSON.parse(JSON.stringify(obj));
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

	count: (calc) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: ' + calc.cid);
			getVisits({
				from: calc.from,
				to: calc.to
			}).then((res) => {
				var state = clone(calc.state) || {};
				for(var uid in USER_MAP){
					var visits = getVisitsInRange({
						uid: uid,
						from: calc.from,
						to: calc.to
					});
					state = calc.aggregator(state, visits);
				}
				console.log(new Date(calc.from), '-->', new Date(calc.to))
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = calc.response(state);
				resolve({
					text: res
				});
			}).catch(reject);
		});
	},

	rank: (calc) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: ' + calc.cid);
			getVisits({
				from: calc.from,
				to: calc.to
			}).then((res) => {
				var leaderboard = {};
				for(var uid in USER_MAP){
					var visits = getVisitsInRange({
						uid: uid,
						from: calc.from,
						to: calc.to
					});
					var info = calc.aggregator(visits);
					info.uid = uid;
					leaderboard[uid] = info;
				}
				var top = Object.keys(leaderboard).map((uid) => {
					return leaderboard[uid];
				}).filter(calc.filter).sort(calc.sort).slice(0, calc.limit).map((leader) => {
					leader.profile = USER_MAP[leader.uid].profile;
					return leader;
				});
				var leaderRes = top.map((x, i) => {return `${i+1}. ${calc.response(x, i+1)}`}).join('\n');
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				var res = `Rankings:\n${leaderRes}`;
				if(top.length < 1){
					res = `No relevant users to list.`;
				}
				resolve({
					text: res
				});
			}).catch(reject);

		});
	},

	compare: (calc) => {
		var startTime = Date.now();
		return new Promise((resolve, reject) => {
			console.log('Started Query: ' + calc.cid);
			getVisits({
				from: calc.from,
				to: calc.to
			}).then((res) => {
				var state = clone(calc.state) || {};
				for(var uid in USER_MAP){
					var entry = USER_MAP[uid];
					var visits = getVisitsInRange({
						uid: uid,
						from: calc.from,
						to: calc.to
					});
					state = calc.aggregator(state, visits);
				}
				var res = calc.response(state);
				var dur = Math.floor((Date.now() - startTime) / 1000);
				console.log(`Completed in ${dur.toFixed(1)} sec.`);
				resolve({
					text: res
				});
			}).catch(reject);
		});
	}

}