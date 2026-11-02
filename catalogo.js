/* ===== CATÁLOGO DEL COMERCIO: productos, mi local y ventas ===== */
/* --- Productos --- */
async function renderProductos(){
  const m=document.getElementById('nmain');if(!m)return;
  m.innerHTML='<div class="empty">Cargando…</div>';
  const {data,error}=await sb.from('productos').select('*').eq('negocio_id',miNeg.id).order('nombre');
  if(error)return m.innerHTML='<div class="empty">No pudimos cargar los productos.</div>';
  npProds=data;
  m.innerHTML=`<button class="btn" onclick="npForm()">+ Agregar producto</button><div style="height:14px"></div>`
  +(data.map(p=>`<div class="card ${p.disponible?'':'closed'}"><div class="prod">
    <img src="${esc(p.foto_url||miNeg.foto_url||'')}" alt="">
    <div class="t"><div>${esc(p.nombre)}</div><div class="meta">${esc(p.descripcion||'')}</div><div class="p">${money(p.precio)}</div></div>
    <span class="chip ${p.disponible?'ok':'no'}">${p.disponible?'Disponible':'Agotado'}</span></div>
    <div style="display:flex;gap:8px;padding:0 12px 12px">
    <button class="btn sec" style="flex:1;padding:10px" onclick="npForm('${p.id}')">Editar</button>
    <button class="btn sec" style="flex:1;padding:10px" onclick="npDisp('${p.id}')">${p.disponible?'Marcar agotado':'Volver a poner'}</button></div></div>`).join('')
  ||'<div class="empty">Todavía no cargaste productos. Tocá "Agregar producto".</div>');
}
async function npDisp(id){
  const p=npProds.find(x=>x.id===id);
  const {error}=await sb.from('productos').update({disponible:!p.disponible}).eq('id',id);
  error?toast(error.message,1):renderProductos();
}
function npResize(file,max){
  return new Promise((ok,no)=>{
    const img=new Image(),u=URL.createObjectURL(file);
    img.onload=()=>{
      const k=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);
      c.toBlob(b=>b?ok(b):no(new Error('No pudimos procesar la foto')),'image/jpeg',0.82);
    };
    img.onerror=()=>no(new Error('No pudimos leer la foto'));
    img.src=u;
  });
}
function npForm(id){
  npBlob=null;
  const p=id?npProds.find(x=>x.id===id):{nombre:'',descripcion:'',precio:'',foto_url:''};
  const s=document.createElement('div');s.className='sheet';s.id='sheet';
  s.innerHTML=`<div><h3 style="margin-bottom:12px">${id?'Editar producto':'Nuevo producto'}</h3>
  <img id="npprev" src="${esc(p.foto_url||'')}" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:12px;margin-bottom:10px;background:#1d1d1d;${p.foto_url?'':'display:none'}">
  <input type="file" id="npfoto" accept="image/*" style="display:none">
  <button class="btn sec" style="margin-bottom:12px" onclick="document.getElementById('npfoto').click()">${p.foto_url?'Cambiar foto':'Elegir foto'}</button>
  <div class="meta">Nombre</div><input id="npn" value="${esc(p.nombre)}" placeholder="Ej: Milanesa napolitana">
  <div class="meta">Descripción (opcional)</div><input id="npd" value="${esc(p.descripcion||'')}" placeholder="Ej: Con papas fritas">
  <div class="meta">Precio en pesos</div><input id="npp" type="number" inputmode="numeric" value="${p.precio}" placeholder="Ej: 9500">
  <button class="btn" id="npgo">Guardar</button>
  ${id?'<button class="btn red" id="npdel">Eliminar producto</button>':''}
  <button class="btn sec" style="margin-top:8px" onclick="document.getElementById('sheet').remove()">Cancelar</button></div>`;
  document.body.appendChild(s);
  document.getElementById('npfoto').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    try{
      npBlob=await npResize(f,800);
      const pv=document.getElementById('npprev');pv.src=URL.createObjectURL(npBlob);pv.style.display='block';
    }catch(err){toast(err.message,1)}
  };
  document.getElementById('npgo').onclick=async e=>{
    const v=i=>document.getElementById(i).value.trim();
    const nombre=v('npn'),precio=Number(v('npp'));
    if(!nombre)return toast('Falta el nombre',1);
    if(v('npp')===''||!(precio>=0))return toast('Poné un precio válido',1);
    e.target.disabled=true;
    let foto=p.foto_url||null;
    if(npBlob){
      const ruta=miNeg.id+'/'+Date.now()+'.jpg';
      const up=await sb.storage.from('productos').upload(ruta,npBlob,{contentType:'image/jpeg'});
      if(up.error){e.target.disabled=false;return toast('No pudimos subir la foto: '+up.error.message,1)}
      foto=sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
    }
    const datos={nombre,descripcion:v('npd')||null,precio,foto_url:foto};
    const r=id?await sb.from('productos').update(datos).eq('id',id)
              :await sb.from('productos').insert({...datos,negocio_id:miNeg.id});
    if(r.error){e.target.disabled=false;return toast(r.error.message,1)}
    s.remove();toast(id?'Producto actualizado':'Producto agregado');renderProductos();
  };
  if(id)document.getElementById('npdel').onclick=async()=>{
    if(!confirm('¿Eliminar "'+p.nombre+'"? No se puede deshacer.'))return;
    const {error}=await sb.from('productos').delete().eq('id',id);
    if(error)return toast(error.message,1);
    s.remove();toast('Producto eliminado');renderProductos();
  };
}

