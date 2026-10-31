/* ===== RANKING DE CADETES ===== */
document.head.insertAdjacentHTML('beforeend','<style>.stars button{background:none;border:0;font-size:32px;color:#ffc83d;padding:4px 8px}.est{color:#ffc83d;letter-spacing:2px}</style>');
const estrellas=n=>'★'.repeat(n)+'☆'.repeat(5-n);
const rkFecha=d=>new Date(d).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'});

document.addEventListener('DOMContentLoaded',()=>{

  /* --- Cliente: calificar al cadete en "Mis pedidos" --- */
  renderPedidos=async function(){
    const m=document.getElementById('main');if(!m)return;
    const {data,error}=await sb.from('pedidos').select('*, negocios(nombre)').eq('cliente_id',me.id).order('created_at',{ascending:false}).limit(30);
    if(error)return m.innerHTML='<div class="empty">No pudimos cargar tus pedidos.</div>';
    if(!data.length)return m.innerHTML='<div class="empty">Todavía no hiciste pedidos. Elegí un comercio y armá el primero.</div>';
    m.innerHTML=data.map(p=>{
      const fin=['entregado','rechazado','cancelado'].includes(p.estado);
      let cal='';
      if(p.estado==='entregado'&&p.cadete_id){
        cal=p.calif_cadete
          ?`<div class="meta">Tu calificación al cadete: <span class="est">${estrellas(p.calif_cadete)}</span></div>`
          :`<div class="meta" style="margin-top:8px">¿Cómo fue la entrega? Calificá al cadete</div><div class="stars">${[1,2,3,4,5].map(n=>`<button aria-label="${n} estrellas" onclick="calificar('${p.id}',${n})">★</button>`).join('')}</div>`;
      }
      return `<div class="card" style="padding:14px"><div class="row"><b>${esc(p.negocios?.nombre||'Comercio')}</b><span class="chip ${p.estado==='entregado'?'ok':fin?'no':''}">${ESTADOS[p.estado]}</span></div>
      <div class="meta">Pedido ${p.numero} · ${new Date(p.created_at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
      <div style="margin:8px 0">${p.items.map(i=>`${i.cantidad} × ${esc(i.nombre)}`).join('<br>')}</div>
      <div class="row"><span class="meta">Total con envío</span><b>${money(p.total)}</b></div>${cal}
      ${p.estado==='pendiente'?`<button class="btn red" onclick="cancelar('${p.id}')">Cancelar pedido</button>`:''}</div>`}).join('');
  };

  /* --- Cadete: ve solo su puesto --- */
  const _rc=renderCadete;
  renderCadete=async function(){
    await _rc();
    const m=document.getElementById('clist');if(!m)return;
    const {data}=await sb.rpc('mi_ranking');
    const viejo=document.getElementById('rkcard');if(viejo)viejo.remove();
    if(!data||!document.getElementById('clist'))return;
    const dias=Math.ceil((new Date(data.hasta)-Date.now())/864e5),fin=dias<=0;
    let cuerpo;
    if(data.puesto){
      cuerpo=`<div style="font-size:34px;font-weight:800;color:var(--g)">Puesto ${data.puesto}</div>
      <div class="meta">de ${data.participantes} ${data.participantes===1?'cadete':'cadetes'} en el ranking</div>
      <div class="meta" style="margin-top:6px"><span class="est">★</span> ${Number(data.promedio).toFixed(2)} · ${data.calificadas} ${data.calificadas===1?'calificación':'calificaciones'}</div>`;
    }else{
      const falta=Math.max(0,data.min-data.calificadas);
      cuerpo=`<div style="font-size:18px;font-weight:700">Todavía no estás en el ranking</div>
      <div class="meta">Necesitás ${data.min} ${data.min===1?'calificación':'calificaciones'} de clientes. Te ${falta===1?'falta':'faltan'} ${falta}.</div>`;
    }
    m.insertAdjacentHTML('afterbegin',`<div class="card" id="rkcard" style="padding:14px;border-color:#ffc83d55"><div class="row"><b>${esc(data.nombre)}</b><span class="chip am">${fin?'Terminó':'Quedan '+dias+(dias===1?' día':' días')}</span></div>
    ${cuerpo}<div class="meta" style="margin-top:8px">Premio al puesto 1: <b style="color:#ffc83d">${money(data.premio)}</b></div></div>`);
  };

  /* --- Dueño: pestaña Ranking --- */
  const _ds=duenoShell;
  duenoShell=async function(){
    await _ds();
    const t=document.querySelector('.tabs');if(!t)return;
    t.insertAdjacentHTML('beforeend','<button id="a4" onclick="aSet(\'ranking\')">Ranking</button>');
    t.querySelectorAll('button').forEach(b=>{b.style.fontSize='13px';b.style.padding='10px 2px'});
  };
  const _as=aSet;
  aSet=async function(t){
    const b=document.getElementById('a4');
    if(t!=='ranking'){if(b)b.className='';return _as(t)}
    ['a1','a2','a3'].forEach(i=>{const e=document.getElementById(i);if(e)e.className=''});
    if(b)b.className='on';
    rkAdmin();
  };
});

