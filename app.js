document.body.insertAdjacentHTML('afterbegin', `
  <div id="metro-title-bar" style="
    width: 100vw;
    background: #000;
    color: #fff;
    font-size: 0.5em;
    font-family: sans-serif;
    text-align: center;
    padding: 0.5em 0;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
  ">
    Next Metro Barcelona
  </div>
`);
document.body.style.paddingTop = '1em'; // Prevent content under the title

const linesButtons = document.getElementById('lines-buttons');
const stationsButtons = document.getElementById('stations-buttons');
const remainingTimeScreen = document.getElementById('remaining-time-screen');
const exitsScreen = document.getElementById('exits-screen');
const exitsEditScreen = document.getElementById('exits-edit-screen');

// Declarar localStorage y darle un valor inicial vacío si no existe
if (!localStorage.getItem('exitsJson')) {
  localStorage.setItem('exitsJson', JSON.stringify({}));
}

let app_id, app_key, app_id_bp, app_key_bp, exits_worker_url;
fetch('json/config.json')
  .then(response => response.json())
  .then(cfg => {
    app_id = cfg.app_id;
    app_key = cfg.app_key;
    app_id_bp = cfg.app_id_bp;
    app_key_bp = cfg.app_key_bp;
    exits_worker_url = cfg.exits_worker_url;
  });

// Colores de los botones principales
const colors = ["#e74c3c", "#e74c3c", "#8e44ad", "#8e44ad", "#27ae60", "#27ae60", "#f39c12", "#f39c12", "#2980b9", "#2980b9"];
const lines = ["L1 - Fondo", "L1 - Hospital de Bellvitge", "L2 - Badalona Pompeu Fabra", "L2 - Paral·lel", "L3 - Trinitat Nova", "L3 - Zona Universitaria", "L4 - Trinitat Nova", "L4 - La Pau", "L5 - Vall d'Hebron", "L5 - Cornellà"];

// sentit:
// L1 - Fondo: 1
// L1 - Hospital de Bellvitge: 2
// L2 - Badalona: 1
// L2 - Paral·lel: 2
// L3 - Trinitat Nova: 1
// L3 - Zona Universitaria: 2
// L4 - Trinitat Nova: 1
// L4 - La Pau: 2
// L5 - Vall d'Hebron: 1
// L5 - Cornellà: 2

// Parse stations.csv and build a mapping from name to id
let stationNameToId = {};
fetch('stations.csv')
  .then(response => response.text())
  .then(text => {
    text.split('\n').forEach(line => {
      const [id, name] = line.split(',');
      if (id && name) {
        stationNameToId[id.trim()] = name.trim();
      }
    });
  });

// State management
function setState(state, data = {}) {
  window.history.pushState({ state, ...data }, '', '');
  renderState(state, data);
}

function getState() {
  console.log("Current history state:", window.history.state);
  return window.history.state.state;
}

function renderState(state, data = {}) {
  if (state !== "time") {
    if (intervalId) clearInterval(intervalId);
    if (countdownIntervalId) clearInterval(countdownIntervalId);
  }

  if (state === "lines") {
    linesButtons.classList.remove('hidden');
    stationsButtons.classList.add('hidden');
    remainingTimeScreen.innerHTML = '';
    exitsScreen.innerHTML = '';
    exitsEditScreen.innerHTML = '';
  } else if (state === "stations") {
    linesButtons.classList.add('hidden');
    stationsButtons.classList.remove('hidden');
    remainingTimeScreen.innerHTML = '';
    exitsScreen.innerHTML = '';
    exitsEditScreen.innerHTML = '';
  } else if (state === "time") {
    linesButtons.classList.add('hidden');
    stationsButtons.classList.add('hidden');
    exitsScreen.innerHTML = '';
    exitsEditScreen.innerHTML = '';
    fetchTime(data.line, data.id_sentit, data.station_name, data.station_code, data.station_index);
  } else if (state === "after-stations") {
    linesButtons.classList.add('hidden');
    stationsButtons.classList.remove('hidden');
    remainingTimeScreen.innerHTML = '';
    exitsScreen.innerHTML = '';
    exitsEditScreen.innerHTML = '';
    // Mostrar solo estaciones desde station_index en adelante
    if (data.label && data.id_sentit !== undefined && data.station_index !== undefined) {
      showstationsButtons(data.label, data.id_sentit, data.station_index + 1);
    }
  } else if (state === "exits") {
    linesButtons.classList.add('hidden');
    stationsButtons.classList.add('hidden');
    remainingTimeScreen.innerHTML = '';
    exitsEditScreen.innerHTML = '';
    fetchExitsView(data.line, data.id_sentit, data.station_name, data.station_code);
  } else if (state === "exits-edit") {
    linesButtons.classList.add('hidden');
    stationsButtons.classList.add('hidden');
    remainingTimeScreen.innerHTML = '';
    exitsScreen.innerHTML = '';
    fetchExitsEdit(data.line, data.id_sentit, data.station_name, data.station_code);
  }
}

