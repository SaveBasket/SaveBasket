import { cloud } from './cloud.js';

const $=(s)=>document.querySelector(s);
const toast=(message)=>{const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(window.__luxeToast);window.__luxeToast=setTimeout(()=>el.classList.remove('show'),2600);};
const state=()=>{try{return JSON.parse(localStorage.getItem('luxe-studio')||'{}')}catch{return {}}};
const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

function installToolbar(){
  const top=document.querySelector('.top');
  if(!top||document.querySelector('#luxeCloud'))return;
  const exportButton=document.querySelector('#export');
  const cloudButton=document.createElement('button');cloudButton.className='btn';cloudButton.id='luxeCloud';cloudButton.textContent=cloud.enabled?'CLOUD':'LOCAL';cloudButton.title=cloud.enabled?'Cloud projects':'Cloud not configured';
  const importButton=document.createElement('button');importButton.className='btn';importButton.id='luxeImport';importButton.textContent='IMPORT';
  const input=document.createElement('input');input.type='file';input.accept='.json,.luxe.json,application/json';input.hidden=true;input.id='luxeImportInput';
  importButton.onclick=()=>input.click();
  input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!parsed||typeof parsed!=='object'||!Array.isArray(parsed.steps))throw new Error('Invalid Luxe project file');localStorage.setItem('luxe-studio',JSON.stringify({...parsed,playing:false,rec:false}));location.reload();}catch(error){toast(error.message||'Project import failed');}finally{input.value='';}};
  cloudButton.onclick=cloud.enabled?openCloud:()=>toast('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud projects.');
  if(exportButton){exportButton.parentNode.insertBefore(importButton,exportButton);exportButton.parentNode.insertBefore(cloudButton,exportButton);}else top.append(importButton,cloudButton);
}

async function openCloud(){
  const modal=$('#modal');if(!modal)return;
  let session=await cloud.session();
  if(!session){
    modal.innerHTML='<div class="dialog"><div class="eyebrow">LUXE CLOUD</div><h2>Save your studio.</h2><p>Sign in to sync projects, patterns and mixer settings across devices.</p><input id="cloudEmail" type="email" placeholder="Email" autocomplete="email"><input id="cloudPassword" type="password" placeholder="Password (8+ characters)" autocomplete="current-password"><div class="dialog-actions"><button class="btn" id="cloudClose">CANCEL</button><button class="btn" id="cloudSignup">CREATE ACCOUNT</button><button class="btn gold" id="cloudSignin">SIGN IN</button></div></div>';
    modal.classList.add('open');
    $('#cloudClose').onclick=()=>modal.classList.remove('open');
    $('#cloudSignin').onclick=async()=>{try{session=await cloud.signIn($('#cloudEmail').value.trim(),$('#cloudPassword').value);modal.classList.remove('open');await openCloud();}catch(e){toast(e.message||'Sign in failed');}};
    $('#cloudSignup').onclick=async()=>{try{const s=await cloud.signUp($('#cloudEmail').value.trim(),$('#cloudPassword').value);modal.classList.remove('open');toast(s?'Account created and signed in.':'Account created — check your email if confirmation is required.');}catch(e){toast(e.message||'Account creation failed');}};
    return;
  }
  const projects=await cloud.listProjects();
  modal.innerHTML='<div class="dialog"><div class="eyebrow">LUXE CLOUD</div><h2>Project vault</h2><p>Signed in as '+String(session.user.email||'user').replace(/[<>]/g,'')+'</p><div id="cloudProjects" class="browser"></div><div class="dialog-actions"><button class="btn" id="cloudSignout">SIGN OUT</button><button class="btn gold" id="cloudSave">SAVE CURRENT</button></div></div>';
  modal.classList.add('open');
  const list=$('#cloudProjects');
  list.innerHTML=projects.length?projects.map(p=>`<button class="browserrow" data-project="${p.id}">${escapeHtml(p.name)} <span>v${p.version}</span></button>`).join(''):'<div class="browserrow">No cloud projects yet.</div>';
  document.querySelectorAll('[data-project]').forEach(button=>button.onclick=async()=>{try{const p=await cloud.loadProject(button.dataset.project);localStorage.setItem('luxe-studio',JSON.stringify({...p.data,project:p.name,playing:false,rec:false}));location.reload();}catch(e){toast(e.message||'Cloud load failed');}});
  $('#cloudSignout').onclick=async()=>{await cloud.signOut();modal.classList.remove('open');toast('Signed out of Luxe Cloud');};
  $('#cloudSave').onclick=async()=>{try{const current=state();await cloud.saveProject(current.project||'Untitled Luxe Project',current);toast('Project saved to Luxe Cloud');await openCloud();}catch(e){toast(e.message||'Cloud save failed');}};
}

function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function installPwa(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='./manifest.webmanifest';document.head.appendChild(manifest);
}

function bootEnhancements(){installToolbar();installPwa();window.addEventListener('load',installToolbar);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootEnhancements);else bootEnhancements();
