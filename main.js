var bot = require('./bot');

var uniqueList = (list) => {
	return [...new Set(list)]; // Thanks, Eric Elliott
}

bot.calculations = {

	countUsers: {
		question: 'How many users were active {in date range}?',
		type: 'count',
		state: {
			count: 0
		},
		aggregator: (state, visits) => {
			if(visits.length > 0){
				state.count++;
			}
			return state;
		},
		response: (state) => {
			return `I counted ${state.count} users.`;
		}
	},

	countSchools: {
		question: 'How many schools have signed up {in date range}?',
		type: 'count',
		state: {
			
		},
		aggregator: (state, visits) => {
			visits.forEach(v => {
				let email = false;
				if (v.visit){
					email = v.visit.email;
				}
				if (email) {
					let domain = email.split('@')[1];
					if (!state[domain]) {
						state[domain] = 0;
					}
					state[domain]++;
				}
			});
			return state;
		},
		response: (state) => {
			let list = Object.keys(state).map(domain => {
				return {
					domain: domain,
					count: state[domain]
				}
			}).sort((a, b) => {
				return b.count - a.count;
			});
			let res = `Signups from ${list.length} schools:`;
			list.forEach(school => {
				res += `\n- ${school.domain}: ${school.count}`;
			});
			return res;
		}
	}

}

bot.init();
