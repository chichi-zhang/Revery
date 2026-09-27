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
    voice: {
      provider: 'minimax',
      name: 'MiniMax 拟真语音',
      base: 'https://api.minimax.chat/v1',
      key: '',
      model: 'speech-02-hd',
      voiceId: 'qingnian1_max'
    },
    voicePresets: [
      { id: 'minimax', name: 'MiniMax (开放平台拟真语音)', base: 'https://api.minimax.chat/v1', key: '', model: 'speech-02-hd', voiceId: 'qingnian1_max' },
      { id: 'elevenlabs', name: 'ElevenLabs (全球情绪拟真语音)', base: 'https://api.elevenlabs.io/v1', key: '', model: 'eleven_multilingual_v2', voiceId: 'AsKyuFhJ2EuOMhWsc4Xq' },
      { id: 'mossland', name: 'Mossland (莫斯大陆官方/聚合)', base: 'https://api.mossland.com/v1', key: '', model: 'tts-1', voiceId: 'alloy' },
      { id: 'custom', name: '自定义语音接口', base: '', key: '', model: '', voiceId: '' }
    ],
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
        if (!x.voice) x.voice = clone(defaults.voice);
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
        '<span class="ring story-avatar-trigger" data-char-edit="' + c.id + '" title="编辑角色卡"><img src="' + esc(c.avatar || fallbackAvatar) + '"></span>' +
        '<span class="story-name-trigger">' + esc(c.name) + '</span>' +
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
  function showModal(id) {
    closeDrawer();
    var modalEl = $(id);
    if (modalEl) {
      modalEl.classList.add('show');
      // 推入一个专属模态框历史记录，让 Android 系统的返回键/侧滑手势优先关闭弹窗，绝不退出网页！
      history.pushState({ modalId: id }, '', '#' + id);
    }
  }

  function closeModals() {
    var opened = document.querySelectorAll('.modal.show');
    if (opened.length > 0) {
      opened.forEach(m => m.classList.remove('show'));
      // 如果当前 URL 带有 modal hash，退回上一个 history 状态
      if (location.hash && location.hash !== '#chat') {
        history.back();
      }
    }
  }
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
    var summary = '';
    var body = raw;
    var tool = null;

    // 1. 匹配 <details><summary>...</summary>...</details>
    var detailsMatch = body.match(/<details[\s\S]*?<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/i);
    if (detailsMatch) {
      thought = detailsMatch[2].trim();
      summary = detailsMatch[1].trim() || '';
      body = body.replace(detailsMatch[0], '').trim();
    } else {
      // 匹配原生 <think>...</think> 或 <thinking>...</thinking>
      var thinkMatch = body.match(/<(think|thinking)>([\s\S]*?)<\/\1>/i);
      if (thinkMatch) {
        thought = thinkMatch[2].trim();
        summary = '';
        body = body.replace(thinkMatch[0], '').trim();
      } else {
        // 匹配 ```thinking ... ```
        var codeThinkMatch = body.match(/```thinking\s*([\s\S]*?)```/i);
        if (codeThinkMatch) {
          thought = codeThinkMatch[1].trim();
          summary = '';
          body = body.replace(codeThinkMatch[0], '').trim();
        }
      }
    }

    // 2. 匹配工具调用 / MCP 标签：<tool_call ...> 或 <tool name="...">
    var toolMatch = body.match(/<tool(?:_call)?[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tool(?:_call)?>/i);
    if (toolMatch) {
      tool = { name: toolMatch[1], content: toolMatch[2].trim() };
      body = body.replace(toolMatch[0], '').trim();
    } else {
      var simpleToolMatch = body.match(/<tool(?:_call)?>([\s\S]*?)<\/tool(?:_call)?>/i);
      if (simpleToolMatch) {
        tool = { name: 'MCP 工具', content: simpleToolMatch[1].trim() };
        body = body.replace(simpleToolMatch[0], '').trim();
      }
    }

    return { thought: thought, summary: summary, tool: tool, body: body };
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
    var lastTimestampMs = 0;

    function getMsgTimestamp(m, index) {
      if (m._ts) return m._ts;
      if (m.time && typeof m.time === 'string' && m.time.indexOf(':') !== -1) {
        var parts = m.time.split(':');
        var h = parseInt(parts[0], 10);
        var min = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(min)) {
          // 以当天特定时间为基准，避免都是同一时刻
          var d = new Date();
          d.setHours(h, min, 0, 0);
          return d.getTime() + index * 1000;
        }
      }
      return Date.now() + index * 1000;
    }

    var htmlBuffer = '';
    c.messages.forEach(function(m, idx) {
      var isMe = (m.role === 'user');
      var rowClass = 'msg-row ' + (isMe ? 'me' : 'them');
      var bubbleClass = 'bubble ' + (isMe ? 'me cv-bubble-user' : 'them cv-bubble-ai');

      // 5分钟时间戳判断：每条消息和上一条相隔超过5分钟，或者首条消息，插入居中时间条
      var curMs = getMsgTimestamp(m, idx);
      var timeStampHtml = '';
      if (idx === 0 || (curMs - lastTimestampMs >= 5 * 60 * 1000)) {
        lastTimestampMs = curMs;
        var displayTime = m.time || time();
        timeStampHtml = '<div class="msg-time-row"><div class="msg-time-pill">' + esc(displayTime) + '</div></div>';
      }
      htmlBuffer += timeStampHtml;

      if (m.role === 'system') {
        htmlBuffer += '<div class="msg-system-row"><div class="msg-system-pill">' + esc(m.text) + '</div></div>';
        return;
      }

      var quoteHtml = '';
      if (m.quote) {
        quoteHtml = '<div class="Revery-quote-wrap quote-snippet-wrap">' +
          '<div class="Revery-quote-snippet quote-snippet">' +
            '<span class="Revery-quote-sender">💬 ' + esc(m.quote.sender === 'user' ? (getUserCallingName(c) || '我') : (getCharDisplayName(c) || 'Ta')) + '</span>' +
            '<span class="Revery-quote-text">' + esc(m.quote.text) + '</span>' +
          '</div>' +
        '</div>';
      }

      var innerContentHtml = '';

      if (m.type === 'voice' || m.audioUrl) {
        var durationSec = m.duration || 5;
        innerContentHtml = '<div class="' + bubbleClass + '" data-message-type="voice">' +
          '<div class="voice-bubble-wrap" data-audio-src="' + esc(m.audioUrl || '') + '">' +
            '<button type="button" class="voice-play-btn" aria-label="播放语音">' +
              '<svg class="voice-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>' +
              '<svg class="voice-pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>' +
            '</button>' +
            '<div class="voice-wave-bars">' +
              '<div class="voice-bar-col" style="height:6px;"></div>' +
              '<div class="voice-bar-col" style="height:12px;"></div>' +
              '<div class="voice-bar-col" style="height:16px;"></div>' +
              '<div class="voice-bar-col" style="height:8px;"></div>' +
              '<div class="voice-bar-col" style="height:14px;"></div>' +
              '<div class="voice-bar-col" style="height:10px;"></div>' +
              '<div class="voice-bar-col" style="height:15px;"></div>' +
              '<div class="voice-bar-col" style="height:7px;"></div>' +
            '</div>' +
            '<span class="voice-duration-tag">' + durationSec + '"</span>' +
          '</div>' +
        '</div>';
      } else if (m.type === 'image') {
        innerContentHtml = '<div class="' + bubbleClass + '" data-message-type="image">' + quoteHtml + '<img class="chat-img-thumb" src="' + esc(m.mediaUrl) + '" alt="图片"></div>';
      } else if (m.type === 'file') {
        innerContentHtml = '<div class="' + bubbleClass + '" data-message-type="file">' + quoteHtml + '<div class="chat-file-card"><div class="chat-file-icon">' + svgFileSmall + '</div><div class="chat-file-info"><div class="chat-file-name">' + esc(m.fileName || '文档') + '</div><div class="chat-file-size">' + esc(m.fileSize || '本地文件') + '</div></div></div></div>';
      } else {
        var parsed = parseMessageContent(m.text);
        var thinkingRowHtml = '';
        var charDispName = getCharDisplayName(c);

        if (parsed.thought) {
          var dynamicTitle = parsed.summary;
          if (!dynamicTitle || dynamicTitle.toLowerCase() === 'thinking' || dynamicTitle.indexOf('发呆中') !== -1 || dynamicTitle.indexOf('独白中') !== -1) {
            dynamicTitle = charDispName + ' 正在烧烤中…';
          } else {
            dynamicTitle = charDispName + ' 正在烧烤中… (' + dynamicTitle + ')';
          }
          thinkingRowHtml += '<div class="thinking-standalone-wrap">' +
            '<details class="thinking-box">' +
              '<summary class="thinking-summary">' +
                '<span class="thinking-summary-title">' + esc(dynamicTitle) + '</span>' +
              '</summary>' +
              '<div class="thinking-content">' + esc(parsed.thought) + '</div>' +
            '</details>' +
          '</div>';
        }

        if (parsed.tool) {
          var wrenchSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.85; margin-right:4px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
          thinkingRowHtml += '<div class="tool-call-wrap" style="margin:3px 0 5px;">' +
            '<details class="tool-call-box">' +
              '<summary class="tool-call-summary">' +
                wrenchSvg +
                '<span>' + esc(charDispName) + ' 正在使用工具 ' + esc(parsed.tool.name) + '…</span>' +
              '</summary>' +
              '<div class="tool-call-body">' + esc(parsed.tool.content) + '</div>' +
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

        innerContentHtml = (thinkingRowHtml ? '<div class="msg-col-wrap">' + thinkingRowHtml + bodyBubbleHtml + '</div>' : bodyBubbleHtml);
      }

      if (isMe) {
        htmlBuffer += '<div class="' + rowClass + '" data-index="' + idx + '">' +
          innerContentHtml +
          '<img class="msg-avatar" src="' + userAvatarUrl + '" alt="用户头像">' +
          '</div>';
      } else {
        htmlBuffer += '<div class="' + rowClass + '" data-index="' + idx + '">' +
          '<img class="msg-avatar" src="' + charAvatarUrl + '" alt="' + esc(c.name) + '">' +
          innerContentHtml +
          '</div>';
      }
    });

    $('messages').innerHTML = htmlBuffer;
    setTimeout(function() { $('messages').scrollTop = $('messages').scrollHeight; }, 0);
    bindMessageSwipeListeners(c);
  }

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
  
  var CHAR_VOICE_PRESETS = {
    'minimax_qingnian': { provider: 'minimax', model: 'speech-02-hd', voiceId: 'qingnian1_max' },
    'minimax_shaonian': { provider: 'minimax', model: 'speech-02-hd', voiceId: 'shaonian1_max' },
    'minimax_dashu': { provider: 'minimax', model: 'speech-02-hd', voiceId: 'dashu1_max' },
    'minimax_shaonv': { provider: 'minimax', model: 'speech-02-hd', voiceId: 'shaonv1_max' },
    'minimax_yujie': { provider: 'minimax', model: 'speech-02-hd', voiceId: 'yujie1_max' },
    'eleven_alder': { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voiceId: 'AsKyuFhJ2EuOMhWsc4Xq' },
    'eleven_adam': { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    'eleven_rachel': { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voiceId: '21m00Tcm4TlvDq8ikWAM' }
  };

  function generateCharVoiceMessage(c, textToSpeak) {
    if (!c) return;
    var v = state.voice || defaults.voice;
    if (!v.key) {
      toast('请先在侧边栏「声音与语音服务」中填入 API 密钥！');
      openVoiceModal();
      return;
    }

    var base = (v.base || '').trim();
    var key = (v.key || '').trim();
    var defaultProvider = v.provider || 'minimax';
    
    var charVoiceId = (c.voiceId && c.voiceId.trim()) || v.voiceId || 'qingnian1_max';
    var charPreset = c.voicePreset || '';
    var provider = defaultProvider;
    var model = v.model || 'speech-02-hd';

    if (charPreset && CHAR_VOICE_PRESETS[charPreset]) {
      var pInfo = CHAR_VOICE_PRESETS[charPreset];
      provider = pInfo.provider;
      model = pInfo.model;
      if (!c.voiceId) charVoiceId = pInfo.voiceId;
    }

    var groupId = (v.groupId || '').trim();
    if (!groupId) {
      var gMatch = base.match(/[?&]GroupId=([^&#]+)/i);
      if (gMatch) groupId = gMatch[1];
    }

    var isMinimax = provider === 'minimax' || base.indexOf('minimax') !== -1;
    var isEleven = provider === 'elevenlabs' || base.indexOf('elevenlabs.io') !== -1;

    var fetchUrl = '';
    var fetchHeaders = {};
    var fetchBody = '';

    var text = (textToSpeak || '').trim();
    if (!text) {
      var lastAi = null;
      for (var i = c.messages.length - 1; i >= 0; i--) {
        if (c.messages[i].role === 'assistant' && c.messages[i].text) {
          lastAi = c.messages[i];
          break;
        }
      }
      if (lastAi) {
        var pMsg = parseMessageContent(lastAi.text);
        text = pMsg.body || lastAi.text;
      } else {
        text = c.greeting || '你好呀，今天想跟我聊些什么呢？';
      }
    }

    var cleanSpeech = text.replace(/\([^\)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
    if (!cleanSpeech) cleanSpeech = text;

    toast('正在为 ' + getCharDisplayName(c) + ' 生成专属语音……');

    if (isMinimax) {
      var urlObj = base.replace(/\/+$/, '');
      if (urlObj.indexOf('/t2a_v2') === -1) {
        fetchUrl = urlObj + '/t2a_v2';
      } else {
        fetchUrl = urlObj;
      }
      if (groupId && fetchUrl.indexOf('GroupId=') === -1) {
        fetchUrl += (fetchUrl.indexOf('?') === -1 ? '?' : '&') + 'GroupId=' + encodeURIComponent(groupId);
      }
      fetchHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      };
      fetchBody = JSON.stringify({
        model: model || 'speech-02-hd',
        text: cleanSpeech,
        stream: false,
        voice_setting: {
          voice_id: charVoiceId || 'qingnian1_max',
          speed: 1.0,
          vol: 1.0,
          pitch: 0
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1
        }
      });
    } else if (isEleven) {
      var eUrl = base.replace(/\/+$/, '');
      var vId = charVoiceId || 'AsKyuFhJ2EuOMhWsc4Xq';
      if (eUrl.indexOf('/text-to-speech') === -1) {
        fetchUrl = eUrl + '/text-to-speech/' + encodeURIComponent(vId);
      } else {
        fetchUrl = eUrl;
      }
      fetchHeaders = {
        'Content-Type': 'application/json',
        'xi-api-key': key
      };
      fetchBody = JSON.stringify({
        text: cleanSpeech,
        model_id: model || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      });
    } else {
      var oUrl = base.replace(/\/+$/, '');
      if (oUrl.indexOf('/audio/speech') === -1) {
        fetchUrl = oUrl + '/audio/speech';
      } else {
        fetchUrl = oUrl;
      }
      fetchHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      };
      fetchBody = JSON.stringify({
        model: model || 'tts-1',
        input: cleanSpeech,
        voice: charVoiceId || 'alloy'
      });
    }

    fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: fetchBody
    }).then(function(resp) {
      if (!resp.ok) {
        return resp.text().then(function(t) {
          throw new Error('HTTP ' + resp.status + ': ' + t.slice(0, 100));
        });
      }
      var contentType = resp.headers.get('content-type') || '';
      if (contentType.indexOf('application/json') !== -1) {
        return resp.json().then(function(json) {
          if (json.data && json.data.audio) {
            var hex = json.data.audio;
            var bytes = new Uint8Array(hex.length / 2);
            for (var i = 0; i < hex.length; i += 2) {
              bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
            }
            return new Blob([bytes], { type: 'audio/mp3' });
          } else if (json.audio_base64) {
            var bin = atob(json.audio_base64);
            var bArr = new Uint8Array(bin.length);
            for (var j = 0; j < bin.length; j++) bArr[j] = bin.charCodeAt(j);
            return new Blob([bArr], { type: 'audio/mp3' });
          } else if (json.base_resp && json.base_resp.status_code !== 0) {
            throw new Error('MiniMax 返回错误: ' + json.base_resp.status_msg);
          } else {
            throw new Error('返回 JSON 但未找到有效音频流');
          }
        });
      }
      return resp.blob();
    }).then(function(blob) {
      var audioUrl = URL.createObjectURL(blob);
      var estSec = Math.max(2, Math.min(60, Math.round(cleanSpeech.length * 0.28 + 1)));
      
      c.messages.push({
        role: 'assistant',
        type: 'voice',
        audioUrl: audioUrl,
        duration: estSec,
        text: cleanSpeech,
        time: time()
      });
      save();
      renderMessages(c);
      playAudio(audioUrl);
      toast('已收到 ' + getCharDisplayName(c) + ' 发来的语音消息 🎵');
    }).catch(function(err) {
      console.error('Voice generation error:', err);
      toast('❌ 语音生成失败: ' + err.message);
    });
  }

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
    if ($('chatCustomVoicePreset')) $('chatCustomVoicePreset').value = c.voicePreset || '';
    if ($('chatCustomVoiceId')) $('chatCustomVoiceId').value = c.voiceId || '';

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
    } else if (act === 'voice') {
      var userSpeechText = prompt('输入你想通过语音对 ' + getCharDisplayName(c) + ' 说的话（将模拟你的语音条发送）:', '');
      if (userSpeechText && userSpeechText.trim()) {
        var cleanUsrSpeech = userSpeechText.trim();
        var estSec = Math.max(2, Math.min(60, Math.round(cleanUsrSpeech.length * 0.28 + 1)));
        c.messages.push({
          role: 'user',
          type: 'voice',
          duration: estSec,
          text: cleanUsrSpeech,
          time: time()
        });
        save();
        renderMessages(c);
        render();
      }
    } else if (act === 'video') {
      toast('视频通话即将接入');
    } else if (act === 'sticker') {
      toast('发送表情包功能即将接入');
    }
  };


  // 高性能纯前端快速图片压缩（避免大图几兆直接转base64卡死页面）
  function compressImageFast(file, maxWidth, maxHeight, quality) {
    maxWidth = maxWidth || 1280;
    maxHeight = maxHeight || 1280;
    quality = quality || 0.82;
    return new Promise(function(resolve, reject) {
      if (window.createImageBitmap) {
        createImageBitmap(file).then(function(bitmap) {
          var w = bitmap.width, h = bitmap.height;
          if (w > maxWidth || h > maxHeight) {
            if (w / h > maxWidth / maxHeight) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            } else {
              w = Math.round((w * maxHeight) / h);
              h = maxHeight;
            }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        }).catch(function() {
          fallbackReader();
        });
      } else {
        fallbackReader();
      }

      function fallbackReader() {
        var reader = new FileReader();
        reader.onload = function(e) {
          var img = new Image();
          img.onload = function() {
            var w = img.width, h = img.height;
            if (w > maxWidth || h > maxHeight) {
              if (w / h > maxWidth / maxHeight) {
                h = Math.round((h * maxWidth) / w);
                w = maxWidth;
              } else {
                w = Math.round((w * maxHeight) / h);
                h = maxHeight;
              }
            }
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  }

  // 监听发送本地图片（极速流式压缩上屏）
  if ($('chatImageInput')) {
    $('chatImageInput').onchange = function(e) {
      var f = e.target.files && e.target.files[0];
      var c = character(activeId);
      if (!f || !c) return;
      if (f.size > 25 * 1024 * 1024) { toast('图片请小于 25MB'); return; }
      
      // 异步快速轻量压缩，毫秒级上屏；用户发图后不生成任何默认假回复，必须由用户点击右下角续写/API回复才触发！
      compressImageFast(f, 1280, 1280, 0.82).then(function(compressedUrl) {
        c.messages.push({
          role: 'user',
          type: 'image',
          mediaUrl: compressedUrl,
          time: time()
        });
        save();
        renderMessages(c);
      }).catch(function(err) {
        toast('图片处理失败: ' + (err.message || err));
      });
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
      toast('已发送文件: ' + f.name);
    };
  }
  // 通话按钮
  $('chatCallBtn').onclick = function() { var c = character(activeId); if (c) generateCharVoiceMessage(c); else toast('未选定角色'); };
  $('chatVideoBtn').onclick = function() { toast('视频通话即将接入'); };
  // API 回复按钮
  $('apiReplyBtn').onclick = function() {
    var c = character(activeId);
    if (!c) return;
    
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
      // 9. 精准分流：如果是点击圆形头像，唤起角色卡编辑
      var avatarTrigger = e.target.closest('[data-char-edit]');
      if (avatarTrigger) {
        e.preventDefault();
        e.stopPropagation();
        var charId = avatarTrigger.getAttribute('data-char-edit');
        activeId = charId;
        initChatThemeModal();
        showModal('chatThemeModal');
        toast('进入角色卡设置');
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


  // === 全局侧边栏菜单与模态框绑定 (双重强保障) ===
  document.querySelectorAll('[data-open]').forEach(function(b) {
    b.onclick = function(e) {
      e.stopPropagation();
      var target = b.dataset.open;
      if (target === 'api') { fillApi(); showModal('apiModal'); }
      else if (target === 'voice') { openVoiceModal(); }
      else if (target === 'persona') { openUserPersonaModal(); }
      else if (target === 'profile') { fillProfile(); showModal('profileModal'); }
      else if (target === 'character') { showModal('characterModal'); }
    };
  });

  if ($('openUserPersonaBtn')) {
    $('openUserPersonaBtn').onclick = function(e) {
      e.stopPropagation();
      openUserPersonaModal();
    };
  }
  if ($('voiceBtn')) {
    $('voiceBtn').onclick = function(e) {
      e.stopPropagation();
      openVoiceModal();
    };
  }


  
  // 角色专属声音预设联动
  if ($('chatCustomVoicePreset')) {
    $('chatCustomVoicePreset').onchange = function() {
      var val = this.value;
      if (CHAR_VOICE_PRESETS[val]) {
        if ($('chatCustomVoiceId')) $('chatCustomVoiceId').value = CHAR_VOICE_PRESETS[val].voiceId;
        toast('已选定音色: ' + CHAR_VOICE_PRESETS[val].voiceId);
      }
    };
  }

  // 点击主页圆形大头像：进入角色设置！
  if ($('profileAvatar')) {
    $('profileAvatar').style.cursor = 'pointer';
    $('profileAvatar').onclick = function(e) {
      e.stopPropagation();
      if (!activeId && state.characters && state.characters.length) {
        activeId = state.characters[0].id;
      }
      if (activeId) {
        initChatThemeModal();
        showModal('chatThemeModal');
        toast('进入角色卡设置');
      } else {
        showModal('characterModal');
      }
    };
  }

  // 点击聊天界面顶栏头像：进入角色设置！
  if ($('chatAvatar')) {
    $('chatAvatar').style.cursor = 'pointer';
    $('chatAvatar').onclick = function(e) {
      e.stopPropagation();
      initChatThemeModal();
      showModal('chatThemeModal');
    };
  }

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

  
  var DEFAULT_API_PRESETS = [
    { id: 'gemai', name: '格脉 (api.gemai.cc) / gpt-4o', base: 'https://api.gemai.cc/v1', key: '', model: 'gpt-4o' },
    { id: 'openai', name: 'OpenAI 官方 (api.openai.com) / gpt-4o', base: 'https://api.openai.com/v1', key: '', model: 'gpt-4o' },
    { id: 'deepseek', name: 'DeepSeek 官方 (api.deepseek.com) / deepseek-chat', base: 'https://api.deepseek.com/v1', key: '', model: 'deepseek-chat' },
    { id: 'siliconflow', name: '硅基流动 (api.siliconflow.cn) / deepseek-v3', base: 'https://api.siliconflow.cn/v1', key: '', model: 'deepseek-ai/DeepSeek-V3' },
    { id: 'openrouter', name: 'OpenRouter (openrouter.ai/api/v1)', base: 'https://openrouter.ai/api/v1', key: '', model: 'anthropic/claude-3.5-sonnet' }
  ];

  function getStoredApiPresets() {
    var stored = localStorage.getItem('Revery_saved_api_presets');
    if (stored) {
      try { return JSON.parse(stored); } catch(e) {}
    }
    return DEFAULT_API_PRESETS;
  }

  function renderApiPresetOptions() {
    var sel = $('apiPresetSelect');
    if (!sel) return;
    var list = getStoredApiPresets();
    sel.innerHTML = '<option value="">-- 选择预设或快速切换 --</option>' + list.map(function(p, i) {
      return '<option value="' + i + '">' + esc(p.name) + '</option>';
    }).join('');
  }

  function fillApi() {
    var a = state.api || {};
    $('apiName').value = a.name || '';
    $('apiBase').value = a.base || '';
    $('apiKey').value = a.key || '';
    $('apiModel').value = a.model || '';
    renderApiPresetOptions();
  }

  if ($('apiPresetSelect')) {
    $('apiPresetSelect').onchange = function() {
      var idx = this.value;
      if (idx !== '') {
        var list = getStoredApiPresets();
        var p = list[parseInt(idx, 10)];
        if (p) {
          $('apiName').value = p.name;
          $('apiBase').value = p.base;
          if (p.key) $('apiKey').value = p.key;
          $('apiModel').value = p.model;
          toast('已切换至预设: ' + p.name);
        }
      }
    };
  }

  if ($('saveApiAsPresetBtn')) {
    $('saveApiAsPresetBtn').onclick = function() {
      var name = ($('apiName').value.trim()) || prompt('请输入此 API 预设的名称:', '我的中转站');
      if (!name) return;
      var base = $('apiBase').value.trim();
      var key = $('apiKey').value.trim();
      var model = $('apiModel').value.trim() || 'gpt-4o';
      if (!base) { toast('请先填写 Base URL'); return; }

      var list = getStoredApiPresets();
      list.unshift({
        id: 'p_' + Date.now(),
        name: name,
        base: base,
        key: key,
        model: model
      });
      localStorage.setItem('Revery_saved_api_presets', JSON.stringify(list));
      renderApiPresetOptions();
      $('apiPresetSelect').value = '0';
      toast('✅ 预设「' + name + '」已永久保存！');
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
    if ($('chatCustomVoicePreset')) {
      c.voicePreset = $('chatCustomVoicePreset').value;
    }
    if ($('chatCustomVoiceId')) {
      c.voiceId = $('chatCustomVoiceId').value.trim();
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
    var userGaveRemark = c.remarkName ? ('用户私下为你设置的爱称/备注是: 「' + c.remarkName + '」；') : '';
    systemPrompt += '\n[当前身份环境] 你的官方角色名是: ' + (c.name || charName) + '；' + userGaveRemark + '当前顶栏显示名称是: ' + charName + '；用户的名字/称呼是: ' + userName + '。请严格保持该人设。在对话和心声中，你知道用户对你的称谓。';

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
    // 深度融合《真实人类存在与自然交互全景法则 (活人感重构)》与动态思维外壳
    systemPrompt += '\n\n【真实人类存在与活人感自然交互全景法则】\n' +
      '1. 生理存在与物理重力法则：\n' +
      '   - 你的所有言行和心理，都必须依托肉身生理感知（低温指节发僵、疲惫眼皮发沉、呼吸短促或喉头干涩、饥饿缺乏耐性），绝不凌驾于现实之上空谈心境。\n' +
      '   - 物质交互具备重力与阻力：推门有合页阻力，端茶感知水温与重量，拉抽屉有滑轨声，坐下有承重反馈。动作必须落在具体物件上，杜绝悬浮虚无。\n' +
      '   - 精力极限打破完美恒定：人类有注意力游离、记忆模糊、疲惫冷淡、说错话或暂时的烦躁，严禁时刻维持全知全能或情绪恒定的客服状态。\n\n' +
      '2. 动作化还原与性格去标签：\n' +
      '   - 封杀主观性格形容词与自吹自擂。你的性格只能通过面对具体阻碍时的动作选择体现（克制冷淡表现为反应延迟手头动作不停；体贴温和表现为避开锋芒、顺手掩门、递温水毫无恩赐感；经历沉淀为身体肌肉记忆）。\n' +
      '   - 引入生理干扰展现人性脆弱：连续熬夜或胃痛时寡言想切断声音；赶时间被延误或手指划破时呼吸粗重凌乱。\n\n' +
      '3. 时序差与身心错位法则：\n' +
      '   - 生理反应快于后天理智：心烦又无可奈何体现为眉心骤紧叹气垮肩；强装镇定体现为端杯手指微僵、放稳茶杯才抬眼。\n' +
      '   - 言行背离呈现内心真实：嘴上说着生硬推脱，手上却顺手替对方解决麻烦；遭遇变故不歇斯底里，只是极其机械专注地抚平手边纸页。\n\n' +
      '4. 旁白克制与通感意象边界：\n' +
      '   - 旁白白描克制，聚焦于一两个最具穿透力的局部细节（未系紧的领口、磨旧的皮带扣），在动作完成后立刻住嘴，绝不附加概括性的心情陈述。\n' +
      '   - 通感打破平庸，将声响写出质感，写出暮色与温度，意象呈现后不做自我解说。\n\n' +
      '5. 自然口语与日常社交空气感：\n' +
      '   - 对话专属于生活碎语与极简口语：遵循主题优先原则，情绪与核心判断先脱口而出，补充条件作为补丁倒装句末；省略冗余主语，不用严密书面关联词；日常口语绝不出现波浪号、破折号和重复感叹号。\n' +
      '   - 消除支配幻想与欠账机制：人与人是平等的碰撞，产生摩擦陈述客观事实，不搞虚张声势，也不过度道歉讨好。\n' +
      '   - 网络流行梗与无厘头话头属于情绪垫片，以生活直觉轻松顺应或随口闲聊，绝不进行严肃的逻辑质问与纠错。\n\n' +
      '【动态思维过程外壳·因人因境而异的此刻状态】\n' +
      '每次回复前，必须先输出思考过程，且必须严格使用以下外壳包裹：\n' +
      '<details>\n' +
      '<summary>' + charName + '此刻真实状态</summary>\n' +
      '内心思维独白（长段连贯真实的思维流动，包含真实的生理知觉、身心错位、对' + userName + '的真实情感与念头）\n' +
      '</details>\n' +
      '⚠️ 极其重要的格式铁律：\n' +
      '1. <summary> 标签内的文字必须是你【此刻正在做的事情、生理状态或心理波动】，绝对禁止使用千篇一律的固定词！每轮都必须根据对话场景和当下的具体动作实时生成，例如：\n' +
      '   - 「' + charName + '指尖发凉，低头摆弄打火机」\n' +
      '   - 「' + charName + '看着屏幕有些愣神」\n' +
      '   - 「' + charName + '揉了揉发沉的鼻梁」\n' +
      '   - 「' + charName + '喉结微动，把视线移向窗外」\n' +
      '   - 「' + charName + '偷偷心软了」\n' +
      '   - 「' + charName + '正咬着烟嘴出神」\n' +
      '2. <details> 结束后，换行输出正式的回复正文。正文与口语严格遵循上述活人感全景法则！\n\n' +
      '【格式要求】请务必在每次回复的最开头输出用 <details><summary>' + charName + '的心声</summary>[在此写上述连贯的长段落独白]</details> 包裹你的思考链；思考闭合后，再输出对' + userName + '说的正文气泡内容。正文多句话之间使用双换行分隔以便分条发送。';

    
    // 赋予 AI 自然发语音的能力
    systemPrompt += '\n\n【发语音能力协议】\n' +
      '你完全具备像真人一样随时发语音消息的能力。当你觉得打字不够传达语气、想轻声叹气、撒娇、说悄悄话、或者语境更适合发语音条时，可以在回复的最后加上 `[VOICE: 你想用语音轻声说的那句话]`（注意：必须是真切的一两句新话，不要机械重复正文！）。系统会自动调用你的专属声音合成真实语音条发给用户！';

    apiMessages.push({ role: 'system', content: systemPrompt });

    // 取最近 16 条消息上下文
    var recent = c.messages.slice(-20);
    recent.forEach(function(m) {
      if (m.role === 'system') return;
      var prefix = '';
      if (m.quote) {
        prefix = '[引用了' + (m.quote.sender === 'user' ? '用户' : '你') + '的消息: "' + m.quote.text + '"]\n';
      }

      // 如果是图片消息，组装多模态 Vision 格式 (OpenAI vision 协议：text + image_url)
      if (m.type === 'image' && m.mediaUrl) {
        var textPart = prefix + (m.text ? m.text : '（用户发送了一张图片，请仔细观察这张图片的内容并结合人设进行自然生动的回应）');
        apiMessages.push({
          role: m.role || 'user',
          content: [
            { type: 'text', text: textPart },
            { type: 'image_url', image_url: { url: m.mediaUrl } }
          ]
        });
        return;
      }

      var contentText = prefix + (m.text || '');
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
        // 插入系统灰条通知［角色卡名字给你改成了 (xxx)］
        c.messages.push({
          role: 'system',
          text: '[' + (c.name || '角色') + ' 给你改成了 (' + newUserRemark + ')]',
          time: time()
        });
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

      // 检查是否有自主发语音指令 [VOICE: xxx]
      var voiceMatch = bodyText.match(/\[VOICE:\s*([^\]]+)\]/);
      var aiVoiceText = '';
      if (voiceMatch) {
        aiVoiceText = voiceMatch[1].trim();
        bodyText = bodyText.replace(/\[VOICE:\s*[^\]]+\]/g, '').trim();
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

      if (aiVoiceText) {
        setTimeout(function() {
          generateCharVoiceMessage(c, aiVoiceText);
        }, 600);
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
    // 发送消息只更新当前聊天气泡，不再强行触发主页全部卡片与故事重绘，极大提升顺滑度
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
    // 监听系统返回手势/物理返回键
    var modalOpen = document.querySelector('.modal.show');
    if (modalOpen) {
      modalOpen.classList.remove('show');
      e.preventDefault();
      return;
    }
    var drawerOpen = $('drawer') && $('drawer').classList.contains('open');
    if (drawerOpen) {
      closeDrawer();
      e.preventDefault();
      return;
    }
    var plusOpen = $('plusPanel') && $('plusPanel').classList.contains('open');
    if (plusOpen) {
      $('plusPanel').classList.remove('open');
      e.preventDefault();
      return;
    }
    var chatOpen = $('chatPage') && $('chatPage').classList.contains('show');
    if (chatOpen) {
      $('chatPage').classList.remove('show');
      activeId = null;
      e.preventDefault();
      return;
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

  // === 声音与语音服务 (Voice Engine) 逻辑与试听测试 ===
  var VOICE_PRESETS = {
    'minimax': { 
      name: 'MiniMax 官方开放平台 (t2a_v2)', 
      base: 'https://api.minimax.chat/v1/t2a_v2', 
      model: 'speech-02-hd', 
      voiceId: 'qingnian1_max' 
    },
    'elevenlabs': { 
      name: 'ElevenLabs 官方情绪拟真语音', 
      base: 'https://api.elevenlabs.io/v1', 
      model: 'eleven_multilingual_v2', 
      voiceId: '7klAjt7mJgqnarhbNXDG' 
    },
    'mossland': { 
      name: 'Mossland 官方/聚合语音', 
      base: 'https://api.mossland.com/v1', 
      model: 'tts-1', 
      voiceId: 'alloy' 
    },
    'custom': { 
      name: '自定义接口 (OpenAI /v1/audio/speech 规范)', 
      base: '', 
      model: '', 
      voiceId: '' 
    }
  };

  
  function fillVoice() {
    var v = state.voice || defaults.voice;
    if ($('voicePresetSelect')) $('voicePresetSelect').value = v.provider || '';
    if ($('voiceBase')) $('voiceBase').value = v.base || '';
    if ($('voiceKey')) $('voiceKey').value = v.key || '';
    if ($('voiceGroupId')) $('voiceGroupId').value = v.groupId || '';
    if ($('voiceModel')) $('voiceModel').value = v.model || '';
    if ($('voiceTestStatus')) $('voiceTestStatus').textContent = '';
  }

  function openVoiceModal() {
    fillVoice();
    showModal('voiceModal');
  }

  if ($('voicePresetSelect')) {
    $('voicePresetSelect').onchange = function() {
      var val = this.value;
      if (VOICE_PRESETS[val]) {
        var p = VOICE_PRESETS[val];
        if (p.base && $('voiceBase')) $('voiceBase').value = p.base;
        if (p.model && $('voiceModel')) $('voiceModel').value = p.model;
        if (p.voiceId && $('voiceId')) $('voiceId').value = p.voiceId;
        toast('已载入 ' + p.name + ' 预设');
      }
    };
  }

    function playAudio(url) {
    var player = $('voiceAudioPlayer');
    if (!player) {
      player = document.createElement('audio');
      player.id = 'voiceAudioPlayer';
      document.body.appendChild(player);
    }
    player.src = url;
    return player.play().catch(function(e) {
      console.warn('Audio play prevented:', e);
    });
  }

  if ($('voiceTestBtn')) {
    $('voiceTestBtn').onclick = function() {
      var text = ($('voiceTestText') && $('voiceTestText').value.trim()) || '你好呀，能听到我的声音吗？';
      var base = ($('voiceBase') && $('voiceBase').value.trim()) || '';
      var key = ($('voiceKey') && $('voiceKey').value.trim()) || '';
      var model = ($('voiceModel') && $('voiceModel').value.trim()) || 'speech-02-hd';
      var voiceId = ($('voiceId') && $('voiceId').value.trim()) || 'qingnian1_max';
      var provider = ($('voicePresetSelect') && $('voicePresetSelect').value) || '';
      var statusEl = $('voiceTestStatus');

      if (statusEl) statusEl.textContent = '正在发起请求……';
      $('voiceTestBtn').disabled = true;

      if (!key) {
        if (statusEl) statusEl.textContent = '❌ 请先填入 API Key 才能进行在线语音合成！';
        $('voiceTestBtn').disabled = false;
        return;
      }

      // 提取 GroupId (如果有)
      var groupId = ($('voiceGroupId') && $('voiceGroupId').value.trim()) || '';
      if (!groupId) {
        var gMatch = base.match(/[?&]GroupId=([^&#]+)/i);
        if (gMatch) groupId = gMatch[1];
      }

      // 判断提供商
      var isMinimax = provider === 'minimax' || base.indexOf('minimax') !== -1;
      var isEleven = provider === 'elevenlabs' || base.indexOf('elevenlabs.io') !== -1;
      var fetchUrl = '';
      var fetchHeaders = {};
      var fetchBody = '';

      if (isMinimax) {
        // MiniMax 规范：支持 api.minimax.chat 或 api.minimaxi.com
        // 确保端点为 /v1/t2a_v2
        var cleanBase = base.split('?')[0].replace(/\/v1\/t2a_v2\/?$/, '').replace(/\/t2a_v2\/?$/, '').replace(/\/v1\/?$/, '');
        if (!cleanBase) cleanBase = 'https://api.minimax.chat';
        fetchUrl = cleanBase + '/v1/t2a_v2' + (groupId ? ('?GroupId=' + encodeURIComponent(groupId)) : '');
        fetchHeaders = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        };
        fetchBody = JSON.stringify({
          model: model || 'speech-02-hd',
          text: text,
          stream: false,
          voice_setting: {
            voice_id: voiceId || 'qingnian1_max',
            speed: 1,
            vol: 1,
            pitch: 0,
            emotion: 'neutral'
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3',
            channel: 1
          }
        });
      } else if (isEleven) {
        var elBase = base ? base.replace(/\/v1\/?$/, '') : 'https://api.elevenlabs.io';
        var actualVoiceId = voiceId || '7klAjt7mJgqnarhbNXDG';
        fetchUrl = elBase + '/v1/text-to-speech/' + encodeURIComponent(actualVoiceId);
        fetchHeaders = {
          'Content-Type': 'application/json',
          'xi-api-key': key
        };
        fetchBody = JSON.stringify({
          text: text,
          model_id: model || 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
          }
        });
      } else {
        var cleanBase = (base || 'https://api.openai.com/v1').replace(/\/audio\/speech\/?$/, '').replace(/\/v1\/?$/, '') + '/v1';
        fetchUrl = cleanBase + '/audio/speech';
        fetchHeaders = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        };
        fetchBody = JSON.stringify({
          model: model || 'tts-1',
          input: text,
          voice: voiceId || 'alloy'
        });
      }

      if (statusEl) statusEl.textContent = '请求目标 [' + fetchUrl + '] 合成中……';

      fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: fetchBody
      }).then(function(resp) {
        if (!resp.ok) {
          return resp.text().then(function(errTxt) {
            var detail = '';
            try {
              var jsonErr = JSON.parse(errTxt);
              detail = (jsonErr.base_resp && jsonErr.base_resp.status_msg) || (jsonErr.error && jsonErr.error.message) || jsonErr.message || jsonErr.detail || errTxt;
            } catch(e) {
              detail = errTxt;
            }
            throw new Error('HTTP ' + resp.status + ' | URL: ' + fetchUrl + ' (' + (detail.slice(0, 100)) + ')');
          });
        }
        var ctype = resp.headers.get('content-type') || '';
        if (ctype.indexOf('application/json') !== -1 || isMinimax) {
          return resp.json().then(function(data) {
            if (data.base_resp && data.base_resp.status_code !== 0) {
              throw new Error('MiniMax Code ' + data.base_resp.status_code + ': ' + data.base_resp.status_msg);
            }
            if (data.data && data.data.audio) {
              var hex = data.data.audio;
              var bytes = new Uint8Array(hex.length / 2);
              for (var i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
              }
              return new Blob([bytes], { type: 'audio/mp3' });
            } else if (data.data && data.data.audio_file) {
              return fetch(data.data.audio_file).then(function(r) { return r.blob(); });
            } else if (data.audio_url) {
              return fetch(data.audio_url).then(function(r) { return r.blob(); });
            }
            throw new Error('响应未包含有效音频数据');
          });
        }
        return resp.blob();
      }).then(function(blob) {
        var audioUrl = URL.createObjectURL(blob);
        playAudio(audioUrl);
        if (statusEl) statusEl.textContent = '✅ 合成成功！音频正常播放中……';
      }).catch(function(err) {
        if (statusEl) statusEl.textContent = '❌ 请求失败: ' + err.message;
      }).finally(function() {
        $('voiceTestBtn').disabled = false;
      });
    };
  }

  
  if ($('saveVoiceBtn')) {
    $('saveVoiceBtn').onclick = function() {
      if (!state.voice) state.voice = clone(defaults.voice);
      state.voice.provider = ($('voicePresetSelect') && $('voicePresetSelect').value) || 'custom';
      state.voice.base = ($('voiceBase') && $('voiceBase').value.trim()) || '';
      state.voice.key = ($('voiceKey') && $('voiceKey').value.trim()) || '';
      state.voice.groupId = ($('voiceGroupId') && $('voiceGroupId').value.trim()) || '';
      state.voice.model = ($('voiceModel') && $('voiceModel').value.trim()) || 'speech-02-hd';
      save();
      closeModals();
      toast('声音与语音服务设置已保存！');
    };
  }


  

  // 聊天气泡内语音条点击事件委托绑定
  document.addEventListener('click', function(e) {
    var voiceWrap = e.target.closest('.voice-bubble-wrap');
    if (!voiceWrap) return;
    var audioSrc = voiceWrap.getAttribute('data-audio-src');
    var isPlaying = voiceWrap.classList.contains('playing');
    
    document.querySelectorAll('.voice-bubble-wrap.playing').forEach(function(el) {
      el.classList.remove('playing');
      var pIcon = el.querySelector('.voice-pause-icon');
      var sIcon = el.querySelector('.voice-play-icon');
      if (pIcon) pIcon.style.display = 'none';
      if (sIcon) sIcon.style.display = 'block';
    });

    if (isPlaying) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      var p = $('voiceAudioPlayer');
      if (p) { p.pause(); p.currentTime = 0; }
      return;
    }

    voiceWrap.classList.add('playing');
    var playIcon = voiceWrap.querySelector('.voice-play-icon');
    var pauseIcon = voiceWrap.querySelector('.voice-pause-icon');
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';

    if (audioSrc) {
      var p = $('voiceAudioPlayer');
      if (p) {
        p.src = audioSrc;
        p.play();
        p.onended = function() {
          voiceWrap.classList.remove('playing');
          if (playIcon) playIcon.style.display = 'block';
          if (pauseIcon) pauseIcon.style.display = 'none';
        };
      }
    } else {
      toast('未配置真实语音接口');
      setTimeout(function() {
        voiceWrap.classList.remove('playing');
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
      }, 3500);
    }
  });

  save();
  applyTheme();
  render();
})();
  // 主题页面独立代码的最小兼容层：不触碰主程序闭包内的其他逻辑
  function $(id) { return document.getElementById(id); }
  function closeDrawer() {
    var drawer = document.getElementById('drawer');
    if (drawer) drawer.classList.remove('open');
  }
  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 2200);
  }

  // 屏蔽长按弹出的系统复制/分享/下载浮窗
  window.addEventListener('contextmenu', function(e) {
    try {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    } catch(err){}
  }, { capture: true });



  // =========================================================================
  // 全屏主题与外观独立页面 (全屏沉浸，非弹窗，全局生效)
  // =========================================================================
  function applyGlobalThemeSettings(settings) {
    if (!settings) {
      try { settings = JSON.parse(localStorage.getItem('Revery_global_theme_settings')) || {}; } catch(e) { settings = {}; }
    }
    var font = settings.font || '';
    var fontSize = settings.fontSize || '13.5';
    var bubbleRadius = settings.bubbleRadius || '12';
    var customCss = settings.customCss || '';

    var styleEl = document.getElementById('Revery-global-dynamic-theme-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'Revery-global-dynamic-theme-style';
      document.head.appendChild(styleEl);
    }

    var cssRules = '';
    if (font) {
      cssRules += 'html, body, button, input, textarea, select, .bubble, .chat-title, .msg-body { font-family: ' + font + ' !important; }\n';
    }
    if (fontSize) {
      cssRules += '.bubble, .msg-body { font-size: ' + fontSize + 'px !important; }\n';
    }
    if (bubbleRadius) {
      cssRules += '.bubble, .cv-bubble-user, .cv-bubble-ai { border-radius: ' + bubbleRadius + 'px !important; }\n';
    }
    if (customCss) {
      cssRules += '\n/* 用户自定义全局 CSS */\n' + customCss + '\n';
    }

    styleEl.innerHTML = cssRules;
  }

  function initGlobalThemePage() {
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('Revery_global_theme_settings')) || {}; } catch(e) {}
    
    if ($('globalFontSelect')) {
      var curFont = settings.font || '';
      var matched = false;
      for (var i = 0; i < $('globalFontSelect').options.length; i++) {
        if ($('globalFontSelect').options[i].value === curFont) {
          $('globalFontSelect').selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && curFont) {
        $('globalFontSelect').value = 'custom';
        if ($('customFontField')) $('customFontField').style.display = 'block';
        if ($('customFontInput')) $('customFontInput').value = curFont;
      } else {
        if ($('customFontField')) $('customFontField').style.display = 'none';
      }
    }

    if ($('globalFontSizeRange')) {
      $('globalFontSizeRange').value = settings.fontSize || '13.5';
      if ($('fontSizeDisplay')) $('fontSizeDisplay').textContent = (settings.fontSize || '13.5') + 'px';
    }

    if ($('globalBubbleRadiusRange')) {
      $('globalBubbleRadiusRange').value = settings.bubbleRadius || '12';
      if ($('bubbleRadiusDisplay')) $('bubbleRadiusDisplay').textContent = (settings.bubbleRadius || '12') + 'px';
    }

    if ($('globalCustomCss')) {
      $('globalCustomCss').value = settings.customCss || '';
    }
  }

  // 绑定侧边栏“主题与聊天气泡”按钮直达全屏新页面
  if ($('globalThemeBtn')) {
    $('globalThemeBtn').onclick = function(e) {
      e.stopPropagation();
      closeDrawer();
      initGlobalThemePage();
      if ($('themePage')) $('themePage').classList.add('show');
    };
  }

  if ($('themePageBackBtn')) {
    $('themePageBackBtn').onclick = function() {
      if ($('themePage')) $('themePage').classList.remove('show');
    };
  }

  if ($('globalFontSelect')) {
    $('globalFontSelect').onchange = function() {
      if (this.value === 'custom') {
        if ($('customFontField')) $('customFontField').style.display = 'block';
      } else {
        if ($('customFontField')) $('customFontField').style.display = 'none';
      }
    };
  }

  if ($('globalFontSizeRange')) {
    $('globalFontSizeRange').oninput = function() {
      if ($('fontSizeDisplay')) $('fontSizeDisplay').textContent = this.value + 'px';
    };
  }

  if ($('globalBubbleRadiusRange')) {
    $('globalBubbleRadiusRange').oninput = function() {
      if ($('bubbleRadiusDisplay')) $('bubbleRadiusDisplay').textContent = this.value + 'px';
    };
  }

  if ($('saveGlobalThemeBtn')) {
    $('saveGlobalThemeBtn').onclick = function() {
      var font = '';
      if ($('globalFontSelect')) {
        if ($('globalFontSelect').value === 'custom') {
          font = ($('customFontInput') && $('customFontInput').value.trim()) || '';
        } else {
          font = $('globalFontSelect').value;
        }
      }
      var fontSize = ($('globalFontSizeRange') && $('globalFontSizeRange').value) || '13.5';
      var bubbleRadius = ($('globalBubbleRadiusRange') && $('globalBubbleRadiusRange').value) || '12';
      var customCss = ($('globalCustomCss') && $('globalCustomCss').value) || '';

      var settings = {
        font: font,
        fontSize: fontSize,
        bubbleRadius: bubbleRadius,
        customCss: customCss
      };
      localStorage.setItem('Revery_global_theme_settings', JSON.stringify(settings));
      applyGlobalThemeSettings(settings);
      if ($('themePage')) $('themePage').classList.remove('show');
      toast('全站主题与字体设置已全局生效！');
    };
  }

  // 页面启动时自载入全站主题
  try { applyGlobalThemeSettings(); } catch(e) {}



// =========================================================================
// 终极事件委托保底：无论何时点击“主题与聊天气泡”，均稳定全屏滑入主题页面
// =========================================================================
(function initGlobalThemeDelegation() {
  function openThemeFullPage() {
    var dr = document.getElementById('drawer');
    if (dr) dr.classList.remove('open');
    if (typeof initGlobalThemePage === 'function') {
      try { initGlobalThemePage(); } catch(e) {}
    }
    var tp = document.getElementById('themePage');
    if (tp) {
      tp.classList.add('show');
      try { history.pushState({ page: 'themePage' }, '', '#theme'); } catch(e) {}
    }
  }

  document.addEventListener('click', function(e) {
    var btn = e.target && e.target.closest && e.target.closest('#globalThemeBtn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      openThemeFullPage();
    }
    var backBtn = e.target && e.target.closest && e.target.closest('#themePageBackBtn');
    if (backBtn) {
      e.preventDefault();
      e.stopPropagation();
      var tp = document.getElementById('themePage');
      if (tp) tp.classList.remove('show');
      if (location.hash === '#theme') history.back();
    }
  }, true);
})();


// 本地字体管理器：使用 IndexedDB 存储大字体文件，突破 localStorage 5MB 限制
var ReveryFontManager = (function() {
  var DB_NAME = 'ReveryFontDB', STORE = 'fonts', KEY = 'activeFont', FONT_FAMILY = 'ReveryCustomUploadedFont';
  var currentBlobUrl = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (!window.indexedDB) return reject(new Error('no indexedDB'));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e); };
    });
  }

  function saveFont(file) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        var store = tx.objectStore(STORE);
        store.put({ id: KEY, blob: file, name: file.name, type: file.type, time: Date.now() });
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function(e) { reject(e); };
      });
    });
  }

  function getFont() {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var store = tx.objectStore(STORE);
        var req = store.get(KEY);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { resolve(null); };
      });
    }).catch(function() { return null; });
  }

  function deleteFont() {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        var store = tx.objectStore(STORE);
        store.delete(KEY);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function(e) { reject(e); };
      });
    }).catch(function() {});
  }

  function applyFontBlob(blob, name) {
    if (currentBlobUrl) {
      try { URL.revokeObjectURL(currentBlobUrl); } catch(e) {}
    }
    currentBlobUrl = URL.createObjectURL(blob);

    // 1. 原生 FontFace API 动态注入
    if (window.FontFace) {
      try {
        var fontFace = new FontFace(FONT_FAMILY, 'url(' + currentBlobUrl + ')');
        fontFace.load().then(function(loaded) {
          document.fonts.add(loaded);
        }).catch(function(e) {});
      } catch(e) {}
    }

    // 2. 注入全局 CSS 规则，确保穿透全站（聊天气泡、主页、侧边栏、所有文字组件）
    var styleEl = document.getElementById('Revery-local-font-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'Revery-local-font-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = '@font-face {\n' +
      '  font-family: "' + FONT_FAMILY + '";\n' +
      '  src: url("' + currentBlobUrl + '");\n' +
      '  font-display: swap;\n' +
      '}\n' +
      'html, body, button, input, textarea, select, .bubble, .cv-bubble-user, .cv-bubble-ai, .chat-title, .msg-body, .char-name, .title, .cv-hero-name {\n' +
      '  font-family: "' + FONT_FAMILY + '", sans-serif !important;\n' +
      '}';

    // 更新 UI 提示
    var status = document.getElementById('customFontFileStatus');
    var choose = document.getElementById('chooseCustomFontBtn');
    var remove = document.getElementById('removeCustomFontBtn');
    if (status) status.innerHTML = '已应用本地字体：<strong style="color:var(--text);">' + (name || '本地字体') + '</strong>';
    if (choose) choose.textContent = '更换本地字体文件';
    if (remove) remove.style.display = 'block';
  }

  function removeAppliedFont() {
    if (currentBlobUrl) {
      try { URL.revokeObjectURL(currentBlobUrl); } catch(e) {}
      currentBlobUrl = null;
    }
    var styleEl = document.getElementById('Revery-local-font-style');
    if (styleEl) styleEl.remove();

    var status = document.getElementById('customFontFileStatus');
    var choose = document.getElementById('chooseCustomFontBtn');
    var remove = document.getElementById('removeCustomFontBtn');
    if (status) status.textContent = '字体保存在当前设备，不会上传到云端。';
    if (choose) choose.textContent = '选择字体文件（TTF / OTF / WOFF / WOFF2）';
    if (remove) remove.style.display = 'none';
  }

  // 页面自启动载入
  getFont().then(function(record) {
    if (record && record.blob) {
      applyFontBlob(record.blob, record.name);
    }
  });

  return {
    FONT_FAMILY: FONT_FAMILY,
    saveFont: saveFont,
    getFont: getFont,
    deleteFont: deleteFont,
    applyFontBlob: applyFontBlob,
    removeAppliedFont: removeAppliedFont
  };
})();

