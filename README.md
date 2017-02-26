# Epimetheus
Easily monitor web analytics and insights by aggregating Prometheus data in Firebase via a Slack bot.

For web app analytics to be meaningful, they must extend beyond just pageviews. PrometheusJS is an open source library that allows developers to track rich web analytics using Firebase, separate from core app data. Epimetheus allows developers to write custom aggregations on this data and easily access the resulting insights by chatting with a Slack bot. Use cases might include:

* Monitor KPIs: daily active users, monthly active users, user churn
* Review Experiments: report conversion rates, A/B test results, feature usage
* Assess Usability: analyze time to complete tasks, identify high priority errors

## Usage

Writing this code:

```javascript
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
	}
	...
}
```

...enables you to ask your bot this:

[Count users over a given time range.]('https://github.com/vingkan/epimetheus/blob/master/docs/count-users.png')

