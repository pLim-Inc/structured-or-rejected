/* Orthogonal connectors between boxes. wires('#id', [{from, to, fs, ts, fo, to_, dashed, red, label, lseg, ldx, ldy, mx, my, both}]) */
function wires(rootSel, specs) {
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.querySelector(rootSel);
  const R = root.getBoundingClientRect();
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wires');
  svg.setAttribute('width', R.width); svg.setAttribute('height', R.height);
  svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
  root.appendChild(svg);
  const pt = (id, side, off = 0) => {
    const e = document.getElementById(id);
    if (!e) throw new Error('no element ' + id);
    const r = e.getBoundingClientRect(), x = r.left - R.left, y = r.top - R.top;
    if (side === 'l') return [x, y + r.height / 2 + off];
    if (side === 'r') return [x + r.width, y + r.height / 2 + off];
    if (side === 't') return [x + r.width / 2 + off, y];
    return [x + r.width / 2 + off, y + r.height];
  };
  const head = (x, y, dx, dy, color) => {
    const L = 9.5, W = 4.2, px = -dy, py = dx;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${x} ${y} L${x - dx * L + px * W} ${y - dy * L + py * W} L${x - dx * L - px * W} ${y - dy * L - py * W} Z`);
    p.setAttribute('fill', color); svg.appendChild(p);
  };
  for (const s of specs) {
    const [x1, y1] = pt(s.from, s.fs, s.fo), [x2, y2] = pt(s.to, s.ts, s.to_);
    const hf = 'lr'.includes(s.fs), ht = 'lr'.includes(s.ts);
    let pts;
    if (hf && ht) { const mx = s.mx ?? (x1 + x2) / 2; pts = [[x1, y1], [mx, y1], [mx, y2], [x2, y2]]; }
    else if (!hf && !ht) { const my = s.my ?? (y1 + y2) / 2; pts = [[x1, y1], [x1, my], [x2, my], [x2, y2]]; }
    else if (hf) pts = [[x1, y1], [x2, y1], [x2, y2]];
    else pts = [[x1, y1], [x1, y2], [x2, y2]];
    pts = pts.filter((p, i) => i === 0 || Math.abs(p[0] - pts[i - 1][0]) > .5 || Math.abs(p[1] - pts[i - 1][1]) > .5);
    const color = s.red ? '#e2231a' : '#000';
    const n = pts.length, a = pts[n - 2], b = pts[n - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len;
    const end = [b[0] - dx * 6, b[1] - dy * 6];
    const line = [...pts.slice(0, -1), end];
    if (s.both) { const c = pts[0], d = pts[1], l2 = Math.hypot(d[0] - c[0], d[1] - c[1]); const ux = (c[0] - d[0]) / l2, uy = (c[1] - d[1]) / l2; head(c[0], c[1], ux, uy, color); line[0] = [c[0] - ux * 6, c[1] - uy * 6]; }
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M' + line.map(q => q.join(' ')).join(' L'));
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', s.w || 1.8);
    if (s.dashed) p.setAttribute('stroke-dasharray', '5 4');
    svg.appendChild(p);
    head(b[0], b[1], dx, dy, color);
    if (s.label) {
      let k = s.lseg;
      if (k === undefined) { let best = -1; pts.slice(0, -1).forEach((q, i) => { const l = Math.hypot(pts[i + 1][0] - q[0], pts[i + 1][1] - q[1]); if (l > best) { best = l; k = i; } }); }
      const d = document.createElement('div');
      d.className = 'wl' + (s.red ? ' red' : '') + (s.vert ? ' v' : '');
      d.innerHTML = s.label;
      d.style.left = ((pts[k][0] + pts[k + 1][0]) / 2 + (s.ldx || 0)) + 'px';
      d.style.top = ((pts[k][1] + pts[k + 1][1]) / 2 + (s.ldy || 0)) + 'px';
      root.appendChild(d);
    }
  }
}
