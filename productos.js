/* ===== PRODUCTOS DEL COMERCIO ===== */
let npTab='pedidos',npProds=[],npBlob=null;

document.addEventListener('DOMContentLoaded',()=>{
  const _ns=negocioShell;
  negocioShell=async function(){
    npTab='pedidos';
    await _ns();
    const n=document.getElementById('nmain');if(!n||!miNeg)return;
    n.insertAdjacentHTML('beforebegin','<div class="wrap" style="padding-top:14px"><div class="tabs" style="margin:0"><button id="np1" class="on" onclick="npSet(\'pedidos\')">Pedidos</button><button id="np2" onclick="npSet(\'productos\')">Productos</button></div></div>');
  };
  const _rn=renderNegPedidos;
  renderNegPedidos=async function(){
    if(npTab!=='pedidos'){
      const b=document.getElementById('np1');
      if(b&&b.textContent.indexOf('•')<0)b.textContent='Pedidos •';
      return;
    }
    return _rn();
  };
});

function npSet(t){
  npTab=t;
  document.getElementById('np1').className=t==='pedidos'?'on':'';
  document.getElementById('np2').className=t==='productos'?'on':'';
  document.getElementById('np1').textContent='Pedidos';
  t==='pedidos'?renderNegPedidos():renderProductos();
}

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
