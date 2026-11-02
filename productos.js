/* ===== PANEL DEL COMERCIO: pedidos, productos, ventas, mi local y alertas ===== */
['catalogo.js','extras.js'].forEach(f=>{const s=document.createElement('script');s.src=f;document.head.appendChild(s)});
let npTab='pedidos',npProds=[],npBlob=null,nlBlob=null,npPend=0,npAudio=null,npWake=null,npTimer=null,npTicks=0,nvRango='hoy',npPeds=[],npCad={},npRelojT=null;
const NP_TABS=['pedidos','productos','ventas','local'];
const NP_ICONOS={
  pedidos:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  productos:'<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
  ventas:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  local:'<path d="M3 10l2-6h14l2 6z"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'
};
document.head.insertAdjacentHTML('beforeend','<style>.chip.am{background:#ffc83d22;color:#ffc83d}.btn.no{background:none;border:1px solid var(--red);color:var(--red)}'
  +'.bnav{position:fixed;left:0;right:0;bottom:0;z-index:7;background:#000f;backdrop-filter:blur(8px);border-top:1px solid var(--line);display:flex;padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px))}'
  +'.bnav button{flex:1;background:none;border:0;color:var(--mut);display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:6px 0;position:relative}'
  +'.bnav button.on{color:var(--g)}.bnav svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
  +'.bnav i{position:absolute;top:0;left:calc(50% + 6px);min-width:18px;height:18px;border-radius:9px;background:var(--red);color:#fff;font-style:normal;font-size:11px;line-height:18px;text-align:center;padding:0 5px}</style>');

document.addEventListener('DOMContentLoaded',()=>{
  const _ns=negocioShell;
  negocioShell=async function(){
    npTab='pedidos';
    await _ns();
    const n=document.getElementById('nmain');if(!n||!miNeg)return;
    n.insertAdjacentHTML('beforebegin','<div class="wrap" style="padding-top:14px"><div id="npsnd"></div></div>');
    app.insertAdjacentHTML('beforeend','<nav class="bnav">'+NP_TABS.map((t,i)=>'<button id="np'+(i+1)+'" class="'+(i?'':'on')+'" onclick="npSet(\''+t+'\')"><svg viewBox="0 0 24 24">'+NP_ICONOS[t]+'</svg><span>'+['Pedidos','Productos','Ventas','Mi local'][i]+'</span>'+(i?'':'<i id="npbadge" style="display:none"></i>')+'</button>').join('')+'</nav>');
    npSonidoUI();npPantalla();npPend=0;npContar();
    clearInterval(npTimer);npTicks=0;npTimer=setInterval(npTick,4000);
    clearInterval(npRelojT);npRelojT=setInterval(npReloj,1000);
  };
  renderNegPedidos=async function(){
    npContar();
    if(npTab!=='pedidos')return;
    return npRenderPedidos();
  };
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&document.getElementById('nmain'))npPantalla();
  });
});

/* --- Alertas: sonido que se repite mientras haya pedidos nuevos, y pantalla encendida --- */
function npTick(){
  if(!document.getElementById('nmain')){clearInterval(npTimer);return}
  npTicks++;
  if(npPend>0&&npAudio)npBeep();
  if(npTicks%4===0)npContar();
  if(npTab==='pedidos'&&npTicks%7===0)npPintarPedidos();
}
function npBeep(){
  if(!npAudio)return;
  const t=npAudio.currentTime;
  [[880,0],[1175,0.2]].forEach(([f,d])=>{
    const o=npAudio.createOscillator(),g=npAudio.createGain();
    o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t+d);
    g.gain.exponentialRampToValueAtTime(0.6,t+d+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.32);
    o.connect(g);g.connect(npAudio.destination);o.start(t+d);o.stop(t+d+0.35);
  });
  if(navigator.vibrate)navigator.vibrate([200,100,200]);
}
function npActivar(){
  try{
    npAudio=new (window.AudioContext||window.webkitAudioContext)();
    npAudio.resume();npBeep();
  }catch(_){toast('Este celular no permite alertas con sonido',1)}
  npSonidoUI();npPantalla();
}
function npSonidoUI(){
  const e=document.getElementById('npsnd');if(!e)return;
  e.innerHTML=npAudio
    ?'<div class="meta" style="margin:0 0 10px;color:var(--g)">Alerta con sonido activada. Suena hasta que atiendas el pedido nuevo.</div>'
    :'<button class="btn" style="margin-bottom:10px;background:var(--red);color:#fff" onclick="npActivar()">Tocá para activar el sonido de pedidos nuevos</button>';
}
async function npPantalla(){
  try{
    if('wakeLock' in navigator&&document.visibilityState==='visible'&&!npWake){
      npWake=await navigator.wakeLock.request('screen');
      npWake.addEventListener('release',()=>{npWake=null});
    }
  }catch(_){}
}
async function npContar(){
  if(!miNeg)return;
  const [r,ng]=await Promise.all([
    sb.from('pedidos').select('id',{count:'exact',head:true}).eq('negocio_id',miNeg.id).eq('estado','pendiente'),
    sb.from('negocios').select('*').eq('id',miNeg.id).single()]);
  const antes=npPend;npPend=r.count||0;
  const bd=document.getElementById('npbadge');if(bd){bd.textContent=npPend;bd.style.display=npPend?'block':'none'}
  if(npPend>antes&&npAudio)npBeep();
  if(ng.data&&(ng.data.abierto!==miNeg.abierto||ng.data.pausado_hasta!==miNeg.pausado_hasta)){
    miNeg=ng.data;if(npTab==='pedidos')npPintarPedidos();
  }
}