/* --- Mi local: portada y datos del comercio --- */
function renderLocal(){
  const m=document.getElementById('nmain');if(!m)return;
  nlBlob=null;
  m.innerHTML=`<div class="card" style="padding:14px"><h3 style="margin-bottom:10px">${esc(miNeg.nombre)}</h3>
  <img id="nlprev" src="${esc(miNeg.foto_url||'')}" alt="" style="width:100%;height:150px;object-fit:cover;border-radius:12px;margin-bottom:10px;background:#1d1d1d;${miNeg.foto_url?'':'display:none'}">
  <input type="file" id="nlfoto" accept="image/*" style="display:none">
  <button class="btn sec" style="margin-bottom:12px" onclick="document.getElementById('nlfoto').click()">${miNeg.foto_url?'Cambiar foto de portada':'Elegir foto de portada'}</button>
  <div class="meta">Descripción</div><input id="nld" value="${esc(miNeg.descripcion||'')}" placeholder="Ej: Las mejores milanesas del barrio">
  <div class="meta">Teléfono</div><input id="nlt" type="tel" value="${esc(miNeg.telefono||'')}">
  <div class="meta">Costo de envío (pesos)</div><input id="nle" type="number" inputmode="numeric" value="${miNeg.costo_envio}">
  <div class="meta">Tiempo estimado de entrega (minutos)</div><input id="nlm" type="number" inputmode="numeric" value="${miNeg.tiempo_estimado_min}">
  <button class="btn" id="nlgo">Guardar cambios</button>
  <div class="meta" style="margin-top:10px">El nombre y la dirección del local los cambia el administrador.</div></div>`;
  document.getElementById('nlfoto').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    try{
      nlBlob=await npResize(f,1000);
      const pv=document.getElementById('nlprev');pv.src=URL.createObjectURL(nlBlob);pv.style.display='block';
    }catch(err){toast(err.message,1)}
  };
  document.getElementById('nlgo').onclick=async e=>{
    const v=i=>document.getElementById(i).value.trim();
    const envio=Number(v('nle')),min=parseInt(v('nlm'));
    if(v('nle')===''||!(envio>=0))return toast('Poné un costo de envío válido (puede ser 0)',1);
    if(!(min>=1))return toast('Poné el tiempo estimado en minutos',1);
    e.target.disabled=true;
    let foto=miNeg.foto_url||null;
    if(nlBlob){
      const ruta=miNeg.id+'/portada-'+Date.now()+'.jpg';
      const up=await sb.storage.from('productos').upload(ruta,nlBlob,{contentType:'image/jpeg'});
      if(up.error){e.target.disabled=false;return toast('No pudimos subir la foto: '+up.error.message,1)}
      foto=sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
    }
    const {data,error}=await sb.from('negocios').update({descripcion:v('nld')||null,telefono:v('nlt')||null,costo_envio:envio,tiempo_estimado_min:min,foto_url:foto}).eq('id',miNeg.id).select().single();
    e.target.disabled=false;
    if(error)return toast(error.message,1);
    miNeg=data;toast('Datos del local guardados');renderLocal();
  };
  if(window.npHorario)npHorario(m);
}

