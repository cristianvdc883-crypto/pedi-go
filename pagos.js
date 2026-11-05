/* ===== PAGOS Y LIQUIDACIONES ===== */
const pgM=n=>'$'+Number(n||0).toLocaleString('es-AR',{maximumFractionDigits:2});
const pgF=d=>new Date(d).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
let pgHasta=null,pgEtq='',pgRes=null;
function pgHoy0(){const d=new Date();d.setHours(0,0,0,0);return d}

/* --- Panel del dueño: pestaña Pagos --- */
async function pgAdmin(){
  const m=document.getElementById('amain');if(!m)return;
  if(!pgHasta){pgHasta=pgHoy0().toISOString();pgEtq='todo lo anterior a hoy'}
  m.innerHTML='<div class="empty">Cargando…</div>';
  const [r,h,n,u]=await Promise.all([
    sb.rpc('dueno_liq_resumen',{p_hasta:pgHasta}),
    sb.from('liquidaciones').select('*').order('created_at',{ascending:false}).limit(20),
    sb.from('negocios').select('id,nombre'),
    sb.from('perfiles').select('id,nombre,email')]);
  if(r.error)return m.innerHTML=`<div class="empty">No pudimos cargar los pagos.<br><span class="meta">${esc(r.error.message)}</span></div>`;
  pgRes=r.data;
  const cfg=pgRes.config,nn={},uu={};
  (n.data||[]).forEach(x=>{nn[x.id]=x.nombre});(u.data||[]).forEach(x=>{uu[x.id]=x.nombre||x.email});
  const sNeg=pgRes.negocios.reduce((s,x)=>s+Number(x.neto),0),sCad=pgRes.cadetes.reduce((s,x)=>s+Number(x.neto),0);
  const sEfe=pgRes.cadetes.reduce((s,x)=>s+Number(x.efectivo),0);
  const miCom=pgRes.negocios.reduce((s,x)=>s+Number(x.comision),0)+pgRes.cadetes.reduce((s,x)=>s+Number(x.comision),0);
  const negs=pgRes.negocios.map(x=>`<div class="card" style="padding:14px"><div class="row"><b>${esc(x.nombre)}</b><span class="meta">${x.pedidos} ${x.pedidos==1?'pedido':'pedidos'}</span></div>
    <div class="row"><span class="meta">Vendió</span><span>${pgM(x.bruto)}</span></div>
    <div class="row"><span class="meta">Tu comisión</span><span>- ${pgM(x.comision)}</span></div>
    <div class="row" style="align-items:center"><b>A transferirle</b><b style="font-size:20px;color:var(--g)">${pgM(x.neto)}</b></div>
    <button class="btn" style="margin-top:8px" onclick="pgPagar('negocio','${x.id}')">Marcar como pagado</button></div>`).join('')||'<div class="empty" style="padding:16px 0">No hay ventas para liquidar en este período.</div>';
  const cads=pgRes.cadetes.map(x=>{
    const sal=Number(x.neto)-Number(x.efectivo);
    return `<div class="card" style="padding:14px"><div class="row"><b>${esc(x.nombre)}</b><span class="meta">${x.alias?'Alias: '+esc(x.alias):'sin alias'}</span></div>
    ${x.pedidos?`<div class="row"><span class="meta">Envíos (${x.pedidos})</span><span>${pgM(x.envios)}</span></div>
    <div class="row"><span class="meta">Tu comisión</span><span>- ${pgM(x.comision)}</span></div>
    <div class="row" style="align-items:center"><b>A pagarle</b><b style="font-size:20px;color:var(--g)">${pgM(x.neto)}</b></div>
    <button class="btn" style="margin-top:8px" onclick="pgPagar('cadete','${x.id}')">Marcar como pagado</button>`:''}
    ${x.efectivo>0?`<div style="margin-top:12px;padding:10px;border-radius:12px;background:#ffc83d14;border:1px solid #ffc83d44"><div class="row" style="align-items:center"><span>Efectivo que te debe rendir (${x.pedidos_efectivo})</span><b style="color:#ffc83d">${pgM(x.efectivo)}</b></div>
    <button class="btn sec" style="margin-top:8px" onclick="pgRendir('${x.id}')">Recibí el efectivo</button></div>`:''}
    ${x.pedidos&&x.efectivo>0?`<div class="meta" style="margin-top:8px">Si lo compensás: ${sal>=0?'le transferís '+pgM(sal):'te transfiere '+pgM(-sal)}.</div>`:''}</div>`}).join('')||'<div class="empty" style="padding:16px 0">No hay entregas para liquidar en este período.</div>';
  const hist=(h.data||[]).map(l=>{
    const tit={negocio:'Pago a negocio',cadete:'Pago a cadete',efectivo:'Efectivo recibido',inicial:'Cierre inicial'}[l.tipo]||l.tipo;
    const quien=l.tipo==='negocio'?nn[l.negocio_id]:l.tipo==='inicial'?'Pedidos anteriores al lanzamiento':uu[l.cadete_id];
    return `<div class="card" style="padding:14px"><div class="row"><b>${tit}</b><b style="color:var(--g)">${pgM(l.neto)}</b></div>
    <div class="meta">${esc(quien||'')} · ${l.pedidos} ${l.pedidos==1?'pedido':'pedidos'} · ${pgF(l.created_at)}</div>
    ${l.tipo==='negocio'||l.tipo==='cadete'?`<div class="meta">Bruto ${pgM(l.bruto)} · comisión ${pgM(l.comision)}</div>`:''}</div>`}).join('')||'<div class="empty" style="padding:16px 0">Todavía no registraste pagos.</div>';
  m.innerHTML=`<div class="card" style="padding:14px"><h3 style="margin-bottom:6px">Tus comisiones</h3>
  <div class="meta">A los negocios, sobre lo que venden sin el envío (%)</div><input id="pgn" type="number" inputmode="decimal" value="${cfg.comision_negocio_pct}">
  <div class="meta">A los cadetes</div><select id="pgt" class="sel" style="margin-bottom:10px"><option value="pct">Porcentaje del envío (%)</option><option value="fijo">Monto fijo por entrega ($)</option></select>
  <input id="pgv" type="number" inputmode="decimal" value="${cfg.comision_cadete_valor}">
  <button class="btn sec" onclick="pgGuardarCfg()">Guardar comisiones</button></div>
  <div class="card" style="padding:14px"><h3 style="margin-bottom:6px">Liquidar hasta</h3>
  <div class="meta">Se suman los pedidos entregados que todavía no pagaste: <b>${pgEtq}</b></div>
  <div style="display:flex;gap:8px;margin:10px 0"><button class="btn sec" style="flex:1;padding:10px" onclick="pgPeriodo('ayer')">Hasta ayer</button><button class="btn sec" style="flex:1;padding:10px" onclick="pgPeriodo('ahora')">Hasta ahora</button></div>
  <div class="meta">O elegí un día (lo incluye)</div><div style="display:flex;gap:8px"><input type="date" id="pgd"><button class="btn sec" style="width:auto;padding:10px 16px;margin-bottom:10px" onclick="pgPeriodo('fecha')">Calcular</button></div></div>
  <div class="card" style="padding:14px"><h3 style="margin-bottom:8px">Resumen del período</h3>
  <div class="row"><span class="meta">A transferir a negocios</span><b>${pgM(sNeg)}</b></div>
  <div class="row"><span class="meta">A transferir a cadetes</span><b>${pgM(sCad)}</b></div>
  <div class="row"><span class="meta">Efectivo que te deben rendir</span><b style="color:#ffc83d">${pgM(sEfe)}</b></div>
  <div class="row"><span class="meta">Tu comisión</span><b style="color:var(--g)">${pgM(miCom)}</b></div></div>
  <h3 style="margin:18px 0 8px">Negocios</h3>${negs}<h3 style="margin:18px 0 8px">Cadetes</h3>${cads}<h3 style="margin:18px 0 8px">Historial de pagos</h3>${hist}`;
  document.getElementById('pgt').value=cfg.comision_cadete_tipo;
}
function pgPeriodo(t){
  if(t==='ayer'){pgHasta=pgHoy0().toISOString();pgEtq='todo lo anterior a hoy'}
  else if(t==='ahora'){pgHasta=new Date().toISOString();pgEtq='hasta este momento'}
  else{
    const v=document.getElementById('pgd').value;if(!v)return toast('Elegí un día',1);
    const d=new Date(v+'T00:00:00');d.setDate(d.getDate()+1);
    pgHasta=d.toISOString();pgEtq='hasta el '+v.split('-').reverse().join('/')+' inclusive';
  }
  pgAdmin();
}
async function pgGuardarCfg(){
  const neg=Number(document.getElementById('pgn').value),val=Number(document.getElementById('pgv').value);
  if(!(neg>=0&&neg<=100))return toast('La comisión a negocios va de 0 a 100',1);
  if(!(val>=0))return toast('Poné un valor válido para los cadetes',1);
  const {error}=await sb.rpc('dueno_guardar_config',{p_neg:neg,p_tipo:document.getElementById('pgt').value,p_valor:val});
  if(error)return toast(error.message,1);
  toast('Comisiones guardadas');pgAdmin();
}
async function pgPagar(tipo,id){
  const e=(tipo==='negocio'?pgRes.negocios:pgRes.cadetes).find(x=>x.id===id);if(!e)return;
  if(!confirm('¿Confirmás que ya transferiste '+pgM(e.neto)+' a '+e.nombre+'? Esos pedidos no van a volver a aparecer.'))return;
  const {error}=await sb.rpc('dueno_liq_pagar',{p_tipo:tipo,p_entidad:id,p_hasta:pgHasta});
  if(error)return toast(error.message,1);
  toast('Pago registrado');pgAdmin();
}
async function pgRendir(id){
  const e=pgRes.cadetes.find(x=>x.id===id);if(!e)return;
  if(!confirm('¿Confirmás que recibiste '+pgM(e.efectivo)+' en efectivo de '+e.nombre+'?'))return;
  const {error}=await sb.rpc('dueno_liq_rendir',{p_cadete:id,p_hasta:pgHasta});
  if(error)return toast(error.message,1);
  toast('Efectivo registrado');pgAdmin();
}

