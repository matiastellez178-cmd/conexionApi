// Pruebas de logica con respuestas simuladas exclusivamente en este archivo.
// La pagina publicada siempre consulta las cuatro APIs reales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const flush = () => new Promise(setImmediate);

function harness(options = {}) {
  const elements = new Map();
  const calls = [];
  const timers = new Map();
  let nextTimer = 0;
  const state = { ...options };
  class Element {
    constructor(id) {
      this.id = id; this.disabled = false; this.hidden = id.endsWith('-content');
      this.textContent = ''; this.attributes = {}; this.events = new Map();
      this.classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(name => this.classes.add(name)),
        remove: (...names) => names.forEach(name => this.classes.delete(name))
      };
    }
    addEventListener(name, handler) {
      if (!this.events.has(name)) this.events.set(name, new Set());
      this.events.get(name).add(handler);
    }
    removeEventListener(name, handler) { this.events.get(name)?.delete(handler); }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    set src(value) {
      this.attributes.src = value;
      if (!state.hangImages) queueMicrotask(() => {
        const event = state.imageError === this.id ? 'error' : 'load';
        for (const handler of [...(this.events.get(event) || [])]) handler();
      });
    }
    get src() { return this.attributes.src; }
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    assert(!elements.has(match[1]), `ID duplicado: ${match[1]}`);
    elements.set(match[1], new Element(match[1]));
  }
  const fixtures = {
    quote: {quote:'Test quote', author:'Test author'},
    dog: {status:'success', message:'https://images.example.test/dog.jpg'},
    cat: {id:'test-cat', url:'https://cataas.com/cat/test-cat'},
    fact: {text:'Test fact'}
  };
  const context = vm.createContext({
    URL, AbortController, DOMException,
    console: {warn() {}},
    document: {getElementById(id) {
      assert(elements.has(id), `Elemento inexistente: ${id}`); return elements.get(id);
    }},
    window: {
      setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
      clearTimeout(id) { timers.delete(id); }
    },
    async fetch(url, config) {
      const name = url.includes('dummyjson') ? 'quote' : url.includes('dog.ceo') ? 'dog' : url.includes('cataas') ? 'cat' : 'fact';
      calls.push({name, url, config});
      assert.equal(config.method, 'GET');
      assert.equal(config.cache, 'no-store');
      if (state.reject === name) throw new TypeError('Failed to fetch');
      if (state.pause === name) return await new Promise((resolve, reject) => {
        state.resume = resolve;
        config.signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')), {once:true});
      });
      return {ok:state.httpError !== name, status:state.httpError === name ? 503 : 200,
        async json() {
          if (state.badJson === name) throw new SyntaxError('Invalid JSON');
          return state.payload?.[name] ?? fixtures[name];
        }
      };
    }
  });
  vm.runInContext(source, context);
  return {context, elements, state, calls, timers, get:id=>elements.get(id)};
}

const checks = [];
async function test(name, callback) {
  await callback(); checks.push(name); console.log('PASS ' + name);
}

