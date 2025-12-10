let EVENTO_TITULO = "Mujeres en Movimiento";
const CSV_PATH = 'data/participantes.csv';
const PDF_UNITS = 'mm';
const PDF_FORMAT = 'a4';
const PDF_ORIENTATION = 'l';
let bgDataUrl = null;
let currentNombreX = 148.5;
let currentNombreY = 140;
let currentCedulaX = 148.5;
let currentCedulaY = 150;
let currentFuente = 'helvetica';
let currentTamano = 28;
let currentColor = '#000000';
const FONTS_KEY = 'gdc_fonts';
let fontsStore = {}; // { family: { dataUrl, base64, format, vfsName } }
let customFontFormat = 'truetype';
let participantesData = [];
const tituloEvento = document.getElementById('titulo-evento');
if (tituloEvento) {
    tituloEvento.textContent = `Descarga tu Certificado para el evento: ${EVENTO_TITULO}`;
}
const logoEvento = document.getElementById('logo-evento');
function aplicarLandingDesdeStorage() {
    try {
        const cfg = JSON.parse(localStorage.getItem('gdc_landing') || '{}');
        if (cfg.bgColor) document.documentElement.style.setProperty('--background-color', cfg.bgColor);
        if (cfg.primaryColor) document.documentElement.style.setProperty('--primary-color', cfg.primaryColor);
        if (cfg.textColor) document.documentElement.style.setProperty('--text-color', cfg.textColor);
        if (cfg.logo) {
            if (logoEvento) { logoEvento.src = cfg.logo; logoEvento.style.display = 'inline-block'; }
        }
    } catch {}
}
function cargarDatos() {
    const csvStored = localStorage.getItem('gdc_csv');
    if (csvStored) {
        Papa.parse(csvStored, { header: true, skipEmptyLines: true, complete: r => { participantesData = r.data; } });
    } else {
        Papa.parse(CSV_PATH, { download: true, header: true, skipEmptyLines: true, complete: r => { participantesData = r.data; } });
    }
}
window.onload = function() {
    aplicarLandingDesdeStorage();
    cargarDatos();
    const bgStored = localStorage.getItem('gdc_bg');
    if (bgStored) { bgDataUrl = bgStored; const z = document.getElementById('zona-calibracion'); if (z) z.style.backgroundImage = `url('${bgDataUrl}')`; }
    loadFontsFromStorage();
    ensureLeagueSpartanDefault();
    const slug = getCurrentSlug();
    const cfgUrl = slug ? `configs/${slug}.json` : 'config.json';
    try {
        const localM = JSON.parse(localStorage.getItem('gdc_sub_configs')||'{}');
        const localCfg = slug ? localM[slug] : null;
        if (localCfg) { importConfig(localCfg); }
        fetch(cfgUrl).then(r => r.ok ? r.json() : null).then(cfg => {
            if (!cfg) return;
            if (cfg.bg) { bgDataUrl = cfg.bg; localStorage.setItem('gdc_bg', bgDataUrl); const z = document.getElementById('zona-calibracion'); if (z) z.style.backgroundImage = `url('${bgDataUrl}')`; }
            if (cfg.font && cfg.font.dataUrl && cfg.font.base64 && cfg.font.family) {
                fontsStore[cfg.font.family] = { dataUrl: cfg.font.dataUrl, base64: cfg.font.base64, format: cfg.font.format || 'truetype', vfsName: `${cfg.font.family}.ttf` };
                persistFonts();
                injectFontCss(cfg.font.family, cfg.font.dataUrl, cfg.font.format || 'truetype');
                addFontOption(cfg.font.family);
            }
            if (cfg.csv) { localStorage.setItem('gdc_csv', cfg.csv); Papa.parse(cfg.csv, { header: true, skipEmptyLines: true, complete: r => { participantesData = r.data; } }); }
            if (cfg.design) { localStorage.setItem('gdc_cfg', JSON.stringify(cfg.design)); currentNombreX = cfg.design.nombreX ?? currentNombreX; currentNombreY = cfg.design.nombreY ?? currentNombreY; currentCedulaX = cfg.design.cedulaX ?? currentCedulaX; currentCedulaY = cfg.design.cedulaY ?? currentCedulaY; currentFuente = cfg.design.fuente ?? currentFuente; currentTamano = cfg.design.tamano ?? currentTamano; currentColor = cfg.design.color ?? currentColor; applyPreview(); }
            if (cfg.eventTitle) { EVENTO_TITULO = cfg.eventTitle; const t = document.getElementById('titulo-evento'); if (t) t.textContent = `Descarga tu Certificado para el evento: ${EVENTO_TITULO}`; }
            if (cfg.landing) { localStorage.setItem('gdc_landing', JSON.stringify(cfg.landing)); aplicarLandingDesdeStorage(); }
            }).catch(()=>{});
    } catch {}
    const cfgStored = localStorage.getItem('gdc_cfg');
    if (cfgStored) {
        try {
            const cfg = JSON.parse(cfgStored);
            currentNombreX = cfg.nombreX ?? currentNombreX;
            currentNombreY = cfg.nombreY ?? currentNombreY;
            currentCedulaX = cfg.cedulaX ?? currentCedulaX;
            currentCedulaY = cfg.cedulaY ?? currentCedulaY;
            currentFuente = cfg.fuente ?? currentFuente;
            currentTamano = cfg.tamano ?? currentTamano;
            currentColor = cfg.color ?? currentColor;
        } catch {}
    }
};
function cambiarVista(vista) {
    const publica = document.getElementById('vista-publica');
    const admin = document.getElementById('vista-admin');
    if (!publica || !admin) return;
    if (vista === 'admin') {
        publica.style.display = 'none';
        admin.style.display = 'block';
    } else {
        publica.style.display = 'block';
        admin.style.display = 'none';
    }
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'A' || e.key === 'a') {
        ensureAdminAuth(() => { cambiarVista('admin'); ensureAdminSlugContext(); });
        e.preventDefault();
    }
});
const ADMIN_PASSWORD = 'david1065864538#128929';
const adminBtn = document.getElementById('admin-btn');
function ensureAdminAuth(cb) {
    if (sessionStorage.getItem('gdc_admin_ok') === '1') { cb(); return; }
    const v = prompt('Clave de administrador');
    if (v === ADMIN_PASSWORD) { sessionStorage.setItem('gdc_admin_ok','1'); cb(); } else { alert('Clave incorrecta'); }
}
if (adminBtn) adminBtn.addEventListener('click', () => ensureAdminAuth(() => { cambiarVista('admin'); ensureAdminSlugContext(); }));
document.getElementById('formularioCertificado').addEventListener('submit', function(e) {
    e.preventDefault();
    const cedulaInput = document.getElementById('cedula').value.trim();
    const feedback = document.getElementById('mensaje-feedback');
    if (feedback) feedback.textContent = 'Buscando participante...';
    if (participantesData.length === 0) {
        if (feedback) feedback.textContent = '❌ Error: Base de datos no cargada. Intenta recargar la página.';
        return;
    }
    const participante = participantesData.find(p => p.CEDULA === cedulaInput);
    if (participante) {
        if (feedback) feedback.textContent = `✅ Encontrado: ${participante.NOMBRE_COMPLETO}. Generando PDF...`;
        generarCertificado(participante.NOMBRE_COMPLETO, participante.CEDULA);
    } else {
        if (feedback) feedback.textContent = '❌ Cédula no encontrada. Verifica el número e intenta de nuevo.';
    }
});
function generarCertificado(nombre, cedula) {
    const doc = new window.jspdf.jsPDF({
        orientation: PDF_ORIENTATION,
        unit: PDF_UNITS,
        format: PDF_FORMAT
    });
    if (fontsStore[currentFuente] && fontsStore[currentFuente].base64) {
        try {
            const f = fontsStore[currentFuente];
            const binary = atob(f.base64);
            doc.addFileToVFS(f.vfsName, binary);
            doc.addFont(f.vfsName, currentFuente, 'normal');
        } catch (e) { console.warn('No se pudo registrar la fuente personalizada en jsPDF:', e); }
    }
    const docWidth = doc.internal.pageSize.getWidth();
    const docHeight = doc.internal.pageSize.getHeight();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = bgDataUrl || 'assets/certificado_base.jpg';
img.onload = function() {
    try {
        doc.addImage(img, 'JPEG', 0, 0, docWidth, docHeight);
    } catch (e) {
        console.warn('No se pudo agregar la imagen base:', e);
    }
    try { doc.setFont(currentFuente, 'normal'); } catch(e) { doc.setFont('helvetica', 'normal'); }
    doc.setFontSize(currentTamano);
    const c = hexToRgb(currentColor);
    doc.setTextColor(c.r, c.g, c.b);
    doc.text(nombre, currentNombreX, currentNombreY, { align: 'center' });
    doc.text(`CC: ${cedula}`, currentCedulaX, currentCedulaY, { align: 'center' });
        doc.save(`Certificado_${EVENTO_TITULO.replace(/\s/g, '')}_${cedula}.pdf`);
        const feedback = document.getElementById('mensaje-feedback');
        if (feedback) feedback.textContent = `✅ Certificado para ${nombre} generado. Verifica tu carpeta de descargas.`;
    };
img.onerror = function() {
    try { doc.setFont(currentFuente, 'normal'); } catch(e) { doc.setFont('helvetica', 'normal'); }
    doc.setFontSize(currentTamano);
    const c = hexToRgb(currentColor);
    doc.setTextColor(c.r, c.g, c.b);
    doc.text(nombre, currentNombreX, currentNombreY, { align: 'center' });
    doc.text(`CC: ${cedula}`, currentCedulaX, currentCedulaY, { align: 'center' });
        doc.save(`Certificado_${EVENTO_TITULO.replace(/\s/g, '')}_${cedula}.pdf`);
        const feedback = document.getElementById('mensaje-feedback');
        if (feedback) feedback.textContent = `⚠️ Imagen base no encontrada. Certificado generado sin fondo.`;
    };
}
const zonaCalibracion = document.getElementById('zona-calibracion');
const coordenadasDisplay = document.getElementById('coordenadas');
const previewNombre = document.getElementById('preview-nombre');
const previewCedula = document.getElementById('preview-cedula');
if (zonaCalibracion && coordenadasDisplay) {
    zonaCalibracion.addEventListener('click', (e) => {
        const rect = zonaCalibracion.getBoundingClientRect();
        const clickX_px = e.clientX - rect.left;
        const clickY_px = e.clientY - rect.top;
        const zonaWidth_px = rect.width;
        const zonaHeight_px = rect.height;
        const PDF_WIDTH_MM = 297;
        const PDF_HEIGHT_MM = 210;
        const x_mm = (clickX_px / zonaWidth_px) * PDF_WIDTH_MM;
        const y_mm = (clickY_px / zonaHeight_px) * PDF_HEIGHT_MM;
        coordenadasDisplay.textContent = `(X: ${x_mm.toFixed(2)}mm, Y: ${y_mm.toFixed(2)}mm)`;
        const textToCopy = `X=${x_mm.toFixed(2)}; Y=${y_mm.toFixed(2)}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                coordenadasDisplay.textContent = `(X: ${x_mm.toFixed(2)}mm, Y: ${y_mm.toFixed(2)}mm) copiado`;
            }).catch(() => {
                coordenadasDisplay.textContent = `(X: ${x_mm.toFixed(2)}mm, Y: ${y_mm.toFixed(2)}mm)`;
            });
        }
    });
}
function hexToRgb(hex) {
    const h = hex.replace('#','');
    const bigint = parseInt(h, 16);
    return { r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255 };
}
const tabs = document.querySelectorAll('.tab-btn');
const sections = { diseno: document.getElementById('tab-diseno'), datos: document.getElementById('tab-datos'), landing: document.getElementById('tab-landing'), subsitios: document.getElementById('tab-subsitios') };
tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(sections).forEach(s => s.classList.remove('active'));
    const key = btn.getAttribute('data-tab');
    if (sections[key]) sections[key].classList.add('active');
}));
const inputFondo = document.getElementById('input-fondo');
if (inputFondo) inputFondo.addEventListener('change', async () => {
    const file = inputFondo.files && inputFondo.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        bgDataUrl = reader.result;
        localStorage.setItem('gdc_bg', bgDataUrl);
        if (zonaCalibracion) zonaCalibracion.style.backgroundImage = `url('${bgDataUrl}')`;
    };
    reader.readAsDataURL(file);
});
const inputTextoPrueba = document.getElementById('input-texto-prueba');
const selectFuente = document.getElementById('select-fuente');
const inputTamano = document.getElementById('input-tamano');
const inputColor = document.getElementById('input-color');
const inputFont = document.getElementById('input-font');
const fontsLoadedInfo = document.getElementById('fonts-loaded-info');
const sNombreX = document.getElementById('slider-nombre-x');
const sNombreY = document.getElementById('slider-nombre-y');
const sCedulaX = document.getElementById('slider-cedula-x');
const sCedulaY = document.getElementById('slider-cedula-y');
function mmToPx(x, totalMm, totalPx) { return (x/totalMm) * totalPx; }
function applyPreview() {
    if (!zonaCalibracion || !previewNombre || !previewCedula) return;
    const rect = zonaCalibracion.getBoundingClientRect();
    previewNombre.style.left = mmToPx(currentNombreX, 297, rect.width) + 'px';
    previewNombre.style.top = mmToPx(currentNombreY, 210, rect.height) + 'px';
    previewCedula.style.left = mmToPx(currentCedulaX, 297, rect.width) + 'px';
    previewCedula.style.top = mmToPx(currentCedulaY, 210, rect.height) + 'px';
    previewNombre.style.fontFamily = currentFuente;
    previewCedula.style.fontFamily = currentFuente;
    previewNombre.style.fontSize = currentTamano + 'px';
    previewCedula.style.fontSize = Math.max(12, currentTamano - 14) + 'px';
    previewNombre.style.color = currentColor;
    previewCedula.style.color = currentColor;
    if (inputTextoPrueba) previewNombre.textContent = inputTextoPrueba.value || 'Nombre de Prueba';
}
['input','change'].forEach(ev => {
    if (inputTextoPrueba) inputTextoPrueba.addEventListener(ev, applyPreview);
    if (selectFuente) selectFuente.addEventListener(ev, () => { currentFuente = selectFuente.value; applyPreview(); });
    if (inputTamano) inputTamano.addEventListener(ev, () => { currentTamano = parseInt(inputTamano.value||'28',10); applyPreview(); });
    if (inputColor) inputColor.addEventListener(ev, () => { currentColor = inputColor.value; applyPreview(); });
    if (sNombreX) sNombreX.addEventListener(ev, () => { currentNombreX = parseFloat(sNombreX.value); applyPreview(); });
    if (sNombreY) sNombreY.addEventListener(ev, () => { currentNombreY = parseFloat(sNombreY.value); applyPreview(); });
    if (sCedulaX) sCedulaX.addEventListener(ev, () => { currentCedulaX = parseFloat(sCedulaX.value); applyPreview(); });
    if (sCedulaY) sCedulaY.addEventListener(ev, () => { currentCedulaY = parseFloat(sCedulaY.value); applyPreview(); });
});
applyPreview();
function injectFontCss(family, dataUrl, format) {
    const id = `gdc-font-${family}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { font-family: '${family}'; src: url(${dataUrl}) format('${format}'); font-weight: normal; font-style: normal; }`;
    document.head.appendChild(style);
    if (document.fonts && document.fonts.load) { document.fonts.load('16px ' + family).then(applyPreview).catch(()=>{}); }
}
function addFontOption(family) {
    if (!selectFuente) return;
    if ([...selectFuente.options].some(o => o.value === family)) return;
    const opt = document.createElement('option');
    opt.value = family;
    opt.textContent = family;
    selectFuente.appendChild(opt);
    updateFontsInfo();
}
function persistFonts() { localStorage.setItem(FONTS_KEY, JSON.stringify(fontsStore)); }
function loadFontsFromStorage() {
    try {
        const raw = localStorage.getItem(FONTS_KEY);
        if (!raw) return;
        fontsStore = JSON.parse(raw) || {};
        Object.keys(fontsStore).forEach(f => { injectFontCss(f, fontsStore[f].dataUrl, fontsStore[f].format); addFontOption(f); });
        updateFontsInfo();
    } catch {}
}
async function ensureLeagueSpartanDefault() {
    if (fontsStore['LeagueSpartan']) { currentFuente = 'LeagueSpartan'; applyPreview(); return; }
    try {
        const url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/leaguespartan/LeagueSpartan-Regular.ttf';
        const res = await fetch(url);
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const base64 = String(dataUrl).split(',')[1];
            const family = 'LeagueSpartan';
            const format = 'truetype';
            const vfsName = 'LeagueSpartan.ttf';
            fontsStore[family] = { dataUrl, base64, format, vfsName };
            persistFonts();
            injectFontCss(family, dataUrl, format);
            addFontOption(family);
            currentFuente = family;
            applyPreview();
        };
        reader.readAsDataURL(blob);
    } catch {}
}
function updateFontsInfo() {
    if (!fontsLoadedInfo) return;
    const names = Object.keys(fontsStore);
    fontsLoadedInfo.textContent = names.length ? `Fuentes cargadas: ${names.join(', ')}` : '';
}
if (inputFont) inputFont.addEventListener('change', () => {
    const files = inputFont.files ? Array.from(inputFont.files) : [];
    if (!files.length) return;
    files.forEach(file => {
        const family = (file.name.replace(/\.[^.]+$/, '') || 'Personalizada').replace(/[^A-Za-z0-9_-]/g,'_');
        const readerDataUrl = new FileReader();
        readerDataUrl.onload = () => {
            const dataUrl = readerDataUrl.result;
            const base64 = String(dataUrl).split(',')[1];
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const format = ext === 'otf' ? 'opentype' : 'truetype';
            const vfsName = `${family}.${ext === 'otf' ? 'otf' : 'ttf'}`;
            fontsStore[family] = { dataUrl, base64, format, vfsName };
            persistFonts();
            injectFontCss(family, dataUrl, format);
            addFontOption(family);
            currentFuente = family;
            applyPreview();
        };
        readerDataUrl.readAsDataURL(file);
    });
});
const btnGuardarDiseno = document.getElementById('btn-guardar-diseno');
if (btnGuardarDiseno) btnGuardarDiseno.addEventListener('click', () => {
    const cfg = { nombreX: currentNombreX, nombreY: currentNombreY, cedulaX: currentCedulaX, cedulaY: currentCedulaY, fuente: currentFuente, tamano: currentTamano, color: currentColor };
    localStorage.setItem('gdc_cfg', JSON.stringify(cfg));
});
const inputCsv = document.getElementById('input-csv');
const infoCsv = document.getElementById('info-csv');
if (inputCsv) inputCsv.addEventListener('change', () => {
    const file = inputCsv.files && inputCsv.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const txt = reader.result;
        localStorage.setItem('gdc_csv', txt);
        Papa.parse(txt, { header: true, skipEmptyLines: true, complete: r => { participantesData = r.data; if (infoCsv) infoCsv.textContent = `Registros: ${participantesData.length}`; } });
    };
    reader.readAsText(file);
});
const btnDescCsv = document.getElementById('btn-descargar-csv');
if (btnDescCsv) btnDescCsv.addEventListener('click', () => {
    const csv = localStorage.getItem('gdc_csv');
    const blob = new Blob([csv || 'CEDULA,NOMBRE_COMPLETO\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'participantes.csv';
    a.click();
    URL.revokeObjectURL(a.href);
});
const colorFondo = document.getElementById('color-fondo');
const colorPrimario = document.getElementById('color-primario');
const colorTexto = document.getElementById('color-texto');
const inputLogo = document.getElementById('input-logo');
const btnGuardarLanding = document.getElementById('btn-guardar-landing');
function applyColors() {
    if (colorFondo) document.documentElement.style.setProperty('--background-color', colorFondo.value);
    if (colorPrimario) document.documentElement.style.setProperty('--primary-color', colorPrimario.value);
    if (colorTexto) document.documentElement.style.setProperty('--text-color', colorTexto.value);
}
['input','change'].forEach(ev => {
    if (colorFondo) colorFondo.addEventListener(ev, applyColors);
    if (colorPrimario) colorPrimario.addEventListener(ev, applyColors);
    if (colorTexto) colorTexto.addEventListener(ev, applyColors);
});
if (inputLogo) inputLogo.addEventListener('change', () => {
    const f = inputLogo.files && inputLogo.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { if (logoEvento) { logoEvento.src = reader.result; logoEvento.style.display = 'inline-block'; } };
    reader.readAsDataURL(f);
});
if (btnGuardarLanding) btnGuardarLanding.addEventListener('click', () => {
    const cfg = { bgColor: colorFondo ? colorFondo.value : null, primaryColor: colorPrimario ? colorPrimario.value : null, textColor: colorTexto ? colorTexto.value : null, logo: logoEvento && logoEvento.src ? logoEvento.src : null };
    localStorage.setItem('gdc_landing', JSON.stringify(cfg));
});
const btnExportConfig = document.getElementById('btn-export-config');
const inputConfig = document.getElementById('input-config');
const btnSaveAll = document.getElementById('btn-save-all');
const saveProgress = document.getElementById('save-progress');
const saveProgressBar = document.getElementById('save-progress-bar');
const saveStatus = document.getElementById('save-status');
function exportConfig() {
    const f = fontsStore[currentFuente];
    const cfg = {
        design: { nombreX: currentNombreX, nombreY: currentNombreY, cedulaX: currentCedulaX, cedulaY: currentCedulaY, fuente: currentFuente, tamano: currentTamano, color: currentColor },
        bg: bgDataUrl || null,
        font: f ? { family: currentFuente, dataUrl: f.dataUrl, base64: f.base64, format: f.format } : null,
        csv: localStorage.getItem('gdc_csv') || null,
        landing: JSON.parse(localStorage.getItem('gdc_landing') || '{}'),
        eventTitle: EVENTO_TITULO
    };
    const blob = new Blob([JSON.stringify(cfg)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(a.href);
}
function importConfig(obj) {
    try {
        if (obj.bg) { bgDataUrl = obj.bg; localStorage.setItem('gdc_bg', bgDataUrl); if (zonaCalibracion) zonaCalibracion.style.backgroundImage = `url('${bgDataUrl}')`; }
        if (obj.font && obj.font.dataUrl && obj.font.base64 && obj.font.family) { fontsStore[obj.font.family] = { dataUrl: obj.font.dataUrl, base64: obj.font.base64, format: obj.font.format || 'truetype', vfsName: `${obj.font.family}.ttf` }; persistFonts(); injectFontCss(obj.font.family, obj.font.dataUrl, obj.font.format || 'truetype'); addFontOption(obj.font.family); currentFuente = obj.font.family; }
        if (obj.csv) { localStorage.setItem('gdc_csv', obj.csv); Papa.parse(obj.csv, { header: true, skipEmptyLines: true, complete: r => { participantesData = r.data; } }); }
        if (obj.design) { localStorage.setItem('gdc_cfg', JSON.stringify(obj.design)); currentNombreX = obj.design.nombreX ?? currentNombreX; currentNombreY = obj.design.nombreY ?? currentNombreY; currentCedulaX = obj.design.cedulaX ?? currentCedulaX; currentCedulaY = obj.design.cedulaY ?? currentCedulaY; currentFuente = obj.design.fuente ?? currentFuente; currentTamano = obj.design.tamano ?? currentTamano; currentColor = obj.design.color ?? currentColor; }
        if (obj.eventTitle) { EVENTO_TITULO = obj.eventTitle; const t = document.getElementById('titulo-evento'); if (t) t.textContent = `Descarga tu Certificado para el evento: ${EVENTO_TITULO}`; }
        if (obj.landing) { localStorage.setItem('gdc_landing', JSON.stringify(obj.landing)); aplicarLandingDesdeStorage(); }
        applyPreview();
    } catch {}
}
if (btnExportConfig) btnExportConfig.addEventListener('click', exportConfig);
if (inputConfig) inputConfig.addEventListener('change', () => {
    const f = inputConfig.files && inputConfig.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const obj = JSON.parse(r.result); importConfig(obj); } catch {} };
    r.readAsText(f);
});
if (btnSaveAll) btnSaveAll.addEventListener('click', async () => {
    if (saveStatus) saveStatus.textContent = '';
    function step(p){ if (saveProgressBar) saveProgressBar.style.width = p + '%'; }
    step(5);
    persistFonts();
    step(15);
    localStorage.setItem('gdc_cfg', JSON.stringify({ nombreX: currentNombreX, nombreY: currentNombreY, cedulaX: currentCedulaX, cedulaY: currentCedulaY, fuente: currentFuente, tamano: currentTamano, color: currentColor }));
    step(35);
    const landingCfg = { bgColor: getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim() || (document.documentElement.style.getPropertyValue('--background-color')||null), primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || null, textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || null, logo: (document.getElementById('logo-evento') && document.getElementById('logo-evento').src) ? document.getElementById('logo-evento').src : null };
    localStorage.setItem('gdc_landing', JSON.stringify(landingCfg));
    step(55);
    if (bgDataUrl) localStorage.setItem('gdc_bg', bgDataUrl);
    step(65);
    if (participantesData && participantesData.length) {
        try {
            const header = 'CEDULA,NOMBRE_COMPLETO\n';
            const body = participantesData.map(p => `${p.CEDULA},${p.NOMBRE_COMPLETO}`).join('\n');
            localStorage.setItem('gdc_csv', header + body);
        } catch {}
    }
    step(75);
    const mKey='gdc_sub_configs';
    const m=JSON.parse(localStorage.getItem(mKey)||'{}');
    if (!subslugInput || !subslugInput.value.trim()) { if (saveStatus) { saveStatus.textContent = 'Slug requerido'; saveStatus.classList.remove('save-success'); } return; }
    const slug=subslugInput.value.trim();
    m[slug] = buildConfigObject();
    localStorage.setItem(mKey, JSON.stringify(m));
    setLastSlug(slug);
    step(90);
    const owner=ghOwnerInput?ghOwnerInput.value.trim():'';
    const repo=ghRepoInput?ghRepoInput.value.trim():'';
    const token=ghTokenInput?ghTokenInput.value.trim():'';
    if (owner && repo && token) {
        const cfg=buildConfigObject(); const content=base64EncodeUtf8(JSON.stringify(cfg));
        let sha=null; const existing=await githubApi(owner,repo,`configs/${slug}.json`,'GET'); if(existing&&existing.sha) sha=existing.sha;
        await githubApi(owner,repo,`configs/${slug}.json`,'PUT',{message:`SaveAll ${slug}`,content,branch:'gh-pages',sha});
        const idxExisting=await githubApi(owner,repo,`configs/index.json`,'GET'); let idx={slugs:[]}, idxSha=null; if(idxExisting&&idxExisting.sha){try{idx=JSON.parse(atob(idxExisting.content)); idxSha=idxExisting.sha;}catch{}}
        if(!idx.slugs.includes(slug)) idx.slugs.push(slug);
        const idxContent=base64EncodeUtf8(JSON.stringify(idx)); await githubApi(owner,repo,`configs/index.json`,'PUT',{message:`Update index`,content:idxContent,branch:'gh-pages',sha:idxSha});
    }
    await new Promise(res => setTimeout(res, 400));
    step(100);
    if (saveStatus) { saveStatus.textContent = 'Guardado correctamente'; saveStatus.classList.add('save-success'); }
    updateSubList();
});
const subslugInput = document.getElementById('subslug');
const subEventTitleInput = document.getElementById('sub-event-title');
const subStatus = document.getElementById('sub-status');
const subList = document.getElementById('sub-list');
const btnSaveLocalSub = document.getElementById('btn-save-local-sub');
const btnPublishSub = document.getElementById('btn-publish-sub');
const btnOpenLink = document.getElementById('btn-open-link');
const ghOwnerInput = document.getElementById('gh-owner');
const ghRepoInput = document.getElementById('gh-repo');
const ghTokenInput = document.getElementById('gh-token');
function base64EncodeUtf8(str){return btoa(unescape(encodeURIComponent(str)))}
function getCurrentSlug(){const parts=window.location.pathname.split('/').filter(Boolean); if (parts.length>=2) return parts[1]; const urlParams=new URLSearchParams(window.location.search); return urlParams.get('site')||''}
function getLastSlug(){try{return localStorage.getItem('gdc_last_slug')||'';}catch{return ''}}
function setLastSlug(slug){try{localStorage.setItem('gdc_last_slug', slug||'');}catch{}}
function ensureAdminSlugContext(){ if (!subslugInput) return; let s=getCurrentSlug()||getLastSlug(); if(!s){ s=prompt('Slug del subsitio')||''; } if(s){ subslugInput.value=s; setLastSlug(s); loadSlugToEditor(s); }}
function loadGithubSettings(){try{const raw=localStorage.getItem('gdc_github'); if(!raw) return; const o=JSON.parse(raw); if(ghOwnerInput) ghOwnerInput.value=o.owner||'PLAGOCORP'; if(ghRepoInput) ghRepoInput.value=o.repo||'GDC'; if(ghTokenInput) ghTokenInput.value=o.token||'';}catch{}}
function saveGithubSettings(){const o={owner: ghOwnerInput?ghOwnerInput.value:'PLAGOCORP', repo: ghRepoInput?ghRepoInput.value:'GDC', token: ghTokenInput?ghTokenInput.value:''}; localStorage.setItem('gdc_github', JSON.stringify(o));}
function updateSubList(){
    const parts=(window.location.pathname||'/').split('/').filter(Boolean); const base='/' + (parts[0]||'');
    fetch(`${base}/configs/index.json`).then(r=>r.ok?r.json():{slugs:[]}).then(idx=>{
        const localM=JSON.parse(localStorage.getItem('gdc_sub_configs')||'{}');
        const set=new Set([...(idx.slugs||[]), ...Object.keys(localM)]);
        subList.innerHTML='';
        Array.from(set).forEach(s=>{
            const li=document.createElement('li');
            const btnEdit=document.createElement('button'); btnEdit.textContent='Editar'; btnEdit.onclick=()=>loadSlugToEditor(s);
            const btnOpen=document.createElement('button'); btnOpen.textContent='Abrir'; btnOpen.onclick=()=>{const owner=ghOwnerInput.value.trim(); const repo=ghRepoInput.value.trim(); window.open(`https://${owner.toLowerCase()}.github.io/${repo}/${s}`,'_blank');};
            const btnDelLocal=document.createElement('button'); btnDelLocal.textContent='Eliminar Local'; btnDelLocal.onclick=()=>{const mKey='gdc_sub_configs'; const m=JSON.parse(localStorage.getItem(mKey)||'{}'); delete m[s]; localStorage.setItem(mKey, JSON.stringify(m)); updateSubList();};
            const btnDelGh=document.createElement('button'); btnDelGh.textContent='Eliminar GitHub'; btnDelGh.onclick=()=>deleteSlugOnGithub(s);
            li.textContent=s+ ' ';
            li.appendChild(btnEdit); li.appendChild(btnOpen); li.appendChild(btnDelLocal); li.appendChild(btnDelGh);
            subList.appendChild(li);
        });
    }).catch(()=>{})
}
function loadSlugToEditor(slug){
    const localM=JSON.parse(localStorage.getItem('gdc_sub_configs')||'{}');
    let cfg=localM[slug];
    const parts=(window.location.pathname||'/').split('/').filter(Boolean); const base='/' + (parts[0]||'');
    if (cfg) { subslugInput.value=slug; subEventTitleInput.value=cfg.eventTitle||EVENTO_TITULO; importConfig(cfg); return; }
    fetch(`${base}/configs/${slug}.json`).then(r=>r.ok?r.json():null).then(rcfg=>{ cfg=rcfg; if(!cfg){ subStatus.textContent='No encontrado'; return; } subslugInput.value=slug; subEventTitleInput.value=cfg.eventTitle||EVENTO_TITULO; importConfig(cfg); }).catch(()=>{ subStatus.textContent='No encontrado'; });
}
if (subslugInput) subslugInput.addEventListener('change', ()=>{ const s=subslugInput.value.trim(); if(!s) return; setLastSlug(s); loadSlugToEditor(s); });
async function deleteSlugOnGithub(slug){
    const owner=ghOwnerInput.value.trim(); const repo=ghRepoInput.value.trim(); const token=ghTokenInput.value.trim();
    const url=`https://api.github.com/repos/${owner}/${repo}/contents/configs/${slug}.json`;
    const get=await fetch(url+`?ref=gh-pages`,{headers:{Authorization:`token ${token}`,'Accept':'application/vnd.github+json'}});
    if(!get.ok){ subStatus.textContent='No existe en GitHub'; return; }
    const obj=await get.json(); const sha=obj.sha;
    const del=await fetch(url,{method:'DELETE',headers:{Authorization:`token ${token}`,'Accept':'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({message:`Delete ${slug}`,sha,branch:'gh-pages'})});
    if(del.ok){
        const idxUrl=`https://api.github.com/repos/${owner}/${repo}/contents/configs/index.json`;
        const idxGet=await fetch(idxUrl+`?ref=gh-pages`,{headers:{Authorization:`token ${token}`,'Accept':'application/vnd.github+json'}});
        let idxSha=null, idx={slugs:[]};
        if(idxGet.ok){const j=await idxGet.json(); idxSha=j.sha; try{ idx=JSON.parse(atob(j.content.replace(/\n/g,''))); }catch{}}
        idx.slugs = (idx.slugs||[]).filter(x=>x!==slug);
        const idxPut=await fetch(idxUrl,{method:'PUT',headers:{Authorization:`token ${token}`,'Accept':'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({message:`Update index remove ${slug}`,content:base64EncodeUtf8(JSON.stringify(idx)),branch:'gh-pages',sha:idxSha})});
        if(idxPut.ok){ subStatus.textContent='Eliminado en GitHub'; updateSubList(); }
    } else { subStatus.textContent='Error al eliminar en GitHub'; }
}
function buildConfigObject(){const f=fontsStore[currentFuente];return{design:{nombreX:currentNombreX,nombreY:currentNombreY,cedulaX:currentCedulaX,cedulaY:currentCedulaY,fuente:currentFuente,tamano:currentTamano,color:currentColor},bg:bgDataUrl||null,font:f?{family:currentFuente,dataUrl:f.dataUrl,base64:f.base64,format:f.format}:null,csv:localStorage.getItem('gdc_csv')||null,landing:JSON.parse(localStorage.getItem('gdc_landing')||'{}'),eventTitle:subEventTitleInput?subEventTitleInput.value:EVENTO_TITULO}}
if (btnSaveLocalSub) btnSaveLocalSub.addEventListener('click', ()=>{const slug=subslugInput.value.trim(); if(!slug){subStatus.textContent='Slug requerido'; return;} const mKey='gdc_sub_configs'; const m=JSON.parse(localStorage.getItem(mKey)||'{}'); m[slug]=buildConfigObject(); localStorage.setItem(mKey, JSON.stringify(m)); subStatus.textContent='Guardado local';});
async function githubApi(owner,repo,path,method,payload){saveGithubSettings(); const token=ghTokenInput?ghTokenInput.value:''; const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path}`; const headers={Authorization:`token ${token}`,'Accept':'application/vnd.github+json'}; if(method==='GET'){const r=await fetch(url+`?ref=gh-pages`,{headers}); return r.ok?await r.json():null;} const body=JSON.stringify(payload); const r=await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body}); return await r.json()}
if (btnPublishSub) btnPublishSub.addEventListener('click', async ()=>{const slug=subslugInput.value.trim(); if(!slug){subStatus.textContent='Slug requerido'; return;} const owner=ghOwnerInput.value.trim(); const repo=ghRepoInput.value.trim(); const cfg=buildConfigObject(); const content=base64EncodeUtf8(JSON.stringify(cfg)); let sha=null; const existing=await githubApi(owner,repo,`configs/${slug}.json`,'GET'); if(existing&&existing.sha) sha=existing.sha; const res=await githubApi(owner,repo,`configs/${slug}.json`,'PUT',{message:`Publish config ${slug}`,content,branch:'gh-pages',sha}); const idxExisting=await githubApi(owner,repo,`configs/index.json`,'GET'); let idx={slugs:[]}, idxSha=null; if(idxExisting&&idxExisting.sha){try{idx=JSON.parse(atob(idxExisting.content)); idxSha=idxExisting.sha;}catch{}} if(!idx.slugs.includes(slug)) idx.slugs.push(slug); const idxContent=base64EncodeUtf8(JSON.stringify(idx)); await githubApi(owner,repo,`configs/index.json`,'PUT',{message:`Update index`,content:idxContent,branch:'gh-pages',sha:idxSha}); subStatus.textContent=`Publicado: https://${owner.toLowerCase()}.github.io/${repo}/${slug}`; updateSubList();});
if (btnOpenLink) btnOpenLink.addEventListener('click', ()=>{const slug=subslugInput.value.trim(); const owner=ghOwnerInput.value.trim(); const repo=ghRepoInput.value.trim(); if(!slug){subStatus.textContent='Slug requerido'; return;} const url=`https://${owner.toLowerCase()}.github.io/${repo}/${slug}`; window.open(url, '_blank');});
loadGithubSettings(); updateSubList();
