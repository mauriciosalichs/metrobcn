const mainButtons = document.getElementById('main-buttons');
const subButtons = document.getElementById('sub-buttons');
const textContainer = document.getElementById('text-container');

// Colores de los botones principales
const colors = ["#e74c3c", "#e74c3c", "#8e44ad", "#8e44ad", "#27ae60", "#27ae60", "#f39c12", "#f39c12", "#2980b9", ];
const lines = ["L1 - Fondo", "L1 - Hospital de Bellvitge", "L2 - Badalona", "L2 - Poble Sec", "L3 - Trinitat Nova", "L3 - Zona Universitaria", "L4 - La Pau", "L4 - Trinitat Nova", "L5 - Vall d'Hebron", "L5 - Cornellà"];

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
 "Paseo de Gracia",
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
 "Zona Universitària"
]


// Crear botones principales
lines.forEach((label, index) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.backgroundColor = colors[index];
  btn.addEventListener('click', () => showSubButtons(label));
  mainButtons.appendChild(btn);
});

// Mostrar subset de 10 botones
function showSubButtons(label) {
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

  for (var i=0, item; item = stops[i]; i++) {
    const btn = document.createElement('button');
    btn.textContent = `${item}`;
    btn.style.backgroundColor = "#bdc3c7";
    btn.addEventListener('click', () => fetchText(`${label}`));
    subButtons.appendChild(btn);
  }
}

// Función para consultar texto en la web
let intervalId;
function fetchText(id) {
  if (intervalId) clearInterval(intervalId);

  async function update() {
    try {
      const response = await fetch(`https://baconipsum.com/api/?type=meat-and-filler&paras=1`);
      const data = await response.json();
      textContainer.textContent = `[${id}] ${data[0]}`;
    } catch (err) {
      textContainer.textContent = "Error al obtener datos.";
    }
  }

  update(); // primer fetch inmediato
  intervalId = setInterval(update, 10000); // cada 10 segundos
}
