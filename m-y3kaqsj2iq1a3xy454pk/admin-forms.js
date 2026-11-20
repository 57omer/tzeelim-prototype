/* Tzeelim admin – schema-driven form engine + content modules (home, articles, company, legal, tours).
   Edits S.content (data/content.js) and S.tours[key].cur (data/tour-*.js). Relies on window.TZA from admin.js. */
(function () {
  'use strict';
  var T = window.TZA, S = T.S, esc = T.esc, app = T.app, $ = T.$, $$ = T.$$;
  var STR = function (v) { return v == null ? '' : v; };

  /* ---------- paths ---------- */
  function P(str) { return String(str).split('.').map(function (k) { return /^\d+$/.test(k) ? +k : k; }); }
  function J(base, k) { return base === '' ? String(k) : base + '.' + k; }
  function rootObj(r) { return r === 'c' ? S.content : (S.tours[r.slice(5)] || {}).cur; }
  function getv(root, str) { var a = P(str), o = root; for (var i = 0; i < a.length; i++) { if (o == null) return undefined; o = o[a[i]]; } return o; }
  function setv(root, str, v) {
    var a = P(str), o = root;
    for (var i = 0; i < a.length - 1; i++) { if (o[a[i]] == null) o[a[i]] = typeof a[i + 1] === 'number' ? [] : {}; o = o[a[i]]; }
    o[a[a.length - 1]] = v;
  }
  function ensure(root, str, def) { var v = getv(root, str); if (v == null) { setv(root, str, def); v = def; } return v; }

  /* ---------- node renderers ---------- */
  function F(label, inner, wide, hint) { return '<div class="field' + (wide ? ' field--wide' : '') + '">' + (label ? '<label>' + esc(label) + '</label>' : '') + inner + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div>'; }
  function attrs(path, r) { return ' data-b="' + esc(path) + '" data-r="' + r + '"'; }
  function node(n, base, r, inList) {
    var path = n.k != null ? J(base, n.k) : base, root = rootObj(r), val = getv(root, path), a = attrs(path, r), lbl = inList ? '' : n.label;
    switch (n.t) {
      case 'note': return '<div class="note field--wide" style="grid-column:1/-1">' + n.html + '</div>';
      case 'text': return F(lbl, '<input type="text"' + a + (n.ltr ? ' dir="ltr"' : '') + ' value="' + esc(STR(val)) + '"' + (n.ph ? ' placeholder="' + esc(n.ph) + '"' : '') + '>', n.wide, n.hint);
      case 'num': return F(lbl, '<input type="number"' + a + ' step="' + (n.step || 1) + '" value="' + esc(STR(val)) + '">', n.wide, n.hint);
      case 'area': return F(lbl, '<textarea' + a + ' style="min-height:' + (n.h || 110) + 'px">' + esc(STR(val)) + '</textarea>', true, n.hint);
      case 'check': return '<div class="field"><label class="check"><input type="checkbox"' + a + (val !== false && (val || n.dflt) ? ' checked' : '') + '> ' + esc(n.label) + '</label>' + (n.hint ? '<small>' + esc(n.hint) + '</small>' : '') + '</div>';
      case 'select': var o = typeof n.opts === 'function' ? n.opts() : n.opts; return F(lbl, '<select' + a + '><option value="">בחירה…</option>' + o.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (val === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>', n.wide, n.hint);
      case 'image': case 'video':
        var isV = n.t === 'video', has = !!val;
        return '<div class="field' + (n.wide ? ' field--wide' : '') + '">' + (lbl ? '<label>' + esc(lbl) + '</label>' : '') + '<div class="media">' +
          (isV ? '<div class="media__pic media__pic--v">' + (has ? esc(String(val).split('/').pop()) : 'אין סרטון') + '</div>' : '<div class="media__pic" style="background-image:url(\'' + (has ? esc(T.src(val)) : '') + '\')"></div>') +
          '<div class="media__btns"><label class="btn btn--ghost btn--sm">' + (has ? 'החלפה' : 'העלאה') + '<input type="file" hidden accept="' + (isV ? 'video/mp4,video/webm' : 'image/*') + '" data-up="' + esc(path) + '" data-r="' + r + '" data-dir="' + esc(n.dir || 'img') + '" data-kind="' + n.t + '"' + (n.png ? ' data-png="1"' : '') + '></label>' +
          (has && !n.req ? '<button class="btn btn--ghost btn--sm" data-la="clear"' + a + '>הסרה</button>' : '') + '</div></div>' + (n.hint ? '<small>' + esc(n.hint) + '</small>' : '') + '</div>';
      case 'group': return '<fieldset class="grp field--wide"><legend>' + esc(n.label) + '</legend><div class="form">' + n.fields.map(function (f) { return node(f, path, r); }).join('') + '</div></fieldset>';
      case 'list': return listNode(n, path, r, val);
    }
    return '';
  }
  function listNode(n, path, r, val) {
    var arr = Array.isArray(val) ? val : [], h = '<div class="list-b field--wide"><div class="list-b__t">' + esc(n.label) + (n.hint ? ' <small>' + esc(n.hint) + '</small>' : '') + '</div>';
    arr.forEach(function (it, i) {
      var ip = J(path, i), body;
      if (n.item) body = node(n.item, ip, r, true);
      else if (n.tuple) body = '<div class="form form--tuple">' + n.tuple.map(function (c) { return tupleCell(c, J(ip, c.i), r); }).join('') + '</div>';
      else body = '<div class="form">' + n.fields.map(function (f) { return node(f, ip, r); }).join('') + '</div>';
      var title = n.title ? n.title(it, i) : (n.itemLabel || 'פריט') + ' ' + (i + 1);
      h += '<div class="li"><div class="li__h"><strong>' + esc(title) + '</strong><span><button class="iconbtn" data-la="up" data-b="' + esc(ip) + '" data-r="' + r + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="הזז קדימה">▲</button><button class="iconbtn" data-la="down" data-b="' + esc(ip) + '" data-r="' + r + '"' + (i === arr.length - 1 ? ' disabled' : '') + ' aria-label="הזז אחורה">▼</button><button class="iconbtn" data-la="del" data-b="' + esc(ip) + '" data-r="' + r + '" aria-label="מחיקה">✕</button></span></div>' + body + '</div>';
    });
    h += '<button class="btn btn--ghost btn--sm" data-la="add" data-b="' + esc(path) + '" data-r="' + r + '" data-def="' + esc(JSON.stringify(n.def != null ? n.def : '')) + '">+ ' + esc(n.add || 'הוספה') + '</button></div>';
    return h;
  }
  function tupleCell(c, path, r) {
    var v = getv(rootObj(r), path), a = attrs(path, r);
    if (c.t === 'num') return F(c.label, '<input type="number"' + a + ' data-scale="' + (c.scale || 1) + '" step="' + (c.step || 1) + '" value="' + (v === '' || v == null ? '' : Math.round(v * (c.scale || 1) * 10) / 10) + '">', false, c.hint);
    return F(c.label, '<input type="text"' + a + ' value="' + esc(STR(v)) + '">', c.wide);
  }
  function form(nodes, r) { return '<div class="form">' + nodes.map(function (n) { return node(n, '', r); }).join('') + '</div>'; }
  function section(title, nodes, r, open) { return '<details class="sec"' + (open ? ' open' : '') + '><summary>' + esc(title) + '</summary>' + form(nodes, r) + '</details>'; }
  function bar(title, right) { return '<div class="bar"><h1>' + esc(title) + '</h1><div class="filters">' + (right || '') + '</div></div>'; }
  function pvBtn(arg) { return '<button class="btn btn--ghost btn--sm" data-ma="pv" data-arg="' + esc(arg) + '">תצוגה מקדימה באתר</button>'; }
  function projOpts() { return S.items.map(function (p) { return [p.slug, p.name]; }); }

  /* ---------- generic events ---------- */
  app.addEventListener('input', onBind); app.addEventListener('change', onBind);
  function onBind(ev) {
    var t = ev.target, b = t.dataset && t.dataset.b; if (!b || t.dataset.la) return;
    if (t.dataset.up) return;
    var root = rootObj(t.dataset.r); if (!root) return;
    var v;
    if (t.type === 'checkbox') v = t.checked;
    else if (t.type === 'number') v = t.value === '' ? '' : (+t.value) / (+t.dataset.scale || 1);
    else v = t.value;
    setv(root, b, v); T.persist();
  }
  app.addEventListener('change', function (ev) { var t = ev.target; if (t.dataset && t.dataset.up && t.files && t.files[0]) upload(t); });
  function keepScroll(fn) { var y = window.scrollY; fn(); T.render(); window.scrollTo(0, y); }
  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-la]'); if (!b) return;
    var la = b.dataset.la, path = b.dataset.b, root = rootObj(b.dataset.r); if (!root) return;
    keepScroll(function () {
      if (la === 'clear') { setv(root, path, ''); }
      else if (la === 'add') { var arr = ensure(root, path, []); var d = JSON.parse(b.dataset.def); arr.push(d && typeof d === 'object' ? JSON.parse(JSON.stringify(d)) : d); }
      else {
        var a = P(path), idx = a.pop(), arr2 = getv(root, a.join('.'));
        if (la === 'del') { if (confirm('למחוק את הפריט?')) arr2.splice(idx, 1); }
        if (la === 'up' && idx > 0) { var t = arr2[idx]; arr2[idx] = arr2[idx - 1]; arr2[idx - 1] = t; }
        if (la === 'down' && idx < arr2.length - 1) { var t2 = arr2[idx]; arr2[idx] = arr2[idx + 1]; arr2[idx + 1] = t2; }
      }
      T.persist();
    });
  });
  function upload(input) {
    var f = input.files[0], kind = input.dataset.kind, dir = input.dataset.dir, id = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
    var done = function (blob, ext) {
      var path = dir + '/' + id + '.' + ext;
      S.files[path] = { blob: blob, url: URL.createObjectURL(blob) };
      setv(rootObj(input.dataset.r), input.dataset.up, path); T.persist(); T.render(); T.toast('הקובץ נוסף. הוא יעלה לאתר בפרסום');
    };
    if (kind === 'video') {
      if (!/^video\/(mp4|webm)$/.test(f.type)) return T.toast('יש להעלות וידאו mp4 או webm');
      if (f.size > 60 * 1024 * 1024) return T.toast('הסרטון גדול מ-60MB. יש לכווץ אותו לפני ההעלאה (מומלץ עד 20MB)');
      if (f.size > 25 * 1024 * 1024 && !confirm('הסרטון כבד (' + Math.round(f.size / 1048576) + 'MB) ויאט את האתר. להמשיך?')) return;
      return done(f, f.type === 'video/webm' ? 'webm' : 'mp4');
    }
    if (!/^image\//.test(f.type)) return T.toast('יש להעלות תמונה');
    if (input.dataset.png && f.type === 'image/png' && f.size < 700 * 1024) return done(f, 'png');
    T.toast('מעבדים את התמונה…');
    T.compress(f, 1920, 0.82).then(function (b) { done(b, 'jpg'); }).catch(function () { T.toast('לא הצלחנו לעבד את התמונה'); });
  }

  /* ================= HOME ================= */
  var BLOCK_TYPES = [['p', 'פסקה'], ['h2', 'כותרת'], ['h3', 'תת-כותרת'], ['li', 'פריט ברשימה']];
  function blocksNode(types) {
    return { t: 'list', k: 'blocks', label: 'תוכן המסמך', add: 'הוספת בלוק', def: { type: 'p', text: '' }, itemLabel: 'בלוק',
      title: function (it) { var tl = (types || BLOCK_TYPES).filter(function (x) { return x[0] === it.type; })[0]; return (tl ? tl[1] : it.type) + ': ' + String(it.text || '').slice(0, 40); },
      fields: [{ t: 'select', k: 'type', label: 'סוג', opts: types || BLOCK_TYPES }, { t: 'area', k: 'text', label: 'טקסט', h: 90 }] };
  }
  T.views.home = function () {
    var h = bar('עמוד הבית ואודות', pvBtn('home')) + '<p class="muted">הטקסטים והאזורים שמופיעים בדף הבית ובעמוד אודות. פתחו אזור כדי לערוך.</p>';
    h += secPanel();
    h += section('פתיחה וסלוגן', [
      { t: 'text', k: 'company.tagline', label: 'סלוגן', hint: 'מופיע בראש הדף ובפוטר' },
      { t: 'text', k: 'company.sinceLine', label: 'שורת תיאור בפוטר', hint: 'למשל: קבלני בניין בקריות, מאז 1991' },
      { t: 'area', k: 'company.lead', label: 'פסקת פתיחה', h: 90 }], 'c', true);
    h += section('על החברה', [
      { t: 'num', k: 'company.founded', label: 'שנת הקמה' }, { t: 'num', k: 'company.occupiedCount', label: 'מספר פרויקטים מאוכלסים (מוצג בסטטיסטיקה)', hint: 'אם ריק, נספרים הפרויקטים המאוכלסים שבמערכת' }, { t: 'num', k: 'company.years', label: 'שנות ניסיון', hint: 'המספר מופיע גם בתוך כותרות וטקסטים, לעדכן אותם ידנית' },
      { t: 'text', k: 'company.yearsHeading', label: 'כותרת ניסיון', wide: true }, { t: 'text', k: 'company.servicesHeading', label: 'כותרת שירותים', wide: true },
      { t: 'list', k: 'company.intro', label: 'פסקאות אודות', add: 'פסקה', def: '', itemLabel: 'פסקה', item: { t: 'area', h: 90 } },
      { t: 'list', k: 'company.services', label: 'שירותים', add: 'שירות', def: '', itemLabel: 'שירות', item: { t: 'text' } }], 'c');
    h += section('ערכי החברה', [{ t: 'list', k: 'values', label: 'ערכים', add: 'ערך', def: { title: '', text: '' }, itemLabel: 'ערך', title: function (it, i) { return (i + 1) + '. ' + (it.title || ''); }, fields: [{ t: 'text', k: 'title', label: 'כותרת' }, { t: 'area', k: 'text', label: 'טקסט', h: 80 }] }], 'c');
    h += section('כותרות אזורי הפרויקטים', ['marketing', 'construction', 'occupied'].map(function (k) {
      return { t: 'group', k: 'sections.' + k, label: { marketing: 'פרויקטים בשיווק', construction: 'פרויקטים בבנייה', occupied: 'פרויקטים מאוכלסים' }[k], fields: [{ t: 'text', k: 'title', label: 'כותרת' }, { t: 'area', k: 'intro', label: 'הסבר', h: 70 }] };
    }).concat([{ t: 'area', k: 'sections.projectsGeneral', label: 'הסבר בעמוד כל הפרויקטים', h: 70 }]), 'c');
    h += section('מאוכלסים שמוצגים בדף הבית', [{ t: 'list', k: 'home.occupied', label: 'פרויקטים', hint: 'לרוב 3', add: 'פרויקט', def: '', itemLabel: 'פרויקט', item: { t: 'select', opts: projOpts } }], 'c');
    h += section('סרטון פרומו בדף הבית', [
      { t: 'select', k: 'promo.slug', label: 'פרויקט מקושר (כפתור "לעמוד הפרויקט")', opts: projOpts },
      { t: 'text', k: 'promo.eyebrow', label: 'שורה קטנה מעל הכותרת' }, { t: 'text', k: 'promo.title', label: 'כותרת' },
      { t: 'area', k: 'promo.text', label: 'טקסט', h: 80 },
      { t: 'video', k: 'promo.video', label: 'סרטון', dir: 'video', hint: 'mp4, מומלץ עד 20MB' }, { t: 'image', k: 'promo.poster', label: 'תמונה לפני ההפעלה', dir: 'video' }], 'c');
    h += section('שותפים ולקוחות (לוגואים)', [
      { t: 'text', k: 'partnersHeading', label: 'כותרת האזור', wide: true },
      { t: 'list', k: 'partners', label: 'לוגואים', add: 'לוגו', def: { src: '', alt: '' }, itemLabel: 'לוגו', title: function (it, i) { return (i + 1) + '. ' + (it.alt || 'לוגו'); }, fields: [{ t: 'image', k: 'src', label: 'תמונה', dir: 'img/partners', png: true, req: true }, { t: 'text', k: 'alt', label: 'שם השותף (תיאור לנגישות)' }] }], 'c');
    h += section('אזור המאמרים בדף הבית', [{ t: 'text', k: 'articlesIntro.title', label: 'כותרת' }, { t: 'area', k: 'articlesIntro.text', label: 'הסבר', h: 70 }], 'c');
    h += '<div class="note">שקופיות הסרטון בראש דף הבית (הירו) מתחלפות בצוות הפיתוח, כי כל שקופית דורשת קבצי וידאו ותמונות ייעודיים.</div>';
    app.innerHTML = h;
  };

  /* home sections on/off: hiding keeps all the content, so a section can be restored at any time */
  var SECS = [['promo41', 'סרטון פרומו', 'promo'], ['marketing', 'פרויקטים בשיווק'], ['about-teaser', 'אודות החברה (תקציר)'], ['construction', 'פרויקטים בבנייה'], ['occupied', 'פרויקטים מאוכלסים'], ['map-section', 'מפת הפרויקטים'], ['partners', 'שותפים ולקוחות'], ['articles', 'מאמרים'], ['cta', 'יצירת קשר (טופס השארת פרטים)']];
  function isOn(s) { var C = S.content; if (s[2] === 'promo') return !(C.promo && C.promo.enabled === false); return ((C.home || {}).hidden || []).indexOf(s[0]) < 0; }
  function secPanel() {
    return '<details class="sec" open><summary>אזורים בדף הבית (הצגה והסתרה)</summary><div style="padding:0 18px 18px"><p class="muted">אזור שמוסתר לא מוצג למבקרים, אבל כל התוכן שלו נשמר, ואפשר להחזיר אותו בכל רגע. הבאנר בראש הדף (הירו) תמיד מוצג.</p><div class="secs">' +
      SECS.map(function (s) { var on = isOn(s); return '<label class="secrow' + (on ? '' : ' is-off') + '"><input type="checkbox" data-sec="' + s[0] + '"' + (on ? ' checked' : '') + '><span>' + esc(s[1]) + '</span><em>' + (on ? 'מוצג' : 'מוסתר') + '</em></label>'; }).join('') +
      '</div></div></details>';
  }
  app.addEventListener('change', function (ev) {
    var t = ev.target; if (!t.dataset || !t.dataset.sec) return;
    var C = S.content, id = t.dataset.sec, sec = SECS.filter(function (s) { return s[0] === id; })[0];
    if (id === 'cta' && !t.checked && !confirm('הסתרת טופס השארת הפרטים תפחית פניות מהאתר. להמשיך?')) { t.checked = true; return; }
    if (sec[2] === 'promo') { C.promo = C.promo || {}; C.promo.enabled = t.checked; }
    else { C.home = C.home || {}; var h = C.home.hidden = C.home.hidden || []; var i = h.indexOf(id); if (t.checked && i >= 0) h.splice(i, 1); if (!t.checked && i < 0) h.push(id); }
    T.persist(); var row = t.closest('.secrow'); row.classList.toggle('is-off', !t.checked); row.querySelector('em').textContent = t.checked ? 'מוצג' : 'מוסתר';
  });

  /* ================= COMPANY / CONTACT ================= */
  T.views.company = function () {
    var h = bar('פרטי חברה וקשר', pvBtn('contact')) + '<p class="muted">הפרטים מופיעים בכותרת, בפוטר, בעמוד צור קשר, בכפתורי ההתקשרות ובוואטסאפ. מספרי הטלפון בפורמט רגיל, למשל 052-8587821.</p>';
    h += form([
      { t: 'text', k: 'contact.mainPhone', label: 'טלפון ראשי', ltr: true }, { t: 'text', k: 'contact.officePhone', label: 'טלפון משרד', ltr: true },
      { t: 'text', k: 'contact.mobile', label: 'נייד', ltr: true }, { t: 'text', k: 'contact.fax', label: 'פקס', ltr: true },
      { t: 'text', k: 'contact.address', label: 'כתובת המשרד', wide: true },
      { t: 'text', k: 'contact.whatsapp', label: 'קישור וואטסאפ', ltr: true, wide: true, hint: 'בפורמט https://wa.me/9725XXXXXXXX (מספר בינלאומי, בלי אפס ובלי מקפים)' },
      { t: 'text', k: 'contact.facebook', label: 'קישור פייסבוק', ltr: true, wide: true }], 'c');
    h += '<div class="note" style="margin-top:20px">מיקום המשרד על המפה, פרטי החברה בטקסטים המשפטיים והנתונים המובנים לגוגל (JSON-LD) מתעדכנים בנפרד. שינוי טלפון כאן לא ישנה אותם.</div>';
    app.innerHTML = h;
  };

  /* ================= ARTICLES ================= */
  var ART = -1;
  T.views.articles = function () {
    var A = S.content.articles || [];
    var h = bar('מאמרים', '<button class="btn" data-ma="art-new">+ מאמר חדש</button>') + '<p class="muted">הסדר כאן הוא הסדר באתר. שלושת הראשונים מופיעים גם בדף הבית.</p><div class="grid">';
    A.forEach(function (a, i) {
      h += '<article class="card"><div class="card__img" style="background-image:url(\'' + esc(T.src(a.cover)) + '\')"></div><div class="card__body"><div class="card__name">' + esc(a.title || '(בלי כותרת)') + '</div><p class="muted" style="margin:6px 0 0;font-size:.9rem">' + esc((a.excerpt || '').slice(0, 90)) + '</p></div><div class="card__foot"><button class="iconbtn" data-ma="art-up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="הזז קדימה">▲</button><button class="iconbtn" data-ma="art-down" data-i="' + i + '"' + (i === A.length - 1 ? ' disabled' : '') + ' aria-label="הזז אחורה">▼</button><span class="sp"></span><button class="btn btn--sm" data-ma="art-edit" data-i="' + i + '">עריכה</button></div></article>';
    });
    app.innerHTML = h + '</div>';
  };
  T.views.article = function () {
    var a = (S.content.articles || [])[ART]; if (!a) { S.view = 'articles'; return T.render(); }
    var h = bar(a.title || 'מאמר חדש', pvBtn('article')) + form([
      { t: 'text', k: 'articles.' + ART + '.title', label: 'כותרת', wide: true },
      { t: 'area', k: 'articles.' + ART + '.excerpt', label: 'תקציר (מופיע בכרטיס)', h: 80 },
      { t: 'image', k: 'articles.' + ART + '.cover', label: 'תמונת שער', dir: 'img/articles', wide: true, hint: 'יחס 16:10 מומלץ' },
      Object.assign(blocksNode(), { k: 'articles.' + ART + '.blocks' })], 'c');
    h += '<div class="note" style="margin-top:20px">כתובת המאמר (' + esc(a.id) + ') נקבעת ביצירה ואינה משתנה.</div><div class="sticky"><div class="grp"><button class="btn btn--ghost" data-ma="art-back">חזרה לרשימה</button></div><div class="grp"><button class="btn btn--danger" data-ma="art-del">מחיקת מאמר</button></div></div>';
    app.innerHTML = h;
  };

  /* ================= LEGAL ================= */
  var LK = 'privacy', LEG = [['privacy', 'מדיניות פרטיות'], ['terms', 'תנאי שימוש'], ['cookies', 'מדיניות עוגיות'], ['accessibility', 'הצהרת נגישות']];
  T.views.legal = function () {
    var h = bar('דפים משפטיים', pvBtn('legal')) + '<div class="note"><strong>זהירות:</strong> אלה טקסטים משפטיים (טיוטה לבדיקת עורך דין). שינוי בהם עלול להשפיע על העמידה בחוק. מומלץ להתייעץ לפני עריכה.</div>';
    h += '<div class="tabs">' + LEG.map(function (l) { return '<button class="' + (LK === l[0] ? 'is-on' : '') + '" data-ma="leg" data-arg="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div>';
    h += form([{ t: 'text', k: 'legal.' + LK + '.title', label: 'כותרת' }, { t: 'text', k: 'legal.' + LK + '.updated', label: 'תאריך עדכון (טקסט חופשי)' },
      Object.assign(blocksNode([['p', 'פסקה'], ['h2', 'כותרת'], ['li', 'פריט ברשימה']]), { k: 'legal.' + LK + '.blocks' })], 'c');
    app.innerHTML = h;
  };

  /* ================= TOURS ================= */
  var TK = null;
  function tourProject(key) { return S.items.filter(function (p) { return (p.tours || []).indexOf(key) >= 0; })[0]; }
  T.views.tours = function () {
    var keys = Object.keys(S.tours);
    var h = bar('סיורי דירה') + '<p class="muted">סיורים אינטראקטיביים בעמוד הפרויקט. אפשר לערוך שמות, תיאורים, חדרים וכיתובים ולהחליף את הסרטון, התוכנית והתמונה.</p><div class="grid">';
    keys.forEach(function (k) { var t = S.tours[k].cur, p = tourProject(k); h += '<article class="card"><div class="card__img" style="background-image:url(\'' + esc(T.src(t.poster)) + '\')"></div><div class="card__body"><div class="card__name">' + esc(t.title || k) + '</div><div class="card__meta"><span class="badge">' + esc(p ? p.name : '') + '</span><span class="badge">' + (t.stops || []).length + ' חדרים</span></div></div><div class="card__foot"><span class="sp"></span><button class="btn btn--sm" data-ma="tour-edit" data-arg="' + esc(k) + '">עריכה</button></div></article>'; });
    app.innerHTML = h + '</div><div class="note" style="margin-top:20px">הוספת סיור לדירה חדשה דורשת גם מסלול הליכה על התוכנית (נתונים שמופקים בכלי ייעודי), ולכן נעשית בצוות הפיתוח.</div>';
  };
  T.views.tour = function () {
    var t = S.tours[TK]; if (!t) { S.view = 'tours'; return T.render(); }
    var r = 'tour:' + TK;
    var h = bar(t.cur.title || TK, pvBtn('tour')) + form([
      { t: 'text', k: 'eyebrow', label: 'שורה קטנה מעל הכותרת' }, { t: 'text', k: 'title', label: 'כותרת' },
      { t: 'area', k: 'desc', label: 'תיאור הדירה', h: 90 },
      { t: 'video', k: 'video', label: 'סרטון הסיור', dir: 'video', req: true, hint: 'החלפת סרטון דורשת לתזמן מחדש את החדרים (ראו להלן). המסלול על התוכנית נשאר כפי שהיה.' },
      { t: 'image', k: 'poster', label: 'תמונה לפני ההפעלה', dir: 'img/p/' + ((tourProject(TK) || {}).slug || 'tours'), req: true },
      { t: 'image', k: 'plan', label: 'תוכנית הדירה', dir: 'img/p/' + ((tourProject(TK) || {}).slug || 'tours'), png: true, req: true, hint: 'החלפת התוכנית בתמונה בגודל או חיתוך אחר תשבור את המסלול על המפה הקטנה' },
      { t: 'list', k: 'stops', label: 'חדרים וכיתובים', hint: 'המיקום הוא אחוז מאורך הסרטון, בסדר עולה', add: 'חדר', def: [0.5, 'חדר חדש', ''], itemLabel: 'חדר',
        title: function (it) { return Math.round((it[0] || 0) * 1000) / 10 + '% · ' + (it[1] || ''); },
        tuple: [{ i: 0, t: 'num', label: 'מיקום בסרטון (%)', scale: 100, step: 0.1 }, { i: 1, t: 'text', label: 'שם החדר' }, { i: 2, t: 'text', label: 'כיתוב שמופיע על הסרטון', wide: true }] }], r);
    h += '<div class="sticky"><div class="grp"><button class="btn btn--ghost" data-ma="tour-back">חזרה לסיורים</button></div></div>';
    app.innerHTML = h;
  };

  /* ---------- module actions ---------- */
  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-ma]'); if (!b) return;
    var a = b.dataset.ma, arg = b.dataset.arg, i = +b.dataset.i, A = S.content.articles;
    if (a === 'pv') return doPreview(arg);
    if (a === 'art-edit') { ART = i; S.view = 'article'; T.render(); window.scrollTo(0, 0); }
    else if (a === 'art-back') { S.view = 'articles'; T.render(); }
    else if (a === 'art-up' && i > 0) { var t = A[i]; A[i] = A[i - 1]; A[i - 1] = t; T.persist(); T.render(); }
    else if (a === 'art-down' && i < A.length - 1) { var t2 = A[i]; A[i] = A[i + 1]; A[i + 1] = t2; T.persist(); T.render(); }
    else if (a === 'art-new') newArticle();
    else if (a === 'art-del') { if (confirm('למחוק את המאמר "' + (A[ART].title || '') + '"? אפשר לשחזר רק מהיסטוריית הגרסאות.')) { A.splice(ART, 1); T.persist(); S.view = 'articles'; T.render(); } }
    else if (a === 'leg') { LK = arg; T.render(); }
    else if (a === 'tour-edit') { TK = arg; S.view = 'tour'; T.render(); window.scrollTo(0, 0); }
    else if (a === 'tour-back') { S.view = 'tours'; T.render(); }
  });
  function newArticle() {
    T.modal('<h2>מאמר חדש</h2><div class="form"><div class="field field--wide"><label>כותרת</label><input type="text" id="na-t"></div><div class="field field--wide"><label>כתובת באנגלית (slug)</label><input type="text" dir="ltr" id="na-s"><small>אותיות לטיניות, מספרים ומקפים. נקבעת פעם אחת.</small></div></div><p class="err" id="na-e"></p><div class="modal__foot"><button class="btn btn--ghost" data-close>ביטול</button><button class="btn" id="na-ok">יצירה</button></div>');
    var tt = $('#na-t'), ss = $('#na-s'), man = false; ss.addEventListener('input', function () { man = true; }); tt.addEventListener('input', function () { if (!man) ss.value = T.slugify(tt.value); });
    $('#na-ok').onclick = function () {
      var title = tt.value.trim(), id = ss.value.trim(), e = $('#na-e');
      if (!title) return e.textContent = 'יש להזין כותרת';
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return e.textContent = 'ה-slug חייב להיות באותיות לטיניות קטנות, מספרים ומקפים';
      if (S.content.articles.some(function (x) { return x.id === id; })) return e.textContent = 'כבר קיים מאמר עם ה-slug הזה';
      S.content.articles.unshift({ id: id, title: title, excerpt: '', cover: '', blocks: [{ type: 'p', text: '' }] });
      ART = 0; S.view = 'article'; T.closeModal(); T.persist(); T.render(); T.toast('המאמר נוצר. הוסיפו תמונה, תקציר ותוכן');
    };
  }
  function doPreview(arg) {
    var a = (S.content.articles || [])[ART];
    var map = {
      home: [['דף הבית', 'home.html?noloader=1&draft=1'], ['אודות', 'about.html?draft=1']],
      contact: [['צור קשר', 'contact.html?draft=1'], ['דף הבית', 'home.html?noloader=1&draft=1']],
      article: [['המאמר', 'article.html?id=' + encodeURIComponent(a ? a.id : '') + '&draft=1'], ['רשימת מאמרים', 'articles.html?draft=1'], ['דף הבית', 'home.html?noloader=1&draft=1']],
      legal: [['המסמך', 'legal.html?doc=' + LK + '&draft=1']],
      tour: [['עמוד הפרויקט', 'project.html?p=' + ((tourProject(TK) || {}).slug || '') + '&draft=1']]
    };
    T.previewPages(map[arg] || map.home, 0);
  }
})();
