/* ===== MAPA: elegir un punto y ruta del cadete ===== */
const MP_CENTRO=[-33.4199,-63.2977];
const MP_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MP_RUTAS='https://router.project-osrm.org';
let mpMapa=null,mpPid=null,mpKey='',mpMarks={},mpLinea=null,mpLk='',mpUlt=0,mpOcupado=false,mpPed=null,mpCache={};
function mpLeaflet(){return new Promise((ok,no)=>{
  if(window.L)return ok();
  const l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(l);
  const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);
})}

/* --- Elegir un punto en el mapa (cliente y dueño) --- */
async function mapaElegir(cb,ini,titulo){
  try{await mpLeaflet()}catch(_){return toast('No pudimos cargar el mapa',1)}
  const ov=document.createElement('div');ov.id='mpov';
  ov.style.cssText='position:fixed;inset:0;z-index:40;background:#000;display:flex;flex-direction:column';
  ov.innerHTML=`<div style="padding:12px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b>${esc(titulo||'Marcá el punto exacto')}</b><button class="link" id="mpx">Cancelar</button></div>
  <div style="position:relative;flex:1"><div id="mpmap" style="position:absolute;inset:0"></div>
  <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);pointer-events:none;z-index:1000"><svg width="30" height="42" viewBox="0 0 30 42"><path d="M15 1C7 1 1 7 1 15c0 10 14 26 14 26s14-16 14-26C29 7 23 1 15 1z" fill="#00FF88" stroke="#000" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#000"/></svg></div></div>
  <div style="padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line)"><div class="meta" style="margin:0 0 10px">Movés el mapa hasta que el pin quede justo sobre el lugar.</div>
  <button class="btn sec" id="mpgps" style="margin-bottom:8px">Usar mi ubicación actual</button><button class="btn" id="mpok">Confirmar ubicación</button></div>`;
  document.body.appendChild(ov);
  const c=ini&&ini.lat!=null?[ini.lat,ini.lng]:MP_CENTRO;
  const map=L.map('mpmap').setView(c,(ini&&ini.zoom)||16);
  L.tileLayer(MP_TILES,{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  setTimeout(()=>map.invalidateSize(),80);
  const cerrar=()=>{map.remove();ov.remove()};
  document.getElementById('mpx').onclick=cerrar;
  document.getElementById('mpgps').onclick=()=>{
    if(!navigator.geolocation)return toast('Este celular no permite usar la ubicación',1);
    navigator.geolocation.getCurrentPosition(p=>map.setView([p.coords.latitude,p.coords.longitude],18),()=>toast('No pudimos obtener tu ubicación. Activá el GPS y el permiso.',1),{enableHighAccuracy:true,timeout:12000});
  };
  document.getElementById('mpok').onclick=()=>{
    const p=map.getCenter();cerrar();
    cb({lat:Math.round(p.lat*1e6)/1e6,lng:Math.round(p.lng*1e6)/1e6});
  };
}

/* --- Mapa del cadete: él, el local y el cliente, con recorrido --- */
function mpMarca(id,pos,color,txt){
  if(!pos){if(mpMarks[id]){mpMarks[id].remove();delete mpMarks[id]}return}
  if(mpMarks[id])mpMarks[id].setLatLng(pos);
  else mpMarks[id]=L.circleMarker(pos,{radius:9,color:'#000',weight:2,fillColor:color,fillOpacity:1}).addTo(mpMapa).bindTooltip(txt,{permanent:true,direction:'top'});
}
async function mapaCadete(p){
  const w=document.getElementById('cmapawrap');if(!w)return;
  if(!p){if(mpMapa){mpMapa.remove();mpMapa=null}mpPid=null;mpPed=null;w.innerHTML='';return}
  mpPed=p;
  try{await mpLeaflet()}catch(_){return}
  if(!document.getElementById('cmapawrap'))return;
  if(mpPid!==p.id||!document.getElementById('cmap')){
    if(mpMapa){mpMapa.remove();mpMapa=null}
    w.innerHTML='<div class="card" style="padding:0;overflow:hidden"><div id="cmap" style="height:240px"></div><div style="padding:12px 14px"><div class="meta" id="cmapinfo" style="margin:0 0 10px">Calculando recorrido…</div><button class="btn" onclick="mapaNavegar()">Navegar con Google Maps</button></div></div>';
    mpMapa=L.map('cmap').setView(MP_CENTRO,13);
    L.tileLayer(MP_TILES,{maxZoom:19,attribution:'© OpenStreetMap · rutas OSRM'}).addTo(mpMapa);
    mpMarks={};mpLinea=null;mpLk='';mpPid=p.id;mpKey='';
  }
  mpMapa.invalidateSize();
  const ret=p.negocios&&p.negocios.lat!=null?[p.negocios.lat,p.negocios.lng]:null;
  const ent=p.lat!=null?[p.lat,p.lng]:null;
  const yo=cdPos?[cdPos.lat,cdPos.lng]:null;
  mpMarca('yo',yo,'#4da3ff','Vos');mpMarca('ret',ret,'#ffc83d','Retiro');mpMarca('ent',ent,'#00FF88','Entrega');
  const key=p.id+p.estado;
  if(key!==mpKey){mpKey=key;const todos=[yo,ret,ent].filter(Boolean);if(todos.length)mpMapa.fitBounds(todos,{padding:[40,40],maxZoom:16})}
  const pts=[];if(yo)pts.push(yo);if(p.estado!=='en_camino'&&ret)pts.push(ret);if(ent)pts.push(ent);
  mpRuta(pts);
}
function mapaMover(){
  if(!mpMapa||!cdPos)return;
  mpMarca('yo',[cdPos.lat,cdPos.lng],'#4da3ff','Vos');
  if(mpPed&&Date.now()-mpUlt>30000)mapaCadete(mpPed);
}
async function mpRuta(pts){
  const info=document.getElementById('cmapinfo');
  if(pts.length<2){
    if(mpLinea){mpLinea.remove();mpLinea=null;mpLk=''}
    if(info)info.textContent='Todavía no hay dos puntos para trazar el recorrido. Usá la dirección escrita.';
    return;
  }
  if(mpOcupado)return;
  const ck=mpKey+'|'+pts.map(q=>q[0].toFixed(3)+','+q[1].toFixed(3)).join(';');
  let r=mpCache[ck];
  if(!r||Date.now()-r.t>60000){
    if(Date.now()-mpUlt<1200){setTimeout(()=>mpRuta(pts),1300);return}
    mpOcupado=true;mpUlt=Date.now();
    try{
      const res=await fetch(MP_RUTAS+'/route/v1/driving/'+pts.map(q=>q[1]+','+q[0]).join(';')+'?overview=full&geometries=geojson');
      const j=await res.json();
      if(j.code!=='Ok')throw new Error('sin ruta');
      const rt=j.routes[0];
      r=mpCache[ck]={t:Date.now(),km:rt.distance/1000,min:rt.duration/60,pts:rt.geometry.coordinates.map(c=>[c[1],c[0]])};
    }catch(_){
      let km=0;for(let i=1;i<pts.length;i++)km+=cdKm(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);
      r=mpCache[ck]={t:Date.now(),km,min:null,pts,aprox:true};
    }
    mpOcupado=false;
  }
  if(!mpMapa)return;
  if(mpLk!==ck){
    if(mpLinea)mpLinea.remove();
    mpLinea=L.polyline(r.pts,{color:'#00FF88',weight:5,opacity:.85,dashArray:r.aprox?'6 8':null}).addTo(mpMapa);
    mpLk=ck;
  }
  const i2=document.getElementById('cmapinfo');
  if(i2)i2.textContent=(r.aprox?'En línea recta: ':'Recorrido: ')+cdFmtKm(r.km)+(r.min?' · unos '+Math.max(1,Math.round(r.min))+' min':'');
}
function mapaNavegar(){
  const p=mpPed;if(!p)return;
  const camino=p.estado==='en_camino';
  const lat=camino?p.lat:(p.negocios&&p.negocios.lat),lng=camino?p.lng:(p.negocios&&p.negocios.lng);
  const url=lat!=null&&lng!=null
    ?'https://www.google.com/maps/dir/?api=1&destination='+lat+','+lng+'&travelmode=driving'
    :mapa(camino?p.direccion_entrega:(p.negocios&&p.negocios.direccion)||'');
  window.open(url,'_blank');
                 }