// Listen for browser navigation
window.addEventListener('popstate', (event) => {
  const state = event.state ? event.state.state : "lines";
  renderState(state, event.state || {});
});

// Crear botones principales
lines.forEach((label, index) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.backgroundColor = colors[index];
  let id_sentit = (index % 2) + 1;
  btn.addEventListener('click', () => {
    setState("stations", { label, id_sentit });
    showstationsButtons(label, id_sentit);
  });
  linesButtons.appendChild(btn);
});

// Add three extra buttons with images in a row at the end
const extraRow = document.createElement('div');
extraRow.style.display = 'flex';
extraRow.style.width = '100%';
extraRow.style.marginTop = '1em';

const extraScreens = [
  { id: 'infoScreen', img: "imgs/info.png" },
  { id: 'favScreen', img: "imgs/favs.png" },
  { id: 'settingsScreen', img: "imgs/settings.png" }
];

extraScreens.forEach(({ id, img }) => {
  const btn = document.createElement('button');
  btn.style.flex = '1';
  btn.style.height = '30px';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.background = '#ffffffd0';
  btn.style.border = '1px solid #ffffffff';
  btn.innerHTML = `<img src='${img}' style='width:25px;height:25px;display:block;margin:auto;' alt='${id}'/>`;
  btn.onclick = () => {
    showScreen(id);
  };
  extraRow.appendChild(btn);
});
linesButtons.appendChild(extraRow);

function showScreen(id) {
  if (id === 'infoScreen') {
    alert("Next Metro Barcelona\nVersión 1.0\nDesarrollado por msalichs");
  } else if (id === 'favScreen') {
    renderFavScreen();
  } else if (id === 'settingsScreen') {
    renderSettingsScreen();
  }
}

// --- SETTINGS SCREEN ---
function renderSettingsScreen() {
  // Get current value or default
  let textSize = parseFloat(localStorage.getItem('appTextSize') || '1.0');
  // HTML for settings
  let html = `
    <h2 style="text-align:center;">Ajustes</h2>
    <div style="margin:2em 0;">
      <label for="textSizeSlider" style="font-size:1.1em;">Tamaño texto:</label>
      <input type="range" id="textSizeSlider" min="0.7" max="2.0" step="0.05" value="${textSize}" style="width:60%;vertical-align:middle;">
      <span id="textSizeValue" style="font-size:1.1em;margin-left:1em;">${textSize}</span>
    </div>
  `;
  // Show settings screen
  linesButtons.classList.add('hidden');
  stationsButtons.classList.add('hidden');
  remainingTimeScreen.innerHTML = '';
  exitsScreen.innerHTML = '';
  exitsEditScreen.innerHTML = '';
  remainingTimeScreen.innerHTML = html;

  // Slider logic
  const slider = document.getElementById('textSizeSlider');
  const valueLabel = document.getElementById('textSizeValue');
  slider.oninput = function() {
    valueLabel.textContent = this.value;
    applyTextSize(this.value);
    localStorage.setItem('appTextSize', this.value);
  };
}

