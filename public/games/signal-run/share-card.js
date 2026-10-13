(function (root) {
  'use strict';

  function createScoreCard(options = {}) {
    const doc = options.document || root.document;
    if (!doc || typeof doc.createElement !== 'function') return Promise.resolve(null);

    const parsedScore = Number(options.score);
    if (!Number.isFinite(parsedScore) || parsedScore < 0) return Promise.resolve(null);

    const score = Math.floor(Math.min(parsedScore, 999999999));
    const dailyDate = typeof options.dailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.dailyDate)
      ? options.dailyDate
      : '';
    const canvas = doc.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;

    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx || typeof canvas.toBlob !== 'function') return Promise.resolve(null);

    const background = ctx.createLinearGradient(0, 0, 1080, 1350);
    background.addColorStop(0, '#111e1b');
    background.addColorStop(0.48, '#080d10');
    background.addColorStop(1, '#060809');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1080, 1350);

    // Quiet technical grid, gold/teal orbit lines and a distinct signal core.
    ctx.strokeStyle = 'rgba(205, 255, 105, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 48; x <= 1032; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1350);
      ctx.stroke();
    }
    for (let y = 48; y <= 1350; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    const glow = ctx.createRadialGradient(790, 470, 10, 790, 470, 410);
    glow.addColorStop(0, 'rgba(211, 255, 105, 0.18)');
    glow.addColorStop(1, 'rgba(211, 255, 105, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(250, 80, 830, 800);

    ctx.strokeStyle = 'rgba(211, 255, 105, 0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(790, 470, 265, -0.8, 4.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(228, 218, 184, 0.25)';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.arc(790, 470, 305, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#d3ff69';
    ctx.beginPath();
    ctx.arc(790, 470, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d3ff69';
    ctx.font = '500 26px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('OSGARD WORLD / PLAY', 78, 100);

    ctx.fillStyle = '#f3f2e9';
    ctx.font = '500 88px Georgia, serif';
    ctx.fillText('SIGNAL RUN', 72, 235);

    ctx.fillStyle = 'rgba(232, 239, 226, 0.72)';
    ctx.font = '500 20px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(dailyDate ? 'DAILY CONTRACT  /  ' + dailyDate : 'REFLEX CHALLENGE  /  PERSONAL BEST', 78, 294);

    ctx.strokeStyle = 'rgba(211, 255, 105, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(78, 335);
    ctx.lineTo(1002, 335);
    ctx.stroke();

    ctx.fillStyle = 'rgba(232, 239, 226, 0.68)';
    ctx.font = '500 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('MY SIGNAL SCORE', 78, 445);

    const formattedScore = score.toLocaleString('en-US');
    ctx.fillStyle = '#f2f2eb';
    ctx.font = '500 178px Georgia, serif';
    ctx.fillText(formattedScore, 72, 625, 850);

    ctx.fillStyle = '#d3ff69';
    ctx.font = '500 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('CAN YOU BEAT IT?', 80, 710);

    ctx.fillStyle = 'rgba(232, 239, 226, 0.72)';
    ctx.font = '400 27px Georgia, serif';
    ctx.fillText('One run. Three lanes. Stay in the signal.', 78, 830, 900);

    ctx.strokeStyle = 'rgba(232, 239, 226, 0.2)';
    ctx.beginPath();
    ctx.moveTo(78, 1120);
    ctx.lineTo(1002, 1120);
    ctx.stroke();

    ctx.fillStyle = '#d3ff69';
    ctx.font = '500 22px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('PLAY THE SAME CHALLENGE', 78, 1175);
    ctx.fillStyle = 'rgba(232, 239, 226, 0.72)';
    ctx.font = '400 22px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('osgard.world/games/signal-run/', 78, 1225);
    ctx.fillStyle = 'rgba(232, 239, 226, 0.44)';
    ctx.font = '400 16px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('YOUR LINK CARRIES THE CHALLENGE CODE', 78, 1280);

    return new Promise(resolve => {
      try {
        canvas.toBlob(blob => resolve(blob && blob.type === 'image/png' && blob.size > 0 ? blob : null), 'image/png');
      } catch {
        resolve(null);
      }
    });
  }

  root.OSGARDSignalShareCard = Object.freeze({ createScoreCard });
})(typeof window === 'undefined' ? globalThis : window);
