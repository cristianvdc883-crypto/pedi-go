/* ===== EXTRAS DEL COMERCIO: WhatsApp, comanda y horario automático ===== */
/* --- WhatsApp al cliente --- */
function npTel(t){
  let d=String(t||'').replace(/\D/g,'').replace(/^0+/,'');
  if(!d)return '';
  if(d.startsWith('549'))return d;
  if(d.startsWith('54'))d=d.slice(2);
  if(d.length===12){for(const p of [2,3,4]){if(d.slice(p,p+2)==='15'){d=d.slice(0,p)+d.slice(p+2);break}}}
  return '549'+d;
}
function npWaMsg(p){
  const loc=miNeg.nombre,n=String(p.cliente_nombre||'').split(' ')[0];
  if(['aceptado','preparando'].includes(p.estado))return 'Hola '+n+', te escribimos de '+loc+'. Recibimos tu pedido #'+p.numero+(p.tiempo_prep_min?' y va a estar listo en unos '+p.tiempo_prep_min+' minutos':'')+'.';
  if(p.estado==='listo')return 'Hola '+n+', tu pedido #'+p.numero+' de '+loc+' ya está listo y lo está retirando el cadete.';
  if(p.estado==='en_camino')return 'Hola '+n+', tu pedido #'+p.numero+' de '+loc+' ya va en camino.';
  return 'Hola '+n+', te escribimos de '+loc+' por tu pedido #'+p.numero+'.';
}
function npAcc2(p){
  if(!['aceptado','preparando','listo','en_camino'].includes(p.estado))return '';
  const tel=npTel(p.cliente_telefono);
  return `<div style="display:flex;gap:8px;margin-top:10px"><button class="btn sec" style="flex:1;padding:10px" onclick="npComanda('${p.id}')">Comanda</button>`
    +(tel?`<a class="btn sec" style="flex:1;padding:10px;text-align:center;text-decoration:none" href="https://wa.me/${tel}?text=${encodeURIComponent(npWaMsg(p))}" target="_blank" rel="noopener">WhatsApp</a>`:'')+'</div>';
}

