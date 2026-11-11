"use strict";

const endpoints = Object.freeze({
  quote: "https://dummyjson.com/quotes/random",
  dog: "https://dog.ceo/api/breeds/image/random",
  cat: "https://cataas.com/cat?json=true",
  fact: "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en"
});

// Cada tarjeta tiene sus propios elementos y su estado independiente.
function getSection(name) {
  return {
    card: document.getElementById(`${name}-card`),
    content: document.getElementById(`${name}-content`),
    status: document.getElementById(`${name}-status`),
    button: document.getElementById(`${name}-button`)
  };
}

function requireText(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("La API devolvió datos incompletos.");
  }
  return value.trim();
}

function requireImageUrl(value, base) {
  const url = new URL(requireText(value), base);
  if (url.protocol !== "https:") {
    throw new Error("La API devolvió una dirección de imagen no válida.");
  }
  return url.href;
}

async function fetchJson(url, signal) {
  // no-store obliga al navegador a consultar de nuevo en cada clic.
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal
  });
  if (!response.ok) {
    throw new Error(`La API respondió con HTTP ${response.status}.`);
  }
  return await response.json();
}

// La consulta sigue en curso hasta que también termine de cargar la imagen.
// Los listeners se agregan antes de asignar src, incluso si existe en caché.
function loadImage(image, url, signal) {
  return new Promise((resolve, reject) => {
    function cleanup() {
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    }
    function onLoad() { cleanup(); resolve(); }
    function onError() { cleanup(); reject(new Error("No se pudo cargar la imagen.")); }
    function onAbort() {
      cleanup();
      image.removeAttribute("src");
      reject(new DOMException("Tiempo de espera agotado", "AbortError"));
    }
    if (signal.aborted) { onAbort(); return; }
    image.addEventListener("load", onLoad, { once: true });
    image.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    image.src = url;
  });
}

// Comparte el ciclo de carga, pero no mezcla los estados de las tarjetas.
async function updateSection(name, requestContent) {
  const section = getSection(name);
  if (section.button.disabled) return;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  section.button.disabled = true;
  section.card.setAttribute("aria-busy", "true");
  section.card.classList.remove("has-error");
  section.card.classList.add("is-loading");
  section.content.hidden = true;
  section.status.textContent = "Cargando…";

  try {
    await requestContent(controller.signal);
    section.content.hidden = false;
    section.status.textContent = "";
  } catch (error) {
    const message = error.name === "AbortError"
      ? "La consulta tardó demasiado. Vuelve a intentarlo con el botón."
      : "No pudimos cargar este contenido. Revisa tu conexión y vuelve a intentarlo con el botón.";
    section.status.textContent = message;
    section.card.classList.add("has-error");
    console.warn(`Error al cargar ${name}:`, error);
  } finally {
    window.clearTimeout(timeout);
    section.button.disabled = false;
    section.card.setAttribute("aria-busy", "false");
    section.card.classList.remove("is-loading");
  }
}

async function obtenerCita() {
  await updateSection("quote", async (signal) => {
    const data = await fetchJson(endpoints.quote, signal);
    const quote = requireText(data.quote);
    const author = requireText(data.author);
    document.getElementById("quote-text").textContent = quote;
    document.getElementById("quote-author").textContent = author;
  });
}

async function mostrarPerro() {
  await updateSection("dog", async (signal) => {
    const data = await fetchJson(endpoints.dog, signal);
    if (data.status !== "success") throw new Error("Dog CEO no devolvió una imagen.");
    const url = requireImageUrl(data.message);
    await loadImage(document.getElementById("dog-image"), url, signal);
  });
}

async function mostrarGato() {
  await updateSection("cat", async (signal) => {
    // /cat?json=true devuelve JSON; /cat/{id} devuelve la imagen.
    const data = await fetchJson(endpoints.cat, signal);
    const path = data.url || `/cat/${encodeURIComponent(requireText(data.id || data._id))}`;
    const url = requireImageUrl(path, "https://cataas.com");
    await loadImage(document.getElementById("cat-image"), url, signal);
  });
}

async function mostrarDato() {
  await updateSection("fact", async (signal) => {
    const data = await fetchJson(endpoints.fact, signal);
    document.getElementById("fact-text").textContent = requireText(data.text);
  });
}

document.getElementById("quote-button").addEventListener("click", obtenerCita);
document.getElementById("dog-button").addEventListener("click", mostrarPerro);
document.getElementById("cat-button").addEventListener("click", mostrarGato);
document.getElementById("fact-button").addEventListener("click", mostrarDato);

// Se lanzan juntas sin esperar entre sí: una API caída no bloquea las demás.
obtenerCita();
mostrarPerro();
mostrarGato();
mostrarDato();