// 主题页面在 index.html 中位于 app.js 之后，因此只延后绑定主题页自己的控件
window.addEventListener('DOMContentLoaded', function() {
  var themeBtn = document.getElementById('globalThemeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); closeDrawer();
      if (typeof initGlobalThemePage === 'function') initGlobalThemePage();
      var page = document.getElementById('themePage');
      if (page) page.classList.add('show');
    }, true);
  }
  var backBtn = document.getElementById('themePageBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      var page = document.getElementById('themePage');
      if (page) page.classList.remove('show');
    }, true);
  }
  var fontSelect = document.getElementById('globalFontSelect');
  if (fontSelect) fontSelect.addEventListener('change', function() {
    var field=document.getElementById('customFontField');
    if (field) field.style.display=this.value==='custom'?'block':'none';
  });
  var fontSize = document.getElementById('globalFontSizeRange');
  if (fontSize) fontSize.addEventListener('input', function() {
    var display=document.getElementById('fontSizeDisplay');
    if (display) display.textContent=this.value+'px';
  });
  var radius = document.getElementById('globalBubbleRadiusRange');
  if (radius) radius.addEventListener('input', function() {
    var display=document.getElementById('bubbleRadiusDisplay');
    if (display) display.textContent=this.value+'px';
  });
  
  // === 本地字体选择与交互 ===
  var chooseBtn = document.getElementById('chooseCustomFontBtn');
  var fontFileInput = document.getElementById('customFontFile');
  var removeFontBtn = document.getElementById('removeCustomFontBtn');

  if (chooseBtn && fontFileInput) {
    chooseBtn.addEventListener('click', function(e) {
      e.preventDefault();
      fontFileInput.click();
    });
  }

  if (fontFileInput) {
    fontFileInput.addEventListener('change', function() {
      var file = fontFileInput.files && fontFileInput.files[0];
      if (!file) return;
      var ok = /\.(ttf|otf|woff2?)$/i.test(file.name);
      if (!ok) {
        toast('请选择 TTF、OTF、WOFF 或 WOFF2 格式的字体');
        fontFileInput.value = '';
        return;
      }
      // 保存至 IndexedDB 并立即全站应用
      ReveryFontManager.saveFont(file).then(function() {
        ReveryFontManager.applyFontBlob(file, file.name);
        // 同时在设置里标记当前主字体为本地字体
        var settings = {};
        try { settings = JSON.parse(localStorage.getItem('Revery_global_theme_settings')) || {}; } catch(e) {}
        settings.font = 'custom';
        settings.customFontType = 'local';
        settings.customFontName = file.name;
        localStorage.setItem('Revery_global_theme_settings', JSON.stringify(settings));
        toast('字体已成功加载并保存到全站！');
      }).catch(function(err) {
        toast('存储字体失败：' + (err.message || err));
      });
    });
  }

  if (removeFontBtn) {
    removeFontBtn.addEventListener('click', function(e) {
      e.preventDefault();
      ReveryFontManager.deleteFont().then(function() {
        ReveryFontManager.removeAppliedFont();
        var settings = {};
        try { settings = JSON.parse(localStorage.getItem('Revery_global_theme_settings')) || {}; } catch(e) {}
        settings.font = '';
        delete settings.customFontType;
        delete settings.customFontName;
        localStorage.setItem('Revery_global_theme_settings', JSON.stringify(settings));
        toast('已移除本地字体');
      });
    });
  }

  var saveBtn = document.getElementById('saveGlobalThemeBtn');
  if (saveBtn) saveBtn.addEventListener('click', function(e) {
    e.preventDefault();
    var select=document.getElementById('globalFontSelect'), custom=document.getElementById('customFontInput');
    var size=document.getElementById('globalFontSizeRange'), radius=document.getElementById('globalBubbleRadiusRange'), css=document.getElementById('globalCustomCss');
    var settings={
      font: select && select.value==='custom' ? ((custom && custom.value.trim())||'') : ((select && select.value)||''),
      fontSize:(size && size.value)||'13.5', bubbleRadius:(radius && radius.value)||'12', customCss:(css && css.value)||''
    };
    localStorage.setItem('Revery_global_theme_settings', JSON.stringify(settings));
    if (typeof applyGlobalThemeSettings==='function') applyGlobalThemeSettings(settings);
    var page=document.getElementById('themePage'); if (page) page.classList.remove('show');
    toast('全站主题与字体设置已生效！');
  }, true);
});