// Apply text size to all buttons
function applyTextSize(size) {
  document.querySelectorAll('button').forEach(btn => {
    btn.style.fontSize = `${size}em`;
  });
}

// On load, apply saved text size
window.addEventListener('DOMContentLoaded', () => {
  setState("lines");
  let textSize = parseFloat(localStorage.getItem('appTextSize') || '1.0');
  applyTextSize(textSize);
});

// Renderizar la pantalla de favoritos
function renderFavScreen() {
  // Obtener los 6 pares más consultados
  let favs = JSON.parse(localStorage.getItem('stationSentitCounts') || '{}');
  let favArr = Object.values(favs);
  favArr.sort((a, b) => b.count - a.count);
  favArr = favArr.slice(0, 6);

  // Crear vista de cartas
  let html = `<h2 style="text-align:center;">Favoritos</h2>`;
  html += `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1em;">`;
  favArr.forEach(fav => {
    // Obtener color de la línea
    let lineIdx = lines.findIndex(l => l.startsWith(fav.line));
    let color = colors[lineIdx] || "#bdc3c7";
    let sentitLabel = lines[lineIdx + (fav.sentit -1)];
    html += `
      <div style="
        background:${color};
        color:#fff;
        border-radius:16px;
        padding:1em;
        min-width:280px;
        max-width:320px;
        margin-bottom:1em;
        box-shadow:0 2px 8px #0002;
        cursor:pointer;
        display:flex;
        flex-direction:column;
        align-items:center;
        font-size:1.1em;
      " onclick="window.__favClick('${fav.line}',${fav.sentit},'${fav.station_name.replace(/'/g,"\\'")}',${fav.station_code})">
        <div style="font-weight:bold;font-size:1.3em;margin-bottom:0.5em;">${fav.station_name}</div>
        <div style="margin-bottom:0.5em;">${sentitLabel}</div>
        <div style="font-size:0.9em;">Consultas: ${fav.count}</div>
      </div>
    `;
  });
  html += `</div>`;

  // Mostrar en pantalla
  linesButtons.classList.add('hidden');
  stationsButtons.classList.add('hidden');
  remainingTimeScreen.innerHTML = '';
  exitsScreen.innerHTML = '';
  exitsEditScreen.innerHTML = '';
  remainingTimeScreen.innerHTML = html;

  // Handler global para click en carta
  window.__favClick = function(line, sentit, station_name, station_code) {
    incrementStationSentitCount(station_code, sentit, line, station_name);
    setState("time", { line, id_sentit: sentit, station_name, station_code, station_index: 0 });
  };
}

function showstationsButtons(label, id_sentit, startIndex = 0) {
  console.log("Showing stations for", label, "with sentit", id_sentit, "starting from index", startIndex);
  let line = label.split(" - ")[0];
  stationsButtons.innerHTML = '';
  linesButtons.classList.add('hidden');
  stationsButtons.classList.remove('hidden');
  
  let stops = Object.keys(stationNameToId)
    .filter(key => key.trim().charAt(0) === line[1]);

  let stops_names = stops.map(key => stationNameToId[key]);

  // Reverse stops for specific labels
  if (id_sentit === 2) {
    stops_names = stops_names.reverse();
    stops = stops.reverse();
  }

  // Recortar las listas si es necesario
  stops_names = stops_names.slice(startIndex);
  stops = stops.slice(startIndex);

  for (let i = 0; i < stops_names.length; i++) {
    let station_name = stops_names[i];
    const btn = document.createElement('button');
    btn.textContent = `${station_name}`;
    btn.style.backgroundColor = "#bdc3c7";
    btn.addEventListener('click', () => {
      // Al hacer clic en una estación, ir a la pantalla de tiempo si el estado es "stations"
      // O ir a la pantalla de salidas si el estado es "after-stations"
      if (getState() === "stations") {
        // Incrementar contador de consultas
        incrementStationSentitCount(stops[i], id_sentit, line, station_name);
        setState("time", { line, id_sentit, station_name, station_code: stops[i], station_index: i + startIndex });
      } else if (getState() === "after-stations") {
        setState("exits", { line, id_sentit, station_name, station_code: stops[i], station_index: i + startIndex });
      }
    });
    stationsButtons.appendChild(btn);
  }
}

