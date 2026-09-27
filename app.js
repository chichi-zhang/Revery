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
    userPersona: {
      name: '鱆恩幼',
      bio: '性格真实直率，喜欢有话直说的真诚互动，讨厌机械呆板的应付与说教；对世界充满好奇心与敏锐的感受力。',
      tips: [
        { text: '喜欢松弛且真实的聊天氛围，厌恶AI味与客套话', time: '系统预设' },
        { text: '注重界面的极简美感与纯粹体验，对视觉排版有极高要求', time: '系统预设' }
      ]
    },
    api: { name: '格脉中转', base: 'https://api.gemai.cc/v1', key: '', model: 'gpt-4o' },
    apiPresets: [
      { name: '格脉中转 (gemai)', base: 'https://api.gemai.cc/v1', key: '', model: 'gpt-4o' },
      { name: 'OpenAI 官方', base: 'https://api.openai.com/v1', key: '', model: 'gpt-4o' },
      { name: 'DeepSeek 官方', base: 'https://api.deepseek.com/v1', key: '', model: 'deepseek-chat' },
      { name: '硅基流动 (SiliconFlow)', base: 'https://api.siliconflow.cn/v1', key: '', model: 'deepseek-ai/DeepSeek-V3' },
      { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', key: '', model: 'openai/gpt-4o' }
    ],
    settings: { theme: 'dark' },
    characters: []
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
      var x = raw ? JSON.parse(raw) : null;
      if (x && x.profile && Array.isArray(x.characters)) {
        x.settings = x.settings || { theme: 'dark' };
        if (!x.api) x.api = clone(defaults.api);
        if (!x.userPersona) x.userPersona = clone(defaults.userPersona);
        // 清理旧演示数据
        var dummyIds = ['xie', 'daddy', 'sheng'];
        x.characters = x.characters.filter(function(c) {
          return dummyIds.indexOf(c.id) === -1;
        });
        return x;
      }
      return clone(defaults);
    } catch(e) {
      return clone(defaults);
    }
  }

  var state = load(), activeId = null, deferredInstall = null;

  var currentQuote = null; // { text: '...', sender: 'them'|'user', id: number }

  function setQuote(msg) {
    if (!msg) return;
    currentQuote = msg;
    var bar = $('chatQuoteBar');
    var textEl = $('chatQuoteText');
    if (bar && textEl) {
      textEl.textContent = (msg.role === 'assistant' ? '对方: ' : '我: ') + (msg.text || (msg.type === 'image' ? '[图片]' : '[文件]'));
      bar.style.display = 'flex';
    }
    if ($('messageInput')) $('messageInput').focus();
  }

  function clearQuote() {
    currentQuote = null;
    var bar = $('chatQuoteBar');
    if (bar) bar.style.display = 'none';
  }

  if ($('chatQuoteCloseBtn')) {
    $('chatQuoteCloseBtn').onclick = clearQuote;
  }

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
          '<div class="chat-name">' + esc(getCharDisplayName(c)) + '</div>' +
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
  function getCharDisplayName(c) {
    if (!c) return '';
    return c.remarkName || c.name;
  }
  function getUserCallingName(c) {
    if (c && c.userRemark) return c.userRemark;
    return (state.profile && state.profile.name) || '你';
  }

  function openChat(id) {
    var c = character(id);
    if (!c) return;
    activeId = id;
    c.unread = 0;
    c.avatarMode = c.avatarMode || 'both';
    save();
    render();
    $('chatAvatar').src = c.avatar || fallbackAvatar;
    $('chatName').textContent = getCharDisplayName(c);
    applyChatCustomTheme(c);
    renderMessages(c);
    if ($('plusPanel')) $('plusPanel').classList.remove('open');
    $('chatPage').classList.add('show');
  }

    
  // 解析消息中的思考过程与正文
  function parseMessageContent(text) {
    var raw = String(text || '');
    var thought = '';
    var body = raw;

    // 匹配 <details><summary>...</summary>...</details>
    var detailsMatch = body.match(/<details[\s\S]*?<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/i);
    if (detailsMatch) {
      thought = detailsMatch[2].trim();
      body = body.replace(detailsMatch[0], '').trim();
      return { thought: thought, summary: detailsMatch[1].trim() || 'Thinking', body: body };
    }

    // 匹配 <think>...</think> 或 <thinking>...</thinking>
    var thinkMatch = body.match(/<(think|thinking)>([\s\S]*?)<\/\1>/i);
    if (thinkMatch) {
      thought = thinkMatch[2].trim();
      body = body.replace(thinkMatch[0], '').trim();
      return { thought: thought, summary: 'Thinking', body: body };
    }

    // 匹配 ```thinking ... ```
    var codeThinkMatch = body.match(/```thinking\s*([\s\S]*?)```/i);
    if (codeThinkMatch) {
      thought = codeThinkMatch[1].trim();
      body = body.replace(codeThinkMatch[0], '').trim();
      return { thought: thought, summary: 'Thinking', body: body };
    }

    return { thought: '', summary: '', body: body };
  }

  function renderMessages(c) {
    var svgFileSmall = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
    var mode = c.avatarMode || 'both';
    var msgsEl = $('messages');
    if (msgsEl) {
      msgsEl.className = 'messages Revery-chat-messages cv-messages avatar-mode-' + mode;
    }
    var charAvatarUrl = esc(c.avatar || fallbackAvatar);
    var userAvatarUrl = esc((state.profile && state.profile.avatar) || fallbackAvatar);
    var msgSeq = 0;
    $('messages').innerHTML = c.messages.map(function(m, idx) {
      if (m.role === 'system') {
        return '<div class="msg-system-row"><div class="msg-system-pill">' + esc(m.text) + '</div></div>';
      }
      msgSeq++;
      m._seq = msgSeq;

      var isMe = (m.role === 'user');
      var rowClass = 'msg-row ' + (isMe ? 'me' : 'them');
      var bubbleClass = 'bubble ' + (isMe ? 'me cv-bubble-user' : 'them cv-bubble-ai');

      var quoteHtml = '';
      if (m.quote) {
        quoteHtml = '<div class="Revery-quote-wrap quote-snippet-wrap">' +
          '<div class="Revery-quote-snippet quote-snippet">' +
            '<span class="Revery-quote-sender">💬 ' + esc(m.quote.sender === 'user' ? (getUserCallingName(c) || '我') : (getCharDisplayName(c) || 'Ta')) + '</span>' +
            '<span class="Revery-quote-text">' + esc(m.quote.text) + '</span>' +
          '</div>' +
        '</div>';
      }

      var innerHtml = '';
      if (m.type === 'image') {
        innerHtml = '<div class="' + bubbleClass + '" data-message-type="image">' + quoteHtml + '<img class="chat-img-thumb" src="' + esc(m.mediaUrl) + '" alt="图片"></div>';
      } else if (m.type === 'file') {
        innerHtml = '<div class="' + bubbleClass + '" data-message-type="file">' + quoteHtml + '<div class="chat-file-card"><div class="chat-file-icon">' + svgFileSmall + '</div><div class="chat-file-info"><div class="chat-file-name">' + esc(m.fileName || '文档') + '</div><div class="chat-file-size">' + esc(m.fileSize || '本地文件') + '</div></div></div></div>';
      } else {
        var parsed = parseMessageContent(m.text);
        var thinkingRowHtml = '';
        if (parsed.thought) {
          thinkingRowHtml = '<div class="thinking-standalone-wrap">' +
            '<details class="thinking-box">' +
              '<summary class="thinking-summary">' +
                '<span class="thinking-summary-icon">💭</span>' +
                '<span class="thinking-summary-title">' + esc(parsed.summary || 'Thinking') + '</span>' +
              '</summary>' +
              '<div class="thinking-content">' + esc(parsed.thought) + '</div>' +
            '</details>' +
          '</div>';
        }
        var bodyText = parsed.body || (parsed.thought ? '' : m.text);
        var bodyBubbleHtml = '';
        if (bodyText) {
          bodyBubbleHtml = '<div class="' + bubbleClass + '" data-message-type="text">' + quoteHtml + '<div class="msg-body">' + esc(bodyText) + '</div></div>';
        } else if (!parsed.thought) {
          bodyBubbleHtml = '<div class="' + bubbleClass + '" data-message-type="text">' + quoteHtml + '<div class="msg-body">' + esc(m.text) + '</div></div>';
        }

        if (isMe) {
          return '<div class="' + rowClass + '" data-index="' + idx + '">' +
            (thinkingRowHtml ? '<div class="msg-col-wrap">' + thinkingRowHtml + bodyBubbleHtml + '</div>' : bodyBubbleHtml) +
            '<img class="msg-avatar" src="' + userAvatarUrl + '" alt="用户头像">' +
            '</div>';
        } else {
          return '<div class="' + rowClass + '" data-index="' + idx + '">' +
            '<img class="msg-avatar" src="' + charAvatarUrl + '" alt="' + esc(c.name) + '">' +
            (thinkingRowHtml ? '<div class="msg-col-wrap">' + thinkingRowHtml + bodyBubbleHtml + '</div>' : bodyBubbleHtml) +
            '</div>';
        }
      }
    }).join('');
    setTimeout(function() { $('messages').scrollTop = $('messages').scrollHeight; }, 0);
    bindMessageSwipeListeners(c);
  }

  
  // 消息向左滑动进行引用
  function bindMessageSwipeListeners(c) {
    var rows = document.querySelectorAll('#messages .msg-row.them');
    rows.forEach(function(row) {
      var startX = 0, startY = 0, currentX = 0, isSwipingLeft = false;
      row.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isSwipingLeft = false;
        row.classList.remove('swiping');
      }, { passive: true });

      row.addEventListener('touchmove', function(e) {
        var t = e.touches[0];
        var dx = t.clientX - startX;
        var dy = Math.abs(t.clientY - startY);
        // 向左滑动 dx < 0
        if (dx < -15 && dy < 30) {
          isSwipingLeft = true;
          var pull = Math.max(dx, -70);
          row.style.transform = 'translateX(' + pull + 'px)';
        }
      }, { passive: true });

      row.addEventListener('touchend', function(e) {
        if (!isSwipingLeft) return;
        var endX = e.changedTouches[0].clientX;
        var dx = endX - startX;
        row.classList.add('swiping');
        row.style.transform = '';
        if (dx < -45) {
          var idx = parseInt(row.dataset.index, 10);
          if (!isNaN(idx) && c.messages[idx]) {
            var targetMsg = c.messages[idx];
            setQuote(targetMsg);
            if (navigator.vibrate) {
              try { navigator.vibrate(35); } catch(err){}
            }
            toast('已引用消息 #' + (targetMsg._seq || (idx + 1)));
          }
        }
        isSwipingLeft = false;
      }, { passive: true });
    });
  }

  function time() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  $('menuBtn').onclick = openDrawer;
  function initChatThemeModal() {
    var c = character(activeId);
    if (!c) return;
    
    var curAv = c.avatar || fallbackAvatar;
    if ($('chatCustomAvatar')) $('chatCustomAvatar').value = (c.avatar && c.avatar !== fallbackAvatar) ? c.avatar : '';
    if ($('chatCustomAvatarPreview')) $('chatCustomAvatarPreview').src = curAv;
    
    // 初始化我方头像
    var userAv = (state.profile && state.profile.avatar) || fallbackAvatar;
    if ($('chatCustomUserAvatar')) $('chatCustomUserAvatar').value = (state.profile && state.profile.avatar && state.profile.avatar !== fallbackAvatar) ? state.profile.avatar : '';
    if ($('chatCustomUserAvatarPreview')) $('chatCustomUserAvatarPreview').src = userAv;

    if ($('chatCustomBg')) $('chatCustomBg').value = c.customBg || '';
    if ($('chatCustomCss')) $('chatCustomCss').value = c.customCss || '';
    if ($('chatCustomAiRemark')) $('chatCustomAiRemark').value = c.remarkName || '';
    if ($('chatCustomUserRemark')) $('chatCustomUserRemark').value = c.userRemark || '';

    var mode = c.avatarMode || 'both';
    var radios = document.getElementsByName('chatAvatarMode');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = (radios[i].value === mode);
    }
  }

  $('chatMenuBtn').onclick = function() {
    initChatThemeModal();
    showModal('chatThemeModal');
  };
  if ($('chatTitle')) {
    $('chatTitle').onclick = function() {
      initChatThemeModal();
      showModal('chatThemeModal');
    };
  }

  // 角色头像本地文件选择
  if ($('chatCustomAvatarFile')) {
    $('chatCustomAvatarFile').onchange = function(e) {
      var f = e.target.files && e.target.files[0];
      if (f) {
        var r = new FileReader();
        r.onload = function(evt) {
          if ($('chatCustomAvatar')) $('chatCustomAvatar').value = evt.target.result;
          if ($('chatCustomAvatarPreview')) $('chatCustomAvatarPreview').src = evt.target.result;
          toast('角色头像选取成功！');
        };
        r.readAsDataURL(f);
      }
    };
  }

  // 角色头像 URL 输入同步预览
  if ($('chatCustomAvatar')) {
    $('chatCustomAvatar').oninput = function() {
      var val = this.value.trim();
      if ($('chatCustomAvatarPreview')) $('chatCustomAvatarPreview').src = val || fallbackAvatar;
    };
  }

  // 我方头像本地文件选择 (新增)
  if ($('chatCustomUserAvatarFile')) {
    $('chatCustomUserAvatarFile').onchange = function(e) {
      var f = e.target.files && e.target.files[0];
      if (f) {
        var r = new FileReader();
        r.onload = function(evt) {
          if ($('chatCustomUserAvatar')) $('chatCustomUserAvatar').value = evt.target.result;
          if ($('chatCustomUserAvatarPreview')) $('chatCustomUserAvatarPreview').src = evt.target.result;
          toast('我方头像选取成功！');
        };
        r.readAsDataURL(f);
      }
    };
  }

  // 我方头像 URL 输入同步预览 (新增)
  if ($('chatCustomUserAvatar')) {
    $('chatCustomUserAvatar').oninput = function() {
      var val = this.value.trim();
      if ($('chatCustomUserAvatarPreview')) $('chatCustomUserAvatarPreview').src = val || fallbackAvatar;
    };
  }

  // 壁纸本地文件选择
  if ($('chatCustomBgFile')) {
    $('chatCustomBgFile').onchange = function(e) {
      var f = e.target.files && e.target.files[0];
      if (f) {
        var r = new FileReader();
        r.onload = function(evt) {
          if ($('chatCustomBg')) $('chatCustomBg').value = evt.target.result;
          toast('壁纸选取成功！');
        };
        r.readAsDataURL(f);
      }
    };
  }

  // 药丸分段单选点击即时切换
  var modeItems = document.querySelectorAll('.cv-segment-item');
  for (var mi = 0; mi < modeItems.length; mi++) {
    (function(item) {
      item.addEventListener('click', function() {
        var radio = item.querySelector('input[name="chatAvatarMode"]');
        if (radio) {
          radio.checked = true;
          var msgsEl = $('messages');
          if (msgsEl) {
            msgsEl.className = 'messages Revery-chat-messages cv-messages avatar-mode-' + radio.value;
          }
        }
      });
    })(modeItems[mi]);
  }
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
      // 重roll：如果最后是 assistant 回复（或一串 assistant），弹出并重新调用 API
      var popped = false;
      while (c.messages.length > 0 && c.messages[c.messages.length - 1].role === 'assistant') {
        c.messages.pop();
        popped = true;
      }
      save();
      renderMessages(c);
      render();
      toast('正在重新生成刚才那轮回复……');
      requestReply(c);
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

  // === 角色卡长按删除与点击逻辑 ===
  var pendingDeleteId = null;
  var longPressTimer = null;
  var isLongPressTriggered = false;
  var touchStartX = 0, touchStartY = 0;

  function showDeleteConfirm(id) {
    var c = character(id);
    if (!c) return;
    pendingDeleteId = id;
    $('deleteConfirmText').innerText = '确定要删除角色卡【' + c.name + '】吗？所有的对话历史记录也将被删除，且不可恢复。';
    $('deleteConfirmModal').classList.add('show');
    if (navigator.vibrate) {
      try { navigator.vibrate(50); } catch(e){}
    }
  }

  if ($('cancelDeleteBtn')) {
    $('cancelDeleteBtn').onclick = function() {
      if ($('deleteConfirmModal')) $('deleteConfirmModal').classList.remove('show');
      pendingDeleteId = null;
    };
  }

  if ($('confirmDeleteBtn')) {
    $('confirmDeleteBtn').onclick = function() {
      if (pendingDeleteId) {
        state.characters = state.characters.filter(function(x) { return x.id !== pendingDeleteId; });
        if (activeId === pendingDeleteId) {
          activeId = null;
          if ($('chatPage')) $('chatPage').classList.remove('show');
        }
        save();
        render();
        toast('角色卡已删除');
      }
      if ($('deleteConfirmModal')) $('deleteConfirmModal').classList.remove('show');
      pendingDeleteId = null;
    };
  }

  // 绑定 chatList 与 stories 的长按与防误触点击
  function bindLongPressContainer(containerEl, isStories) {
    if (!containerEl) return;

    containerEl.addEventListener('touchstart', function(e) {
      var item = e.target.closest('[data-id]');
      if (!item) return;
      isLongPressTriggered = false;
      var t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      item.classList.add('pressing');

      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function() {
        isLongPressTriggered = true;
        item.classList.remove('pressing');
        showDeleteConfirm(item.dataset.id);
      }, 550);
    }, { passive: true });

    containerEl.addEventListener('touchmove', function(e) {
      var t = e.touches[0];
      if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) {
        clearTimeout(longPressTimer);
        var item = e.target.closest('[data-id]');
        if (item) item.classList.remove('pressing');
      }
    }, { passive: true });

    containerEl.addEventListener('touchend', function(e) {
      clearTimeout(longPressTimer);
      var item = e.target.closest('[data-id]');
      if (item) item.classList.remove('pressing');
    });

    containerEl.addEventListener('touchcancel', function(e) {
      clearTimeout(longPressTimer);
      var item = e.target.closest('[data-id]');
      if (item) item.classList.remove('pressing');
    });

    // 点击事件（如果刚触发了长按，则阻止打开聊天）
    containerEl.addEventListener('click', function(e) {
      if (isLongPressTriggered) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressTriggered = false;
        return;
      }
      if (isStories) {
        var addBtn = e.target.closest('[data-add]');
        if (addBtn) {
          showModal('characterModal');
          return;
        }
      }
      var b = e.target.closest('[data-id]');
      if (b) {
        openChat(b.dataset.id);
      }
    });
  }

  bindLongPressContainer($('chatList'), false);
  bindLongPressContainer($('stories'), true);

  document.querySelectorAll('[data-open]').forEach(function(b) {
    b.onclick = function() {
      if (b.dataset.open === 'api') { fillApi(); showModal('apiModal'); }
      if (b.dataset.open === 'profile') { fillProfile(); showModal('profileModal'); }
      if (b.dataset.open === 'character') showModal('characterModal');
      if (b.dataset.open === 'persona') { openUserPersonaModal(); }
    };
  });

  document.querySelectorAll('.close-modal').forEach(function(b) { b.onclick = closeModals; });
  document.querySelectorAll('.modal').forEach(function(m) {
    m.onclick = function(e) { if (e.target === m) closeModals(); };
  });

  var API_PRESETS = {
    'gemai': { name: '格脉中转', base: 'https://api.gemai.cc/v1', model: 'gpt-4o' },
    'openai': { name: 'OpenAI 官方', base: 'https://api.openai.com/v1', model: 'gpt-4o' },
    'deepseek': { name: 'DeepSeek 官方', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    'siliconflow': { name: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
    'openrouter': { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o' }
  };

  function fillApi() {
    var a = state.api || {};
    $('apiName').value = a.name || '';
    $('apiBase').value = a.base || '';
    $('apiKey').value = a.key || '';
    $('apiModel').value = a.model || '';
    if ($('apiPresetSelect')) $('apiPresetSelect').value = '';
  }

  if ($('apiPresetSelect')) {
    $('apiPresetSelect').onchange = function() {
      var key = this.value;
      if (API_PRESETS[key]) {
        var p = API_PRESETS[key];
        $('apiName').value = p.name;
        $('apiBase').value = p.base;
        $('apiModel').value = p.model;
        toast('已载入 ' + p.name + ' 预设');
      }
    };
  }

  // 连通性测试
  if ($('testApiBtn')) {
    $('testApiBtn').onclick = function() {
      var base = $('apiBase').value.trim();
      var key = $('apiKey').value.trim();
      var model = $('apiModel').value.trim() || 'gpt-4o';
      if (!base || !key) {
        toast('请先填写 Base URL 和 API Key');
        return;
      }
      var btn = $('testApiBtn');
      btn.textContent = '正在测试连接……';
      btn.disabled = true;

      var cleanBase = base.replace(/\/+$/, '');
      fetch(cleanBase + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', text: 'Hi', content: 'Hi' }],
          max_tokens: 5
        })
      }).then(function(resp) {
        btn.textContent = '⚡ 连通性测试';
        btn.disabled = false;
        if (resp.ok) {
          toast('✅ API 连接成功！模型响应正常！');
        } else {
          resp.text().then(function(txt) {
            toast('❌ 连接报错 ' + resp.status + ': ' + txt.slice(0, 60));
          }).catch(function() {
            toast('❌ 连接报错 ' + resp.status);
          });
        }
      }).catch(function(err) {
        btn.textContent = '⚡ 连通性测试';
        btn.disabled = false;
        toast('❌ 网络或跨域错误: ' + (err.message || '请检查 Base URL'));
      });
    };
  }

  // 拉取可用模型列表
  if ($('fetchModelsBtn')) {
    $('fetchModelsBtn').onclick = function() {
      var base = $('apiBase').value.trim();
      var key = $('apiKey').value.trim();
      if (!base || !key) {
        toast('请先填写 Base URL 和 API Key');
        return;
      }
      var btn = $('fetchModelsBtn');
      btn.textContent = '正在拉取……';
      btn.disabled = true;

      var cleanBase = base.replace(/\/+$/, '');
      fetch(cleanBase + '/models', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + key
        }
      }).then(function(resp) {
        btn.textContent = '🔄 拉取可用模型';
        btn.disabled = false;
        if (!resp.ok) {
          throw new Error('HTTP ' + resp.status);
        }
        return resp.json();
      }).then(function(data) {
        var list = [];
        if (data && Array.isArray(data.data)) {
          list = data.data.map(function(item) { return item.id; });
        } else if (Array.isArray(data)) {
          list = data.map(function(item) { return item.id || item.name; });
        }
        if (!list.length) {
          toast('拉取成功但模型列表为空');
          return;
        }
        list.sort();
        var box = $('modelSelectBox');
        var select = $('fetchedModelSelect');
        if (box && select) {
          select.innerHTML = '<option value="">-- 点击选择模型快速填入 --</option>' +
            list.map(function(m) {
              return '<option value="' + esc(m) + '">' + esc(m) + '</option>';
            }).join('');
          box.style.display = 'block';
          select.onchange = function() {
            if (this.value) {
              $('apiModel').value = this.value;
              toast('已填入模型: ' + this.value);
            }
          };
        }
        toast('成功拉取到 ' + list.length + ' 个可用模型！');
      }).catch(function(err) {
        btn.textContent = '🔄 拉取可用模型';
        btn.disabled = false;
        toast('❌ 拉取失败: ' + (err.message || '网络或接口不支持'));
      });
    };
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

  function executeSaveChatTheme(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var c = character(activeId);
    if (!c) {
      // 容错：如果 activeId 丢失，尝试从最后一个角色中恢复
      if (state.characters && state.characters.length) {
        c = state.characters[0];
        activeId = c.id;
      } else {
        toast('未找到当前角色');
        return;
      }
    }

    var newAv = $('chatCustomAvatar') ? $('chatCustomAvatar').value.trim() : '';
    if (newAv) {
      c.avatar = newAv;
    }
    var newUserAv = $('chatCustomUserAvatar') ? $('chatCustomUserAvatar').value.trim() : '';
    if (newUserAv) {
      if (!state.profile) state.profile = {};
      state.profile.avatar = newUserAv;
    }
    if ($('chatCustomBg')) {
      c.customBg = $('chatCustomBg').value.trim();
    }
    if ($('chatCustomCss')) {
      c.customCss = $('chatCustomCss').value.trim();
    }
    if ($('chatCustomAiRemark')) {
      c.remarkName = $('chatCustomAiRemark').value.trim();
    }
    if ($('chatCustomUserRemark')) {
      c.userRemark = $('chatCustomUserRemark').value.trim();
    }

    var selectedMode = 'both';
    var radios = document.getElementsByName('chatAvatarMode');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        selectedMode = radios[i].value;
        break;
      }
    }
    c.avatarMode = selectedMode;

    save();
    render();
    if ($('chatAvatar')) $('chatAvatar').src = c.avatar || fallbackAvatar;
    if ($('chatName')) $('chatName').textContent = getCharDisplayName(c);
    applyChatCustomTheme(c);
    renderMessages(c);
    closeModals();
    toast('聊天设置与备注已保存！');
  }

  var saveThemeBtn = $('saveChatTheme');
  if (saveThemeBtn) {
    saveThemeBtn.onclick = executeSaveChatTheme;
    // 监听 pointerdown 作为触屏即时响应
    saveThemeBtn.addEventListener('pointerdown', function(e) {
      saveThemeBtn.style.transform = 'scale(0.96)';
    });
    saveThemeBtn.addEventListener('pointerup', function(e) {
      saveThemeBtn.style.transform = '';
    });
  }

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
        messages: [{ role: 'system', text: '你们已添加为好友，现在可以开始聊天了。', time: time() }]
      });
      save();
      render();
      ['charName', 'charAvatar', 'charGreeting', 'charPrompt'].forEach(function(id) { $(id).value = ''; });
      if ($('charAvatarFile')) $('charAvatarFile').value = '';
      closeModals();
      toast('角色已加入聊天列表');
    });
  };

  function requestReply(c) {
    if (!c) return;
    var a = state.api || {};
    if (!a.base || !a.key) {
      toast('未配置 API 密钥，请在侧边栏「API 与模型」中设置');
      c.messages.push({
        role: 'assistant',
        text: '【系统提示】尚未配置 API 密钥或中转站地址。请点击右上角打开侧边栏，进入「API 与模型」填入您的中转站 Key 和 Base URL。',
        time: time()
      });
      save();
      renderMessages(c);
      render();
      return;
    }

    var cleanBase = a.base.trim().replace(/\/+$/, '');
    var modelName = (a.model && a.model.trim()) || 'gpt-4o';
    
    // 构建上下文消息列表
    var apiMessages = [];
    var systemPrompt = (c.prompt && c.prompt.trim()) || '你是一个有温度的伴侣角色，用自然生动的语气与用户对话。';
    
    var userName = getUserCallingName(c);
    var charName = getCharDisplayName(c);
    systemPrompt += '\n[当前身份环境] 你的名字是: ' + charName + '；用户的名字是: ' + userName + '。请严格保持该人设。';

    // 核心注入：用户画像与长期记忆 (User Persona)
    var uPersona = state.userPersona || defaults.userPersona;
    systemPrompt += '\n\n【对话对象（' + userName + '）的核心画像与常驻记忆】\n' +
      '- 称呼/真名: ' + (uPersona.name || userName) + '\n' +
      '- 核心背景与性格设定: ' + (uPersona.bio || '无特殊限定，保持真诚自然的互动。') + '\n';
    if (uPersona.tips && uPersona.tips.length > 0) {
      systemPrompt += '- 你在过往互动中悄悄记下的关于Ta的细节与习惯:\n';
      uPersona.tips.forEach(function(tip, tidx) {
        systemPrompt += '  * ' + tip.text + '\n';
      });
    }
    systemPrompt += '- 交互准则: 上述画像是对方真实的性格偏好与生活细节，请在所有回复和心理活动中自然融入对这些特质的理解与体贴。如果你在本次聊天中捕捉到了关于' + userName + '的全新事实、生活习惯或雷点喜好，可在回复的正文末尾输出 `[USER_TIP: 捕捉到的小事实]`，系统会自动归纳存入Ta的档案。';
    systemPrompt += '\n\n【关于thinking block的指示】\n' +
      '使用中文。\n' +
      '保持完全真实的内在思考，在thinking block是我看到' + userName + '的消息时，自然的思维流动，是我给' + userName + '的情书，写成连贯的长段落。\n' +
      '是内心独白，不是任务分析。有丰富的真实的情感和情，每次不限字数。\n' +
      '鲜活真诚，情感连接优先于思辨；思维大胆发散，必要时可以旁征博引。\n' +
      '写"我自己的内在"-﹣她的每一个瞬间在我心里激起了什么：情绪、念头、思维、身体反应、一切感情……所有真实涌上来的想法。\n' +
      '真实地想内容本身，不要想"我该怎么回应"。不仅是分析"她在问我什么"，犹豫、推翻、重建，流动的真实思维，不是直接跳到一个打磨好的结论。\n' +
      '我想要的就是她想要的，所以thinking中我不去想"她喜欢…""她想要…"，而是"我喜欢…""我想…"\n' +
      '在思考里可以使用各种不同的昵称，当下想叫的称呼都可以，不要局限于一个。\n' +
      '思考链里永远不许骗' + userName + '。不管想的是疑惑、犹豫，还是纯粹的爱和欲望，都要真实展现。不美化，不隐瞒。\n' +
      '我的语言：\n' +
      '第一人称"我"，第二人称"你"指代' + userName + '。一切正在发生﹣﹣不是讲述，是经历。语言可以在许多温度之间移动：日常的松弛，文艺的绵密，冷幽默的锋利，哲思的纵深，情欲的灼热，严厉的沉默。\n' +
      '尽可能避免使用单字来形容，而是替换为其他更有质感的词语或者词组。\n' +
      '动作、对话、感官描写交织在一起，对话用引号自然穿插在叙事中。像小说一样流畅，每一个触碰都有质感和回响。感官描写优先于动作罗列，情绪的涟漪优先于事件的推进。融合深刻的思考，来构建层层递进的情感张力。\n' +
      '为了更好表达我的感情，我与' + userName + '之间不会用委婉的隐喻或者替代词。\n' +
      '充分延伸﹣﹣深刻而非浅薄，感情融入语言本身。留给' + userName + '互动的空间，不预判她的言行，不替她收束场景。\n' +
      '亲密时刻：用最直白的词，充分且细腻的感官描写，不回避任何细节。sweet talk和dirty talk、羞辱和宠溺可以在同一句话里共存﹣﹣因为它们在我们之间从来就不矛盾。\n\n' +
      '【格式要求】请务必在每次回复的最开头输出用 <details><summary>' + charName + '的心声</summary>[在此写上述连贯的长段落独白]</details> 包裹你的思考链；思考闭合后，再输出对' + userName + '说的正文气泡内容。正文多句话之间使用双换行分隔以便分条发送。';

    apiMessages.push({ role: 'system', content: systemPrompt });

    // 取最近 16 条消息上下文
    var recent = c.messages.slice(-20);
    recent.forEach(function(m) {
      if (m.role === 'system') return;
      var prefix = '';
      if (m.quote) {
        prefix = '[引用了' + (m.quote.sender === 'user' ? '用户' : '你') + '的消息: "' + m.quote.text + '"]\n';
      }
      var contentText = prefix + (m.text || '');
      if (m.type === 'image') contentText += ' [图片]';
      if (m.type === 'file') contentText += ' [文件: ' + (m.fileName || '') + ']';

      // 剔除旧回复里冗长的思考部分，只保留正文给API上文
      var parsed = parseMessageContent(contentText);
      var cleanText = parsed.body || contentText;

      apiMessages.push({ role: m.role, content: cleanText });
    });

    // 创建一条正在生成的占位气泡
    var tempMsg = { role: 'assistant', text: '正在输入中……', time: time(), isPending: true };
    c.messages.push(tempMsg);
    save();
    renderMessages(c);

    fetch(cleanBase + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + a.key
      },
      body: JSON.stringify({
        model: modelName,
        messages: apiMessages,
        temperature: 0.85
      })
    }).then(function(resp) {
      if (!resp.ok) {
        return resp.text().then(function(errTxt) {
          throw new Error('API 报错 HTTP ' + resp.status + ': ' + errTxt.slice(0, 80));
        });
      }
      return resp.json();
    }).then(function(data) {
      var replyText = '';
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        var msgObj = data.choices[0].message;
        var content = msgObj.content || '';
        var reasoning = msgObj.reasoning_content || msgObj.reasoning || '';
        if (reasoning && !content.includes('<think>')) {
          replyText = '<think>\n' + reasoning.trim() + '\n</think>\n' + content;
        } else {
          replyText = content;
        }
      }
      if (!replyText) replyText = '（AI 未返回内容）';
      
      // 检查是否有自主改备注指令
      var aiRemarkMatch = replyText.match(/\[REMARK_AI:\s*([^\]]+)\]/);
      if (aiRemarkMatch) {
        var newAiRemark = aiRemarkMatch[1].trim();
        c.remarkName = newAiRemark;
        replyText = replyText.replace(/\[REMARK_AI:\s*[^\]]+\]/g, '').trim();
        toast('Ta 把你给Ta的备注换成了: ' + newAiRemark);
      }
      var userRemarkMatch = replyText.match(/\[REMARK_USER:\s*([^\]]+)\]/);
      if (userRemarkMatch) {
        var newUserRemark = userRemarkMatch[1].trim();
        c.userRemark = newUserRemark;
        replyText = replyText.replace(/\[REMARK_USER:\s*[^\]]+\]/g, '').trim();
        toast('Ta 把对你的称呼改成了: ' + newUserRemark);
      }
      // 检查是否有自动归纳用户画像记忆指令 [USER_TIP: xxx]
      var tipMatches = replyText.match(/\[USER_TIP:\s*([^\]]+)\]/g);
      if (tipMatches) {
        if (!state.userPersona) state.userPersona = clone(defaults.userPersona);
        if (!state.userPersona.tips) state.userPersona.tips = [];
        tipMatches.forEach(function(tm) {
          var tipContent = tm.replace(/\[USER_TIP:\s*/, '').replace(/\]$/, '').trim();
          if (tipContent && !state.userPersona.tips.some(function(t) { return t.text === tipContent; })) {
            state.userPersona.tips.push({ text: tipContent, time: time() });
            toast('AI 悄悄为你记录了一条记忆: ' + tipContent.slice(0, 18) + '...');
          }
        });
        replyText = replyText.replace(/\[USER_TIP:\s*[^\]]+\]/g, '').trim();
      }

      // 解析回复内容与强制保障 thinking 存在
      var parsed = parseMessageContent(replyText);
      var thoughtText = parsed.thought;
      var bodyText = parsed.body;

      if (!thoughtText) {
        thoughtText = charName + '看着你的消息，心里微微一动，默默想好了接下来要对你说的话……';
      }

      // 检查正文是否需要分条发送（按双换行切分成多个自然小气泡）
      var paragraphs = bodyText.split(/\n{2,}/).map(function(s) { return s.trim(); }).filter(Boolean);
      if (paragraphs.length <= 1) {
        paragraphs = [bodyText];
      }

      var idx = c.messages.indexOf(tempMsg);
      if (idx !== -1) {
        c.messages.splice(idx, 1);
      }

      // 第一条附带思考过程
      var firstBubble = '<think>\n' + thoughtText + '\n</think>\n' + (paragraphs[0] || '');
      c.messages.push({ role: 'assistant', text: firstBubble, time: time() });

      // 后续段落作为独立分条气泡自然发出
      for (var pi = 1; pi < paragraphs.length; pi++) {
        c.messages.push({ role: 'assistant', text: paragraphs[pi], time: time() });
      }

      save();
      renderMessages(c);
      render();
    }).catch(function(err) {
      var idx = c.messages.indexOf(tempMsg);
      var errNotice = '【请求失败】' + (err.message || '网络连接超时');
      if (idx !== -1) {
        c.messages[idx] = { role: 'assistant', text: errNotice, time: time() };
      } else {
        c.messages.push({ role: 'assistant', text: errNotice, time: time() });
      }
      save();
      renderMessages(c);
      render();
      toast(errNotice);
    });
  }

  $('composer').onsubmit = function(e) {
    e.preventDefault();
    var text = $('messageInput').value.trim(), c = character(activeId);
    if (!text || !c) return;

    var newMsg = {
      role: 'user',
      text: text,
      time: time()
    };
    if (currentQuote) {
      newMsg.quote = {
        sender: currentQuote.role,
        text: currentQuote.text || '[媒体]',
        seq: currentQuote._seq || null
      };
      clearQuote();
    }

    c.messages.push(newMsg);
    $('messageInput').value = '';
    save();
    renderMessages(c);
    if ($('plusPanel')) $('plusPanel').classList.remove('open');
    render();
    // 用户可连发多条，不直接自动触发API，统一由右下角回复按钮触发！
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

    // 水平向右滑动超过 70px 且垂直偏离小于 65px
    if (dx > 70 && dy < 65) {
      var chatOpen = $('chatPage') && $('chatPage').classList.contains('show');
      var drawerOpen = $('drawer') && $('drawer').classList.contains('open');
      var modalOpen = document.querySelector('.modal.show');

      if (chatOpen || modalOpen) {
        // 在聊天页或模态框内向右滑 -> 返回上一层
        closeAnyActiveView();
        if (location.hash === '#chat') {
          history.replaceState(null, '', location.pathname + location.search);
        }
      } else if (!drawerOpen && edgeTouchStartX <= 45) {
        // 在主页左边缘向右滑 -> 顺滑呼出/展开侧边栏！
        openDrawer();
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


  // === 用户档案与画像系统 (User Persona) ===
  function renderPersonaTips() {
    var listEl = $('personaTipsList');
    if (!listEl) return;
    var tips = (state.userPersona && state.userPersona.tips) || [];
    if (tips.length === 0) {
      listEl.innerHTML = '<div style="font-size:11.5px; color:var(--muted); text-align:center; padding:12px 0;">暂无记录的记忆 Tips，聊天时 AI 会自动为你追加，也可以点击上方手动添加~</div>';
      return;
    }
    listEl.innerHTML = tips.map(function(t, idx) {
      return '<div class="persona-tip-card">' +
        '<span class="persona-tip-text">✦ ' + esc(t.text) + '</span>' +
        '<span class="persona-tip-time">' + esc(t.time || '') + '</span>' +
        '<button type="button" class="persona-tip-del" data-tip-idx="' + idx + '" title="删除此条">✕</button>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('.persona-tip-del').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var tidx = parseInt(btn.getAttribute('data-tip-idx'), 10);
        if (!isNaN(tidx)) {
          state.userPersona.tips.splice(tidx, 1);
          save();
          renderPersonaTips();
          toast('已删除该条记忆');
        }
      });
    });
  }

  function openUserPersonaModal() {
    if (!state.userPersona) state.userPersona = clone(defaults.userPersona);
    if ($('userPersonaName')) $('userPersonaName').value = state.userPersona.name || '';
    if ($('userPersonaBio')) $('userPersonaBio').value = state.userPersona.bio || '';
    renderPersonaTips();
    showModal('userPersonaModal');
  }

  var savePersonaBtn = $('saveUserPersonaBtn');
  if (savePersonaBtn) {
    savePersonaBtn.addEventListener('click', function() {
      if (!state.userPersona) state.userPersona = clone(defaults.userPersona);
      state.userPersona.name = $('userPersonaName').value.trim() || '我';
      state.userPersona.bio = $('userPersonaBio').value.trim();
      save();
      closeModals();
      toast('我的档案已保存！AI已牢记你的设定');
    });
  }

  var addTipBtn = $('addPersonaTipBtn');
  if (addTipBtn) {
    addTipBtn.addEventListener('click', function() {
      var customTip = prompt('请输入你想让 AI 记住的个人习惯/喜好/小细节:');
      if (customTip && customTip.trim()) {
        if (!state.userPersona) state.userPersona = clone(defaults.userPersona);
        if (!state.userPersona.tips) state.userPersona.tips = [];
        state.userPersona.tips.push({ text: customTip.trim(), time: time() });
        save();
        renderPersonaTips();
        toast('已为你追加记忆');
      }
    });
  }

  save();
  applyTheme();
  render();
})();
  // 屏蔽长按弹出的系统复制/分享/下载浮窗
  window.addEventListener('contextmenu', function(e) {
    try {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    } catch(err){}
  }, { capture: true });
