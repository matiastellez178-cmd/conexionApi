# Explorador de contenido aleatorio

**Materia:** Programación Web III  
**Integrante:** Sergio Aguilera Pantoja

Página creada con HTML, CSS y JavaScript. Consulta cuatro APIs públicas y actualiza cada tarjeta de forma independiente, sin recargar la página. No requiere base de datos, cuentas, claves de API ni paquetes de instalación.

## Ejecución

1. Extraer el ZIP completo conservando las carpetas `css`, `js` y `tests`.
2. Abrir una terminal en la carpeta donde está `index.html`.
3. Si Python está instalado, ejecutar `python -m http.server 8080 --bind 127.0.0.1`.
4. Abrir <http://127.0.0.1:8080> en Chrome, Edge o Firefox.
5. Mantener la terminal abierta. Usar `Ctrl+C` para detener el servidor.

Como alternativa se puede abrir la carpeta con Visual Studio Code y utilizar Live Server. Se necesita Internet para obtener las respuestas y las imágenes. Se recomienda servir por HTTP local en lugar de abrir `index.html` como archivo.

## Organización

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura semántica de las cuatro tarjetas y sus botones. |
| `css/styles.css` | Diseño, tamaños uniformes, imágenes sin deformación y adaptación a teléfonos. |
| `js/app.js` | Consultas HTTP, procesamiento de JSON y actualización del contenido. |
| `tests/verify.cjs` | Verificación automatizada de la lógica con respuestas simuladas, sin dependencias. |
| `VERIFICACION.md` | Alcance y resultados de la revisión. |

## Funcionamiento

- `obtenerCita()`, `mostrarPerro()`, `mostrarGato()` y `mostrarDato()` son funciones independientes con `async/await`.
- Al ingresar se lanzan las cuatro funciones sin que una tenga que esperar a las otras.
- Cada solicitud muestra **Cargando…**, oculta temporalmente el contenido anterior y bloquea únicamente su botón.
- Se comprueba `response.ok`, se validan los campos necesarios y se manejan errores con `try/catch`.
- `finally` habilita el botón tanto si hubo éxito como si ocurrió un error.
- Los botones de perros y gatos se habilitan después de cargar la imagen, no solo después de obtener su JSON.
- Un límite de 20 segundos cancela consultas o cargas de imágenes que no terminan.
- `cache: "no-store"` solicita contenido nuevamente en cada clic. Es válido que el servicio devuelva un resultado repetido.
- Las imágenes tienen texto alternativo, un contenedor del mismo tamaño y `object-fit: contain`.
- Se utiliza `textContent` para mostrar los textos externos sin interpretarlos como HTML.

## Respuestas de reflexión

### 1. ¿Qué es un endpoint y cuál utilizaste para cada API?

Un endpoint es una dirección concreta de una API a la que el cliente envía una solicitud para consultar un recurso o realizar una operación. En este proyecto se utiliza el método GET para los cuatro servicios:

| Sección | Endpoint | Campos utilizados |
| --- | --- | --- |
| Citas | <https://dummyjson.com/quotes/random> | `quote` y `author` |
| Perros | <https://dog.ceo/api/breeds/image/random> | `message` y `status` |
| Gatos | <https://cataas.com/cat?json=true> | `url`; como alternativa, `id` o `_id` |
| Datos curiosos | <https://uselessfacts.jsph.pl/api/v2/facts/random?language=en> | `text` |

Antes de implementar gatos se inspeccionó una respuesta de CATAAS: contenía `id`, `tags`, `created_at`, `url` y `mimetype`. La aplicación usa la URL recibida; si falta, construye `https://cataas.com/cat/{id}` con el identificador. También admite URLs relativas a `https://cataas.com`.

### 2. ¿Qué diferencia existe entre recibir JSON y recibir directamente una imagen?

JSON es texto con datos estructurados, como propiedades, objetos y listas. Después de procesarlo podemos acceder, por ejemplo, a `data.author` o `data.url`. Una imagen es un archivo binario que el navegador puede mostrar con la etiqueta `img`. No se debe usar `response.json()` con una respuesta que contiene directamente una imagen, porque no es un documento JSON válido. En CATAAS primero se consulta `/cat?json=true` y luego el navegador carga la dirección recibida mediante `img.src`.

### 3. ¿Qué función cumplen await y response.json()?

`await` permite esperar a que una promesa se resuelva dentro de una función asíncrona, sin bloquear toda la interfaz. Se utiliza para esperar la respuesta de `fetch` y después el procesamiento de su cuerpo. `response.json()` lee el cuerpo de la respuesta e interpreta el JSON como un valor de JavaScript. Esta operación también devuelve una promesa, por lo que se espera con `await`. Si el contenido no tiene un formato válido, puede producir un error.

### 4. ¿Por qué se debe verificar response.ok además de utilizar try/catch?

`fetch` puede resolver normalmente aunque el servidor responda con un error HTTP como 404 o 500. Por eso un `try/catch` por sí solo no detecta todos los fallos de HTTP. `response.ok` indica si el estado está entre 200 y 299; cuando es falso se lanza un error para que lo maneje `catch`. Este bloque también controla problemas de red, JSON inválido, datos incompletos y errores al cargar imágenes. Finalmente se habilita el botón para permitir reintentar.

### 5. ¿Cómo lograste actualizar una sección sin recargar toda la página?

Cada botón tiene un listener de `click` que llama únicamente a la función de su sección. `fetch` obtiene el contenido de forma asíncrona y después se modifican elementos específicos del DOM mediante sus identificadores. Para citas y datos se actualiza `textContent`; para imágenes, `src`. No se envía un formulario ni se cambia la ubicación de la página. Los mensajes, el botón y el contenido de cada tarjeta se controlan por separado, por lo que un fallo no detiene las otras secciones.

## Pruebas automatizadas

Si Node.js está instalado, ejecutar:

```sh
node tests/verify.cjs
```

Las respuestas simuladas existen únicamente en las pruebas. El JavaScript de la página consulta las APIs reales y no contiene citas ni imágenes de prueba para sustituirlas. Las pruebas de lógica no acreditan conectividad real, CORS ni diseño visual.

## Capturas solicitadas para la entrega

**Estado: pendientes de captura real en navegador.**

1. Con Internet, abrir la página y esperar a que las cuatro tarjetas muestren contenido. Guardar la captura como `01_cuatro_secciones.png`.
2. En las herramientas de desarrollo del navegador, pestaña Network, seleccionar temporalmente Offline. Sin recargar la página, pulsar un solo botón. Comprobar que aparece un mensaje comprensible, el botón se vuelve a habilitar y las otras tarjetas conservan su contenido. Guardar como `02_error_controlado.png`.
3. Volver a No throttling u Online y pulsar el mismo botón para comprobar que se recupera.

La emulación Offline debe restaurarse al finalizar. También puede simularse el fallo desconectando temporalmente Internet. No se incluyen capturas fabricadas ni se presentan las pruebas simuladas como si fueran consultas reales.

## Documentación

- DummyJSON: <https://dummyjson.com/docs/quotes>
- Dog CEO: <https://dog.ceo/dog-api/documentation/random>
- CATAAS: <https://cataas.com/>
- Useless Facts: <https://uselessfacts.jsph.pl/>