/* --- Comanda: compartir o imprimir --- */
function npComandaTxt(p){
  const raya='--------------------------------';
  const f=new Date(p.created_at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  return ['PEDI GO',miNeg.nombre,raya,'Pedido #'+p.numero+'  '+f,
    'Cliente: '+p.cliente_nombre+(p.cliente_telefono?' ('+p.cliente_telefono+')':''),
    'Entrega: '+p.direccion_entrega,raya,
    p.items.map(i=>i.cantidad+' x '+i.nombre).join('\n'),raya,
    p.nota?'Nota: '+p.nota:null,
    'Subtotal: '+money(p.subtotal),'Envio: '+money(p.costo_envio),
    'TOTAL: '+money(p.total)+' ('+(p.pago==='mercadopago'?'Mercado Pago':'efectivo')+')'].filter(x=>x!==null).join('\n');
}
function npComanda(id){
  const p=npPeds.find(x=>x.id===id);if(!p)return;
  npAbrirSheet(`<h3 style="margin-bottom:10px">Comanda del pedido #${p.numero}</h3>
  <pre style="white-space:pre-wrap;font:13px/1.5 ui-monospace,monospace;background:#1a1a1a;border-radius:12px;padding:12px;margin-bottom:12px;overflow:auto">${esc(npComandaTxt(p))}</pre>
  <div style="display:flex;gap:8px"><button class="btn" style="flex:1" onclick="npCompartir('${p.id}')">Compartir</button><button class="btn sec" style="flex:1" onclick="npImprimir('${p.id}')">Imprimir</button></div>`);
}
async function npCompartir(id){
  const p=npPeds.find(x=>x.id===id);if(!p)return;
  const t=npComandaTxt(p);
  if(navigator.share){try{await navigator.share({title:'Pedido #'+p.numero,text:t})}catch(_){}return}
  try{await navigator.clipboard.writeText(t);toast('Comanda copiada')}catch(_){toast('No se pudo compartir',1)}
}
function npImprimir(id){
  const p=npPeds.find(x=>x.id===id);if(!p)return;
  const w=window.open('','_blank');
  if(!w)return toast('Permití las ventanas emergentes para imprimir',1);
  w.document.write('<html><head><meta charset="utf-8"><title>Pedido #'+p.numero+'</title><style>body{margin:0;padding:8px;font:14px/1.4 monospace}pre{white-space:pre-wrap;margin:0}@page{margin:4mm}</style></head><body><pre>'+esc(npComandaTxt(p))+'</pre></body></html>');
  w.document.close();w.focus();setTimeout(()=>w.print(),300);
}

/* --- Horario automático (se muestra en "Mi local") --- */
const HZ_DIAS=[[1,'Lu'],[2,'Ma'],[3,'Mi'],[4,'Ju'],[5,'Vi'],[6,'Sa'],[0,'Do']];
function npHorario(m){
  const h=miNeg.horario||{};
  const dias=h.dias||[1,2,3,4,5,6,0],t=h.turnos||[],t1=t[0]||['09:00','22:00'],t2=t[1]||['',''];
  m.insertAdjacentHTML('beforeend',`<div class="card" style="padding:14px;margin-top:12px"><h3>Horario automático</h3>
  <div class="meta" style="margin:4px 0 12px">El local abre y cierra solo según estos horarios. Si lo apagás, abrís y cerrás vos con el botón.</div>
  <button class="btn ${h.auto?'':'sec'}" id="hzauto" data-on="${h.auto?1:0}" onclick="hzAuto()">${h.auto?'Horario automático: encendido':'Horario automático: apagado'}</button>
  <div class="meta" style="margin:14px 0 6px">Días que abre</div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px">${HZ_DIAS.map(d=>`<button class="btn ${dias.includes(d[0])?'':'sec'}" id="hzd${d[0]}" data-on="${dias.includes(d[0])?1:0}" style="padding:10px 0;font-size:13px" onclick="hzDia(${d[0]})">${d[1]}</button>`).join('')}</div>
  <div class="meta">Turno 1: desde y hasta</div>
  <div style="display:flex;gap:8px"><input type="time" id="hz1a" value="${t1[0]}"><input type="time" id="hz1b" value="${t1[1]}"></div>
  <div class="meta">Turno 2 (opcional, por ejemplo la noche)</div>
  <div style="display:flex;gap:8px"><input type="time" id="hz2a" value="${t2[0]}"><input type="time" id="hz2b" value="${t2[1]}"></div>
  <button class="btn" id="hzgo">Guardar horario</button></div>`);
  document.getElementById('hzgo').onclick=hzGuardar;
}
function hzAuto(){
  const b=document.getElementById('hzauto'),on=b.dataset.on==='1'?0:1;
  b.dataset.on=on;b.className='btn '+(on?'':'sec');
  b.textContent=on?'Horario automático: encendido':'Horario automático: apagado';
}
function hzDia(d){
  const b=document.getElementById('hzd'+d),on=b.dataset.on==='1'?0:1;
  b.dataset.on=on;b.className='btn '+(on?'':'sec');
}
async function hzGuardar(e){
  const v=i=>document.getElementById(i).value;
  const auto=document.getElementById('hzauto').dataset.on==='1';
  const dias=HZ_DIAS.map(d=>d[0]).filter(d=>document.getElementById('hzd'+d).dataset.on==='1');
  const turnos=[];
  if(v('hz1a')&&v('hz1b'))turnos.push([v('hz1a'),v('hz1b')]);
  else return toast('Completá el desde y el hasta del turno 1',1);
  if(v('hz2a')||v('hz2b')){
    if(!(v('hz2a')&&v('hz2b')))return toast('Completá el desde y el hasta del turno 2, o dejá los dos vacíos',1);
    turnos.push([v('hz2a'),v('hz2b')]);
  }
  if(auto&&!dias.length)return toast('Elegí al menos un día',1);
  e.target.disabled=true;
  const {data,error}=await sb.from('negocios').update({horario:{auto,dias,turnos}}).eq('id',miNeg.id).select().single();
  e.target.disabled=false;
  if(error)return toast(error.message,1);
  miNeg=data;
  toast(auto?'Horario guardado. El local se abre y cierra solo.':'Horario guardado (automático apagado)');
  renderLocal();
  }
