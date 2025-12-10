const EVENTO_TITULO = "Mujeres en Movimiento";
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
let customFontDataUrl = null;
let customFontBase64 = null;
const customFontFamily = 'GDC_Custom';
const customFontVfsName = 'gdc_custom.ttf';
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
    const fontStored = localStorage.getItem('gdc_font');
    if (fontStored) {
        try {
            const f = JSON.parse(fontStored);
            customFontDataUrl = f.dataUrl;
            customFontBase64 = f.base64;
            customFontFormat = f.format || 'truetype';
            ensureCustomFontCss();
            ensureCustomFontOption();
        } catch {}
    }
    try {
        fetch('config.json').then(r => r.ok ? r.json() : null).then(cfg => {
            if (!cfg) return;
            if (cfg.bg) { bgDataUrl = cfg.bg; localStorage.setItem('gdc_bg', bgDataUrl); const z = document.getElementById('zona-calibracion'); if (z) z.style.backgroundImage = `url('${bgDataUrl}')`; }
            if (cfg.font && cfg.font.dataUrl && cfg.font.base64) {
                customFontDataUrl = cfg.font.dataUrl; customFontBase64 = cfg.font.base64; customFontFormat = cfg.font.format || 'truetype'; localStorage.setItem('gdc_font', JSON.stringify(cfg.font)); ensureCustomFontCss(); ensureCustomFontOption(); }
            if (cfg.csv) { localStorage.setItem('gdc_csv', cfg.csv); Papa.parse(cfg.csv, { header: true, skipEmptyLines: true, complete: r => { participantesData = r.data; } }); }
            if (cfg.design) { localStorage.setItem('gdc_cfg', JSON.stringify(cfg.design)); currentNombreX = cfg.design.nombreX ?? currentNombreX; currentNombreY = cfg.design.nombreY ?? currentNombreY; currentCedulaX = cfg.design.cedulaX ?? currentCedulaX; currentCedulaY = cfg.design.cedulaY ?? currentCedulaY; currentFuente = cfg.design.fuente ?? currentFuente; currentTamano = cfg.design.tamano ?? currentTamano; currentColor = cfg.design.color ?? currentColor; applyPreview(); }
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
        ensureAdminAuth(() => cambiarVista('admin'));
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
if (adminBtn) adminBtn.addEventListener('click', () => ensureAdminAuth(() => cambiarVista('admin')));
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
    if (customFontBase64) {
        try {
            doc.addFileToVFS(customFontVfsName, customFontBase64);
            doc.addFont(customFontVfsName, customFontFamily, 'normal');
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
        doc.setFont(customFontBase64 && currentFuente === customFontFamily ? customFontFamily : currentFuente, 'normal');
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
        doc.setFont(customFontBase64 && currentFuente === customFontFamily ? customFontFamily : currentFuente, 'normal');
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
const sections = { diseno: document.getElementById('tab-diseno'), datos: document.getElementById('tab-datos'), landing: document.getElementById('tab-landing') };
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
    previewNombre.style.fontFamily = currentFuente === customFontFamily ? customFontFamily : currentFuente;
    previewCedula.style.fontFamily = currentFuente === customFontFamily ? customFontFamily : currentFuente;
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
function ensureCustomFontCss() {
    if (!customFontDataUrl) return;
    const id = 'gdc-custom-font-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { font-family: '${customFontFamily}'; src: url(${customFontDataUrl}) format('${customFontFormat}'); font-weight: normal; font-style: normal; }`;
    document.head.appendChild(style);
    if (document.fonts && document.fonts.load) { document.fonts.load('16px ' + customFontFamily).then(applyPreview).catch(()=>{}); }
}
function ensureCustomFontOption() {
    if (!selectFuente) return;
    if ([...selectFuente.options].some(o => o.value === customFontFamily)) return;
    const opt = document.createElement('option');
    opt.value = customFontFamily;
    opt.textContent = 'Personalizada';
    selectFuente.appendChild(opt);
}
if (inputFont) inputFont.addEventListener('change', () => {
    const file = inputFont.files && inputFont.files[0];
    if (!file) return;
    const readerDataUrl = new FileReader();
    readerDataUrl.onload = () => {
        customFontDataUrl = readerDataUrl.result;
        const base64 = String(customFontDataUrl).split(',')[1];
        customFontBase64 = base64;
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        customFontFormat = ext === 'otf' ? 'opentype' : 'truetype';
        localStorage.setItem('gdc_font', JSON.stringify({ dataUrl: customFontDataUrl, base64: customFontBase64, format: customFontFormat }));
        ensureCustomFontCss();
        ensureCustomFontOption();
        currentFuente = customFontFamily;
        applyPreview();
    };
    readerDataUrl.readAsDataURL(file);
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
function exportConfig() {
    const cfg = {
        design: { nombreX: currentNombreX, nombreY: currentNombreY, cedulaX: currentCedulaX, cedulaY: currentCedulaY, fuente: currentFuente, tamano: currentTamano, color: currentColor },
        bg: bgDataUrl || null,
        font: customFontDataUrl ? { dataUrl: customFontDataUrl, base64: customFontBase64, format: customFontFormat } : null,
        csv: localStorage.getItem('gdc_csv') || null,
        landing: JSON.parse(localStorage.getItem('gdc_landing') || '{}')
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
        if (obj.font && obj.font.dataUrl && obj.font.base64) { customFontDataUrl = obj.font.dataUrl; customFontBase64 = obj.font.base64; customFontFormat = obj.font.format || 'truetype'; localStorage.setItem('gdc_font', JSON.stringify(obj.font)); ensureCustomFontCss(); ensureCustomFontOption(); }
        if (obj.csv) { localStorage.setItem('gdc_csv', obj.csv); Papa.parse(obj.csv, { header: true, skipEmptyLines: true, complete: r => { participantesData = r.data; } }); }
        if (obj.design) { localStorage.setItem('gdc_cfg', JSON.stringify(obj.design)); currentNombreX = obj.design.nombreX ?? currentNombreX; currentNombreY = obj.design.nombreY ?? currentNombreY; currentCedulaX = obj.design.cedulaX ?? currentCedulaX; currentCedulaY = obj.design.cedulaY ?? currentCedulaY; currentFuente = obj.design.fuente ?? currentFuente; currentTamano = obj.design.tamano ?? currentTamano; currentColor = obj.design.color ?? currentColor; }
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
