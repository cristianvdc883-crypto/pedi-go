/* ===== HISTORIAL Y GANANCIAS DEL CADETE ===== */
let hsRango='hoy';
function hsSet(r){hsRango=r;renderHistorial()}
async function renderHistorial(){
  const m=document.getElementById('chis');if(!m)return;
  m.innerHTML='<div class="empty">Cargando…</div>';
  const dias=hsRango==='hoy'?1:hsRango==='7'?7:30;
  const desde=new Date();desde.setHours(0,0,0,0);desde.setDate(desde.getDate()-(dias-1));
  const {data,error}=await sb.from('pedidos').select('numero,total,ganancia_cadete,pago,calif_cadete,updated_at,direccion_entrega,negocios(nombre)').eq('cadete_id',me.id).eq('estado','entregado').gte('updated_at',desde.toISOString()).order('updated_at',{ascending:false}).limit(500);
  if(error)return m.innerHTML='<div class="empty">No pudimos cargar tu historial.</div>';
  const gan=data.reduce((s,p)=>s+Number(p.ganancia_cadete),0);
  const efec=data.filter(p=>p.pago==='efectivo').reduce((s,p)=>s+Number(p.total),0);
  const cal=data.filter(p=>p.calif_cadete);
  const prom=cal.length?cal.reduce((s,p)=>s+p.calif_cadete,0)/cal.length:0;
  const porDia=[];
  for(let i=0;i<dias;i++){const d=new Date(desde);d.setDate(d.getDate()+i);porDia.push({d,t:0})}
  data.forEach(p=>{
    const d=new Date(p.updated_at);d.setHours(0,0,0,0);
    const x=porDia.find(y=>y.d.getTime()===d.getTime());if(x)x.t+=Number(p.ganancia_cadete);
  });
  const max=Math.max(1,...porDia.map(x=>x.t));
  const k=(v,t,c)=>`<div style="flex:1;min-width:45%"><div style="font-size:22px;font-weight:800;color:${c||'var(--g)'}">${v}</div><div class="meta">${t}</div></div>`;
  const btn=(r,t)=>`<button class="${hsRango===r?'on':''}" onclick="hsSet('${r}')">${t}</button>`;
  m.innerHTML=`<div class="tabs" style="margin:0 0 12px">${btn('hoy','Hoy')}${btn('7','7 días')}${btn('30','30 días')}</div>
  <div class="card" style="padding:14px"><div style="display:flex;flex-wrap:wrap;gap:14px 8px">${k(data.length,data.length===1?'Entrega':'Entregas')}${k(money(gan),'Tu ganancia por envíos')}${k(money(efec),'Efectivo cobrado','var(--tx)')}${k(cal.length?'★ '+prom.toFixed(2):'-','Promedio ('+cal.length+')','#ffc83d')}</div>
  <div class="meta" style="margin-top:12px">El efectivo que cobrás a los clientes lo rendís a PEDI GO. Tu ganancia se te paga por transferencia.</div></div>
  ${dias>1?`<div class="card" style="padding:14px"><div class="meta" style="margin:0 0 8px">Ganancia por día</div>
  <div style="display:flex;align-items:flex-end;gap:3px;height:100px">${porDia.map(x=>`<div style="flex:1;height:100%;display:flex;align-items:flex-end"><div style="width:100%;background:var(--g);border-radius:4px 4px 0 0;height:${Math.round(x.t/max*100)}%;min-height:${x.t?3:0}px"></div></div>`).join('')}</div>
  ${dias===7?`<div style="display:flex;gap:3px">${porDia.map(x=>`<div class="meta" style="flex:1;text-align:center;font-size:11px">${x.d.toLocaleDateString('es-AR',{weekday:'short'}).slice(0,2)}</div>`).join('')}</div>`:''}</div>`:''}
  <h3 style="margin:18px 0 8px">Entregas (${data.length})</h3>
  ${data.slice(0,40).map(p=>`<div class="card" style="padding:14px"><div class="row"><b>${esc(p.negocios?.nombre||'Comercio')}</b><b style="color:var(--g)">+${money(p.ganancia_cadete)}</b></div>
  <div class="meta">Pedido ${p.numero} · ${new Date(p.updated_at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
  <div class="meta">${esc(p.direccion_entrega)}</div>
  <div class="row"><span class="meta">Cobraste ${money(p.total)} (${p.pago==='mercadopago'?'Mercado Pago':'efectivo'})</span><span style="color:#ffc83d">${p.calif_cadete?'★'.repeat(p.calif_cadete)+'☆'.repeat(5-p.calif_cadete):''}</span></div></div>`).join('')||'<div class="empty" style="padding:16px 0">Todavía no hiciste entregas en este período.</div>'}
  ${data.length>40?'<div class="meta" style="text-align:center">Mostrando las últimas 40 entregas.</div>':''}`;
}
