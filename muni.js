/* ===== PANTALLA DE LA MUNI (cadetería) ===== */
document.head.insertAdjacentHTML('beforeend','<style>.chip.am{background:#ffc83d22;color:#ffc83d}</style>');
let mCad=[],mUb=[],mTab='cadetes',mMap=null,mMarks={},mCentro=[-32.4075,-63.2403];
function docsInfo(c){
  if(!c.seguro_vence||!c.carnet_vence)return{est:'rojo',txt:'Falta cargar la documentación'};
  const h=new Date();h.setHours(0,0,0,0);
  const dias=d=>Math.round((new Date(d+'T00:00:00')-h)/864e5);
  const ds=dias(c.seguro_vence),dc=dias(c.carnet_vence);
  if(ds<0||dc<0)return{est:'rojo',txt:ds<0&&dc<0?'Seguro y carnet vencidos':ds<0?'Seguro vencido':'Carnet vencido'};
  const p=[];if(ds<=15)p.push('Seguro: '+ds+' días');if(dc<=15)p.push('Carnet: '+dc+' días');
  if(p.length)return{est:'amarillo',txt:'Vence pronto · '+p.join(' · ')};
  return{est:'verde',txt:'Documentación en regla'};
}
const mFecha=d=>d?d.split('-').reverse().join('/'):'sin cargar';
const mHace=t=>{const s=Math.max(0,Math.round((Date.now()-new Date(t))/1000));return s<60?'hace '+s+' s':'hace '+Math.round(s/60)+' min'};
const mCol={verde:'var(--g)',amarillo:'#ffc83d',rojo:'var(--red)'};
async function muniShell(){
  app.innerHTML=`<header><div class="wrap"><div class="logo">PEDI <b>GO</b> <span class="meta">Muni</span></div><button class="link" onclick="salir()">Salir</button></div></header>
  <div class="wrap" style="padding-top:14px"><div id="mres"></div><div class="tabs"><button id="m1" onclick="mSet('cadetes')">Cadetería</button><button id="m2" onclick="mSet('mapa')">En vivo</button></div><div id="mmain"></div></div>`;
  if(!me.ciudad_id)return document.getElementById('mmain').innerHTML='<div class="empty">Todavía no tenés una ciudad asignada. Pedile al administrador que te la asigne.</div>';
  const c=await sb.from('ciudades').select('lat,lng').eq('id',me.ciudad_id).maybeSingle();
  if(c.data)mCentro=[c.data.lat,c.data.lng];
  if(ch)sb.removeChannel(ch);
  ch=sb.channel('muni-ub').on('postgres_changes',{event:'*',schema:'public',table:'ubicaciones'},()=>mCargar()).subscribe();
  clearInterval(window.mT);window.mT=setInterval(mCargar,30000);
  mTab='cadetes';mCargar();
}
function mSet(t){if(mMap){mMap.remove();mMap=null}mTab=t;mPintar()}
async function mCargar(){
  if(!document.getElementById('mmain')){clearInterval(window.mT);return}
  const [c,u]=await Promise.all([
    sb.from('perfiles').select('*').eq('rol','CADETE').eq('ciudad_id',me.ciudad_id).order('nombre'),
    sb.from('ubicaciones').select('*').eq('ciudad_id',me.ciudad_id)]);
  if(c.error||u.error)return document.getElementById('mmain').innerHTML='<div class="empty">No pudimos cargar los datos.</div>';
  mCad=c.data;mUb=u.data.filter(x=>x.repartiendo);mPintar();
}
function mCard(c){
  const d=docsInfo(c),rep=mUb.find(u=>u.cadete_id===c.id);
  return `<div class="card" style="padding:14px;border-left:4px solid ${mCol[d.est]}"><div class="row"><b>${esc(c.nombre||'Sin nombre')}</b><span class="chip ${d.est==='verde'?'ok':d.est==='amarillo'?'am':'no'}">${d.est==='verde'?'En regla':d.est==='amarillo'?'Por vencer':'Deshabilitado'}</span></div>
  <div class="meta">${esc(d.txt)}</div>
  <div class="meta">Seguro vence: ${mFecha(c.seguro_vence)} · Carnet vence: ${mFecha(c.carnet_vence)}</div>
  <div class="meta">${c.telefono?`<a style="color:var(--g)" href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a> · `:''}${esc(c.email||'')}</div>
  ${rep?'<div style="margin-top:6px"><span class="chip ok">Repartiendo ahora</span></div>':''}
  <button class="btn sec" style="margin-top:10px" onclick="mForm('${c.id}')">Cargar documentación</button></div>`;
}
async function mPintar(){
  const n=e=>mCad.filter(c=>docsInfo(c).est===e).length;
  const k=(v,t,col)=>`<div style="flex:1"><div style="font-size:24px;font-weight:800;color:${col}">${v}</div><div class="meta">${t}</div></div>`;
  const r=document.getElementById('mres');if(!r)return;
  r.innerHTML=`<div class="card" style="padding:14px"><div style="display:flex;gap:8px;text-align:center">${k(n('verde'),'En regla','var(--g)')}${k(n('amarillo'),'Por vencer','#ffc83d')}${k(n('rojo'),'Deshabilitados','var(--red)')}${k(mUb.length,'Repartiendo','var(--tx)')}</div></div>`;
  ['cadetes','mapa'].forEach((x,i)=>{const b=document.getElementById('m'+(i+1));if(b)b.className=x===mTab?'on':''});
  const m=document.getElementById('mmain');
  if(mTab==='cadetes'){m.innerHTML=mCad.map(mCard).join('')||'<div class="empty">Todavía no hay cadetes en tu ciudad.</div>';return}
  if(!document.getElementById('mapa')){
    m.innerHTML='<div id="mapa" style="height:340px;border-radius:16px;border:1px solid var(--line);margin-bottom:12px"></div><div id="mlist"></div>';
    try{await mLeaflet()}catch(_){return m.innerHTML='<div class="empty">No pudimos cargar el mapa.</div>'}
    if(!document.getElementById('mapa')||mTab!=='mapa')return;
    mMap=L.map('mapa').setView(mCentro,13);mMarks={};
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(mMap);
  }
  if(!mMap)return;
  const ids=mUb.map(u=>u.cadete_id);
  Object.keys(mMarks).forEach(id=>{if(!ids.includes(id)){mMarks[id].remove();delete mMarks[id]}});
  mUb.forEach(u=>{
    const c=mCad.find(x=>x.id===u.cadete_id),pos=[u.lat,u.lng];
    if(mMarks[u.cadete_id])mMarks[u.cadete_id].setLatLng(pos);
    else mMarks[u.cadete_id]=L.circleMarker(pos,{radius:11,color:'#000',weight:2,fillColor:'#00FF88',fillOpacity:1}).addTo(mMap).bindTooltip(c?c.nombre||c.email:'Cadete',{permanent:true,direction:'top'});
  });
  if(mUb.length&&!mMap._ajustado){mMap._ajustado=true;mMap.fitBounds(mUb.map(u=>[u.lat,u.lng]),{padding:[40,40],maxZoom:16})}
  document.getElementById('mlist').innerHTML=mUb.map(u=>{
    const c=mCad.find(x=>x.id===u.cadete_id)||{},viejo=Date.now()-new Date(u.updated_at)>120000;
    return `<div class="card" style="padding:14px"><div class="row"><b>${esc(c.nombre||c.email||'Cadete')}</b><span class="chip ${viejo?'am':'ok'}">${viejo?'Sin señal':'En vivo'}</span></div>
    <div class="meta">Última ubicación ${mHace(u.updated_at)}</div>
    <a class="meta" style="color:var(--g)" href="https://www.google.com/maps?q=${u.lat},${u.lng}" target="_blank" rel="noopener">Abrir en Google Maps</a></div>`}).join('')||'<div class="empty" style="padding:20px 0">Nadie está repartiendo ahora</div>';
}
function mLeaflet(){return new Promise((ok,no)=>{
  if(window.L)return ok();
  const l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(l);
  const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);
})}
function mForm(id){
  const c=mCad.find(x=>x.id===id);
  const s=document.createElement('div');s.className='sheet';s.id='sheet';
  s.innerHTML=`<div><h3 style="margin-bottom:4px">${esc(c.nombre||c.email)}</h3><div class="meta" style="margin-bottom:14px">Cargá la fecha de vencimiento de cada documento después de revisarlo.</div>
  <div class="meta">Seguro vence</div><input type="date" id="dseg" value="${c.seguro_vence||''}">
  <div class="meta">Carnet de conducir vence</div><input type="date" id="dcar" value="${c.carnet_vence||''}">
  <button class="btn" id="dgo">Guardar</button><button class="btn sec" style="margin-top:8px" onclick="document.getElementById('sheet').remove()">Cancelar</button></div>`;
  document.body.appendChild(s);
  document.getElementById('dgo').onclick=async()=>{
    const a=document.getElementById('dseg').value,b=document.getElementById('dcar').value;
    if(!a||!b)return toast('Completá las dos fechas',1);
    const {error}=await sb.rpc('muni_docs',{p_cadete:id,p_seguro:a,p_carnet:b});
    if(error)return toast(error.message,1);
    s.remove();toast('Documentación guardada');mCargar();
  };
}
