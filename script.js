const SUPABASE_URL = 'https://blqtsgbkysfkpqrfyfpt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscXRzZ2JreXNma3BxcmZ5ZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2MTMzMDAsImV4cCI6MjExMDE4OTMwMH0.nArGREZ4goxv7WHQXPE-ahzD_5DoDGbzGdfiQpK2cK0';

let sb = null;
let apps = [];
let selMode = false;
let sel = new Set();
let editing = null;

/* Reloj 12h sin segundos */
(function () {
    const el = document.getElementById('clock');
    if (!el) return;
    function tick() {
        const d = new Date();
        let h = d.getHours();
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        el.textContent = String(h).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
    }
    tick();
    setInterval(tick, 1000);
})();

function initSb() {
    try {
        if (window.supabase) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
        console.error('sb', e);
        sb = null;
    }
}

async function loadApps() {
    const grid = document.getElementById('grid');
    const empty = document.getElementById('emptyState');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--muted);">Cargando...</div>';
    try {
        if (!sb) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
        const { data, error } = await sb.from('apps').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        apps = data || [];
        render();
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--muted);">No se pudieron cargar las apps</div>';
        empty.style.display = 'block';
    }
}

function render() {
    const grid = document.getElementById('grid');
    const empty = document.getElementById('emptyState');
    grid.innerHTML = '';
    if (!apps.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    for (const a of apps) {
        const c = document.createElement('div');
        c.className = 'card' + (sel.has(a.id) ? ' selected' : '');
        c.dataset.id = a.id;
        c.dataset.link = a.link || '';
        c.innerHTML =
            (a.image_url ? `<img class="thumb" src="${a.image_url}" alt="">` : `<div class="no-thumb">📱</div>`) +
            `<h3>${esc(a.name)}</h3><p>${esc(a.description)}</p>` +
            `<div class="foot">Descargar</div>`;
        grid.appendChild(c);
    }
}

function esc(t) {
    if (t == null) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function openCard(id, link) {
    if (selMode) { toggleSel(id); return; }
    if (link) window.open(link, '_blank');
}

function toggleSel(id) {
    if (sel.has(id)) { sel.delete(id); } else { sel.add(id); }
    render();
    updateDel();
}

function updateDel() {
    const b = document.getElementById('btnDel');
    b.classList.toggle('hidden', sel.size === 0);
}

function toggleSelMode() {
    selMode = !selMode;
    const b = document.getElementById('btnSel');
    b.classList.toggle('active');
    if (b.classList.contains('active')) {
        b.style.background = 'var(--blue-soft)';
        b.style.color = 'var(--blue)';
        b.style.borderColor = 'var(--blue)';
    } else {
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
        sel.clear();
        render();
        updateDel();
    }
}

async function delSel() {
    if (sel.size === 0) return;
    if (!confirm('Eliminar ' + sel.size + ' app(s)?')) return;
    try {
        if (!sb) { alert('Sin Supabase'); return; }
        const { error } = await sb.from('apps').delete().in('id', Array.from(sel));
        if (error) throw error;
        sel.clear();
        render();
        updateDel();
        selMode = false;
        const b = document.getElementById('btnSel');
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
        toast('Apps eliminadas', 'ok');
    } catch (e) {
        console.error(e);
        toast('Error al eliminar', 'bad');
    }
}

/* Modales */
function openAdd() {
    document.getElementById('modalTitle').innerHTML = '<span class="ic">➕</span> Subir App';
    document.getElementById('form').reset();
    document.getElementById('appId').value = '';
    document.getElementById('prev').innerHTML = '<span class="ic">🖼️</span>';
    editing = null;
    document.getElementById('overlay').classList.add('open');
}

function openEditList() {
    const list = document.getElementById('editList');
    if (!apps.length) { alert('No hay apps para editar'); return; }
    list.innerHTML = apps.map(a => `
        <div class="item" data-id="${a.id}">
            ${a.image_url ? `<img class="thumb" src="${a.image_url}" alt="">` : `<div class="no-thumb">📱</div>`}
            <div class="info"><div class="t">${esc(a.name)}</div><div class="d">${esc(a.description.slice(0, 60))}...</div></div>
        </div>
    `).join('');
    list.querySelectorAll('.item').forEach(it => {
        it.addEventListener('click', () => openEdit(it.dataset.id));
    });
    document.getElementById('overlayEdit').classList.add('open');
}

function openEdit(id) {
    const a = apps.find(x => x.id === id);
    if (!a) return;
    document.getElementById('overlayEdit').classList.remove('open');
    document.getElementById('modalTitle').innerHTML = '<span class="ic">✏️</span> Editar App';
    document.getElementById('appId').value = a.id;
    document.getElementById('name').value = a.name;
    document.getElementById('desc').value = a.description;
    document.getElementById('link').value = a.link || '';
    document.getElementById('prev').innerHTML = a.image_url ? `<img class="thumb" src="${a.image_url}" alt="">` : '<span class="ic">🖼️</span>';
    editing = a;
    document.getElementById('overlay').classList.add('open');
}

function closeAll() {
    document.getElementById('overlay').classList.remove('open');
    document.getElementById('overlayEdit').classList.remove('open');
}

/* Imagen previo */
const fi = document.getElementById('img');
const fp = document.getElementById('prev');
fi.addEventListener('change', function () {
    const f = this.files[0];
    if (!f) { fp.innerHTML = '<span class="ic">🖼️</span>'; return; }
    const r = new FileReader();
    r.onload = ev => { fp.innerHTML = `<img class="thumb" src="${ev.target.result}" alt="">`; };
    r.readAsDataURL(f);
});

/* Guardar */
async function save(e) {
    e.preventDefault();
    const id = document.getElementById('appId').value;
    const name = document.getElementById('name').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const link = document.getElementById('link').value.trim();
    const file = document.getElementById('img').files[0];
    if (!name || !desc || !link) { alert('Completa todos los campos'); return; }
    if (!sb) { alert('Sin Supabase'); return; }
    let imgUrl = editing?.image_url || null;
    if (file) {
        const fn = Date.now() + '_' + file.name;
        const { error: ue } = await sb.storage.from('app-images').upload(fn, file);
        if (ue) throw ue;
        const { data: { publicUrl } } = sb.storage.from('app-images').getPublicUrl(fn);
        imgUrl = publicUrl;
    }
    const data = { name, description: desc, link, image_url: imgUrl };
    try {
        if (id) {
            const { error } = await sb.from('apps').update(data).eq('id', id);
            if (error) throw error;
            toast('App actualizada', 'ok');
        } else {
            const { error } = await sb.from('apps').insert([data]);
            if (error) throw error;
            toast('App subida', 'ok');
        }
        closeAll();
        await loadApps();
    } catch (e) {
        console.error(e);
        toast('Error al guardar', 'bad');
    }
}

/* Toast */
function toast(m, kind) {
    const t = document.getElementById('toast');
    t.textContent = m;
    t.className = 'toast ' + kind + ' show';
    setTimeout(() => t.classList.remove('show'), 2500);
}

/* Listeners */
function wire() {
    document.getElementById('btnAdd').addEventListener('click', openAdd);
    document.getElementById('btnEditar').addEventListener('click', openEditList);
    document.getElementById('btnSel').addEventListener('click', toggleSelMode);
    document.getElementById('btnDel').addEventListener('click', delSel);
    document.getElementById('btnTheme').addEventListener('click', () => {
        const dark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
        document.getElementById('btnTheme').querySelector('.ic').textContent = dark ? '☀️' : '🌙';
    });
    document.getElementById('closeModal').addEventListener('click', closeAll);
    document.getElementById('closeEdit').addEventListener('click', closeAll);
    document.getElementById('cancel').addEventListener('click', closeAll);
    document.getElementById('form').addEventListener('submit', save);
    document.getElementById('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeAll(); });
    document.getElementById('overlayEdit').addEventListener('click', e => { if (e.target.id === 'overlayEdit') closeAll(); });
    const grid = document.getElementById('grid');
    grid.addEventListener('click', e => {
        const card = e.target.closest('.card');
        if (!card) return;
        openCard(card.dataset.id, card.dataset.link);
    });
}

function init() {
    initSb();
    wire();
    loadApps();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

window.openAdd = openAdd;
window.openEditList = openEditList;
window.toggleSelMode = toggleSelMode;
window.delSel = delSel;
