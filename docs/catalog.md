# Contributions Catalog

This page features interesting calculations that capture how Epimetheus can allow your team to easily report actionable analytics. Please submit pull requests when adding your own calculations to the catalog.


## Demo Page Conversion Rates

Calculation to report what percentage of users tried the sample meeting demo.

**Type:** `compare
**Team:** Omnipointment

![Omnipointment Compare Demo Page](https://github.com/vingkan/epimetheus/blob/master/docs/omni-compare-demo.png)

```javascript
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
```