// Función para actualizar el contador de consultas en localStorage
function incrementStationSentitCount(station_code, sentit, line, station_name) {
  let favs = JSON.parse(localStorage.getItem('stationSentitCounts') || '{}');
  const key = `${station_code},${sentit}`;
  if (!favs[key]) {
    favs[key] = { count: 0, line, station_name, station_code, sentit };
  }
  favs[key].count += 1;
  localStorage.setItem('stationSentitCounts', JSON.stringify(favs));
}

// Función para consultar texto en la web
let intervalId;
let countdownIntervalId;
function fetchTime(line_number, sentit, station_name, station_code, station_index) {
  console.log("In line number", line_number, "fetching", station_name, "with sentit", sentit);
  if (intervalId) clearInterval(intervalId);
  if (countdownIntervalId) clearInterval(countdownIntervalId);
  linesButtons.classList.add('hidden');
  stationsButtons.classList.add('hidden');
  let secondsArrivals = [];
  let firstTimeFound = false;

  async function update() {
    try {
      const response = await fetch(`https://api.tmb.cat/v1/itransit/metro/estacions?estacions=${station_code}&app_id=${app_id}&app_key=${app_key}`);
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
      if (data.timestamp) {
        var now = new Date(data.timestamp);
        console.log("Timestamp:", now.toLocaleString());
      } else {
        console.log("No timestamp available");
        if (!firstTimeFound) {
          remainingTimeScreen.innerHTML = "<p>No se encontró información de tiempo.</p>";
        }
        return;
      }
      // Custom pretty print
      let output = "";
      let finalOutput = "";
      secondsArrivals = [];
      if (data.linies && data.linies.length > 0) {
        const linia = data.linies[0]
        const line_name = linia.nom_linia;
        if (line_name != line_number) {
          output += `Solo se encuentra infromación para la linea ${line_name}`;
          return;
        }
        output += `Linea: ${linia.nom_linia} <br>`;
        output += `Estación: ${station_name} <br>`;
        if (linia.estacions && linia.estacions.length > 0) {
            linia.estacions.forEach(est => {
            // Mostrar llegada de tren en la otra dirección
            if (est.linies_trajectes && est.linies_trajectes.length > 0 && est.id_sentit != sentit) {
              est.linies_trajectes.forEach(traj => {
              if (traj.propers_trens && traj.propers_trens.length > 0) {
                traj.propers_trens.forEach((train, idx) => {
                const seconds = Math.round((train.temps_arribada - now.getTime()) / 1000);
                const min = Math.floor(seconds / 60);
                const sec = Math.abs(seconds % 60);
                const color = seconds >= 60 ? '#000000ff' : '#f80b0bff';
                const formatted = `${min}:${sec.toString().padStart(2, '0')}`;
                finalOutput = `<div id="otherDirectionArrival" style="color:${color};font-size:1.1em;margin-top:2em;text-align:center;opacity:0.7;">
                    Llegada de tren en la otra dirección: <span style="font-weight:bold;">${formatted}</span>
                    </div>`;
                });
              }
              });
            }
            // Mostrar llegada de tren en el sentido actual
            if (est.linies_trajectes && est.linies_trajectes.length > 0 && est.id_sentit == sentit) {
              est.linies_trajectes.forEach(traj => {
                output += `Sentido: ${traj.desti_trajecte} <br>`;
                if (traj.propers_trens && traj.propers_trens.length > 0) {
                  traj.propers_trens.forEach((train, idx) => {
                    if (idx < 2) { // solo mostrar los dos primeros
                      firstTimeFound = true;
                      const seconds = Math.round((train.temps_arribada - now.getTime()) / 1000);
                      secondsArrivals[idx] = seconds;
                      let proxima_llegada_label;
                      if (idx == 0) proxima_llegada_label = "Próxima partida: ";
                      if (idx == 1) proxima_llegada_label = "Siguiente partida: ";
                      output += `${proxima_llegada_label}<br>${new Date(train.temps_arribada).toLocaleTimeString()}<br>`;
                      // Format seconds as m:ss
                      const min = Math.floor(seconds / 60);
                      const sec = Math.abs(seconds % 60);
                      const color = seconds >= 60 ? '#000000ff' : '#f80b0bff';
                      const formatted = `${min}:${sec.toString().padStart(2, '0')}`;
                      output += `<div id="secondsToArrival${idx + 1}" style="color:${color};font-size:${7 - (idx*3)}em;margin-top:10px;">${formatted}</div>`;
                    }
                  });
                } else {
                  output += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Próxima partida: No disponible<br>`;
                  if (413 === station_code) {
                    output += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Por suerte, nadie usa esta estación de metro.<br>`;
                  }
                }
              });
            }
          });
        }
        output += finalOutput;
        remainingTimeScreen.innerHTML = output;

        // Agregar botón Seleccionar destino
        const selectBtn = document.createElement('button');
        selectBtn.textContent = "Seleccionar destino";
        selectBtn.style.position = "fixed";
        selectBtn.style.left = "50%";
        selectBtn.style.bottom = "30px";
        selectBtn.style.transform = "translateX(-50%)";
        selectBtn.style.background = "#2980b9";
        selectBtn.style.color = "#fff";
        selectBtn.style.fontSize = "1.2em";
        selectBtn.style.padding = "0.7em 2em";
        selectBtn.style.border = "none";
        selectBtn.style.borderRadius = "8px";
        selectBtn.style.zIndex = "1100";
        selectBtn.addEventListener('click', () => {
          setState("after-stations", { label: `${line_number} - ${station_name}`, id_sentit: sentit, station_index });
        });
        remainingTimeScreen.appendChild(selectBtn);

        // Decrement both seconds counters every second
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        countdownIntervalId = setInterval(() => {
          secondsArrivals.forEach((sec, idx) => {
            const el = document.getElementById(`secondsToArrival${idx + 1}`);
            if (el) {
              let currentText = el.textContent;
              let parts = currentText.split(':');
              let min = parseInt(parts[0], 10);
              let sec = parseInt(parts[1], 10);
              let total = min * 60 + sec;
              if (total > 0) {
          total = total - 1;
          let newMin = Math.floor(total / 60);
          let newSec = Math.abs(total % 60);
          el.textContent = `${newMin}:${newSec.toString().padStart(2, '0')}`;
              }
            }
          });

          // Also decrement otherDirectionArrival if present
          const otherDirEl = document.getElementById('otherDirectionArrival');
          if (otherDirEl) {
            // Find the <span> inside for the time
            const span = otherDirEl.querySelector('span');
            if (span) {
              let currentText = span.textContent;
              let parts = currentText.split(':');
              let min = parseInt(parts[0], 10);
              let sec = parseInt(parts[1], 10);
              let total = min * 60 + sec;
              if (total > 0) {
          total = total - 1;
          let newMin = Math.floor(total / 60);
          let newSec = Math.abs(total % 60);
          span.textContent = `${newMin}:${newSec.toString().padStart(2, '0')}`;
              }
            }
          }
        }, 1000);
      } else {
        remainingTimeScreen.innerHTML = `[${station_name}] Sin información`;
      }
    } catch (err) {
      if (firstTimeFound) {
        // No hacer nada, mantener la última información válida, pero cambiar el color a gris
        Array.from(remainingTimeScreen.querySelectorAll('div[id^="secondsToArrival"]')).forEach(el => {
          el.style.color = '#888888ff';
        });
      } else {
        remainingTimeScreen.innerHTML = "<p>Error al obtener datos. Reintentando...</p>";
      }
    }
  }

  update(); // primer fetch inmediato
  intervalId = setInterval(update, 10000); // actualiza todo cada 10 segundos
}

