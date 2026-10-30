/* ===== PANTALLA DEL CADETE ===== */
document.head.insertAdjacentHTML('beforeend','<style>.chip.am{background:#ffc83d22;color:#ffc83d}</style>');
let ciudadNom='',gpsId=null,gpsLast=0,gpsAviso=false;
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
async function cadeteShell(){
  app.innerHTML=`<header><div class="wrap"><div class="logo">PEDI <b>GO</b></div><button class="link" onclick="salir()">Salir</button></div></header>
  <div class="wrap" id="cmain" style="padding-top:14px"></div>`;
  const m=document.getElementById('cmain');
  if(!me.ciudad_id)return m.innerHTML='<div class="empty">Todavía no tenés una ciudad asignada. Pedile al administrador que te la asigne.</div>';
  const c=await sb.from('ciudades').select('nombre').eq('id',me.ciudad_id).maybeSingle();
  ciudadNom=(c.data&&c.data.nombre)||'';
  m.innerHTML=`<div class="card" style="padding:14px"><div class="row" style="align-items:center"><div><h3>Hola, ${esc(me.nombre||'cadete')}</h3><div class="meta" id="dmsg"></div></div>
  <button class="btn" id="dbtn" style="width:auto;padding:10px 16px" onclick="toggleDisp()"></button></div>
  <div id="ddoc" style="margin-top:8px"></div>
  <input id="alias" placeholder="Tu alias de Mercado Pago" value="${esc(me.mp_alias||'')}" style="margin:12px 0 8px">
  <button class="btn sec" onclick="guardarAlias()">Guardar alias</button></div><div id="clist"></div>`;
  dispUI();
  if(ch)sb.removeChannel(ch);
  ch=sb.channel('cad-pedidos').on('postgres_changes',{event:'*',schema:'public',table:'pedidos'},p=>{
    if(me.disponible&&p.new&&!p.new.cadete_id&&navigator.vibrate)navigator.vibrate([150,80,150]);
    renderCadete();
  }).subscribe();
  renderCadete();
}
function dispUI(){
  const b=document.getElementById('dbtn');if(!b)return;
  const d=docsInfo(me),rojo=d.est==='rojo',on=me.disponible&&!rojo;
  b.textContent=on?'Disponible':'No disponible';
  b.style.cssText='width:auto;padding:10px 16px;'+(on?'':'background:none;color:var(--mut);border:1px solid var(--line)');
  document.getElementById('dmsg').textContent=rojo?'Deshabilitado por documentación':on?'Te mostramos los pedidos para tomar':'Activate para ver pedidos disponibles';
  document.getElementById('ddoc').innerHTML=`<span class="chip ${d.est==='verde'?'ok':d.est==='amarillo'?'am':'no'}">${d.est==='verde'?'En regla':d.est==='amarillo'?'Por vencer':'Deshabilitado'}</span> <span class="meta">${esc(d.txt)}</span>`;
}
async function toggleDisp(){
  const d=docsInfo(me);
  if(d.est==='rojo')return toast(d.txt+'. Presentá tus papeles en la Muni para habilitarte',1);
  const {data,error}=await sb.from('perfiles').update({disponible:!me.disponible}).eq('id',me.id).select().single();
  if(error)return toast(error.message,1);
  me=data;dispUI();renderCadete();
}
async function guardarAlias(){
  const v=document.getElementById('alias').value.trim();
  const {error}=await sb.from('perfiles').update({mp_alias:v||null}).eq('id',me.id);
  error?toast(error.message,1):toast('Alias guardado');
}
function gpsSync(on){
  if(on&&gpsId===null&&navigator.geolocation){
    gpsId=navigator.geolocation.watchPosition(pos=>{
      const t=Date.now();if(t-gpsLast<8000)return;gpsLast=t;
      sb.rpc('cadete_ubicacion',{p_lat:pos.coords.latitude,p_lng:pos.coords.longitude,p_repartiendo:true});
    },()=>{if(!gpsAviso){gpsAviso=true;toast('Activá la ubicación del celular para que la Muni te vea',1)}},{enableHighAccuracy:true,maximumAge:5000});
  }
  if(!on&&gpsId!==null){
    navigator.geolocation.clearWatch(gpsId);gpsId=null;
    sb.rpc('cadete_ubicacion',{p_lat:0,p_lng:0,p_repartiendo:false});
  }
}
const mapa=d=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d+(ciudadNom?', '+ciudadNom:''));
function cadDisp(p){
  return `<div class="card" style="padding:14px"><div class="row"><b>${esc(p.negocios?.nombre||'Comercio')}</b><span class="chip ok">Ganás ${money(p.costo_envio)}</span></div>
  <div class="meta">Retirar en: ${esc(p.negocios?.direccion||'-')}</div>
  <div class="meta">Entregar en: ${esc(p.direccion_entrega)}</div>
  <div class="row"><span class="meta">${ESTADOS[p.estado]}</span><span class="meta">Pedido ${p.numero}</span></div>
  <button class="btn" style="margin-top:10px" onclick="tomar('${p.id}')">Tomar pedido</button></div>`;
}
function cadMio(p){
  let acc='<div class="meta" style="margin-top:8px">Esperando que el comercio lo termine</div>';
  if(p.estado==='listo')acc=`<button class="btn" style="margin-top:10px" onclick="setCad('${p.id}','en_camino')">Lo retiré, salgo a entregar</button>`;
  if(p.estado==='en_camino')acc=`<div class="meta" style="margin-top:8px">Mientras repartís, la Muni ve tu ubicación. Dejá la app abierta.</div><button class="btn" style="margin-top:10px" onclick="setCad('${p.id}','entregado')">Marcar como entregado</button>`;
  return `<div class="card" style="padding:14px;border-color:var(--g)"><div class="row"><b>${esc(p.negocios?.nombre||'Comercio')}</b><span class="chip ok">${ESTADOS[p.estado]}</span></div>
  <div class="meta">Retirar en: <a style="color:var(--g)" href="${mapa(p.negocios?.direccion||'')}" target="_blank" rel="noopener">${esc(p.negocios?.direccion||'-')}</a></div>
  <div class="meta">Entregar en: <a style="color:var(--g)" href="${mapa(p.direccion_entrega)}" target="_blank" rel="noopener">${esc(p.direccion_entrega)}</a></div>
  <div class="meta">${esc(p.cliente_nombre)}${p.cliente_telefono?` · <a style="color:var(--g)" href="tel:${esc(p.cliente_telefono)}">${esc(p.cliente_telefono)}</a>`:''}</div>
  ${p.nota?`<div class="meta">Nota: ${esc(p.nota)}</div>`:''}
  <div class="row"><span class="meta">Pedido ${p.numero} · cobrar al cliente (efectivo)</span><b>${money(p.total)}</b></div>${acc}</div>`;
}
async function renderCadete(){
  const m=document.getElementById('clist');if(!m)return;
  const [r,pf]=await Promise.all([
    sb.from('pedidos').select('*, negocios(nombre,direccion)').order('created_at',{ascending:false}).limit(60),
    sb.from('perfiles').select('*').eq('id',me.id).single()]);
  if(pf.data){me=pf.data;dispUI()}
  const {data,error}=r;
  if(error)return m.innerHTML='<div class="empty">No pudimos cargar los pedidos.</div>';
  const mios=data.filter(p=>p.cadete_id===me.id);
  const activos=mios.filter(p=>['aceptado','preparando','listo','en_camino'].includes(p.estado));
  gpsSync(activos.some(p=>p.estado==='en_camino'));
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const ent=mios.filter(p=>p.estado==='entregado'&&new Date(p.updated_at)>=hoy);
  const gan=ent.reduce((s,p)=>s+Number(p.ganancia_cadete),0);
  const on=me.disponible&&docsInfo(me).est!=='rojo';
  const disp=on?data.filter(p=>!p.cadete_id&&['aceptado','preparando','listo'].includes(p.estado)):[];
  m.innerHTML=`<div class="card" style="padding:14px"><div class="meta">Ganancias de hoy</div><div style="font-size:28px;font-weight:800;color:var(--g)">${money(gan)}</div><div class="meta">${ent.length} ${ent.length===1?'entrega':'entregas'}</div></div>
  <h3 style="margin:18px 0 8px">Mi pedido (${activos.length})</h3>${activos.map(cadMio).join('')||'<div class="empty" style="padding:16px 0">No tenés pedidos en curso</div>'}
  <h3 style="margin:18px 0 8px">Disponibles (${disp.length})</h3>${disp.map(cadDisp).join('')||`<div class="empty" style="padding:16px 0">${on?'No hay pedidos para tomar ahora':'Activate como disponible para ver pedidos'}</div>`}`;
}
async function tomar(id){
  const {error}=await sb.rpc('tomar_pedido',{p_id:id});
  error?toast(error.message,1):renderCadete();
}
async function setCad(id,e){
  const {error}=await sb.rpc('pedido_estado',{p_id:id,p_estado:e});
  error?toast(error.message,1):renderCadete();
    }