/* --- Panel del comercio: su cuenta (se muestra arriba de Ventas) --- */
async function npCuenta(){
  const [r,h]=await Promise.all([
    sb.rpc('negocio_pendiente'),
    sb.from('liquidaciones').select('neto,created_at').eq('tipo','negocio').eq('negocio_id',miNeg.id).order('created_at',{ascending:false}).limit(5)]);
  const d=r.data;if(!d)return '';
  return `<div class="card" style="padding:14px"><h3 style="margin-bottom:8px">Tu cuenta con PEDI GO</h3>
  <div class="row" style="align-items:center"><span class="meta">Por cobrar (${d.pedidos} ${d.pedidos==1?'pedido':'pedidos'})</span><b style="font-size:22px;color:var(--g)">${pgM(d.neto)}</b></div>
  <div class="meta">Vendiste ${pgM(d.bruto)} y la comisión es ${pgM(d.comision)}. Se te transfiere en cada liquidación.</div>
  <div class="row" style="margin-top:6px"><span class="meta">Cobrado hasta ahora</span><span>${pgM(d.pagado)}</span></div>
  ${(h.data||[]).length?`<div class="meta" style="margin-top:10px">Últimos pagos</div>${h.data.map(x=>`<div class="row"><span class="meta">${pgF(x.created_at)}</span><b>${pgM(x.neto)}</b></div>`).join('')}`:''}</div>`;
}

