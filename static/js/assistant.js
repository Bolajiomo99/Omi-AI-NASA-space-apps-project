/* ==========================================================================
   Omi AI — AI Research Assistant Chat Client
   Sends user questions to Flask AI endpoint via fetch().
   Never generates fake AI answers if the backend is unavailable.
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('assistant-root');
    if (!root) return;

    var endpoint = root.getAttribute('data-assistant-endpoint') || '/api/assistant/chat';
    var messagesBox = document.getElementById('chat-messages');
    var loadingRow = document.getElementById('chat-loading-row');
    var statusNotice = document.getElementById('assistant-status-notice');
    var form = document.getElementById('assistant-chat-form');
    var input = document.getElementById('chat-question-input');
    var sendBtn = document.getElementById('send-question-btn');
    var clearBtn = document.getElementById('clear-chat-btn');

    var conversationHistory = [];
    var isPending = false;

    function scrollToBottom() {
      if (messagesBox) {
        messagesBox.scrollTop = messagesBox.scrollHeight;
      }
    }

    function appendBubble(role, text, isError) {
      if (!messagesBox) return;
      var row = document.createElement('div');
      row.className = 'chat-bubble-row ' + (role === 'user' ? 'is-user' : 'is-assistant') + (isError ? ' is-error' : '');

      var sender = document.createElement('span');
      sender.className = 'chat-sender';
      sender.textContent = role === 'user' ? 'You' : (isError ? 'Service Notice' : 'Omi AI Assistant');

      var bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = text;

      row.appendChild(sender);
      row.appendChild(bubble);
      messagesBox.appendChild(row);
      scrollToBottom();
    }

    function setLoading(active) {
      isPending = active;
      if (loadingRow) loadingRow.classList.toggle('is-hidden', !active);
      if (sendBtn) sendBtn.disabled = active;
      if (input) input.disabled = active;
    }

    function showUnavailableNotice(detail) {
      if (!statusNotice) return;
      statusNotice.classList.remove('is-hidden');
      statusNotice.textContent =
        'The AI Assistant backend service (' + endpoint + ') is currently unavailable (' + detail + '). Connect your Flask assistant route to receive live AI responses.';
    }

    function hideUnavailableNotice() {
      if (statusNotice) statusNotice.classList.add('is-hidden');
    }

    function submitQuestion(questionText) {
      var trimmed = String(questionText || '').trim();
      if (!trimmed || isPending) return;

      hideUnavailableNotice();
      appendBubble('user', trimmed, false);
      conversationHistory.push({ role: 'user', content: trimmed });

      if (input) {
        input.value = '';
        input.style.height = 'auto';
      }

      setLoading(true);

      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: trimmed,
          question: trimmed,
          history: conversationHistory
        })
      })
        .then(function (res) {
          return res.text().then(function (raw) {
            var parsed = null;
            try {
              parsed = raw ? JSON.parse(raw) : null;
            } catch (e) {}

            if (!res.ok) {
              var msg = (parsed && (parsed.error || parsed.message)) || ('HTTP ' + res.status);
              throw new Error(msg);
            }
            if (!parsed) {
              throw new Error('Non-JSON response received from Flask backend');
            }
            return parsed;
          });
        })
        .then(function (data) {
          var reply = data.reply || data.answer || data.response || data.message || data.content;
          if (!reply) {
            throw new Error(data.error || 'Assistant response payload did not include an answer field');
          }
          appendBubble('assistant', String(reply), false);
          conversationHistory.push({ role: 'assistant', content: String(reply) });
        })
        .catch(function (err) {
          showUnavailableNotice(err.message);
          appendBubble(
            'assistant',
            'Unable to reach the Flask AI Assistant endpoint (' + err.message + '). No simulated answer was generated.',
            true
          );
        })
        .finally(function () {
          setLoading(false);
          if (input) input.focus();
        });
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (input) submitQuestion(input.value);
      });
    }

    if (input) {
      input.addEventListener('input', function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 140) + 'px';
      });

      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          submitQuestion(input.value);
        }
      });
    }

    document.querySelectorAll('[data-suggested-question]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-suggested-question');
        if (q) submitQuestion(q);
      });
    });

    if (clearBtn && messagesBox) {
      clearBtn.addEventListener('click', function () {
        conversationHistory = [];
        hideUnavailableNotice();
        messagesBox.innerHTML =
          '<div class="chat-bubble-row is-assistant">' +
          '<span class="chat-sender">Omi AI Assistant</span>' +
          '<div class="chat-bubble">Conversation cleared. Select a suggested question or type a new inquiry to query the Flask AI service.</div>' +
          '</div>';
      });
    }
  });
})();