// Manejo de exits.json persistente
async function loadExitsJson() {
  console.log("Loading exits JSON from remote");
  try {
  let res = await fetch(exits_worker_url);
  // Si falla en obtenerlo, lo recupera del localStorage
  if (!res.ok) {
    console.warn("Failed to fetch exits JSON, falling back to localStorage");
    let localCopy = localStorage.getItem('exitsJson');
    if (localCopy) {
      try {
        return JSON.parse(localCopy);
      } catch (e) {
        console.error("Error parsing localStorage exits JSON:", e);
      }
    }
    return {};
  }
  console.log("Fetched exits JSON:", res);
    let data = await res.json();
    localStorage.setItem('exitsJson', JSON.stringify(data));
    console.log("Exits JSON data:", data);
    return data;
  } catch (e) {
    console.error("Error fetching exits JSON:", e);
    return {};
  }
}

async function saveExitsJson(exitsObj) {
  try {
    // Compare (NOT DONE FOR NOW)
    // if (JSON.stringify(latestData) !== JSON.stringify(localData)) {
    //   alert('Otro usuario ha modificado las salidas. Tus cambios no se guardarán.');
    //   // Salir del editor de exits
    //   setState('lines');
    //   return; 
    // }
    // Si no hay conflicto, guardar
    const res = await fetch(exits_worker_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exitsObj)
    });
    if (!res.ok) {
      throw new Error("Failed to save exits JSON");
    }
    // Actualizar localStorage con la nueva versión
    localStorage.setItem('exitsJson', JSON.stringify(exitsObj));
    console.log("Exits JSON saved remotely:", exitsObj);
  } catch (e) {
    console.error("Error saving exits JSON:", e);
  }
}