async function calificar(id,n){
  if(!confirm('¿Calificar al cadete con '+n+(n===1?' estrella?':' estrellas?')))return;
  const {error}=await sb.rpc('calificar_cadete',{p_pedido:id,p_estrellas:n});
  if(error)return toast(error.message,1);
  toast('¡Gracias por calificar!');renderPedidos();
}
function rkFila(x){
  return `<div class="row" style="align-items:center"><span><b style="color:${Number(x.puesto)===1?'var(--g)':'var(--tx)'}">#${x.puesto}</b> ${esc(x.nombre)}</span><span><span class="est">★</span> ${Number(x.promedio).toFixed(2)} <span class="meta">(${x.calificadas})</span></span></div>`;
}
async function rkAdmin(){
  const m=document.getElementById('amain');m.innerHTML='<div class="empty">Cargando…</div>';
  const [r,c]=await Promise.all([sb.from('rankings').select('*').order('created_at',{ascending:false}).limit(6),sb.from('ciudades').select('*')]);
  if(r.error||c.error)return m.innerHTML='<div class="empty">No pudimos cargar el ranking.</div>';
  let html='';
  const act=r.data.find(x=>!x.cerrado);
  if(act){
    const t=(await sb.rpc('dueno_ranking_tabla',{p_ranking:act.id})).data||[];
    const en=t.filter(x=>x.califica),fuera=t.filter(x=>!x.califica);
    const corre=new Date(act.hasta)>new Date();
    html+=`<div class="card" style="padding:14px"><div class="row"><b>${esc(act.nombre)}</b><span class="chip ${corre?'ok':''}">${corre?'En curso':'Terminado'}</span></div>
    <div class="meta">Del ${rkFecha(act.desde)} al ${rkFecha(act.hasta)} · mínimo ${act.min_calificaciones} calificaciones</div>
    <div class="meta">Premio al puesto 1: <b style="color:#ffc83d">${money(act.premio)}</b></div>
    <div style="margin:10px 0">${en.map(rkFila).join('')||'<div class="meta">Todavía nadie llegó al mínimo de calificaciones.</div>'}</div>
    ${en[0]?`<div class="chip ok">${corre?'Va ganando':'Ganador'}: ${esc(en[0].nombre)}</div>`:''}
    ${fuera.length?`<div class="meta" style="margin-top:10px">Todavía no califican:</div>${fuera.map(x=>`<div class="row"><span>${esc(x.nombre)}</span><span class="meta">${x.calificadas} de ${act.min_calificaciones}</span></div>`).join('')}`:''}
    ${corre?`<button class="btn red" onclick="rkTerminar('${act.id}')">Terminar ahora</button>`:''}</div>`;
  }
  html+=`<div class="card" style="padding:14px"><h3 style="margin-bottom:10px">${act?'Nuevo ranking':'Armar un ranking'}</h3>
  <div class="meta">Nombre</div><input id="rkn" value="Mejor cadete del mes">
  <div class="meta">Cantidad de días</div><input id="rkd" type="number" inputmode="numeric" value="30">
  <div class="meta">Premio para el puesto 1 (en pesos)</div><input id="rkp" type="number" inputmode="numeric" value="50000">
  <div class="meta">Mínimo de calificaciones para entrar</div><input id="rkm" type="number" inputmode="numeric" value="3">
  <div class="meta">Ciudad</div><select id="rkc" class="sel" style="margin-bottom:12px">${c.data.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</select>
  <button class="btn" onclick="rkCrear(${act?'true':'false'})">Crear ranking</button>
  ${act?'<div class="meta" style="margin-top:8px">Al crear uno nuevo, el actual queda en el historial.</div>':''}</div>`;
  const hist=r.data.filter(x=>x.cerrado).slice(0,5);
  if(hist.length){
    html+='<h3 style="margin:18px 0 8px">Rankings anteriores</h3>';
    for(const h of hist){
      const t=(await sb.rpc('dueno_ranking_tabla',{p_ranking:h.id})).data||[];
      const g=t.find(x=>Number(x.puesto)===1);
      html+=`<div class="card" style="padding:14px"><div class="row"><b>${esc(h.nombre)}</b><span class="meta">${rkFecha(h.desde)} al ${rkFecha(h.hasta)}</span></div>
      <div class="meta">${g?`Ganador: ${esc(g.nombre)} · ★ ${Number(g.promedio).toFixed(2)} (${g.calificadas}) · Premio ${money(h.premio)}`:'Sin ganador: nadie llegó al mínimo de calificaciones'}</div></div>`;
    }
  }
  m.innerHTML=html;
}
async function rkCrear(hayActivo){
  const v=id=>document.getElementById(id).value;
  const dias=parseInt(v('rkd')),premio=Number(v('rkp')),min=parseInt(v('rkm'))||1;
  if(!dias||dias<1)return toast('Poné la cantidad de días',1);
  if(v('rkp')===''||!(premio>=0))return toast('Poné el premio',1);
  if(hayActivo&&!confirm('Ya hay un ranking. Si creás uno nuevo, el actual pasa al historial. ¿Seguimos?'))return;
  const {error}=await sb.rpc('dueno_crear_ranking',{p_ciudad:v('rkc'),p_nombre:v('rkn'),p_dias:dias,p_premio:premio,p_min:min});
  if(error)return toast(error.message,1);
  toast('Ranking creado');rkAdmin();
}
async function rkTerminar(id){
  if(!confirm('¿Terminar el ranking ahora? Las calificaciones nuevas ya no suman.'))return;
  const {error}=await sb.rpc('dueno_terminar_ranking',{p_id:id});
  if(error)return toast(error.message,1);
  rkAdmin();
                                                                               }
