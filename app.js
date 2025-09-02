const mainButtons = document.getElementById('main-buttons');
const subButtons = document.getElementById('sub-buttons');
const textContainer = document.getElementById('text-container');

const app_id = '8eeb4f36';
const app_key = '841c8ca5a916a874dd9709d32b73ce88';

// Colores de los botones principales
const colors = ["#e74c3c", "#e74c3c", "#8e44ad", "#8e44ad", "#27ae60", "#27ae60", "#f39c12", "#f39c12", "#2980b9", "#2980b9"];
const lines = ["L1 - Fondo", "L1 - Hospital de Bellvitge", "L2 - Badalona", "L2 - Poble Sec", "L3 - Trinitat Nova", "L3 - Zona Universitaria", "L4 - La Pau", "L4 - Trinitat Nova", "L5 - Vall d'Hebron", "L5 - Cornellà"];
// sentit:
// L1 - Fondo
// L1 - Hospital de Bellvitge
// L2 - Badalona
// L2 - Poble Sec
// L3 - Trinitat Nova: 1
// L3 - Zona Universitaria: 2
// L4 - La Pau
// L4 - Trinitat Nova
// L5 - Vall d'Hebron
// L5 - Cornellà
const stops_l3 = [
 "Trinitat Nova",
 "Roquetes",
 "Canyelles",
 "Valldaura",
 "Mundet",
 "Montbau",
 "Vall d'Hebron",
 "Cocheras de Sant Genís",
 "Penitents",
 "Vallcarca",
 "Lesseps",
 "Fontana",
 "Diagonal",
 "Passeig de Gràcia",
 "Catalunya",
 "Liceu",
 "Drassanes",
 "Paral·lel",
 "Poble Sec",
 "Espanya",
 "Tarragona",
 "Sants Estació",
 "Plaça del Centre",
 "Les Corts",
 "Maria Cristina",
 "Palau Reial",
 "Zona Universitaria"
]

// Parse stations.csv and build a mapping from name to id
let stationNameToId = {};
fetch('stations.csv')
  .then(response => response.text())
  .then(text => {
    text.split('\n').forEach(line => {
      const [id, name] = line.split(',');
      if (id && name) {
        stationNameToId[name.trim().toLowerCase()] = id.trim();
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
  var stops;
  
  if (label == "L3 - Trinitat Nova") {
    stops = stops_l3.reverse()
  } else if (label == "L3 - Zona Universitaria")  {
    stops = stops_l3
  } else {
    stops = ["Aun no definido"]
  }

  for (let i = 0; i < stops.length; i++) {
    let item = stops[i];
    const btn = document.createElement('button');
    btn.textContent = `${item}`;
    btn.style.backgroundColor = "#bdc3c7";
    btn.addEventListener('click', () => fetchText(line, id_sentit, item)); // <-- pass id_sentit
    subButtons.appendChild(btn);
  }
}

// Función para consultar texto en la web
let intervalId;
function fetchText(line_number, sentit, station_name) {
  console.log("In line number", line_number, "fetching", station_name, "with sentit", sentit);
  if (intervalId) clearInterval(intervalId);
  subButtons.classList.add('hidden');
  async function update() {
    try {
      const key = station_name.trim().toLowerCase();
      const station_id = stationNameToId[key];
      if (!station_id) {
        textContainer.textContent = `No se encontró el ID para la estación "${station_name}"`;
        return;
      }
      const response = await fetch(`https://api.tmb.cat/v1/itransit/metro/estacions?estacions=${station_id}&app_id=${app_id}&app_key=${app_key}`);
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
      console.log("TS", data.linies);
      // Custom pretty print
      let output = "";
      if (data.linies && data.linies.length > 0) {
        const linia = data.linies[0];
        output += `Linea: ${linia.nom_linia} <br>`;
        if (linia.estacions && linia.estacions.length > 0) {
          linia.estacions.forEach(est => {
            if (est.linies_trajectes && est.linies_trajectes.length > 0 && est.id_sentit == sentit) {
              est.linies_trajectes.forEach(traj => {
                if (traj.propers_trens && traj.propers_trens.length > 0) {
                  const firstTrain = traj.propers_trens[0];
                  output += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Próxima llegada: ${new Date(firstTrain.temps_arribada).toLocaleTimeString()}<br>`;
                } else {
                  output += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Próxima llegada: No disponible<br>`;
                }
              });
            }
          });
        }
        console.log("OUTPUT",output);
        textContainer.innerHTML = output;
      } else {
        textContainer.innerHTML = `[${station_name}] Sin información`;
      }
    } catch (err) {
      textContainer.textContent = "Error al obtener datos.";
    }
  }

  update(); // primer fetch inmediato
  intervalId = setInterval(update, 10000); // cada 10 segundos
}