// Pantalla de solo vista de salidas (sin edición)
async function fetchExitsView(line_number, sentit, station_name, station_code) {
  let exitsObj = await loadExitsJson();
  console.log("In line number", line_number, "fetching exits-view for", station_name, "with sentit", sentit, "and station code", station_code);
  console.log("Exits JSON data for this", exitsObj);
  let stationRecord = exitsObj[station_code];
  let exitsList = [];
  if (stationRecord && stationRecord.exits && stationRecord.exits.length > 0) {
    exitsList = stationRecord.exits[sentit - 1] || {};
  }
  // Determinar qué vagones mostrar: 1, 20 y los del medio con datos
  let rows = [1];
  for (let i = 2; i < 20; i++) {
    if (exitsList[i] && exitsList[i].length > 0) rows.push(i);
  }
  rows.push(20);

  // Insertar saltos con '...' si hay huecos entre vagones
  let fullRows = [];
  for (let idx = 0; idx < rows.length; idx++) {
    fullRows.push(rows[idx]);
    if (idx < rows.length - 1 && rows[idx + 1] - rows[idx] > 1) {
      // Insertar '...' equidistante
      fullRows.push('gap');
    }
  }

  let table = `<div style='height:calc(100vh - 120px);overflow-y:auto;'><table style="width:100%;border-collapse:collapse;">`;
  table += `<tr><th style='border:none;text-align:center;'>Vagón</th><th style='border:none;text-align:center;'>Tipo</th><th style='border:none;text-align:center;'>Salidas</th></tr>`;
  fullRows.forEach(i => {
    if (i === 'gap') {
      table += `<tr style='border:none;height:40px;'><td colspan='3' style='border:none;text-align:center;font-size:2em;color:#bbb;'>...</td></tr>`;
      return;
    }
    // Número de vagón grande y centrado
  let vagonCell = `<div style='font-size:2.5em;font-weight:bold;display:flex;align-items:center;justify-content:center;height:80px;'>${i}</div>`;
  // Imagen correspondiente
  let imgSrc = i === 1 ? 'imgs/head.png' : (i === 20 ? 'imgs/tail.png' : 'imgs/middle.png');
  let imgCell = `<div style='display:flex;align-items:center;justify-content:center;height:80px;'><img src='${imgSrc}' alt='' style='max-height:70px;max-width:70px;transform:rotate(90deg);object-fit:contain;'/></div>`;
    // Tags para salidas
    let salidaTags = '';
    if (exitsList[i] && exitsList[i].length > 0) {
      salidaTags = exitsList[i].map(txt => {
        // if txt is L1, color red; L2 purple; L3 green; L4 orange; L5 blue; else gray
        let colorTag = '#7f8c8d'; // default gray
        if (txt === 'L1') colorTag = '#e74c3c';
        else if (txt === 'L2') colorTag = '#8e44ad';
        else if (txt === 'L3') colorTag = '#27ae60';
        else if (txt === 'L4') colorTag = '#f39c12';
        else if (txt === 'L5') colorTag = '#2980b9';
        return `<span style='display:inline-block;background:${colorTag};color:#fff;border-radius:8px;padding:0.3em 1em;margin:0.2em;font-size:1.1em;'>${txt}</span>`;
      }).join('');
    }
    table += `<tr style='border:none;'>`
      + `<td style='border:none;text-align:center;'>${vagonCell}</td>`
      + `<td style='border:none;text-align:center;'>${imgCell}</td>`
      + `<td style='border:none;text-align:left;'>${salidaTags}</td>`
      + `</tr>`;
  });
  table += `</table></div>`;

  // Botón para editar salidas
  let editBtn = document.createElement('button');
  editBtn.textContent = 'Editar salidas';
  editBtn.style.position = 'fixed';
  editBtn.style.left = '50%';
  editBtn.style.bottom = '30px';
  editBtn.style.transform = 'translateX(-50%)';
  editBtn.style.background = '#2980b9';
  editBtn.style.color = '#fff';
  editBtn.style.fontSize = '1.2em';
  editBtn.style.padding = '0.7em 2em';
  editBtn.style.border = 'none';
  editBtn.style.borderRadius = '8px';
  editBtn.style.zIndex = '1100';
  editBtn.onclick = function() {
    setState('exits-edit', { line: line_number, id_sentit: sentit, station_name, station_code });
  };

  exitsScreen.innerHTML = `<h2 style='text-align:center;'>Salidas para estación ${station_name} (${station_code}) Sentido ${sentit}</h2>` + table;
  exitsScreen.appendChild(editBtn);
}