(async () => {
  await test('Carga inicial: cuatro consultas y cuatro contenidos visibles', async () => {
    const h = harness(); await flush();
    assert.equal(h.calls.length, 4);
    for (const name of ['quote','dog','cat','fact']) {
      assert.equal(h.get(`${name}-content`).hidden, false);
      assert.equal(h.get(`${name}-button`).disabled, false);
      assert.equal(h.get(`${name}-card`).attributes['aria-busy'], 'false');
    }
    assert.equal(h.timers.size, 0);
  });
  await test('Cada clic consulta solo su API y conserva las otras tarjetas', async () => {
    const h = harness(); await flush();
    for (const [name,fn] of [['quote','obtenerCita'],['dog','mostrarPerro'],['cat','mostrarGato'],['fact','mostrarDato']]) {
      const before = h.calls.length;
      const others = [...h.elements].filter(([id])=>!id.startsWith(`${name}-`)).map(([id,e])=>[id,e.textContent,e.hidden,e.disabled,e.src]);
      await h.context[fn]();
      assert.equal(h.calls.length, before+1); assert.equal(h.calls.at(-1).name, name);
      assert.deepEqual([...h.elements].filter(([id])=>!id.startsWith(`${name}-`)).map(([id,e])=>[id,e.textContent,e.hidden,e.disabled,e.src]), others);
    }
  });
  await test('Cargando y boton bloqueado hasta finalizar; doble llamada ignorada', async () => {
    const h = harness({pause:'quote'}); await flush();
    assert.equal(h.get('quote-status').textContent, 'Cargando\u2026');
    assert.equal(h.get('quote-button').disabled, true);
    assert.equal(h.get('dog-button').disabled, false);
    await h.context.obtenerCita(); assert.equal(h.calls.filter(c=>c.name==='quote').length, 1);
    h.state.resume({ok:true,json:async()=>({quote:'New',author:'Author'})}); await flush();
    assert.equal(h.get('quote-button').disabled, false);
    assert.equal(h.get('quote-content').hidden, false);
  });
  await test('Fallo de red aislado y reintento exitoso', async () => {
    const h = harness({reject:'quote'}); await flush();
    assert(h.get('quote-card').classes.has('has-error'));
    assert.match(h.get('quote-status').textContent, /conexi/);
    assert.equal(h.get('quote-button').disabled, false);
    for (const name of ['dog','cat','fact']) assert.equal(h.get(`${name}-content`).hidden, false);
    h.state.reject = null; await h.context.obtenerCita();
    assert.equal(h.get('quote-status').textContent, '');
    assert(!h.get('quote-card').classes.has('has-error'));
  });
  await test('HTTP 503, JSON invalido y campos faltantes se controlan', async () => {
    for (const options of [{httpError:'fact'},{badJson:'fact'},{payload:{fact:{}}}]) {
      const h = harness(options); await flush();
      assert(h.get('fact-card').classes.has('has-error'));
      assert.equal(h.get('fact-button').disabled, false);
      assert.equal(h.get('fact-content').hidden, true);
    }
  });
  await test('Error de imagen y estado de Dog CEO se controlan', async () => {
    for (const options of [{imageError:'dog-image'},{payload:{dog:{status:'error'}}}]) {
      const h = harness(options); await flush();
      assert(h.get('dog-card').classes.has('has-error'));
      assert.equal(h.get('dog-button').disabled, false);
    }
  });
  await test('CATAAS admite url absoluta, relativa, id y _id', async () => {
    for (const [payload,url] of [[{url:'https://cataas.com/cat/a'},'https://cataas.com/cat/a'],[{url:'/cat/b'},'https://cataas.com/cat/b'],[{id:'a b'},'https://cataas.com/cat/a%20b'],[{_id:'legacy'},'https://cataas.com/cat/legacy']]) {
      const h = harness({payload:{cat:payload}}); await flush();
      assert.equal(h.get('cat-image').src, url);
      assert.equal(h.get('cat-content').hidden, false);
    }
  });
  await test('Tiempo de espera libera el boton de la consulta', async () => {
    const h = harness({pause:'quote'}); await flush();
    for (const callback of [...h.timers.values()]) callback(); await flush();
    assert.match(h.get('quote-status').textContent, /demasiado/);
    assert.equal(h.get('quote-button').disabled, false);
  });
  await test('Tiempo de espera de imagen libera botones y listeners', async () => {
    const h = harness({hangImages:true}); await flush();
    assert.equal(h.get('cat-button').disabled, true);
    for (const callback of [...h.timers.values()]) callback(); await flush();
    for (const name of ['dog','cat']) {
      assert.equal(h.get(`${name}-button`).disabled, false);
      assert(h.get(`${name}-card`).classes.has('has-error'));
      assert.equal(h.get(`${name}-image`).events.get('load').size, 0);
    }
  });
  await test('Validacion de URLs y contenido externo como texto', async () => {
    const h = harness({payload:{quote:{quote:'<script>alert(1)</script>',author:'Author'},cat:{url:'javascript:alert(1)'}}}); await flush();
    assert.equal(h.get('quote-text').textContent, '<script>alert(1)</script>');
    assert(h.get('cat-card').classes.has('has-error'));
    assert(!source.includes('innerHTML'));
  });
  console.log(`\n${checks.length} grupos de pruebas correctos. Estas pruebas no verifican red real, CORS ni apariencia visual.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
