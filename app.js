document.body.insertAdjacentHTML('afterbegin', `
  <div id="metro-title-bar" style="
    width: 100vw;
    background: #000;
    color: #fff;
    font-size: 1em;
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
document.body.style.paddingTop = '2em'; // Prevent content under the title

const mainButtons = document.getElementById('main-buttons');
const subButtons = document.getElementById('sub-buttons');
const textContainer = document.getElementById('text-container');

const app_id = '8eeb4f36';
const app_key = '841c8ca5a916a874dd9709d32b73ce88';

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

function renderState(state, data = {}) {
  if (state === "lines") {
    mainButtons.classList.remove('hidden');
    subButtons.classList.add('hidden');
    textContainer.innerHTML = '';
  } else if (state === "stations") {
    mainButtons.classList.add('hidden');
    subButtons.classList.remove('hidden');
    textContainer.innerHTML = '';
  } else if (state === "time") {
    mainButtons.classList.add('hidden');
    subButtons.classList.add('hidden');
    // textContainer is updated by fetchText
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
    showSubButtons(label, id_sentit);
  });
  mainButtons.appendChild(btn);
});

// Mostrar subset de 10 botones
function showSubButtons(label, id_sentit) {
  let line = label.split(" - ")[0];
  subButtons.innerHTML = '';
  mainButtons.classList.add('hidden');
  subButtons.classList.remove('hidden');
  
  let stops = Object.keys(stationNameToId)
    .filter(key => key.trim().charAt(0) === line[1]);

  let stops_names = stops.map(key => stationNameToId[key]);

  // Reverse stops for specific labels
  if (
    label === "L1 - Hospital de Bellvitge" ||
    label === "L2 - Paral·lel" ||
    label === "L3 - Zona Universitaria" ||
    label === "L4 - La Pau" ||
    label === "L5 - Cornellà"
  ) {
    stops_names = stops_names.reverse();
    stops = stops.reverse();
  }

  for (let i = 0; i < stops_names.length; i++) {
    let station_name = stops_names[i];
    const btn = document.createElement('button');
    btn.textContent = `${station_name}`;
    btn.style.backgroundColor = "#bdc3c7";
    btn.addEventListener('click', () => {
      setState("time", { line, id_sentit, station_name, station_code: stops[i] });
      fetchText(line, id_sentit, station_name, stops[i]);
    });
    subButtons.appendChild(btn);
  }
}

// Función para consultar texto en la web
let intervalId;
let countdownIntervalId;
function fetchText(line_number, sentit, station_name, station_code) {
  console.log("In line number", line_number, "fetching", station_name, "with sentit", sentit);
  if (intervalId) clearInterval(intervalId);
  if (countdownIntervalId) clearInterval(countdownIntervalId);
  subButtons.classList.add('hidden');
  let secondsArrivals = [];

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
        textContainer.innerHTML = "<p>No se encontró información de tiempo.</p>";
        return;
      }
      // Custom pretty print
      let output = "";
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
            if (est.linies_trajectes && est.linies_trajectes.length > 0 && est.id_sentit == sentit) {
              est.linies_trajectes.forEach(traj => {
                output += `Sentido: ${traj.desti_trajecte} <br>`;
                if (traj.propers_trens && traj.propers_trens.length > 0) {
                  traj.propers_trens.forEach((train, idx) => {
                    if (idx < 2) { // solo mostrar los dos primeros
                      const seconds = Math.round((train.temps_arribada - now.getTime()) / 1000);
                      secondsArrivals[idx] = seconds;
                      let proxima_llegada_label;
                      if (idx == 0) proxima_llegada_label = "Próxima partida: ";
                      if (idx == 1) proxima_llegada_label = "Siguiente partida: ";
                      output += `${proxima_llegada_label}<br>${new Date(train.temps_arribada).toLocaleTimeString()}<br>`;
                      // Format seconds as m:ss
                      const min = Math.floor(seconds / 60);
                      const sec = Math.abs(seconds % 60);
                      const formatted = `${min}:${sec.toString().padStart(2, '0')}`;
                      output += `<div id="secondsToArrival${idx + 1}" style="color:red;font-size:${7 - (idx*3)}em;margin-top:10px;">${formatted}</div>`;
                    }
                  });
                } else {
                  output += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Próxima partida: No disponible<br>`;
                }
              });
            }
          });
        }
        textContainer.innerHTML = output;

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
        }, 1000);
      } else {
        textContainer.innerHTML = `[${station_name}] Sin información`;
      }
    } catch (err) {
      textContainer.textContent = `Error al obtener datos: ${err.message}`;
    }
  }

  update(); // primer fetch inmediato
  intervalId = setInterval(update, 10000); // actualiza todo cada 10 segundos
}

// Initial state
window.addEventListener('DOMContentLoaded', () => {
  setState("lines");
});