/* --- Panel del cadete: su cuenta (se muestra arriba de Ganancias) --- */
async function cdCuenta(){
  const {data:d}=await sb.rpc('cadete_pendiente');if(!d)return '';
  return `<div class="card" style="padding:14px;border-color:#ffc83d55"><h3 style="margin-bottom:8px">Tu cuenta con PEDI GO</h3>
  <div class="row" style="align-items:center"><span class="meta">Te falta cobrar (${d.pedidos} ${d.pedidos==1?'entrega':'entregas'})</span><b style="font-size:20px;color:var(--g)">${pgM(d.neto)}</b></div>
  <div class="meta">Tu ganancia ${pgM(d.bruto)} menos la comisión ${pgM(d.comision)}.</div>
  <div class="row" style="align-items:center;margin-top:8px"><span class="meta">Efectivo que tenés que rendir (${d.pedidos_efectivo})</span><b style="font-size:20px;color:#ffc83d">${pgM(d.efectivo)}</b></div>
  <div class="meta">Entregalo a PEDI GO como te indiquen.</div></div>`;
}

/* --- Se enganchan cuando ya cargaron todos los archivos --- */
window.addEventListener('load',()=>{
  if(typeof renderVentas==='function'){
    const _rv=renderVentas;
    renderVentas=async function(){
      await _rv();
      const m=document.getElementById('nmain');if(!m)return;
      const c=await npCuenta();if(c&&document.getElementById('nmain'))m.insertAdjacentHTML('afterbegin',c);
    };
  }
  if(typeof renderHistorial==='function'){
    const _rh=renderHistorial;
    renderHistorial=async function(){
      await _rh();
      const m=document.getElementById('chis');if(!m)return;
      const c=await cdCuenta();if(c&&document.getElementById('chis'))m.insertAdjacentHTML('afterbegin',c);
    };
  }
});
