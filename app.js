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

// Crear botones principales
lines.forEach((label, index) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.backgroundColor = colors[index];
  let id_sentit = (index % 2) + 1; // <-- assign id_sentit as requested
  btn.addEventListener('click', () => showSubButtons(label, id_sentit));
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
    btn.addEventListener('click', () => fetchText(line, id_sentit, station_name, stops[i])); // <-- pass id_sentit
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
                      if (idx == 0) proxima_llegada_label = "Próxima llegada: ";
                      if (idx == 1) proxima_llegada_label = "Siguiente llegada: ";
                      output += `${proxima_llegada_label}<br>${new Date(train.temps_arribada).toLocaleTimeString()}<br>`;
                      output += `<div id="secondsToArrival${idx + 1}" style="color:red;font-size:${7 - (idx*3)}em;margin-top:10px;">${seconds}</div>`;
                    }
                  });
                } else {
                  output += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Próxima llegada: No disponible<br>`;
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
              let current = parseInt(el.textContent, 10);
              if (current > 0) {
                el.textContent = current - 1;
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
