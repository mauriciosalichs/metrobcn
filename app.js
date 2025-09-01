const mainButtons = document.getElementById('main-buttons');
const subButtons = document.getElementById('sub-buttons');
const textContainer = document.getElementById('text-container');

// Colores de los botones principales
const colors = ["#e74c3c", "#8e44ad", "#27ae60", "#f39c12", "#2980b9"];
const labels = ["L1", "L2", "L3", "L4", "L5"];

// Estado inicial → pantalla principal
renderMain();

// Manejar botón atrás
window.onpopstate = function(event) {
  if (!event.state || event.state.view === "main") {
    renderMain();
  } else if (event.state.view.startsWith("subset-")) {
    renderSubButtons(event.state.label);
  } else if (event.state.view.startsWith("text-")) {
    fetchText(event.state.id, false); // false = no pushear otro estado
  }
};

function renderMain() {
  mainButtons.innerHTML = "";
  subButtons.innerHTML = "";
  textContainer.innerHTML = "";

  labels.forEach((label, index) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.backgroundColor = colors[index];
    btn.addEventListener('click', () => {
      history.pushState({view: "subset-" + label, label}, "", "");
      renderSubButtons(label);
    });
    mainButtons.appendChild(btn);
  });
}

function renderSubButtons(label) {
  mainButtons.innerHTML = "";
  subButtons.innerHTML = "";
  textContainer.innerHTML = "";

  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.textContent = `${label}-${i}`;
    btn.style.backgroundColor = "#bdc3c7";
    btn.addEventListener('click', () => {
      history.pushState({view: "text-" + label + "-" + i, id: `${label}-${i}`}, "", "");
      fetchText(`${label}-${i}`, true);
    });
    subButtons.appendChild(btn);
  }
}

let intervalId;
function fetchText(id, pushState = true) {
  if (intervalId) clearInterval(intervalId);

  mainButtons.innerHTML = "";
  subButtons.innerHTML = "";
  textContainer.innerHTML = "Cargando...";

  async function update() {
    try {
      const response = await fetch(`https://baconipsum.com/api/?type=meat-and-filler&paras=1`);
      const data = await response.json();
      textContainer.textContent = `[${id}] ${data[0]}`;
    } catch (err) {
      textContainer.textContent = "Error al obtener datos.";
    }
  }

  update();
  intervalId = setInterval(update, 10000);
}

