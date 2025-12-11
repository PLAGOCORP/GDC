import React, { useEffect, useState } from 'react'
import {
  Navbar,
  Typography,
  Card,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  Button,
  Input,
  Select,
  Option
} from '@material-tailwind/react'

export default function App(){
  const [admin, setAdmin] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar className="mb-6 rounded-xl px-4 py-3 bg-[var(--primary-color)]">
        <div className="flex items-center gap-4">
          <Typography variant="h5" color="white">GDC</Typography>
          <Typography color="white">Generación de Certificados</Typography>
        </div>
      </Navbar>

      <div id="vista-publica" className={`${admin?'hidden':''} flex-1 grid place-items-center px-4`}>
        <Card className="p-6 w-full max-w-3xl">
          <img id="logo-evento" alt="Logo" className="hidden h-16 mb-3 mx-auto" />
          <Typography id="titulo-evento" variant="h4" className="mb-2 text-center">Descarga tu Certificado de Participación</Typography>
          <Typography className="mb-4 text-center">Por favor, ingresa tu número de documento para obtener tu certificado.</Typography>
          <form id="formularioCertificado" className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Input id="cedula" label="Número de cédula" size="md" className="w-full max-w-md" />
            <Button type="submit" color="blue" className="w-full sm:w-auto">Buscar y Descargar Certificado</Button>
          </form>
          <div id="mensaje-feedback" className="mt-3 text-sm text-center"></div>
        </Card>
      </div>

      <div id="vista-admin" className={`${admin?'':'hidden'} flex-1 grid place-items-center px-4`}>
        <Card className="p-4 w-full max-w-5xl">
          <div className="flex items-center gap-2 mb-3">
            <Typography>Slug</Typography>
            <select id="slug-select" className="border rounded px-2 py-1 min-w-[180px]"></select>
            <Input id="slug-input" label="nuevo-slug" className="min-w-[180px]" />
            <Button id="slug-use-btn" color="green">Usar/Crear</Button>
            <Typography id="slug-status" className="text-gray-500"></Typography>
            <div className="ml-auto flex items-center gap-2">
              <Button id="btn-save-all" color="green">Guardar Todo</Button>
              <div id="save-progress" className="w-40 h-2 bg-gray-200 rounded">
                <div id="save-progress-bar" className="h-full w-0 bg-green-600"></div>
              </div>
              <Typography id="save-status" className="min-w-[180px] text-green-600"></Typography>
              <Button id="btn-export-config" color="blue" variant="outlined">Exportar Config</Button>
              <label className="inline-block relative overflow-hidden">
                <span className="px-3 py-2 border rounded">Importar Config</span>
                <input type="file" id="input-config" accept="application/json" className="absolute left-0 top-0 opacity-0 w-full h-full cursor-pointer" />
              </label>
              <Button className="" onClick={()=>{ const f=window.cambiarVista; if (typeof f==='function') f('publica'); setAdmin(false); }}>Cerrar</Button>
            </div>
          </div>

          <Tabs value="diseno">
            <TabsHeader>
              <Tab value="diseno" data-tab="diseno">Diseño</Tab>
              <Tab value="datos" data-tab="datos">Base de Datos</Tab>
              <Tab value="landing" data-tab="landing">Landing</Tab>
              <Tab value="subsitios" data-tab="subsitios">Subsitios</Tab>
            </TabsHeader>
            <TabsBody>
              <div id="tab-diseno" className="tab-section">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Typography className="mb-2">Diseño de fondo</Typography>
                    <input type="file" id="input-fondo" accept="image/*" className="mb-2" />
                    <div id="zona-calibracion" className="relative">
                      <span id="coordenadas" className="absolute left-2 top-2 bg-white/80 px-2 py-1 rounded text-xs">(X: 0mm, Y: 0mm)</span>
                      <span id="preview-nombre" className="preview-text">Nombre de Prueba</span>
                      <span id="preview-cedula" className="preview-text">CC: 0000000000</span>
                    </div>
                  </div>
                  <div>
                    <Typography variant="h6" className="mb-2">Texto</Typography>
                    <Input id="input-texto-prueba" label="Texto de prueba" defaultValue="Nombre de Prueba" className="mb-2" />
                    <Typography className="mb-1">Fuente</Typography>
                    <select id="select-fuente" className="border rounded px-2 py-1 mb-2">
                      <option value="helvetica">Helvetica</option>
                      <option value="times">Times</option>
                      <option value="courier">Courier</option>
                    </select>
                    <Typography className="mb-1">Subir fuentes (.ttf/.otf)</Typography>
                    <input type="file" id="input-font" accept=".ttf,.otf" multiple className="mb-1" />
                    <small id="fonts-loaded-info" className="block mb-2"></small>
                    <Input id="input-tamano" type="number" label="Tamaño" defaultValue={28} className="mb-2" />
                    <div className="mb-2">
                      <Typography className="mb-1">Color</Typography>
                      <input type="color" id="input-color" defaultValue="#000000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Typography variant="small">Nombre</Typography>
                        <Typography className="mt-1">X (mm)</Typography>
                        <input type="range" id="slider-nombre-x" min="0" max="297" step="0.5" defaultValue="148.5" />
                        <Typography className="mt-2">Y (mm)</Typography>
                        <input type="range" id="slider-nombre-y" min="0" max="210" step="0.5" defaultValue="140" />
                      </div>
                      <div>
                        <Typography variant="small">Cédula</Typography>
                        <Typography className="mt-1">X (mm)</Typography>
                        <input type="range" id="slider-cedula-x" min="0" max="297" step="0.5" defaultValue="148.5" />
                        <Typography className="mt-2">Y (mm)</Typography>
                        <input type="range" id="slider-cedula-y" min="0" max="210" step="0.5" defaultValue="150" />
                      </div>
                    </div>
                    <Button id="btn-guardar-diseno" color="blue" className="mt-3">Guardar Diseño</Button>
                  </div>
                </div>
              </div>

              <div id="tab-datos" className="tab-section hidden">
                <Typography className="mb-2">Subir CSV de participantes</Typography>
                <input type="file" id="input-csv" accept=".csv" className="mb-2" />
                <p id="info-csv" className="mb-2"></p>
                <Button id="btn-descargar-csv" color="blue">Descargar CSV actual</Button>
              </div>

              <div id="tab-landing" className="tab-section hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Typography className="mb-1">Color de fondo</Typography>
                    <input type="color" id="color-fondo" defaultValue="#f4f4f9" />
                  </div>
                  <div>
                    <Typography className="mb-1">Color primario</Typography>
                    <input type="color" id="color-primario" defaultValue="#0056b3" />
                  </div>
                  <div>
                    <Typography className="mb-1">Color de texto</Typography>
                    <input type="color" id="color-texto" defaultValue="#333333" />
                  </div>
                  <div>
                    <Typography className="mb-1">Logo</Typography>
                    <input type="file" id="input-logo" accept="image/*" />
                  </div>
                </div>
                <Button id="btn-guardar-landing" color="blue" className="mt-3">Guardar Landing</Button>
              </div>

              <div id="tab-subsitios" className="tab-section hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Typography variant="h6">Subsitio</Typography>
                    <Typography className="mb-1">Slug</Typography>
                    <Input id="subslug" placeholder="carreramujeres" className="mb-2" />
                    <Typography className="mb-1">Título del evento</Typography>
                    <Input id="sub-event-title" placeholder="Mujeres en Movimiento" className="mb-3" />
                    <div className="flex flex-wrap gap-2">
                      <Button id="btn-save-local-sub" color="blue">Guardar en Local</Button>
                      <Button id="btn-publish-sub" color="green">Publicar en GitHub</Button>
                      <Button id="btn-open-link" color="blue" variant="outlined">Abrir enlace</Button>
                    </div>
                  </div>
                  <div>
                    <Typography variant="h6">GitHub</Typography>
                    <Typography className="mb-1">Owner</Typography>
                    <Input id="gh-owner" defaultValue="PLAGOCORP" className="mb-2" />
                    <Typography className="mb-1">Repo</Typography>
                    <Input id="gh-repo" defaultValue="GDC" className="mb-2" />
                    <Typography className="mb-1">Token</Typography>
                    <Input id="gh-token" type="password" placeholder="ghp_..." className="mb-2" />
                    <p id="sub-status" className="text-sm"></p>
                    <Typography variant="small" className="mt-3">Subsitios existentes</Typography>
                    <ul id="sub-list" className="list-disc pl-5"></ul>
                  </div>
                </div>
              </div>
            </TabsBody>
          </Tabs>
        </Card>
      </div>
      <button id="admin-btn" className="admin-fab rounded-full bg-blue-600 text-white px-4 py-2 shadow-lg" title="Admin">🛠</button>
    </div>
  )
}
