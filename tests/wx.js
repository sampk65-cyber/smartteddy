// 天氣：台灣中文地名、陣風與風級、查不到改用定位
const {chromium}=require('playwright');const http=require('http');
const srv=http.createServer(require('./srvh')).listen(8802);
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 p.on('pageerror',e=>console.log('PAGEERR',e.message));
 let geo=[],fc=[];
 await p.route('https://geocoding-api.open-meteo.com/**',r=>{const q=new URL(r.request().url()).searchParams.get('name');geo.push(q);
   r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(q==='東京'?{results:[{name:'東京',latitude:35.68,longitude:139.69}]}:{})});});
 await p.route('https://api.open-meteo.com/**',r=>{const u=new URL(r.request().url());fc.push(u.searchParams.get('latitude')+','+u.searchParams.get('longitude'));
   r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({current:{temperature_2m:24,relative_humidity_2m:90,weather_code:63,wind_speed_10m:43.2,wind_gusts_10m:90,wind_direction_10m:45,precipitation:12.5},
     daily:{time:['d0','d1'],weather_code:[63,61],temperature_2m_max:[26,27],temperature_2m_min:[22,23],precipitation_probability_max:[90,70],precipitation_sum:[80,20],wind_gusts_10m_max:[100,60]}})});});
 await p.goto('http://localhost:8802/');await p.waitForTimeout(1500);
 await p.evaluate(()=>{teddyLocation={lat:24.21,lon:120.70,label:"潭子區"};});
 for(const loc of ["台中","臺中市","台中市潭子區","東京","火星村"]){
   geo=[];fc=[];
   const r=await p.evaluate(l=>teddyRunTool("get_weather",{location:l,days:1}),loc);
   console.log(`「${loc}」→ ${r.location}（${r.location_source}）座標 ${fc[0]}｜查地名服務 ${geo.length} 次｜風 ${r.wind_ms}m/s ${r.wind_level}、陣風 ${r.gust_ms}m/s ${r.gust_level}、${r.wind_direction}、雨 ${r.precipitation_mm}mm｜明天最大陣風 ${r.forecast&&r.forecast[0].max_gust_level}`);
 }
 const desc=await p.evaluate(()=>TEDDY_TOOLS.find(t=>t.name==="get_weather").description);
 console.log("工具說明含陣風與颱風:",desc.includes("陣風")&&desc.includes("颱風"));
 await b.close();srv.close();})();
