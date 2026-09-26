(function(){
  var KEY = 'revery_data_v2', LEGACY_KEY = 'qt_agent_home_v1';
  var fallbackAvatar = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8f72ff"/><stop offset="1" stop-color="#e66ca6"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="78" r="38" fill="#fff" opacity=".9"/><path d="M38 190c6-49 31-74 62-74s56 25 62 74" fill="#fff" opacity=".9"/></svg>');
  var defaults = {
    profile: {
      brand: 'Revery',
      name: 'Ongengia ♡',
      bio: 'link to your executive character',
      location: '📍 Your private universe',
      avatar: fallbackAvatar
    },
    api: { name: '', base: '', key: '', model: '' },
    settings: { theme: 'dark' },
    characters: [
      {
        id: 'xie',
        name: '谢尽欢',
        avatar: fallbackAvatar,
        greeting: '你终于来了，我刚才还在等你。',
        prompt: '',
        unread: 2,
        messages: [{ role: 'assistant', text: '你终于来了，我刚才还在等你。', time: '14:17' }]
      },
      {
        id: 'daddy',
        name: '我家那daddy',
        avatar: fallbackAvatar,
        greeting: '今天确实是个好天气。',
        prompt: '',
        unread: 0,
        messages: [{ role: 'assistant', text: '今天确实是个好天气。', time: '昨天' }]
      },
      {
        id: 'sheng',
        name: '生生',
        avatar: fallbackAvatar,
        greeting: '要不要跟我聊一会儿？',
        prompt: '',
        unread: 1,
        messages: [{ role: 'assistant', text: '要不要跟我聊一会儿？', time: '星期五' }]
      }
    ]
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
      var x = raw ? JSON.parse(raw) : null;
      if (x && x.profile && x.characters) {
        x.settings = x.settings || { theme: 'dark' };
        if (!localStorage.getItem(KEY) && x.profile.brand === 'bewitchment') x.profile.brand = 'Revery';
        return x;
      }
      return clone(defaults);
    } catch(e) {
      return clone(defaults);
    }
  }

  var state = load(), activeId = null, deferredInstall = null;
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '"', "'": '&#39;' }[c];
    });
  }
  function toast(t) {
    var el = $('toast');
    el.textContent = t;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 1800);
  }

  function fileData(input, done) {
    var f = input && input.files && input.files[0];
    if (!f) { done(''); return; }
    if (f.size > 5 * 1024 * 1024) { toast('图片请控制在 5MB 以内'); done(''); return; }
    var r = new FileReader();
    r.onload = function() { done(r.result); };
    r.onerror = function() { toast('读取图片失败'); done(''); };
    r.readAsDataURL(f);
  }

  function applyTheme() {
    var theme = (state.settings && state.settings.theme) || 'dark';
    document.documentElement.dataset.theme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#f7f6fb' : '#0a0a0b';
    var b = $('themeBtn');
    if (b) {
      var span = b.querySelector('span');
      if (span) span.textContent = theme === 'light' ? '切换夜间版本' : '切换日间版本';
    }
  }

  function render() {
    var p = state.profile;
    $('brand').textContent = p.brand;
    $('profileName').textContent = p.name;
    $('profileBio').textContent = p.bio;
    $('profileLocation').textContent = p.location;
    $('profileAvatar').src = p.avatar || fallbackAvatar;
    $('statRoles').textContent = state.characters.length;
    var total = 0;
    state.characters.forEach(function(c) { total += c.messages.length; });
    $('statChats').textContent = total;

    $('stories').innerHTML = state.characters.map(function(c) {
      return '<button class="story" data-id="' + c.id + '">' +
        '<span class="ring"><img src="' + esc(c.avatar || fallbackAvatar) + '"></span>' +
        '<span>' + esc(c.name) + '</span>' +
        '</button>';
    }).join('') + '<button class="story" data-add="1"><span class="ring" style="font-size:28px">＋</span><span>添加角色</span></button>';

    $('chatList').innerHTML = state.characters.length ? state.characters.map(function(c) {
      var m = c.messages[c.messages.length - 1] || { text: c.greeting, time: '' };
      return '<button class="chat-item" data-id="' + c.id + '">' +
        '<img src="' + esc(c.avatar || fallbackAvatar) + '" alt="' + esc(c.name) + '">' +
        '<div class="chat-info">' +
          '<div class="chat-name">' + esc(c.name) + '</div>' +
          '<div class="preview">' + esc(m.text) + '</div>' +
        '</div>' +
        '</button>';
    }).join('') : '<div class="empty">还没有角色卡，点右上角的 ＋ 添加一个。</div>';
  }

  function openDrawer() { $('drawer').classList.add('open'); }
  function closeDrawer() { $('drawer').classList.remove('open'); }
  function showModal(id) { closeDrawer(); $(id).classList.add('show'); }
  function closeModals() {
    document.querySelectorAll('.modal').forEach(function(x) { x.classList.remove('show'); });
  }

  function character(id) {
    return state.characters.find(function(c) { return c.id === id; });
  }

  function openChat(id) {
    var c = character(id);
    if (!c) return;
    activeId = id;
    c.unread = 0;
    save();
    render();
    $('chatAvatar').src = c.avatar || fallbackAvatar;
    $('chatName').textContent = c.name;
    applyChatCustomTheme(c);
    renderMessages(c);
    if ($('plusPanel')) $('plusPanel').classList.remove('open');
    $('chatPage').classList.add('show');
  }

  function renderMessages(c) {
    var myAvatar = state.profile.avatar || fallbackAvatar;
    var theirAvatar = c.avatar || fallbackAvatar;
    $('messages').innerHTML = c.messages.map(function(m) {
      var isMe = (m.role === 'user');
      var avatar = isMe ? myAvatar : theirAvatar;
      var timeStr = m.time || '';
      return '<div class="cv-msg-row" data-sender="' + (isMe ? 'me' : 'them') + '">' +
        (!isMe ? '<div class="cv-avatar-slot"><img src="' + avatar + '" alt="avatar"></div>' : '') +
        '<div class="cv-msg-content">' +
          '<div class="bubble ' + (isMe ? 'me cv-bubble-user' : 'them cv-bubble-ai') + '" data-message-type="text">' + esc(m.text) + '</div>' +
          (timeStr ? '<span class="cv-bubble-time ' + (isMe ? 'cv-bubble-time-user' : 'cv-bubble-time-ai') + '">' + timeStr + '</span>' : '') +
        '</div>' +
        (isMe ? '<div class="cv-avatar-slot"><img src="' + avatar + '" alt="avatar"></div>' : '') +
      '</div>';
    }).join('');
    setTimeout(function() { $('messages').scrollTop = $('messages').scrollHeight; }, 0);
  }

  function time() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  $('menuBtn').onclick = openDrawer;
  $('chatMenuBtn').onclick = function() {
    var c = character(activeId);
    if (!c) return;
    $('chatCustomAvatar').value = c.avatar || '';
    $('chatCustomBg').value = c.customBg || '';
    $('chatCustomCss').value = c.customCss || '';
    showModal('chatThemeModal');
  };
  $('shade').onclick = closeDrawer;
  $('closeDrawer').onclick = closeDrawer;
  
  // 切换加号多功能面板
  $('plusBtn').onclick = function() {
    $('plusPanel').classList.toggle('open');
  };
  // 点击加号项
  $('plusPanel').onclick = function(e) {
    var item = e.target.closest('[data-action]');
    if (!item) return;
    var act = item.dataset.action;
    $('plusPanel').classList.remove('open');
    if (act === 'image') toast('发送图片功能即将接入');
    if (act === 'video') toast('发送视频功能即将接入');
    if (act === 'sticker') toast('发送表情包功能即将接入');
  };
  // 通话按钮
  $('chatCallBtn').onclick = function() { toast('语音通话即将接入'); };
  $('chatVideoBtn').onclick = function() { toast('视频通话即将接入'); };
  // API 回复按钮
  $('apiReplyBtn').onclick = function() {
    var c = character(activeId);
    if (!c) return;
    toast('正在请求 API 回复……');
    requestReply(c);
  };

  $('backBtn').onclick = function() {
    $('chatPage').classList.remove('show');
    activeId = null;
  };

  $('addBtn').onclick = function() { showModal('characterModal'); };
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.onclick = function() {
      if (b.dataset.tab === 'home') return;
      toast(b.textContent.trim() + '即将接入');
    };
  });
  $('manageBtn').onclick = openDrawer;
  $('editProfileBtn').onclick = function() {
    fillProfile();
    showModal('profileModal');
  };

  $('chatList').onclick = function(e) {
    var b = e.target.closest('[data-id]');
    if (b) openChat(b.dataset.id);
  };

  $('stories').onclick = function(e) {
    var b = e.target.closest('[data-id],[data-add]');
    if (!b) return;
    b.dataset.add ? showModal('characterModal') : openChat(b.dataset.id);
  };

  document.querySelectorAll('[data-open]').forEach(function(b) {
    b.onclick = function() {
      if (b.dataset.open === 'api') { fillApi(); showModal('apiModal'); }
      if (b.dataset.open === 'profile') { fillProfile(); showModal('profileModal'); }
      if (b.dataset.open === 'character') showModal('characterModal');
    };
  });

  document.querySelectorAll('.close-modal').forEach(function(b) { b.onclick = closeModals; });
  document.querySelectorAll('.modal').forEach(function(m) {
    m.onclick = function(e) { if (e.target === m) closeModals(); };
  });

  function fillApi() {
    var a = state.api || {};
    $('apiName').value = a.name || '';
    $('apiBase').value = a.base || '';
    $('apiKey').value = a.key || '';
    $('apiModel').value = a.model || '';
  }

  
  function applyChatCustomTheme(c) {
    var styleTag = $('ReveryCustomChatStyle');
    if (styleTag) {
      styleTag.textContent = c && c.customCss ? c.customCss : '';
    }
    var msgBox = $('messages');
    if (msgBox) {
      if (c && c.customBg) {
        msgBox.style.backgroundImage = 'url(' + c.customBg + ')';
      } else {
        msgBox.style.backgroundImage = '';
      }
    }
  }

  $('saveChatTheme').onclick = function() {
    var c = character(activeId);
    if (!c) return;
    c.avatar = $('chatCustomAvatar').value.trim() || c.avatar || fallbackAvatar;
    c.customBg = $('chatCustomBg').value.trim();
    c.customCss = $('chatCustomCss').value.trim();
    save();
    render();
    $('chatAvatar').src = c.avatar;
    applyChatCustomTheme(c);
    hideModal('chatThemeModal');
    toast('聊天美化与设置已保存');
  };

  $('saveApi').onclick = function() {
    state.api = {
      name: $('apiName').value.trim(),
      base: $('apiBase').value.trim(),
      key: $('apiKey').value,
      model: $('apiModel').value.trim()
    };
    save();
    closeModals();
    toast('API 配置已保存在本机');
  };

  function fillProfile() {
    var p = state.profile;
    $('editBrand').value = p.brand;
    $('editName').value = p.name;
    $('editBio').value = p.bio;
    $('editLocation').value = p.location;
    $('editAvatar').value = p.avatar === fallbackAvatar ? '' : p.avatar;
    if ($('editAvatarFile')) $('editAvatarFile').value = '';
  }

  $('saveProfile').onclick = function() {
    fileData($('editAvatarFile'), function(img) {
      state.profile = {
        brand: $('editBrand').value.trim() || 'Revery',
        name: $('editName').value.trim() || '未命名',
        bio: $('editBio').value.trim(),
        location: $('editLocation').value.trim(),
        avatar: img || $('editAvatar').value.trim() || state.profile.avatar || fallbackAvatar
      };
      save();
      render();
      closeModals();
      toast('主页已更新');
    });
  };

  $('saveCharacter').onclick = function() {
    var name = $('charName').value.trim();
    if (!name) { toast('先写角色名称'); return; }
    var greeting = $('charGreeting').value.trim() || '你好，我们开始聊天吧。';
    fileData($('charAvatarFile'), function(img) {
      state.characters.unshift({
        id: 'c' + Date.now(),
        name: name,
        avatar: img || $('charAvatar').value.trim() || fallbackAvatar,
        greeting: greeting,
        prompt: $('charPrompt').value.trim(),
        unread: 0,
        messages: [{ role: 'assistant', text: greeting, time: time() }]
      });
      save();
      render();
      ['charName', 'charAvatar', 'charGreeting', 'charPrompt'].forEach(function(id) { $(id).value = ''; });
      if ($('charAvatarFile')) $('charAvatarFile').value = '';
      closeModals();
      toast('角色已加入聊天列表');
    });
  };

  $('composer').onsubmit = function(e) {
    e.preventDefault();
    var text = $('messageInput').value.trim(), c = character(activeId);
    if (!text || !c) return;
    c.messages.push({ role: 'user', text: text, time: time() });
    $('messageInput').value = '';
    save();
    renderMessages(c);
    if ($('plusPanel')) $('plusPanel').classList.remove('open');
    render();
    setTimeout(function() {
      c.messages.push({
        role: 'assistant',
        text: '这是本地原型回复。配置 API 并接入后端后，我会真正按照角色设定回答。',
        time: time()
      });
      save();
      renderMessages(c);
    if ($('plusPanel')) $('plusPanel').classList.remove('open');
      render();
    }, 500);
  };

  $('shareBtn').onclick = function() {
    if (navigator.share) {
      navigator.share({
        title: state.profile.brand,
        text: state.profile.bio,
        url: location.href
      }).catch(function() {});
    } else {
      toast('当前浏览器暂不支持系统分享');
    }
  };

  $('moreBtn').onclick = openDrawer;

  $('exportBtn').onclick = function() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'revery-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('备份已导出');
  };

  $('clearBtn').onclick = function() {
    if (confirm('确定恢复为演示数据吗？')) {
      state = clone(defaults);
      save();
      applyTheme();
      render();
      closeDrawer();
      toast('已恢复演示数据');
    }
  };

  $('themeBtn').onclick = function() {
    state.settings = state.settings || {};
    state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
    save();
    applyTheme();
    closeDrawer();
  };

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredInstall = e;
  });

  $('installBtn').onclick = function() {
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall.userChoice.finally(function() {
        deferredInstall = null;
      });
    } else {
      toast('若没有安装提示，请用浏览器菜单选择“添加到主屏幕”');
    }
  };

  // 开屏动画确保每次打开都有充足时长展示花体并平滑淡出
  (function initSplash() {
    var splash = document.getElementById('splashScreen');
    if (splash) {
      setTimeout(function() {
        splash.classList.add('fade-out');
        setTimeout(function() {
          if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 650);
      }, 1200);
    }
  })();

  // PWA 自动热更新检查与静默激活，打开即用最新代码
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js').then(function(reg) {
        reg.update();
        setInterval(function() { reg.update(); }, 60000);
      }).catch(function() {});
      
      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  var sx = 0, sy = 0, tracking = false;
  document.addEventListener('touchstart', function(e) {
    var t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;
    tracking = sx < 28;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!tracking) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - sx;
    var dy = Math.abs(t.clientY - sy);
    if (dx > 72 && dy < 70) openDrawer();
    tracking = false;
  }, { passive: true });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeDrawer();
      closeModals();
      $('chatPage').classList.remove('show');
    }
  });

  save();
  applyTheme();
  render();
})();