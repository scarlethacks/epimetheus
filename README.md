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

![Count users over a given time range.](https://github.com/vingkan/epimetheus/blob/master/docs/count-users.png)


## Writing Calculations

To define calculations, use the following properties:

### question

Format of to follow for Slack messages that trigger the calculation.


```javascript
bot.calculations = {
	countUsers: {
		question: 'How many users were active {in date range}?',
		...
	}
	...
}
```

### type

Type of calculation to run. Epimetheus currently supports three types:

* `count`: count relevant users, visits, or other data
* `rank`: identify and rank high value users
* `compare`: divide users into segments and compare data

### state

Define the default properties of an object to store temporary data during the calculation. Only for `count` and `compare` calculations.

### aggregator

Define custom method to evaluate each relevant users and their visits.

Params: state (object) and visits (list of visits, [see Data Structure]{#datastructure})
Return: state (modified or not)

```javascript
bot.calculations = {
	countUsers: {
		...
		aggregator: (state, visits) => {
			if(visits.length > 0){
				state.count++;
			}
			return state;
		},
		...
	}
	...
}

### filter
Only for `compare` calculations. Detailed documentation coming soon.

### sort
Only for `compare` calculations. Detailed documentation coming soon.

### response
Define what response the Slack bot should show for the calculation.

```javascript
bot.calculations = {
	countUsers: {
		...
		response: (state) => {
			return `I counted ${state.count} users.`;
		}
	}
	...
}
```

## Data Structure

These `calculations` are highly extensibile to fit board analytics needs for any web application that uses PrometheusJS to collect data. Prometheus saves relevant user events as `visits`. Some benefits of using Prometheus to track web analytics:

* Gather more actionable data by tracking user-specific analytics
* Separate core app data and analytics, Firebase/Prometheus integrate non-invasively into codebase

Epimetheus `calculations` loop over all `visits` for all users that are in the date range specified in the Slack question. All of the Prometheus data can be used in aggregations. Each `visit` has this structure:

```javascript
{
	visit: {
		type: , // type of event as defined by developer
		... // additional data as defined by developer
	},
	meta: {
		datetime: {
			timestamp: , // Unix timestamp for event
			timezoneOffset: // offset for user's timezone
		},
		browser: {
			device: , // type of device (desktop, tablet, mobile, or unknown)
			height: , // height of screen (pixels)
			width: , // width of screen (pixels)
			name: , // browser name
			version: // browser version
		},
		location: {
			city: , // approximate city from geoip data
			country: , // country from geoip data
			latitude: , // approximate latitude coordinates
			longitude: , // approximate longitude coordinates
			ip: // device IP address
		},
		page: {
			title: , // title of page/document
			url: // URL of page/document
		}
	}
}
```