// Pantalla de edición de salidas
async function fetchExitsEdit(line_number, sentit, station_name, station_code) {
  console.log("In line number", line_number, "fetching exits-edit for", station_name, "with sentit", sentit, "and station code", station_code);
  let exitsObj = await loadExitsJson();
  let clearBtnPressed = false;
  let stationRecord = exitsObj[station_code];
  let exitsList = [];
  if (stationRecord && stationRecord.exits && stationRecord.exits.length > 0) {
    // sentido: 1 o 2, pero array index 0 o 1
    exitsList = stationRecord.exits[sentit - 1] || {};
  }
  // Construir tabla HTML con celdas editables
  let table = '<table style="width:100%;border-collapse:collapse;">';
  table += '<tr><th>Vagón</th><th>Salidas</th></tr>';
  for (let i = 1; i <= 20; i++) {
    let salida = exitsList[i] ? exitsList[i].join(', ') : '';
    table += `<tr><td style='border:1px solid #ccc;text-align:center;'>${i}</td><td style='border:1px solid #ccc;cursor:pointer;' data-vagon='${i}'>${salida}</td></tr>`;
  }
  table += '</table>';
  exitsEditScreen.innerHTML = `<h2>Salidas para estación ${station_name} (${station_code}) sentido ${sentit}</h2>` + table;

  // Agregar evento click a cada celda de salida
  Array.from(exitsEditScreen.querySelectorAll('td[data-vagon]')).forEach(cell => {
    cell.addEventListener('click', function() {
      const vagon = parseInt(cell.getAttribute('data-vagon'));
      // Crear popup
      let popup = document.createElement('div');
      popup.style.position = 'fixed';
      popup.style.left = '50%';
      popup.style.top = '50%';
      popup.style.transform = 'translate(-50%, -50%)';
      popup.style.background = '#fff';
      popup.style.border = '2px solid #2980b9';
      popup.style.borderRadius = '10px';
      popup.style.padding = '2em';
      popup.style.zIndex = '9999';
      popup.innerHTML = `<h3>Editar salidas para vagón ${vagon}</h3>`;
      // Inputs
      let inputs = [];
      for (let j = 0; j < 4; j++) {
        let value = exitsList[vagon] && exitsList[vagon][j] ? exitsList[vagon][j] : '';
        let input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.placeholder = `Salida ${j+1}`;
        input.style.display = 'block';
        input.style.marginBottom = '1em';
        popup.appendChild(input);
        inputs.push(input);
      }
      // Botón modifcar una direccion
      let accept1Btn = document.createElement('button');
      accept1Btn.textContent = 'Modificar';
      accept1Btn.style.background = '#2980b9';
      accept1Btn.style.fontSize = '1em';
      accept1Btn.style.color = '#fff';
      accept1Btn.style.padding = '0.5em 2em';
      accept1Btn.style.border = 'none';
      accept1Btn.style.borderRadius = '8px';
      accept1Btn.style.marginRight = '1em';
      popup.appendChild(accept1Btn);

      // Botón modificar ambas direcciones
      let acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Modificar en ambas direcciones';
      acceptBtn.style.background = '#2980b9';
      acceptBtn.style.fontSize = '1em';
      acceptBtn.style.color = '#fff';
      acceptBtn.style.padding = '0.5em 2em';
      acceptBtn.style.border = 'none';
      acceptBtn.style.borderRadius = '8px';
      acceptBtn.style.marginRight = '1em';
      popup.appendChild(acceptBtn);

      // Botón limpiar
      let clearBtn = document.createElement('button');
      clearBtn.textContent = 'Limpiar valores';
      clearBtn.style.fontSize = '1em';
      clearBtn.style.background = '#ccc';
      clearBtn.style.color = '#333';
      clearBtn.style.padding = '0.5em 2em';
      clearBtn.style.border = 'none';
      clearBtn.style.borderRadius = '8px';
      popup.appendChild(clearBtn);

      // Botón cancelar
      let cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.style.fontSize = '1em';
      cancelBtn.style.background = '#e74c3c';
      cancelBtn.style.color = '#fff';
      cancelBtn.style.padding = '0.5em 2em';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '8px';
      popup.appendChild(cancelBtn);

      document.body.appendChild(popup);

      function saveChanges(applyToBoth) {
        let newValues = inputs.map(inp => inp.value.trim()).filter(v => v);
        if (!exitsObj[station_code]) {
          exitsObj[station_code] = { exits: [{}, {}] };
        }
        if (!exitsObj[station_code].exits[sentit-1]) {
          exitsObj[station_code].exits[sentit-1] = {};
        }
        exitsObj[station_code].exits[sentit-1][vagon] = newValues;
        if (applyToBoth && !clearBtnPressed) {
          if (!exitsObj[station_code].exits[2-sentit]) {
            exitsObj[station_code].exits[2-sentit] = {};
          }
          exitsObj[station_code].exits[2-sentit][21-vagon] = newValues;
        }
        saveExitsJson(exitsObj);
        document.body.removeChild(popup);
        clearBtnPressed = false;
        // Refrescar tabla
        setState('exits-edit', { line: line_number, id_sentit: sentit, station_name, station_code });
      }

      accept1Btn.onclick = function() {
        saveChanges(false);
      };

      acceptBtn.onclick = function() {
        saveChanges(true);
      };

      clearBtn.onclick = function() {
        inputs.forEach(inp => inp.value = '');
        clearBtnPressed = true;
      };

      cancelBtn.onclick = function() {
        document.body.removeChild(popup);
        clearBtnPressed = false;
      };
    });
  });
}

// Initial state
window.addEventListener('DOMContentLoaded', () => {
  setState("lines");
});
