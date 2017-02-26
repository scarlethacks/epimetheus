var Epimetheus = require('./bot');

var bot = Epimetheus;

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
			state.count++;
			return state;
		},
		response: (state) => {
			return `I counted ${state.count} users.`;
		}
	},

	countMeetings: {
		question: 'How many meetings were active {in date range}?',
		type: 'count',
		state: {
			mids: []
		},
		aggregator: (state, visits) => {
			var mids = visits.filter((v) => {
				return v.visit.mid || false;
			}).map((v) => {
				return v.visit.mid;
			});
			state.mids.push.apply(state.mids, mids);
			return state;
		},
		response: (state) => {
			return `I counted ${uniqueList(state.mids).length} active meetings.`;
		}
	},

	rankCreators: {
		question: 'Who were the top meeting creators {in date range}?',
		type: 'rank',
		aggregator: (visits) => {
			return {
				creates: visits.filter((v) => {
					return v.visit.type === 'CREATE_MEETING';
				}).length
			}
		},
		limit: 20,
		filter: (user) => {
			return user.creates > 0;
		},
		sort: (a, b) => {
			return b.creates - a.creates;
		},
		response: (user, rank) => {
			return `${user.profile.name} (${user.creates} meetings.)`;
		}
	},

	compareDemo: {
		question: 'What were conversion rates for the demo {in date range}?',
		type: 'compare',
		state: {
			usedDemo: {
				true: 0,
				false: 0
			},
			total: 0
		},
		aggregator: (state, visits) => {
			var usedDemo = false;
			for(var v = 0; v < visits.length; v++){
				var visit = visits[v].visit;
				if(visit.mid === 'sample'){
					usedDemo = true;
					break;
				}
			}
			state.usedDemo[usedDemo]++;
			state.total++;
			return state;
		},
		response: (state) =>{
			var res = `Comparison for Demo Page:\n`;
			var tag = {
				true: 'Tried Demo',
				false: 'Did not try Demo'
			}
			for(var i in tag){
				var num = state.usedDemo[i] || 0;
				res += `${tag[i]}: ${((num/state.total)*100).toFixed(2)}%\n`;
			}
			return res;
		}
	}

}

bot.init();