function npSet(t){
  npTab=t;
  NP_TABS.forEach((x,i)=>{const b=document.getElementById('np'+(i+1));if(b)b.className=x===t?'on':''});
  window.scrollTo(0,0);
  if(t==='pedidos')renderNegPedidos();
  if(t==='productos')renderProductos();
  if(t==='ventas')renderVentas();
  if(t==='local')renderLocal();
}

/* --- Pedidos --- */
const npFmt=ms=>{const s=Math.max(0,Math.floor(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function npTiempo(p){
  const ini=new Date(p.created_at).getTime(),d=Date.now()-ini;
  if(p.estado==='pendiente')return[d>=360000?'no':d>=180000?'am':'ok','Hace '+npFmt(d),'data-ini="'+ini+'" data-pend="1"'];
  if(['aceptado','preparando'].includes(p.estado)&&p.tiempo_prep_min&&p.aceptado_at){
    const fin=new Date(p.aceptado_at).getTime()+p.tiempo_prep_min*60000,r=fin-Date.now();
    return[r>=0?'ok':'no',(r>=0?'Faltan ':'Atrasado ')+npFmt(Math.abs(r)),'data-fin="'+fin+'"'];
  }
  if(['entregado','rechazado','cancelado'].includes(p.estado))return['',new Date(p.created_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})];
  return['','Hace '+npFmt(d),'data-ini="'+ini+'"'];
}
function npReloj(){
  if(!document.getElementById('nmain')){clearInterval(npRelojT);return}
  const ahora=Date.now();
  document.querySelectorAll('.npcr').forEach(e=>{
    const fin=e.getAttribute('data-fin'),ini=e.getAttribute('data-ini');
    if(fin){const r=Number(fin)-ahora;e.textContent=(r>=0?'Faltan ':'Atrasado ')+npFmt(Math.abs(r));e.className='chip npcr '+(r>=0?'ok':'no')}
    else if(ini){
      const d=ahora-Number(ini);e.textContent='Hace '+npFmt(d);
      if(e.getAttribute('data-pend'))e.className='chip npcr '+(d>=360000?'no':d>=180000?'am':'ok');
    }
  });
}
function npAcciones(p){
  const b=(t,f,c)=>`<button class="btn ${c||''}" style="flex:1;margin-top:10px" onclick="${f}">${t}</button>`;
  if(p.estado==='pendiente')return b('Aceptar',`npAceptar('${p.id}')`)+b('Rechazar',`npRechazar('${p.id}')`,'no');
  if(p.estado==='aceptado')return b('Empezar a preparar',`setEstado('${p.id}','preparando')`)+b('Listo para retirar',`setEstado('${p.id}','listo')`,'sec');
  if(p.estado==='preparando')return b('Listo para retirar',`setEstado('${p.id}','listo')`);
  return '';
}
function npCard(p){
  const [cls,txt,at]=npTiempo(p),cad=npCad[p.id];
  const fin=['rechazado','cancelado'].includes(p.estado);
  const retira=cad
    ?`<div style="margin-top:8px;padding:10px;border-radius:12px;background:#00ff8814;border:1px solid #00ff8844"><div class="meta" style="margin:0">Retira el pedido</div><b>${esc(cad.nombre)}</b>${cad.telefono?` · <a style="color:var(--g)" href="tel:${esc(cad.telefono)}">${esc(cad.telefono)}</a>`:''}</div>`
    :(p.estado==='listo'?'<div class="meta" style="margin-top:8px">Esperando que un cadete lo tome</div>':'');
  return `<div class="card" style="padding:14px;${p.estado==='pendiente'?'border-color:var(--g)':''}">
  <div class="row" style="align-items:center"><div style="font-size:24px;font-weight:800;letter-spacing:-.5px">#${p.numero}</div><span class="chip npcr ${cls}" ${at||''}>${txt}</span></div>
  <div class="row" style="align-items:center"><span class="chip ${p.estado==='entregado'?'ok':fin?'no':''}">${ESTADOS[p.estado]}</span><b>${money(p.total)}</b></div>
  <div class="meta">${esc(p.cliente_nombre)}${p.cliente_telefono?` · <a style="color:var(--g)" href="tel:${esc(p.cliente_telefono)}">${esc(p.cliente_telefono)}</a>`:''}</div>
  <div class="meta">Entrega: ${esc(p.direccion_entrega)}</div>
  <div style="margin:8px 0">${p.items.map(i=>`${i.cantidad} × ${esc(i.nombre)}`).join('<br>')}</div>
  ${p.nota?`<div class="meta">Nota: ${esc(p.nota)}</div>`:''}
  ${p.motivo_rechazo?`<div class="meta" style="color:var(--red)">Motivo: ${esc(p.motivo_rechazo)}</div>`:''}
  ${retira}${window.npAcc2?npAcc2(p):''}<div style="display:flex;gap:8px">${npAcciones(p)}</div></div>`;
}
function npSec(t,l,vacio){
  return `<h3 style="margin:18px 0 8px">${t} (${l.length})</h3>${l.length?l.map(npCard).join(''):vacio?`<div class="empty" style="padding:16px 0">${vacio}</div>`:''}`;
}
async function npRenderPedidos(){
  const m=document.getElementById('nmain');if(!m)return;
  const [r,c]=await Promise.all([
    sb.from('pedidos').select('*').eq('negocio_id',miNeg.id).order('created_at',{ascending:false}).limit(100),
    sb.rpc('cadetes_de_mi_negocio')]);
  if(r.error)return m.innerHTML='<div class="empty">No pudimos cargar los pedidos.</div>';
  npPeds=r.data;npCad={};
  (c.data||[]).forEach(x=>{npCad[x.pedido_id]=x});
  npPintarPedidos();
}
function npPintarPedidos(){
  const m=document.getElementById('nmain');if(!m||npTab!=='pedidos')return;
  const g=(...e)=>npPeds.filter(p=>e.includes(p.estado));
  const h=new Date();h.setHours(0,0,0,0);
  const hoy=npPeds.filter(p=>new Date(p.created_at)>=h);
  const vend=hoy.filter(p=>p.estado==='entregado').reduce((s,p)=>s+Number(p.subtotal),0);
  const k=(v,t)=>`<div style="flex:1"><div style="font-size:20px;font-weight:800;color:var(--g)">${v}</div><div class="meta">${t}</div></div>`;
  m.innerHTML=`<div class="card" style="padding:14px">${npCabecera()}
  <div style="display:flex;gap:8px;text-align:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">${k(hoy.length,'Pedidos hoy')}${k(money(vend),'Vendido hoy')}${k(g('pendiente').length,'Por atender')}</div></div>
  ${npSec('Nuevos',g('pendiente'),'Sin pedidos nuevos')}${npSec('En curso',g('aceptado','preparando','listo','en_camino'))}${npSec('Finalizados',g('entregado','rechazado','cancelado').slice(0,10))}`;
}
function npCabecera(){
  const pausa=miNeg.pausado_hasta&&new Date(miNeg.pausado_hasta)>new Date();
  const auto=miNeg.horario&&miNeg.horario.auto;
  const hora=pausa?new Date(miNeg.pausado_hasta).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'';
  const estado=pausa?'Pedidos pausados hasta las '+hora
    :miNeg.abierto?(auto?'Abierto · horario automático':'Recibiendo pedidos')
    :(auto?'Cerrado · fuera de horario':'Cerrado: no recibís pedidos');
  let bt='';
  if(pausa)bt='<button class="btn" style="width:auto;padding:10px 16px" onclick="npReanudar()">Reanudar</button>';
  else{
    if(!auto)bt+=`<button class="btn" style="width:auto;padding:10px 16px;${miNeg.abierto?'background:none;color:var(--red);border:1px solid var(--red)':''}" onclick="toggleAbierto()">${miNeg.abierto?'Cerrar local':'Abrir local'}</button>`;
    if(miNeg.abierto)bt+='<button class="btn sec" style="width:auto;padding:10px 16px" onclick="npPausar()">Pausar</button>';
  }
  return `<div class="row" style="align-items:center"><div><h3>${esc(miNeg.nombre)}</h3><div class="meta">${estado}</div></div><div style="display:flex;gap:8px">${bt}</div></div>`;
}
function npPausar(){
  npAbrirSheet(`<h3 style="margin-bottom:4px">¿Cuánto tiempo pausás los pedidos?</h3><div class="meta" style="margin-bottom:14px">Los clientes ven el local cerrado y no pueden pedir. Se reabre solo cuando termina.</div>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${[[15,'15 min'],[30,'30 min'],[60,'1 hora'],[120,'2 horas']].map(x=>`<button class="btn sec" onclick="npConfirmarPausa(${x[0]})">${x[1]}</button>`).join('')}</div>`);
}
async function npConfirmarPausa(m){
  const {error}=await sb.rpc('negocio_pausar',{p_min:m});
  const s=document.getElementById('sheet');if(s)s.remove();
  if(error)return toast(error.message,1);
  await npRefrescarNegocio();toast('Pedidos pausados');
}
async function npReanudar(){
  const {error}=await sb.rpc('negocio_reanudar');
  if(error)return toast(error.message,1);
  await npRefrescarNegocio();toast('Pedidos reanudados');
}
async function npRefrescarNegocio(){
  const {data}=await sb.from('negocios').select('*').eq('id',miNeg.id).single();
  if(data)miNeg=data;
  renderNegPedidos();
}
function npAbrirSheet(html){
  const s=document.createElement('div');s.className='sheet';s.id='sheet';
  s.innerHTML='<div>'+html+'<button class="btn sec" style="margin-top:12px" onclick="document.getElementById(\'sheet\').remove()">Cancelar</button></div>';
  document.body.appendChild(s);
}
function npAceptar(id){
  npAbrirSheet(`<h3 style="margin-bottom:4px">¿Cuánto tarda en estar listo?</h3><div class="meta" style="margin-bottom:14px">El cliente va a ver este tiempo en su pedido.</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${[10,15,20,30,45,60].map(m=>`<button class="btn sec" onclick="npConfirmarAceptar('${id}',${m})">${m} min</button>`).join('')}</div>`);
}
async function npConfirmarAceptar(id,m){
  const {error}=await sb.rpc('negocio_aceptar',{p_id:id,p_min:m});
  const s=document.getElementById('sheet');if(s)s.remove();
  if(error)return toast(error.message,1);
  toast('Pedido aceptado');renderNegPedidos();
}
function npRechazar(id){
  npAbrirSheet(`<h3 style="margin-bottom:4px">¿Por qué lo rechazás?</h3><div class="meta" style="margin-bottom:14px">El cliente va a ver el motivo.</div>
  ${['Sin stock','Local cerrado por hoy','Demasiados pedidos','Dirección fuera de zona'].map(t=>`<button class="btn sec" style="margin-bottom:8px" onclick="npConfirmarRechazo('${id}',this.textContent)">${t}</button>`).join('')}
  <input id="npotro" placeholder="Otro motivo" style="margin-top:6px">
  <button class="btn no" id="npotrob">Rechazar con este motivo</button>`);
  document.getElementById('npotrob').onclick=()=>{
    const t=document.getElementById('npotro').value.trim();
    if(!t)return toast('Escribí el motivo',1);
    npConfirmarRechazo(id,t);
  };
}
async function npConfirmarRechazo(id,t){
  const {error}=await sb.rpc('negocio_rechazar',{p_id:id,p_motivo:t});
  const s=document.getElementById('sheet');if(s)s.remove();
  if(error)return toast(error.message,1);
  toast('Pedido rechazado');renderNegPedidos();
      }
