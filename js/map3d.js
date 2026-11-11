/* Isometric illustrated 3D map (experiment). OSM footprints extruded, drawn in the site's paper/ink style;
   project line-art figures stand on the map as billboards.  three.js r128 (global THREE). */
(function () {
  'use strict';
  var D = window.MAP3D, P = window.PROJECTS || [];
  var stage = document.getElementById('stage');
  if (!window.THREE || !D || !stage) { document.getElementById('load').textContent = 'המפה אינה זמינה כרגע.'; return; }
  var T = window.THREE;

  
  var PAPER = 0xd8cdaa, GROUND = 0xd8cdaa, GREEN = 0xc3c99a, ROAD = 0x2b2827, ROOF = 0xfbf7ea, WALL = 0xb9ad8e;
  var KX = D.kx, KZ = D.kz, LAT0 = D.o[0], LNG0 = D.o[1];
  function toM(lat, lng) { return [(lng - LNG0) * KX, -(lat - LAT0) * KZ]; }

  /* ---------- renderer / camera ---------- */
  var renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(PAPER, 1);
  stage.appendChild(renderer.domElement);
  var scene = new T.Scene();
  var cam = new T.OrthographicCamera(-1, 1, 1, -1, 1, 8000);

  var PITCH = 33 * Math.PI / 180;
  var st = { x: 0, z: 0, yaw: Math.PI / 4, yawTo: Math.PI / 4, h: 900 };   // h = visible world height (metres, across the screen)
  var dirty = true;

  /* ---------- helpers: merged geometry builders ---------- */
  function ribbon(list, width, y, color) {
    var pos = [], idx = [], n = 0;
    list.forEach(function (flat) {
      var m = flat.length / 2; if (m < 2) return;
      for (var i = 0; i < m - 1; i++) {
        var x1 = flat[i * 2], z1 = flat[i * 2 + 1], x2 = flat[i * 2 + 2], z2 = flat[i * 2 + 3];
        var dx = x2 - x1, dz = z2 - z1, L = Math.sqrt(dx * dx + dz * dz); if (L < 0.01) continue;
        var nx = -dz / L * width / 2, nz = dx / L * width / 2;
        pos.push(x1 + nx, y, z1 + nz, x1 - nx, y, z1 - nz, x2 + nx, y, z2 + nz, x2 - nx, y, z2 - nz);
        idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); n += 4;
        // round joint (small disc as a quad rotated) to hide gaps at corners
        var r = width / 2, c = 6;
        for (var k = 0; k < c; k++) {
          var a0 = k / c * Math.PI * 2, a1 = (k + 1) / c * Math.PI * 2;
          pos.push(x2, y, z2, x2 + Math.cos(a0) * r, y, z2 + Math.sin(a0) * r, x2 + Math.cos(a1) * r, y, z2 + Math.sin(a1) * r);
          idx.push(n, n + 2, n + 1); n += 3;
        }
      }
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    var mesh = new T.Mesh(g, new T.MeshBasicMaterial({ color: color, side: T.DoubleSide }));
    return mesh;
  }

  function flatPolys(list, y, color) {
    var pos = [], idx = [], n = 0;
    list.forEach(function (flat) {
      var pts = []; for (var i = 0; i < flat.length; i += 2) pts.push(new T.Vector2(flat[i], flat[i + 1]));
      if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop();
      if (pts.length < 3) return;
      var tris = T.ShapeUtils.triangulateShape(pts, []);
      pts.forEach(function (p) { pos.push(p.x, y, p.y); });
      tris.forEach(function (t) { idx.push(n + t[0], n + t[2], n + t[1]); });
      n += pts.length;
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return new T.Mesh(g, new T.MeshBasicMaterial({ color: color, side: T.DoubleSide }));
  }

  /* ---------- ground, greens, roads ---------- */
  var ground = new T.Mesh(new T.PlaneGeometry(9000, 9000), new T.MeshBasicMaterial({ color: GROUND }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2; scene.add(ground);
  scene.add(flatPolys(D.g, 0.02, GREEN));
  scene.add(ribbon(D.r[2], 2.2, 0.04, 0xc4b894));         // paths / footways
  scene.add(ribbon(D.r[1], 7, 0.06, ROAD));               // local streets
  scene.add(ribbon(D.r[0], 16, 0.08, ROAD));              // main roads
  var mid = ribbon(D.r[0], 0.7, 0.1, 0xe9e1c6); scene.add(mid);      // pale centre line on main roads
  scene.add(ribbon(D.rail, 3, 0.07, 0x6b645a));


  /* ---------- road names (flat text on the main roads) ---------- */
  var roadLabs = [];
  (function () {
    var byName = {};
    (D.rl || []).forEach(function (r) { if (/^כיכר/.test(r[0])) return; (byName[r[0]] = byName[r[0]] || []).push(r[1]); });
    Object.keys(byName).forEach(function (name) {
      var placed = [];
      byName[name].sort(function (a, b) { return b.length - a.length; }).forEach(function (f) {
        // walk the way, find stretches of >=70m that are fairly straight
        var acc = 0, start = 0;
        for (var i = 0; i < f.length / 2 - 1; i++) {
          var dx = f[i * 2 + 2] - f[i * 2], dz = f[i * 2 + 3] - f[i * 2 + 1];
          acc += Math.sqrt(dx * dx + dz * dz);
          if (acc >= 90 || i === f.length / 2 - 2) {
            var x1 = f[start * 2], z1 = f[start * 2 + 1], x2 = f[(i + 1) * 2], z2 = f[(i + 1) * 2 + 1];
            var L = Math.sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1));
            if (L > 60 && L / acc > 0.9) {
              var mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
              if (placed.every(function (q) { return Math.hypot(q[0] - mx, q[1] - mz) > 210; })) { placed.push([mx, mz]); addRoadLab(name, mx, mz, Math.atan2(z2 - z1, x2 - x1), L); }
            }
            start = i + 1; acc = 0;
          }
        }
      });
    });
  })();
  function addRoadLab(name, x, z, ang, len) {
    var c = document.createElement('canvas'), g = c.getContext('2d'), fs = 64;
    g.font = '500 ' + fs + 'px Heebo, Arial, sans-serif';
    var w = Math.ceil(g.measureText(name).width) + 24; c.width = w; c.height = fs + 16;
    g.font = '500 ' + fs + 'px Heebo, Arial, sans-serif'; g.fillStyle = '#efe9d8'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(name, w / 2, c.height / 2 + 2);
    var tex = new T.CanvasTexture(c); tex.anisotropy = 4; tex.minFilter = T.LinearFilter;
    var mat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    var mesh = new T.Mesh(new T.PlaneGeometry(1, 1), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.16;
    var grp = new T.Group(); grp.position.set(x, 0, z); grp.add(mesh); scene.add(grp);
    roadLabs.push({ grp: grp, mesh: mesh, ang: ang, aspect: c.width / c.height, max: len, tex: tex });
  }
  document.fonts && document.fonts.ready && document.fonts.ready.then(function () { roadLabs.forEach(function (r) { r.tex.needsUpdate = true; }); });

  /* ---------- buildings (extruded, merged) ---------- */
  (function () {
    var pos = [], nor = [], col = [], lp = [], sp = [];
    var cRoof = new T.Color(ROOF), cWall = new T.Color(WALL);
    D.b.forEach(function (b) {
      var h = b[0], f = b[1], pts = [];
      for (var i = 0; i < f.length; i += 2) pts.push(new T.Vector2(f[i], f[i + 1]));
      if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop();
      if (pts.length < 3) return;
      var tris = T.ShapeUtils.triangulateShape(pts, []);
      var area = T.ShapeUtils.area(pts);               // sign tells winding in (x,z) plane
      var ccw = area > 0;
      // roof
      tris.forEach(function (t) {
        var A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
        var cr = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);      // need cross<0 for an upward normal
        (cr < 0 ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]]).forEach(function (k) { pos.push(pts[k].x, h, pts[k].y); nor.push(0, 1, 0); col.push(cRoof.r, cRoof.g, cRoof.b); });
      });
      // ground shadow (cast towards +x,+z)
      var sx = h * 0.55, sz = h * 0.35;
      tris.forEach(function (t) {
        var A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
        var cr = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
        (cr < 0 ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]]).forEach(function (k) { sp.push(pts[k].x + sx, 0.03, pts[k].y + sz); });
      });
      for (var i2 = 0; i2 < pts.length; i2++) {
        var a2 = pts[i2], c2 = pts[(i2 + 1) % pts.length];
        var Q = [[a2.x, a2.y], [c2.x, c2.y], [c2.x + sx, c2.y + sz], [a2.x + sx, a2.y + sz]];
        var cr2 = (Q[1][0] - Q[0][0]) * (Q[2][1] - Q[0][1]) - (Q[1][1] - Q[0][1]) * (Q[2][0] - Q[0][0]);
        (cr2 < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]).forEach(function (k) { sp.push(Q[k][0], 0.03, Q[k][1]); });
      }
      // walls
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], c = pts[(i + 1) % pts.length];
        var ex = c.x - a.x, ez = c.y - a.y, L = Math.sqrt(ex * ex + ez * ez) || 1;
        var nx = ez / L, nz = -ex / L; if (!ccw) { nx = -nx; nz = -nz; }
        var q = [[a.x, 0, a.y], [c.x, 0, c.y], [c.x, h, c.y], [a.x, h, a.y]];
        var order = ccw ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
        order.forEach(function (k) { pos.push(q[k][0], q[k][1], q[k][2]); nor.push(nx, 0, nz); col.push(cWall.r, cWall.g, cWall.b); });
        lp.push(a.x, h + 0.05, a.y, c.x, h + 0.05, c.y);                 // roof outline
        lp.push(a.x, 0.05, a.y, a.x, h + 0.05, a.y);                       // vertical corner
      }
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    scene.add(new T.Mesh(sg, new T.MeshBasicMaterial({ color: 0xb7aa84, side: T.DoubleSide })));
    scene.add(new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true })));
    var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3));
    scene.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x2a2624 })));
  })();
  var amb = new T.AmbientLight(0xffffff, 0.62); scene.add(amb);
  var sun = new T.DirectionalLight(0xffffff, 0.5); sun.position.set(-1.4, 1.1, -0.6); scene.add(sun);

  /* ---------- project figures (billboards) ---------- */
  var figs = [], labels = [], loader = new T.TextureLoader();
  var pm = P.filter(function (p) { return isFinite(p.lat) && isFinite(p.lng); }).map(function (p) { var m = toM(p.lat, p.lng); return { p: p, x: m[0], z: m[1], active: p.status !== 'occupied' }; });
  var bb = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 };
  pm.forEach(function (q) { bb.x0 = Math.min(bb.x0, q.x); bb.x1 = Math.max(bb.x1, q.x); bb.z0 = Math.min(bb.z0, q.z); bb.z1 = Math.max(bb.z1, q.z); });
  var labHost = document.body;
  pm.forEach(function (q) {
    var mat = new T.SpriteMaterial({ transparent: true, alphaTest: 0.08, depthTest: false, depthWrite: false });
    var sp = new T.Sprite(mat); sp.center.set(0.5, 0.0); sp.position.set(q.x, 0.3, q.z); sp.userData.q = q; sp.renderOrder = 5; sp.visible = false;
    scene.add(sp); q.sprite = sp;
    loader.load('img/fig/' + q.p.slug + '.png', function (tex) {
      tex.anisotropy = 4; mat.map = tex; mat.needsUpdate = true; q.aspect = tex.image.width / tex.image.height; sp.visible = true; dirty = true;
    });
    var ring = new T.Mesh(new T.RingGeometry(3, 5, 28), new T.MeshBasicMaterial({ color: q.active ? 0x810100 : 0x2a2624, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(q.x, 0.2, q.z); scene.add(ring);
    var lab = document.createElement('div'); lab.className = 'lab' + (q.active ? ' is-active' : ''); lab.textContent = q.p.name; labHost.appendChild(lab); q.lab = lab;
    figs.push(sp);
  });

  /* ---------- view / camera update ---------- */
  var W = 1, H = 1;
  var CENTER = { x: (bb.x0 + bb.x1) / 2, z: (bb.z0 + bb.z1) / 2 };
  var spanX = bb.x1 - bb.x0, spanZ = bb.z1 - bb.z0;
  var H_MAX = 1, H_MIN = 120;
  function resize() {
    W = stage.clientWidth || window.innerWidth; H = stage.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    var diag = Math.sqrt(spanX * spanX + spanZ * spanZ);
    // visible height so the whole project cluster fits with margin (both orientations)
    H_MAX = Math.max(diag * 0.95, 700) * Math.max(1, (diag * 0.8) / (W / H * Math.max(diag * 0.95, 700)));
    st.h = Math.min(Math.max(st.h, H_MIN), H_MAX);
    dirty = true;
  }
  function placeCam() {
    var asp = W / H, hh = st.h / 2, hw = hh * asp;
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.updateProjectionMatrix();
    var cp = Math.cos(PITCH), sp = Math.sin(PITCH), R = 3000;
    cam.position.set(st.x + Math.sin(st.yaw) * cp * R, sp * R, st.z + Math.cos(st.yaw) * cp * R);
    cam.lookAt(st.x, 0, st.z); cam.updateMatrixWorld();
  }
  function clampTarget() {
    var m = 220;
    st.x = Math.max(bb.x0 - m, Math.min(bb.x1 + m, st.x));
    st.z = Math.max(bb.z0 - m, Math.min(bb.z1 + m, st.z));
  }
  var ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3();
  function groundAt(cx, cy) {
    var r = stage.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, cam);
    return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
  }
  function project(x, y, z) { var v = new T.Vector3(x, y, z).project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; }

  var figBase = 56;
  function figPx() { return Math.max(45, Math.min(136, 49.6 * Math.pow(H_MAX / st.h, 0.6))); }   // figure height in screen pixels
  var openQ = null, hoverQ = null;
  function frame() {
    if (Math.abs(st.yawTo - st.yaw) > 0.0005) { st.yaw += (st.yawTo - st.yaw) * 0.14; dirty = true; } else st.yaw = st.yawTo;
    if (!dirty) return requestAnimationFrame(frame);
    dirty = false;
    clampTarget(); placeCam();
    var wpp = st.h / H;                      // world units per screen pixel (vertical)
    var hpx = figPx();
    pm.forEach(function (q) {
      if (!q.aspect) return;
      var hWorld = hpx * wpp / Math.cos(PITCH);  // billboard stands on a tilted view: compensate foreshortening
      q.sprite.scale.set(hWorld * q.aspect, hWorld, 1);
      var s = project(q.x, 0, q.z);
      q.lab.style.display = (st.h < H_MAX * 0.5 || q === hoverQ) ? 'block' : 'none';
      q.sprite.renderOrder = 10 + Math.round(s.y);
      q.lab.style.transform = 'translate(-50%, 6px)';
      q.lab.style.left = s.x + 'px'; q.lab.style.top = s.y + 'px';
      q.lab.style.zIndex = Math.round(s.y);
    });
    var hRoad = Math.max(11, 13 * wpp / Math.sin(PITCH));
    roadLabs.forEach(function (r) {
      var wh = Math.min(hRoad, 12.5), ww = wh * r.aspect;     // never taller than the road is wide
      if (ww > r.max * 1.1) { r.mesh.visible = false; return; }
      r.mesh.visible = true;
      r.mesh.scale.set(ww, wh, 1);
      // flip so the text is never upside down on screen
      var a = r.ang, vx = Math.cos(a), vz = Math.sin(a);
      var p0 = project(r.grp.position.x, 0, r.grp.position.z), p1 = project(r.grp.position.x + vx * 10, 0, r.grp.position.z + vz * 10);
      if (p1.x < p0.x) a += Math.PI;
      r.grp.rotation.y = -a;
    });
    renderer.render(scene, cam);
    if (openQ) placeCard();
    requestAnimationFrame(frame);
  }

  /* ---------- interaction ---------- */
  var drag = null, moved = 0;
  stage.addEventListener('pointerdown', function (e) {
    stage.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, g: groundAt(e.clientX, e.clientY), sx: e.clientX, sy: e.clientY }; moved = 0;
    stage.classList.add('is-drag');
  });
  stage.addEventListener('pointermove', function (e) {
    if (drag && drag.id === e.pointerId) {
      moved = Math.max(moved, Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy));
      var g = groundAt(e.clientX, e.clientY);
      if (g && drag.g) { st.x += drag.g.x - g.x; st.z += drag.g.z - g.z; dirty = true; }
    } else {
      var hq = pick(e.clientX, e.clientY); stage.classList.toggle('is-hover', !!hq); if (hq !== hoverQ) { hoverQ = hq; dirty = true; }
    }
  });
  function endDrag(e) {
    if (!drag || drag.id !== e.pointerId) return;
    stage.classList.remove('is-drag');
    if (moved < 5) { var q = pick(e.clientX, e.clientY); if (q) openCard(q); else closeCard(); }
    drag = null;
  }
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  function zoomBy(f, cx, cy) {
    var before = cx != null ? groundAt(cx, cy) : null;
    st.h = Math.min(H_MAX, Math.max(H_MIN, st.h / f)); placeCam(); dirty = true;
    if (before) { var after = groundAt(cx, cy); if (after) { st.x += before.x - after.x; st.z += before.z - after.z; } }
  }
  stage.addEventListener('wheel', function (e) { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  document.getElementById('zin').onclick = function () { zoomBy(1.4); };
  document.getElementById('zout').onclick = function () { zoomBy(1 / 1.4); };
  document.getElementById('rl').onclick = function () { st.yawTo -= Math.PI / 2; dirty = true; };
  document.getElementById('rr').onclick = function () { st.yawTo += Math.PI / 2; dirty = true; };
  // pinch zoom
  var pts = {};
  stage.addEventListener('pointerdown', function (e) { pts[e.pointerId] = [e.clientX, e.clientY]; });
  stage.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return; var ids = Object.keys(pts);
    if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]], d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pts[e.pointerId] = [e.clientX, e.clientY]; a = pts[ids[0]]; b = pts[ids[1]]; var d1 = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d0 > 0) zoomBy(d1 / d0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); drag = null; }
    else pts[e.pointerId] = [e.clientX, e.clientY];
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { stage.addEventListener(n, function (e) { delete pts[e.pointerId]; }); });
  window.addEventListener('keydown', function (e) {
    if (e.key === '+' || e.key === '=') zoomBy(1.3); else if (e.key === '-') zoomBy(1 / 1.3);
    else if (e.key === 'q') st.yawTo -= Math.PI / 2; else if (e.key === 'e') st.yawTo += Math.PI / 2; else if (e.key === 'Escape') closeCard();
    dirty = true;
  });

  function pick(cx, cy) {
    var r = stage.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, cam);
    var hs = ray.intersectObjects(figs.filter(function (s) { return s.visible; }), false);
    if (!hs.length) {   // sprite raycast ignores transparent corners; fall back to nearest on-screen figure box
      var best = null, bd = 1e9;
      pm.forEach(function (q) { if (!q.aspect) return; var s = project(q.x, 0, q.z), hpx = figPx(), w = hpx * q.aspect; if (Math.abs(cx - r.left - s.x) < w / 2 && cy - r.top < s.y + 6 && cy - r.top > s.y - hpx) { var d = Math.abs(cx - r.left - s.x) + Math.abs(cy - r.top - s.y); if (d < bd) { bd = d; best = q; } } });
      return best;
    }
    return hs[0].object.userData.q;
  }

  /* ---------- popup card ---------- */
  var card = document.getElementById('card');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function openCard(q) {
    var p = q.p, cover = p.cover || (p.images && p.images[0] && p.images[0].src) || '';
    card.innerHTML = '<button class="card__x" aria-label="סגור">×</button>' + (cover ? '<img src="' + esc(cover) + '" alt="' + esc(p.name) + '">' : '') +
      '<div class="card__body"><span class="card__badge' + (q.active ? '' : ' is-past') + '">' + esc(p.statusHe || '') + '</span><strong>' + esc(p.name) + '</strong><span class="c">' + esc(p.cityHe || '') + '</span><a href="project.html?p=' + encodeURIComponent(p.slug) + '">לעמוד הפרויקט</a></div>';
    card.querySelector('.card__x').onclick = closeCard;
    card.style.display = 'block'; openQ = q; dirty = true; placeCard();
  }
  function closeCard() { card.style.display = 'none'; openQ = null; }
  function placeCard() {
    var s = project(openQ.x, 0, openQ.z), r = stage.getBoundingClientRect(), hpx = figPx();
    card.style.left = Math.max(135, Math.min(W - 135, s.x + r.left)) + 'px';
    card.style.top = Math.max(300, s.y - hpx + r.top) + 'px';
  }

  function calcFigBase() {
    var save = { x: st.x, z: st.z, h: st.h, yaw: st.yaw };
    st.x = CENTER.x; st.z = CENTER.z; st.h = H_MAX;
    var best = 60;
    [0, 1, 2, 3].forEach(function (k) {
      st.yaw = Math.PI / 4 + k * Math.PI / 2; placeCam();
      var sc = pm.map(function (q) { var s = project(q.x, 0, q.z); return { x: s.x, y: s.y, a: q.aspect || 0.9 }; });
      for (var hp = best; hp > 18; hp -= 1) {
        var ok = true;
        for (var i = 0; i < sc.length && ok; i++) for (var j = i + 1; j < sc.length; j++) {
          var A = sc[i], B = sc[j], wa = hp * A.a, wb = hp * B.a;
          if (Math.abs(A.x - B.x) < (wa + wb) / 2 + 2 && Math.abs(A.y - B.y) < hp + 2) { ok = false; break; }
        }
        if (ok) { best = hp; break; }
        if (hp <= 19) best = 18;
      }
    });
    st.x = save.x; st.z = save.z; st.h = save.h; st.yaw = save.yaw; placeCam();
    figBase = best;
  }
  window.addEventListener('resize', resize);
  resize();
  st.x = CENTER.x; st.z = CENTER.z; st.h = H_MAX * 0.72;
  requestAnimationFrame(frame);
  setTimeout(function () { document.getElementById('load').classList.add('is-off'); }, 350);
  window.__map3d = { getBase: function () { return figBase; }, st: st, zoomBy: zoomBy, openCard: openCard, pm: pm, mark: function () { dirty = true; } };
})();
