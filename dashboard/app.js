(function(){
    const { useState, useEffect } = React;

    function loadData() {
        return fetch('../data/Results_v2 3.xlsx')
            .then(resp => resp.arrayBuffer())
            .then(buf => {
                const workbook = XLSX.read(new Uint8Array(buf), {type: 'array'});
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet);
                return json.map(row => ({
                    Date: new Date(row['Date']),
                    Variable: row['Variable'],
                    Contribution: +row['contribución'] || +row['Contribución'] || 0,
                    Media_costs: +row['Media_costs'] || 0,
                    Grouping: row['Grouping'],
                    Channel: row['Channel']
                }));
            });
    }

    function Dashboard() {
        const [data, setData] = useState([]);
        const [page, setPage] = useState(1);
        const [startDate, setStartDate] = useState('');
        const [endDate, setEndDate] = useState('');

        useEffect(() => {
            loadData().then(setData).catch(err => console.error(err));
        }, []);

        useEffect(() => {
            if (data.length > 0) {
                const filtered = data.filter(row => {
                    if (startDate && row.Date < new Date(startDate)) return false;
                    if (endDate && row.Date > new Date(endDate)) return false;
                    return true;
                });
                renderCharts(filtered);
            }
        }, [data, startDate, endDate]);

        function chartWrapper(id, title){
            return React.createElement('div', {className:'chart-wrapper', key:id},
                React.createElement('h2', null, title),
                React.createElement('div', {id, className:'chart-container'})
            );
        }

        const page1 = React.createElement('div', {className:'charts-grid'},
            chartWrapper('chart1', 'Contribuci\u00f3n en el tiempo'),
            chartWrapper('chart2', 'Inversi\u00f3n en el tiempo'),
            chartWrapper('chart3', 'Contribuci\u00f3n por canal'),
            chartWrapper('chart4', 'Contribuci\u00f3n por agrupaci\u00f3n'),
            chartWrapper('chart5', 'ROI por canal'),
            chartWrapper('chart6', 'Contribuci\u00f3n vs Inversi\u00f3n')
        );

        const page2 = React.createElement('div', {className:'charts-grid'},
            chartWrapper('chart7', 'Contribuci\u00f3n por variable'),
            chartWrapper('chart8', 'Inversi\u00f3n por variable'),
            chartWrapper('chart9', 'Contribuci\u00f3n acumulada'),
            chartWrapper('chart10', 'Distribuci\u00f3n de contribuci\u00f3n'),
            chartWrapper('chart11', 'Inversi\u00f3n acumulada'),
            chartWrapper('chart12', 'Distribuci\u00f3n de inversi\u00f3n')
        );

        return React.createElement('div', null,
            React.createElement('h1', {style:{marginLeft:'20px'}}, 'Marketing Mix Dashboard'),
            React.createElement('div', {style:{margin:'0 20px 20px 20px'}},
                React.createElement('button', {onClick:()=>setPage(1), disabled: page===1}, 'Página 1'),
                React.createElement('button', {onClick:()=>setPage(2), disabled: page===2, style:{marginLeft:'10px'}}, 'Página 2'),
                React.createElement('label', {style:{marginLeft:'20px'}}, 'Desde:',
                    React.createElement('input', {type:'date', value:startDate, onChange:e=>setStartDate(e.target.value)})
                ),
                React.createElement('label', {style:{marginLeft:'10px'}}, 'Hasta:',
                    React.createElement('input', {type:'date', value:endDate, onChange:e=>setEndDate(e.target.value)})
                )
            ),
            page===1 ? page1 : page2
        );
    }

    function groupBy(array, key){
        const map = {};
        array.forEach(item => {
            const k = item[key] || 'Unknown';
            if(!map[k]) map[k] = [];
            map[k].push(item);
        });
        return map;
    }

    function sum(arr, field){
        return arr.reduce((acc,x)=>acc+(+x[field]||0),0);
    }

    function renderCharts(data){
        ['chart1','chart2','chart3','chart4','chart5','chart6','chart7','chart8','chart9','chart10','chart11','chart12'].forEach(id=>{
            const el = document.getElementById(id);
            if(el) el.innerHTML = '';
        });
        // 1. Contribution over time
        nv.addGraph(function() {
            const chart = nv.models.lineChart();
            const group = groupBy(data, 'Date');
            const values = Object.keys(group).sort().map(date => ({ x: new Date(date), y: sum(group[date],'Contribution') }));
            chart.x(function(d){ return d.x });
            chart.y(function(d){ return d.y });
            d3.select('#chart1').append('svg').datum([{key:'Contribución', values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 2. Media cost over time
        nv.addGraph(function() {
            const chart = nv.models.lineChart();
            const group = groupBy(data, 'Date');
            const values = Object.keys(group).sort().map(date => ({ x: new Date(date), y: sum(group[date],'Media_costs') }));
            chart.x(function(d){ return d.x });
            chart.y(function(d){ return d.y });
            d3.select('#chart2').append('svg').datum([{key:'Inversión', values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 3. Contribution by channel
        nv.addGraph(function() {
            const chart = nv.models.discreteBarChart().staggerLabels(true);
            const group = groupBy(data,'Channel');
            const values = Object.keys(group).map(channel => ({label: channel, value: sum(group[channel],'Contribution')}));
            d3.select('#chart3').append('svg').datum([{key:'Contribución',values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 4. Contribution by grouping (pie)
        nv.addGraph(function() {
            const chart = nv.models.pieChart().x(d=>d.label).y(d=>d.value);
            const group = groupBy(data,'Grouping');
            const values = Object.keys(group).map(g=>({label:g,value:sum(group[g],'Contribution')}));
            d3.select('#chart4').append('svg').datum(values).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 5. ROI by channel
        nv.addGraph(function(){
            const chart = nv.models.discreteBarChart().staggerLabels(true);
            const group = groupBy(data,'Channel');
            const values = Object.keys(group).map(channel=>({
                label:channel,
                value: sum(group[channel],'Contribution') / (sum(group[channel],'Media_costs')||1)
            }));
            d3.select('#chart5').append('svg').datum([{key:'ROI',values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 6. Contribution vs Media cost by variable (scatter)
        nv.addGraph(function(){
            const chart = nv.models.scatterChart();
            chart.x(d=>d.x).y(d=>d.y).showDistX(true).showDistY(true);
            const group = groupBy(data,'Variable');
            const series = Object.keys(group).map(v=>({
                key:v,
                values: group[v].map(row=>({x: row.Media_costs, y: row.Contribution}))
            }));
            d3.select('#chart6').append('svg').datum(series).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 7. Contribution by variable (multiBar)
        nv.addGraph(function(){
            const chart = nv.models.multiBarChart();
            const group = groupBy(data,'Variable');
            const values = Object.keys(group).map(v=>({x:v,y:sum(group[v],'Contribution')}));
            d3.select('#chart7').append('svg').datum([{key:'Contribución',values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 8. Media cost by variable (multiBar)
        nv.addGraph(function(){
            const chart = nv.models.multiBarChart();
            const group = groupBy(data,'Variable');
            const values = Object.keys(group).map(v=>({x:v,y:sum(group[v],'Media_costs')}));
            d3.select('#chart8').append('svg').datum([{key:'Inversión',values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 9. Cumulative contribution over time
        nv.addGraph(function(){
            const chart = nv.models.cumulativeLineChart();
            const group = groupBy(data,'Date');
            const values = [];
            let cumulative = 0;
            Object.keys(group).sort().forEach(date=>{
                cumulative += sum(group[date],'Contribution');
                values.push({x:new Date(date), y:cumulative});
            });
            d3.select('#chart9').append('svg').datum([{key:'Contribución acumulada',values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 10. Box plot of contribution by channel
        nv.addGraph(function(){
            const chart = nv.models.boxPlotChart();
            const group = groupBy(data,'Channel');
            const values = Object.keys(group).map(channel=>{
                const arr = group[channel].map(x=>x.Contribution).sort((a,b)=>a-b);
                return {
                    label: channel,
                    values: {Q1: d3.quantile(arr,0.25)||0, Q2: d3.quantile(arr,0.5)||0, Q3: d3.quantile(arr,0.75)||0, whisker_low: arr[0]||0, whisker_high: arr[arr.length-1]||0}
                };
            });
            d3.select('#chart10').append('svg').datum([{values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 11. Cumulative media cost over time
        nv.addGraph(function(){
            const chart = nv.models.cumulativeLineChart();
            const group = groupBy(data,'Date');
            const values = [];
            let cumulative = 0;
            Object.keys(group).sort().forEach(date=>{
                cumulative += sum(group[date],'Media_costs');
                values.push({x:new Date(date), y:cumulative});
            });
            d3.select('#chart11').append('svg').datum([{key:'Inversi\u00f3n acumulada',values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });

        // 12. Box plot of media cost by channel
        nv.addGraph(function(){
            const chart = nv.models.boxPlotChart();
            const group = groupBy(data,'Channel');
            const values = Object.keys(group).map(channel=>{
                const arr = group[channel].map(x=>x.Media_costs).sort((a,b)=>a-b);
                return {
                    label: channel,
                    values: {Q1: d3.quantile(arr,0.25)||0, Q2: d3.quantile(arr,0.5)||0, Q3: d3.quantile(arr,0.75)||0, whisker_low: arr[0]||0, whisker_high: arr[arr.length-1]||0}
                };
            });
            d3.select('#chart12').append('svg').datum([{values}]).call(chart);
            nv.utils.windowResize(chart.update);
            return chart;
        });
    }

    ReactDOM.render(React.createElement(Dashboard), document.getElementById('root'));
})();
