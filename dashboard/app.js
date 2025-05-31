(function(){
    const { useState, useEffect } = React;

    function loadData() {
        return fetch('../data/Results_v2 3.xlsx')
            .then(resp => resp.arrayBuffer())
            .then(buf => {
                const workbook = XLSX.read(new Uint8Array(buf), {type:'array'});
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet);
                return json;
            });
    }

    function loadStructure(){
        return fetch('../data/structure.json').then(r=>r.json());
    }

    function groupBy(arr, key){
        const map={};
        arr.forEach(row=>{
            const k=row[key]||'Unknown';
            if(!map[k]) map[k]=[];
            map[k].push(row);
        });
        return map;
    }

    function lineData(data, xKey, yKey){
        const group=groupBy(data,xKey);
        return [{key:yKey, values:Object.keys(group).sort().map(k=>({x:new Date(k), y:group[k].reduce((a,b)=>a+(+b[yKey]||0),0)}))}];
    }

    function barData(data, xKey, yKey){
        const group=groupBy(data,xKey);
        return [{key:yKey, values:Object.keys(group).map(k=>({label:k, value:group[k].reduce((a,b)=>a+(+b[yKey]||0),0)}))}];
    }

    function Chart({config, data}){
        useEffect(()=>{
            const el=document.getElementById(config.id);
            if(!el) return;
            el.innerHTML='';
            let chart;
            let chartData=[];
            if(config.type==='line'){
                chart=nv.models.lineChart();
                chart.x(d=>d.x).y(d=>d.y);
                chartData=lineData(data, config.xKey, config.yKey);
            }else if(config.type==='bar'){
                chart=nv.models.discreteBarChart().staggerLabels(true);
                chartData=barData(data, config.xKey, config.yKey);
            }
            if(chart){
                d3.select(el).append('svg').datum(chartData).call(chart);
                nv.utils.windowResize(chart.update);
            }
        },[data,config]);
        return React.createElement('div',{className:'chart-wrapper',key:config.id},
            React.createElement('h2',null,config.title),
            React.createElement('div',{id:config.id,className:'chart-container'})
        );
    }

    function buildConfigs(struct){
        const dateCol=struct.find(c=>c.type==='date');
        const numeric=struct.filter(c=>c.type==='numeric');
        const categorical=struct.filter(c=>c.type==='category');
        const cfgs=[];
        numeric.forEach(num=>{
            if(dateCol){
                cfgs.push({id:num.name+'-time', title:num.name+' en el tiempo', type:'line', xKey:dateCol.name, yKey:num.name});
            }
            categorical.forEach(cat=>{
                cfgs.push({id:num.name+'-by-'+cat.name, title:num.name+' por '+cat.name, type:'bar', xKey:cat.name, yKey:num.name});
            });
        });
        return cfgs;
    }

    function Dashboard(){
        const [data,setData]=useState([]);
        const [structure,setStructure]=useState([]);
        const [configs,setConfigs]=useState([]);
        const [page,setPage]=useState(1);

        useEffect(()=>{loadData().then(setData); loadStructure().then(setStructure);},[]);
        useEffect(()=>{if(structure.length>0) setConfigs(buildConfigs(structure));},[structure]);

        const chartsPerPage=4;
        const pages=Math.ceil(configs.length/chartsPerPage) || 1;
        const toShow=configs.slice((page-1)*chartsPerPage,page*chartsPerPage);

        return React.createElement('div',null,
            React.createElement('h1',{style:{marginLeft:'20px'}},'Marketing Mix Dashboard'),
            React.createElement('div',{style:{margin:'0 20px 20px 20px'}},
                Array.from({length:pages},(_,i)=>React.createElement('button',{key:i,onClick:()=>setPage(i+1),disabled:page===i+1,style:{marginRight:'10px'}},'Página '+(i+1)))
            ),
            React.createElement('div',{className:'charts-grid'},
                toShow.map(cfg=>React.createElement(Chart,{key:cfg.id,config:cfg,data}))
            )
        );
    }

    ReactDOM.render(React.createElement(Dashboard), document.getElementById('root'));
})();
