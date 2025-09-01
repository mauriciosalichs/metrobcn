const mainButtons = document.getElementById('main-buttons');
const subButtons = document.getElementById('sub-buttons');
const textContainer = document.getElementById('text-container');

// Colores de los botones principales
const colors = ["#e74c3c", "#27ae60", "#2980b9", "#f39c12", "#8e44ad"];
const labels = ["L1", "L2", "L3", "L4", "L5"];

// Crear botones principales
labels.forEach((label, index) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.backgroundColor = colors[index];
  btn.addEventListener('click', () => showSubButtons(label));
  mainButtons.appendChild(btn);
});

// Mostrar subset de 10 botones
function showSubButtons(label) {
  subButtons.innerHTML = '';
  subButtons.classList.remove('hidden');

  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.textContent = `${label}-${i}`;
    btn.style.backgroundColor = "#bdc3c7";
    btn.addEventListener('click', () => fetchText(`${label}-${i}`));
    subButtons.appendChild(btn);
  }
}

// Función para consultar texto en la web
let intervalId;
function fetchText(id) {
  if (intervalId) clearInterval(intervalId);

  async function update() {
    try {
      // 🔴 Cambiá esta URL por la de tu backend o API real
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
