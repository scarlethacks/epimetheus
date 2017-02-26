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
			console.log(`Retrieved ${Object.keys(userMap).length} users in date range.`);
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
			console.log(prom);
			prom.then((requests) => {
				console.log(`All ${requests.length} promises received.`);
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

var classifyUsers = (params) => {
	return new Promise((resolve, reject) => {
		var ref = db.ref('prometheus/users');
		var query = ref.orderByChild('lastVisit').startAt(params.from).endAt(Date.now()); // Because more recent users can still have relevant visits
		query.once('value', (snapshot) => {
			var promises = [];
			var userMap = snapshot.val();
			console.log(`Retrieved ${Object.keys(userMap).length} users in date range.`);
			if(userMap['ANONYMOUS_USER']){
				delete userMap['ANONYMOUS_USER'];
			}
			for(var uid in userMap){
				if(USER_MAP[uid]){
					if(!USER_MAP[uid].tags){
						if(!(params.tag in USER_MAP[uid].tags)){
							var visRef = db.ref('prometheus/visits/' + uid);
							var visProm = params.classifier(visRef);
							promises.push(visProm);
						}
						else{
							// Already tagged
						}
					}
					else{
						// Already tagged
					}
				}
				else{
					var visRef = db.ref('prometheus/visits/' + uid);
					var visProm = params.classifier(visRef);
					promises.push(visProm);
				}
			}
			var prom = Promise.all(promises);
			console.log(prom);
			prom.then((queries) => {
				console.log(`All ${queries.length} promises received.`);
				for(var r = 0; r < queries.length; r++){
					var qry = queries[r];
					if(!USER_MAP[uid].tags){
						USER_MAP[uid].tags = {};
					}
					USER_MAP[uid].tags[params.tag] = qry.status;
				}
				resolve({
					ready: true
				});
			});
		});
	});
}

var uniqueList = (list) => {
	return [...new Set(list)];
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
					var visits = Object.keys(USER_MAP[uid].visits).map((vid) => {
						return USER_MAP[uid].visits[vid];
					}).filter((visit) => {
						var keep = false;
						var lo = visit.meta.datetime.timestamp >= from;
						var hi = visit.meta.datetime.timestamp <= to;
						if(lo && hi){
							keep = true;
						}
						return keep;
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
				console.log(res);

				var leaderboard = {};
				for(var uid in USER_MAP){
					var visits = Object.keys(USER_MAP[uid].visits).map((vid) => {
						return USER_MAP[uid].visits[vid];
					}).filter((visit) => {
						var keep = false;
						var lo = visit.meta.datetime.timestamp >= from;
						var hi = visit.meta.datetime.timestamp <= to;
						if(lo && hi){
							keep = true;
						}
						return keep;
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
			var range = parseDateRange(message, 'users ');
			var from = range[0];
			var to = range[1];

			var demoClassifier = (ref) => {
				new Promise((resolve, reject) => {
					var query = ref.orderByChild('visit/mid').equalTo('sample');
					query.once('value', (snapshot) => {
						resolve({
							status: snapshot.exists()
						});
					}).catch(reject);
				});
			}

			classifyUsers({
				from: from,
				to: to,
				tag: 'usedDemo',
				classifier: demoClassifier
			}).then((done) => {
				console.log('Classification:', done);

				getVisits({
					from: from,
					to: to
				}).then((res) => {
					console.log('Visits:', res);

					var count = {};
					var meetings = {};

					for(var uid in USER_MAP){
						var entry = USER_MAP[uid];
						var visits = Object.keys(USER_MAP[uid].visits).map((vid) => {
							return USER_MAP[uid].visits[vid];
						}).filter((visit) => {
							var keep = false;
							var lo = visit.meta.datetime.timestamp >= from;
							var hi = visit.meta.datetime.timestamp <= to;
							if(lo && hi){
								keep = true;
							}
							return keep;
						});

						console.log(entry.tags);

						var status = entry.tags['usedDemo'];
						if(!count[status]){
							count[status] = 0;
						}
						if(!meeting[status]){
							meeting[status] = 0;
						}
						count[status]++;
						meeting[status] += uniqueList(visits.filter((v) => {
													var use = false;
													if(v.visit.mid){
														if(v.visit.mid !== 'sample'){
															use = true;
														}
													}
													return use;
												})).length;
					}

					var res = `Average meetings created by users who:\n`;
					for(var s in count){
						var avg = meeting[s] / count[s];
						var cat = s ? 'Tried demo' : 'Did not try demo';
						res += `${cat}: avg.toFixed(2)\n`;
					}

					
					var dur = Math.floor((Date.now() - startTime) / 1000);
					console.log(`Completed in ${dur.toFixed(1)} sec.`);
					resolve({
						text: res
					});
				}).catch(reject);

			}).catch(reject);

		});
	}

}