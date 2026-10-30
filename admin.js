/* ===== PANEL DEL DUEÑO ===== */
document.head.insertAdjacentHTML('beforeend','<style>.sel{flex:1;width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--tx)}</style>');
let aUsers=[],aNegs=[],aCiu=[];
const ROLES=['CLIENTE','NEGOCIO','CADETE','MUNI'];
async function duenoShell(){
  app.innerHTML=`<header><div class="wrap"><div class="logo">PEDI <b>GO</b> <span class="meta">Admin</span></div><button class="link" onclick="salir()">Salir</button></div></header>
  <div class="wrap"><div class="tabs"><button id="a1" onclick="aSet('usuarios')">Usuarios</button><button id="a2" onclick="aSet('comercios')">Comercios</button><button id="a3" onclick="aSet('pedidos')">Pedidos</button></div><div id="amain"></div></div>`;
  if(ch){sb.removeChannel(ch);ch=null}
  aSet('usuarios');
}
async function aSet(t){
  ['usuarios','comercios','pedidos'].forEach((x,i)=>document.getElementById('a'+(i+1)).className=x===t?'on':'');
  const m=document.getElementById('amain');m.innerHTML='<div class="empty">Cargando…</div>';
  const [u,n,c]=await Promise.all([sb.from('perfiles').select('*').order('created_at',{ascending:false}),sb.from('negocios').select('*').order('nombre'),sb.from('ciudades').select('*')]);
  if(u.error||n.error||c.error)return m.innerHTML='<div class="empty">No pudimos cargar los datos.</div>';
  aUsers=u.data;aNegs=n.data;aCiu=c.data;
  t==='usuarios'?aUsuarios():t==='comercios'?aComercios():aPedidos();
}
function aUsuarios(){
  const ciu=aCiu.map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  document.getElementById('amain').innerHTML=aUsers.map(u=>`<div class="card" style="padding:14px"><div class="row"><b>${esc(u.nombre||'Sin nombre')}</b><span class="chip ${u.rol==='DUENO'?'ok':''}">${u.rol}</span></div>
  <div class="meta">${esc(u.email||'')}${u.telefono?' · '+esc(u.telefono):''}</div>
  ${u.rol==='DUENO'?'':`<div style="display:flex;gap:8px;margin-top:10px"><select id="r${u.id}" class="sel">${ROLES.map(r=>`<option ${r===u.rol?'selected':''}>${r}</option>`).join('')}</select>
  <select id="c${u.id}" class="sel">${u.ciudad_id?ciu.replace(`value="${u.ciudad_id}"`,`value="${u.ciudad_id}" selected`):ciu}</select></div>
  <button class="btn sec" style="margin-top:8px" onclick="aGuardarRol('${u.id}')">Guardar rol</button>`}</div>`).join('');
}
async function aGuardarRol(id){
  const rol=document.getElementById('r'+id).value,ciu=document.getElementById('c'+id).value;
  const {error}=await sb.rpc('dueno_set_rol',{p_id:id,p_rol:rol,p_ciudad:ciu});
  if(error)return toast(error.message,1);
  toast('Rol guardado');aSet('usuarios');
}
function aComercios(){
  const duenos=aUsers.filter(u=>['NEGOCIO','CLIENTE'].includes(u.rol));
  document.getElementById('amain').innerHTML=aNegs.map(n=>{
    const o=aUsers.find(u=>u.id===n.owner_id);
    return `<div class="card" style="padding:14px"><div class="row"><b>${esc(n.nombre)}</b><span class="chip ${n.activo?'ok':'no'}">${n.activo?'Habilitado':'Suspendido'}</span></div>
    <div class="meta">${esc(n.rubro)} · ${esc(n.direccion||'')}</div><div class="meta">Dueño: ${o?esc(o.email):'sin asignar'}</div>
    <select id="o${n.id}" class="sel" style="margin-top:10px"><option value="">Elegí un usuario…</option>${duenos.map(u=>`<option value="${u.id}">${esc(u.email)}</option>`).join('')}</select>
    <button class="btn sec" style="margin-top:8px" onclick="aAsignar('${n.id}')">Asignar dueño</button>
    <button class="btn red" onclick="aActivo('${n.id}',${!n.activo})">${n.activo?'Suspender comercio':'Habilitar comercio'}</button></div>`}).join('');
}
async function aAsignar(id){
  const v=document.getElementById('o'+id).value;
  if(!v)return toast('Elegí un usuario',1);
  const {error}=await sb.rpc('dueno_asignar_negocio',{p_negocio:id,p_owner:v});
  if(error)return toast(error.message,1);
  toast('Dueño asignado');aSet('comercios');
}
async function aActivo(id,v){
  const {error}=await sb.rpc('dueno_negocio_activo',{p_id:id,p_activo:v});
  if(error)return toast(error.message,1);
  aSet('comercios');
}
async function aPedidos(){
  const m=document.getElementById('amain');
  const {data,error}=await sb.from('pedidos').select('*, negocios(nombre)').order('created_at',{ascending:false}).limit(40);
  if(error)return m.innerHTML='<div class="empty">No pudimos cargar los pedidos.</div>';
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const h=data.filter(p=>new Date(p.created_at)>=hoy);
  const vend=h.filter(p=>p.estado==='entregado').reduce((s,p)=>s+Number(p.total),0);
  m.innerHTML=`<div class="card" style="padding:14px"><div class="meta">Hoy</div><div style="font-size:28px;font-weight:800;color:var(--g)">${h.length} ${h.length===1?'pedido':'pedidos'}</div><div class="meta">Entregados por ${money(vend)}</div></div>`
  +(data.map(p=>`<div class="card" style="padding:14px"><div class="row"><b>${esc(p.negocios?.nombre||'')}</b><span class="chip">${ESTADOS[p.estado]}</span></div><div class="meta">Pedido ${p.numero} · ${esc(p.cliente_nombre)} · ${money(p.total)}</div></div>`).join('')||'<div class="empty">Todavía no hay pedidos.</div>');
}
