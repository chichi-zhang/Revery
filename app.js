(function(){
  var KEY='qt_agent_home_v1';
  var fallbackAvatar='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8f72ff"/><stop offset="1" stop-color="#e66ca6"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="78" r="38" fill="#fff" opacity=".9"/><path d="M38 190c6-49 31-74 62-74s56 25 62 74" fill="#fff" opacity=".9"/></svg>');
  var defaults={profile:{brand:'bewitchment',name:'Ongengia ♡',bio:'link to your executive character',location:'📍 Your private universe',avatar:fallbackAvatar},api:{name:'',base:'',key:'',model:''},characters:[
    {id:'xie',name:'谢尽欢',avatar:fallbackAvatar,greeting:'你终于来了，我刚才还在等你。',prompt:'',unread:2,messages:[{role:'assistant',text:'你终于来了，我刚才还在等你。',time:'14:17'}]},
    {id:'daddy',name:'我家那daddy',avatar:fallbackAvatar,greeting:'今天确实是个好天气。',prompt:'',unread:0,messages:[{role:'assistant',text:'今天确实是个好天气。',time:'昨天'}]},
    {id:'sheng',name:'生生',avatar:fallbackAvatar,greeting:'要不要跟我聊一会儿？',prompt:'',unread:1,messages:[{role:'assistant',text:'要不要跟我聊一会儿？',time:'星期五'}]}
  ]};
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function load(){try{var x=JSON.parse(localStorage.getItem(KEY));return x&&x.profile&&x.characters?x:clone(defaults)}catch(e){return clone(defaults)}}
  var state=load(),activeId=null;
  function save(){localStorage.setItem(KEY,JSON.stringify(state))}
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(function(){$('toast').classList.remove('show')},1800)}
  function render(){var p=state.profile;$('brand').textContent=p.brand;$('profileName').textContent=p.name;$('profileBio').textContent=p.bio;$('profileLocation').textContent=p.location;$('profileAvatar').src=p.avatar||fallbackAvatar;$('statRoles').textContent=state.characters.length;var total=0;state.characters.forEach(function(c){total+=c.messages.length});$('statChats').textContent=total;
    $('stories').innerHTML=state.characters.map(function(c){return '<button class="story" data-id="'+c.id+'"><span class="ring"><img src="'+esc(c.avatar||fallbackAvatar)+'"></span><span>'+esc(c.name)+'</span></button>'}).join('')+'<button class="story" data-add="1"><span class="ring" style="font-size:28px">＋</span><span>添加角色</span></button>';
    $('chatList').innerHTML=state.characters.length?state.characters.map(function(c){var m=c.messages[c.messages.length-1]||{text:c.greeting,time:''};return '<button class="chat-item" data-id="'+c.id+'"><img src="'+esc(c.avatar||fallbackAvatar)+'"><span><span class="chat-name">'+esc(c.name)+'</span><span class="preview">'+esc(m.text)+'</span></span><span class="meta">'+esc(m.time||'')+(c.unread?'<span class="badge">'+c.unread+'</span>':'')+'</span></button>'}).join(''):'<div class="empty">还没有角色卡，点右上角的 ＋ 添加一个。</div>';
  }
  function openDrawer(){$('drawer').classList.add('open')}
  function closeDrawer(){$('drawer').classList.remove('open')}
  function showModal(id){closeDrawer();$(id).classList.add('show')}
  function closeModals(){document.querySelectorAll('.modal').forEach(function(x){x.classList.remove('show')})}
  function character(id){return state.characters.find(function(c){return c.id===id})}
  function openChat(id){var c=character(id);if(!c)return;activeId=id;c.unread=0;save();render();$('chatAvatar').src=c.avatar||fallbackAvatar;$('chatName').textContent=c.name;renderMessages(c);$('chatPage').classList.add('show')}
  function renderMessages(c){$('messages').innerHTML=c.messages.map(function(m){return '<div class="bubble '+(m.role==='user'?'me':'them')+'">'+esc(m.text)+'</div>'}).join('');setTimeout(function(){$('messages').scrollTop=$('messages').scrollHeight},0)}
  function time(){var d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  $('menuBtn').onclick=openDrawer;$('chatMenuBtn').onclick=openDrawer;$('shade').onclick=closeDrawer;$('closeDrawer').onclick=closeDrawer;$('backBtn').onclick=function(){$('chatPage').classList.remove('show');activeId=null};
  $('addBtn').onclick=function(){showModal('characterModal')};$('navAdd').onclick=function(){showModal('characterModal')};$('manageBtn').onclick=openDrawer;$('editProfileBtn').onclick=function(){fillProfile();showModal('profileModal')};
  $('chatList').onclick=function(e){var b=e.target.closest('[data-id]');if(b)openChat(b.dataset.id)};$('stories').onclick=function(e){var b=e.target.closest('[data-id],[data-add]');if(!b)return;b.dataset.add?showModal('characterModal'):openChat(b.dataset.id)};
  document.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){if(b.dataset.open==='api'){fillApi();showModal('apiModal')}if(b.dataset.open==='profile'){fillProfile();showModal('profileModal')}if(b.dataset.open==='character')showModal('characterModal')}});document.querySelectorAll('.close-modal').forEach(function(b){b.onclick=closeModals});document.querySelectorAll('.modal').forEach(function(m){m.onclick=function(e){if(e.target===m)closeModals()}});
  function fillApi(){var a=state.api||{};$('apiName').value=a.name||'';$('apiBase').value=a.base||'';$('apiKey').value=a.key||'';$('apiModel').value=a.model||''}
  $('saveApi').onclick=function(){state.api={name:$('apiName').value.trim(),base:$('apiBase').value.trim(),key:$('apiKey').value,model:$('apiModel').value.trim()};save();closeModals();toast('API 配置已保存在本机')};
  function fillProfile(){var p=state.profile;$('editBrand').value=p.brand;$('editName').value=p.name;$('editBio').value=p.bio;$('editLocation').value=p.location;$('editAvatar').value=p.avatar===fallbackAvatar?'':p.avatar}
  $('saveProfile').onclick=function(){state.profile={brand:$('editBrand').value.trim()||'home',name:$('editName').value.trim()||'未命名',bio:$('editBio').value.trim(),location:$('editLocation').value.trim(),avatar:$('editAvatar').value.trim()||fallbackAvatar};save();render();closeModals();toast('主页已更新')};
  $('saveCharacter').onclick=function(){var name=$('charName').value.trim();if(!name){toast('先写角色名称');return}var greeting=$('charGreeting').value.trim()||'你好，我们开始聊天吧。';state.characters.unshift({id:'c'+Date.now(),name:name,avatar:$('charAvatar').value.trim()||fallbackAvatar,greeting:greeting,prompt:$('charPrompt').value.trim(),unread:0,messages:[{role:'assistant',text:greeting,time:time()}]});save();render();['charName','charAvatar','charGreeting','charPrompt'].forEach(function(id){$(id).value=''});closeModals();toast('角色已加入聊天列表')};
  $('composer').onsubmit=function(e){e.preventDefault();var text=$('messageInput').value.trim(),c=character(activeId);if(!text||!c)return;c.messages.push({role:'user',text:text,time:time()});$('messageInput').value='';save();renderMessages(c);render();setTimeout(function(){c.messages.push({role:'assistant',text:'这是本地原型回复。配置 API 并接入后端后，我会真正按照角色设定回答。',time:time()});save();renderMessages(c);render()},500)};
  $('shareBtn').onclick=function(){if(navigator.share)navigator.share({title:state.profile.brand,text:state.profile.bio,url:location.href}).catch(function(){});else toast('本地页面暂时无法生成公开分享链接')};$('moreBtn').onclick=openDrawer;
  $('exportBtn').onclick=function(){var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='qt-agent-home-backup.json';a.click();URL.revokeObjectURL(a.href);toast('备份已导出')};
  $('clearBtn').onclick=function(){if(confirm('确定恢复为演示数据吗？')){state=clone(defaults);save();render();closeDrawer();toast('已恢复演示数据')}};
  var sx=0,sy=0,tracking=false;document.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY;tracking=sx<44},{passive:true});document.addEventListener('touchend',function(e){if(!tracking)return;var t=e.changedTouches[0],dx=t.clientX-sx,dy=Math.abs(t.clientY-sy);if(dx>72&&dy<70)openDrawer();tracking=false},{passive:true});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeDrawer();closeModals();$('chatPage').classList.remove('show')}});render();
})();