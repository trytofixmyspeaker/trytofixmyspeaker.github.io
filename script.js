(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('mobileMenuBtn');
  var navLinks = document.getElementById('navLinks');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    var links = navLinks.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        navLinks.classList.remove('open');
      });
    }
  }

  /* ---------- Active nav link on scroll ---------- */
  var navAnchors = document.querySelectorAll('.nav-links a[href^="/#"]');
  function onScroll() {
    var pos = window.scrollY + 120;
    var current = null;
    for (var i = 0; i < navAnchors.length; i++) {
      var id = navAnchors[i].getAttribute('href').slice(2);
      var el = document.getElementById(id);
      if (el && el.offsetTop <= pos) { current = navAnchors[i]; }
    }
    for (var j = 0; j < navAnchors.length; j++) { navAnchors[j].classList.remove('active'); }
    if (current) { current.classList.add('active'); }
  }
  if (navAnchors.length) { window.addEventListener('scroll', onScroll); onScroll(); }

  /* ---------- FAQ accordion (one open at a time) ---------- */
  var faqItems = document.querySelectorAll('.faq-item');
  for (var f = 0; f < faqItems.length; f++) {
    (function (item) {
      var q = item.querySelector('.faq-question');
      if (!q) { return; }
      q.addEventListener('click', function () {
        var wasOpen = item.classList.contains('open');
        for (var k = 0; k < faqItems.length; k++) { faqItems[k].classList.remove('open'); }
        if (!wasOpen) { item.classList.add('open'); }
      });
    })(faqItems[f]);
  }

  /* ---------- Completion modal ---------- */
  var modalOverlay = document.getElementById('modalOverlay');
  var modalTitle = document.getElementById('modalTitle');
  var modalMessage = document.getElementById('modalMessage');
  var modalPrimary = document.getElementById('modalPrimary');
  var modalSecondary = document.getElementById('modalSecondary');
  var modalClose = document.getElementById('modalClose');

  function showModal(title, message, primaryText, primaryHref, secondaryText) {
    if (!modalOverlay) { return; }
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalPrimary.textContent = primaryText;
    modalPrimary.setAttribute('href', primaryHref);
    modalSecondary.textContent = secondaryText;
    modalOverlay.classList.add('show');
  }
  function hideModal() {
    if (modalOverlay) { modalOverlay.classList.remove('show'); }
  }
  if (modalClose) { modalClose.addEventListener('click', hideModal); }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) { hideModal(); }
    });
  }

  /* ---------- Speaker cleaner tool ---------- */
  var toolCard = document.getElementById('toolCard');
  if (!toolCard) { return; }

  var mode = toolCard.getAttribute('data-mode') || 'water';
  var startBtn = document.getElementById('startBtn');
  var stopBtn = document.getElementById('stopBtn');
  var progressFill = document.getElementById('progressFill');
  var progressPercent = document.getElementById('progressPercent');
  var statusText = document.getElementById('statusText');
  var speakerBtns = document.querySelectorAll('.speaker-btn');

  var MODES = {
    water: {
      label: 'Eject Water',
      total: 60,
      status: 'Ejecting water...',
      doneTitle: 'Water Eject Complete',
      doneMsg: 'Your speaker should sound clearer now. Run a dust clean next to remove any loose dust from the grille.',
      nextText: 'Run Deep Dust Clean',
      nextHref: '/deep-clean/',
      againText: 'Run Water Eject Again',
      stoppedTitle: 'Water eject stopped',
      stoppedMsg: 'You stopped the cleaning early. You can run it again any time.'
    },
    dust: {
      label: 'Remove Dust',
      total: 60,
      status: 'Removing dust...',
      doneTitle: 'Dust Clean Complete',
      doneMsg: 'The frequency sweep is done. Try vibration mode next to shake out anything still trapped inside.',
      nextText: 'Try Vibration Mode',
      nextHref: '/vibration/',
      againText: 'Run Dust Clean Again',
      stoppedTitle: 'Dust clean stopped',
      stoppedMsg: 'You stopped the cleaning early. You can run it again any time.'
    },
    vibration: {
      label: 'Vibration',
      total: 30,
      status: 'Vibrating...',
      doneTitle: 'Vibration Cycle Complete',
      doneMsg: 'The vibration cycle is done. Run a standard water eject next for a full clean.',
      nextText: 'Run Standard Clean',
      nextHref: '/',
      againText: 'Run Vibration Again',
      stoppedTitle: 'Vibration stopped',
      stoppedMsg: 'You stopped the cleaning early. You can run it again any time.'
    }
  };

  var DUST_FREQS = [200, 300, 450, 700, 1000, 1500];
  var cfg = MODES[mode];
  var audio = null;
  var run = null;
  var pan = 0;

  function setSpeaker(value) {
    pan = value === 'left' ? -1 : (value === 'right' ? 1 : 0);
    for (var i = 0; i < speakerBtns.length; i++) {
      if (speakerBtns[i].getAttribute('data-speaker') === value) {
        speakerBtns[i].classList.add('active');
      } else {
        speakerBtns[i].classList.remove('active');
      }
    }
  }
  for (var s = 0; s < speakerBtns.length; s++) {
    speakerBtns[s].addEventListener('click', function () {
      setSpeaker(this.getAttribute('data-speaker'));
    });
  }

  function makeChain() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!audio) { audio = new AC(); }
    if (audio.state === 'suspended') { audio.resume(); }
    var volume = audio.createGain();
    var comp = audio.createDynamicsCompressor();
    comp.threshold.value = -8;
    comp.ratio.value = 6;
    volume.gain.setValueAtTime(0, audio.currentTime);
    volume.gain.linearRampToValueAtTime(1, audio.currentTime + 0.1);
    if (audio.createStereoPanner) {
      var panner = audio.createStereoPanner();
      panner.pan.value = pan;
      volume.connect(panner);
      panner.connect(comp);
    } else {
      volume.connect(comp);
    }
    comp.connect(audio.destination);
    return volume;
  }

  function startTool() {
    if (run) { return; }
    hideModal();
    var volume;
    try {
      volume = makeChain();
    } catch (e) {
      statusText.textContent = 'Sorry, your browser could not play the sound.';
      return;
    }
    var startTime = Date.now();
    var totalMs = cfg.total * 1000;
    run = { volume: volume, startTime: startTime, totalMs: totalMs };

    if (mode === 'water') {
      var osc = audio.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 165;
      var pulse = audio.createGain();
      pulse.gain.value = 1;
      osc.connect(pulse);
      pulse.connect(volume);
      osc.start();
      run.osc = osc;
      run.pulse = pulse;
      run.pulseTimer = setInterval(function () {
        if (!run) { return; }
        var on = (Date.now() - startTime) % 1300 < 1000;
        pulse.gain.setTargetAtTime(on ? 1 : 0, audio.currentTime, 0.03);
      }, 100);
    } else if (mode === 'dust') {
      var dosc = audio.createOscillator();
      dosc.type = 'sine';
      dosc.frequency.value = DUST_FREQS[0];
      dosc.connect(volume);
      dosc.start();
      run.osc = dosc;
    } else {
      var vosc = audio.createOscillator();
      vosc.type = 'sine';
      vosc.frequency.value = 80;
      vosc.connect(volume);
      vosc.start();
      run.osc = vosc;
      if (navigator.vibrate) {
        run.vibTimer = setInterval(function () {
          navigator.vibrate([200, 100]);
        }, 300);
      }
    }

    statusText.textContent = (mode === 'vibration' && !navigator.vibrate)
      ? 'Deep bass mode...'
      : cfg.status;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    run.progressTimer = setInterval(function () {
      var passed = Date.now() - startTime;
      var pct = Math.min(100, Math.round(passed / totalMs * 100));
      progressFill.style.width = pct + '%';
      progressPercent.textContent = pct + '%';
      if (mode === 'dust' && run && run.osc) {
        var step = Math.min(5, Math.floor(passed / 10000));
        var hz = DUST_FREQS[step];
        run.osc.frequency.setTargetAtTime(hz, audio.currentTime, 0.05);
        statusText.textContent = 'Removing dust... ' + hz + 'Hz';
      }
      if (passed >= totalMs) { finishTool(true); }
    }, 100);
  }

  function stopAudio() {
    if (!run) { return; }
    clearInterval(run.progressTimer);
    clearInterval(run.pulseTimer);
    clearInterval(run.vibTimer);
    if (navigator.vibrate) { navigator.vibrate(0); }
    try {
      var t = audio.currentTime;
      run.volume.gain.cancelScheduledValues(t);
      run.volume.gain.setValueAtTime(run.volume.gain.value, t);
      run.volume.gain.linearRampToValueAtTime(0, t + 0.1);
      if (run.osc) { run.osc.stop(t + 0.15); }
    } catch (e) {}
  }

  function finishTool(completed) {
    if (!run) { return; }
    stopAudio();
    run = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (completed) {
      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      statusText.textContent = 'Done. Repeat if needed.';
      showModal(cfg.doneTitle, cfg.doneMsg, cfg.nextText, cfg.nextHref, cfg.againText);
    } else {
      progressFill.style.width = '0%';
      progressPercent.textContent = '0%';
      statusText.textContent = 'Ready to clean';
      showModal(cfg.stoppedTitle, cfg.stoppedMsg, cfg.nextText, cfg.nextHref, cfg.againText);
    }
  }

  startBtn.addEventListener('click', startTool);
  stopBtn.addEventListener('click', function () { finishTool(false); });
  if (modalSecondary) {
    modalSecondary.addEventListener('click', function () {
      hideModal();
      progressFill.style.width = '0%';
      progressPercent.textContent = '0%';
      statusText.textContent = 'Ready to clean';
      startTool();
    });
  }

  /* ---------- Contact form (mailto, no backend) ---------- */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('contactName').value;
      var email = document.getElementById('contactEmail').value;
      var subject = document.getElementById('contactSubject').value;
      var device = document.getElementById('contactDevice').value;
      var message = document.getElementById('contactMessage').value;
      var body = 'Name: ' + name + '\nEmail: ' + email + '\nDevice: ' + device + '\n\n' + message;
      window.location.href = 'mailto:cleanerioadmin@gmail.com'
        + '?subject=' + encodeURIComponent(subject + ' - ' + name)
        + '&body=' + encodeURIComponent(body);
    });
  }
})();