/* --- Ventas --- */
function nvSet(r){nvRango=r;renderVentas()}
async function renderVentas(){
  const m=document.getElementById('nmain');if(!m)return;
  m.innerHTML='<div class="empty">Cargando…</div>';
  const dias=nvRango==='hoy'?1:nvRango==='7'?7:30;
  const desde=new Date();desde.setHours(0,0,0,0);desde.setDate(desde.getDate()-(dias-1));
  const {data,error}=await sb.from('pedidos').select('estado,subtotal,items,created_at').eq('negocio_id',miNeg.id).gte('created_at',desde.toISOString()).order('created_at',{ascending:false}).limit(1000);
  if(error)return m.innerHTML='<div class="empty">No pudimos cargar las ventas.</div>';
  const ent=data.filter(p=>p.estado==='entregado');
  const vend=ent.reduce((s,p)=>s+Number(p.subtotal),0);
  const ticket=ent.length?vend/ent.length:0;
  const perdidos=data.filter(p=>['rechazado','cancelado'].includes(p.estado)).length;
  const acum={};
  ent.forEach(p=>p.items.forEach(i=>{
    const a=acum[i.nombre]||(acum[i.nombre]={c:0,t:0});
    a.c+=Number(i.cantidad);a.t+=Number(i.precio)*Number(i.cantidad);
  }));
  const mas=Object.entries(acum).sort((a,b)=>b[1].c-a[1].c).slice(0,5);
  const porDia=[];
  for(let i=0;i<dias;i++){const d=new Date(desde);d.setDate(d.getDate()+i);porDia.push({d,t:0})}
  ent.forEach(p=>{
    const d=new Date(p.created_at);d.setHours(0,0,0,0);
    const x=porDia.find(y=>y.d.getTime()===d.getTime());if(x)x.t+=Number(p.subtotal);
  });
  const max=Math.max(1,...porDia.map(x=>x.t));
  const k=(v,t)=>`<div style="flex:1"><div style="font-size:20px;font-weight:800;color:var(--g)">${v}</div><div class="meta">${t}</div></div>`;
  const btn=(r,t)=>`<button class="${nvRango===r?'on':''}" onclick="nvSet('${r}')">${t}</button>`;
  m.innerHTML=`<div class="tabs" style="margin:0 0 12px">${btn('hoy','Hoy')}${btn('7','7 días')}${btn('30','30 días')}</div>
  <div class="card" style="padding:14px"><div style="display:flex;gap:8px;text-align:center">${k(money(vend),'Vendido (sin envío)')}${k(ent.length,ent.length===1?'Pedido entregado':'Pedidos entregados')}${k(money(Math.round(ticket)),'Ticket promedio')}</div>
  <div class="meta" style="text-align:center;margin-top:10px">Rechazados o cancelados: ${perdidos}</div></div>
  ${dias>1?`<div class="card" style="padding:14px"><div class="meta" style="margin:0 0 8px">Ventas por día</div>
  <div style="display:flex;align-items:flex-end;gap:3px;height:100px">${porDia.map(x=>`<div style="flex:1;height:100%;display:flex;align-items:flex-end"><div style="width:100%;background:var(--g);border-radius:4px 4px 0 0;height:${Math.round(x.t/max*100)}%;min-height:${x.t?3:0}px"></div></div>`).join('')}</div>
  ${dias===7?`<div style="display:flex;gap:3px">${porDia.map(x=>`<div class="meta" style="flex:1;text-align:center;font-size:11px">${x.d.toLocaleDateString('es-AR',{weekday:'short'}).slice(0,2)}</div>`).join('')}</div>`:''}</div>`:''}
  <div class="card" style="padding:14px"><h3 style="margin-bottom:8px">Lo más pedido</h3>
  ${mas.map((x,i)=>`<div class="row"><span>${i+1}. ${esc(x[0])}</span><span><b>${x[1].c}</b> <span class="meta">· ${money(x[1].t)}</span></span></div>`).join('')||'<div class="meta">Todavía no hay ventas en este período.</div>'}</div>`;
        }
