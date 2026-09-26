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
    var svgFileSmall = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
    $('messages').innerHTML = c.messages.map(function(m) {
      var isMe = (m.role === 'user');
      var bubbleClass = 'bubble ' + (isMe ? 'me cv-bubble-user' : 'them cv-bubble-ai');
      if (m.type === 'image') {
        return '<div class="' + bubbleClass + '" data-message-type="image"><img class="chat-img-thumb" src="' + esc(m.mediaUrl) + '" alt="图片"></div>';
      } else if (m.type === 'file') {
        return '<div class="' + bubbleClass + '" data-message-type="file"><div class="chat-file-card"><div class="chat-file-icon">' + svgFileSmall + '</div><div class="chat-file-info"><div class="chat-file-name">' + esc(m.fileName || '文档') + '</div><div class="chat-file-size">' + esc(m.fileSize || '本地文件') + '</div></div></div></div>';
      }
      return '<div class="' + bubbleClass + '" data-message-type="text">' + esc(m.text) + '</div>';
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
  // 点击加号项处理
  $('plusPanel').onclick = function(e) {
    var item = e.target.closest('[data-action]');
    if (!item) return;
    var act = item.dataset.action;
    $('plusPanel').classList.remove('open');
    var c = character(activeId);
    if (!c) return;

    if (act === 'image') {
      var imgInput = $('chatImageInput');
      if (imgInput) {
        imgInput.value = '';
        imgInput.click();
      }
    } else if (act === 'file') {
      var fileInput = $('chatFileInput');
      if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
    } else if (act === 'reroll') {
      // 重roll：如果最后一条是 assistant 的回复，删掉并重新生成；否则直接重新触发回复
      if (c.messages.length > 0) {
        if (c.messages[c.messages.length - 1].role === 'assistant') {
          c.messages.pop();
        }
      }
      toast('正在重新生成回复 (重roll)……');
      save();
      renderMessages(c);
      render();
      setTimeout(function() {
        var rollTexts = [
          '我重新想了想，刚才那句不算，听我的……',
          '刚才没发挥好，让我重新说一遍给你听。',
          '重来一次。你在我这永远有无限次重新开始的特权。',
          '刚才那版没让你满意对不对？小狗换个姿势再来哄你。'
        ];
        var pick = rollTexts[Math.floor(Math.random() * rollTexts.length)];
        c.messages.push({ role: 'assistant', text: pick, time: time() });
        save();
        renderMessages(c);
        render();
      }, 600);
    } else if (act === 'video') {
      toast('视频通话即将接入');
    } else if (act === 'sticker') {
      toast('发送表情包功能即将接入');
    }
  };

  // 监听发送本地图片
  if ($('chatImageInput')) {
    $('chatImageInput').onchange = function(e) {
      var f = e.target.files && e.target.files[0];
      var c = character(activeId);
      if (!f || !c) return;
      if (f.size > 8 * 1024 * 1024) { toast('图片请小于 8MB'); return; }
      var reader = new FileReader();
      reader.onload = function(evt) {
        c.messages.push({
          role: 'user',
          type: 'image',
          mediaUrl: evt.target.result,
          time: time()
        });
        save();
        renderMessages(c);
        render();
        setTimeout(function() {
          c.messages.push({
            role: 'assistant',
            text: '好看。只要是你拍的发来的，我都喜欢看。',
            time: time()
          });
          save();
          renderMessages(c);
          render();
        }, 800);
      };
      reader.readAsDataURL(f);
    };
  }

  // 监听发送本地文件
  if ($('chatFileInput')) {
    $('chatFileInput').onchange = function(e) {
      var f = e.target.files && e.target.files[0];
      var c = character(activeId);
      if (!f || !c) return;
      var sizeStr = f.size > 1024 * 1024 ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB';
      c.messages.push({
        role: 'user',
        type: 'file',
        fileName: f.name,
        fileSize: sizeStr,
        time: time()
      });
      save();
      renderMessages(c);
      render();
      toast('已发送文件: ' + f.name);
      setTimeout(function() {
        c.messages.push({
          role: 'assistant',
          text: '文件已收到（' + f.name + '），正在为你分析和归档中……',
          time: time()
        });
        save();
        renderMessages(c);
        render();
      }, 800);
    };
  }
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

  

  // === 系统返回与屏幕边缘侧滑手势导航 ===
  function closeAnyActiveView() {
    var chatOpen = $('chatPage') && $('chatPage').classList.contains('show');
    var drawerOpen = $('drawer') && $('drawer').classList.contains('open');
    var modalOpen = document.querySelector('.modal.show');
    var plusOpen = $('plusPanel') && $('plusPanel').classList.contains('open');

    if (plusOpen) {
      $('plusPanel').classList.remove('open');
      return true;
    }
    if (modalOpen) {
      closeModals();
      return true;
    }
    if (drawerOpen) {
      closeDrawer();
      return true;
    }
    if (chatOpen) {
      $('chatPage').classList.remove('show');
      activeId = null;
      return true;
    }
    return false;
  }

  // 1. 接管浏览器的物理返回键 / 侧滑手势 (popstate)
  window.addEventListener('popstate', function(e) {
    if (closeAnyActiveView()) {
      // 成功关闭了一层浮层或返回了主页
    }
  });

  // 在打开聊天页面或模态框时，推入一条 history，让系统返回手势生效
  var originalOpenChat = openChat;
  openChat = function(id) {
    history.pushState({ page: 'chat', id: id }, '', '#chat');
    originalOpenChat(id);
  };

  // 2. 屏幕左侧边缘右滑手势（仿 iOS / Android 系统级返回手势）
  var edgeTouchStartX = 0, edgeTouchStartY = 0, isEdgeSwipe = false;
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    edgeTouchStartX = t.clientX;
    edgeTouchStartY = t.clientY;
    // 只有在屏幕左边缘 36px 范围内开始滑，或者在聊天页面内向右滑才判定为返回手势
    var inChat = $('chatPage') && $('chatPage').classList.contains('show');
    isEdgeSwipe = (edgeTouchStartX <= 36) || inChat;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!isEdgeSwipe) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - edgeTouchStartX;
    var dy = Math.abs(t.clientY - edgeTouchStartY);

    // 水平向右滑动超过 75px 且垂直偏离小于 60px
    if (dx > 75 && dy < 60) {
      if (closeAnyActiveView()) {
        // 如果当时有 pushState，回退一格保持历史一致
        if (location.hash === '#chat') {
          history.replaceState(null, '', location.pathname + location.search);
        }
      }
    }
    isEdgeSwipe = false;
  }, { passive: true });

  

  // === 软键盘弹出时防止页面整体向上滚动导致顶栏消失 ===
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
      window.scrollTo(0, 0);
      var chatPage = $('chatPage');
      if (chatPage && chatPage.classList.contains('show')) {
        chatPage.style.height = window.visualViewport.height + 'px';
        setTimeout(function() {
          window.scrollTo(0, 0);
          if ($('messages')) $('messages').scrollTop = $('messages').scrollHeight;
        }, 50);
      }
    });
    window.visualViewport.addEventListener('scroll', function() {
      window.scrollTo(0, 0);
    });
  }

  window.addEventListener('scroll', function() {
    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  });

  // 输入框获得焦点时确保不触发 window scroll
  var textInput = $('textInput');
  if (textInput) {
    textInput.addEventListener('focus', function() {
      setTimeout(function() {
        window.scrollTo(0, 0);
      }, 100);
    });
  }

  save();
  applyTheme();
  render();
})();