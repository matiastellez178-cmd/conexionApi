# Verificación del proyecto

## Resultado

El código JavaScript pasa la revisión de sintaxis y los diez grupos de pruebas automatizadas de lógica. La estructura contiene las cuatro secciones, sus botones y los archivos separados de HTML, CSS y JavaScript.

**Esta revisión todavía no acredita el funcionamiento completo en un navegador con las APIs reales. Las dos capturas exigidas siguen pendientes.**

## Comprobaciones ejecutadas

Comandos:

```sh
node --check js/app.js
node tests/verify.cjs
```

| Comprobación automatizada | Resultado |
| --- | --- |
| Inicio de cuatro consultas independientes | Correcto |
| Cada clic solicita solo su API y conserva las otras tarjetas | Correcto |
| Mensaje Cargando… y bloqueo de botón hasta finalizar | Correcto |
| Prevención de solicitudes duplicadas mientras el botón está bloqueado | Correcto |
| Fallo de red aislado y recuperación al reintentar | Correcto |
| HTTP 503, JSON inválido y campos faltantes | Correcto |
| Error al descargar imagen y estado fallido de Dog CEO | Correcto |
| CATAAS con URL absoluta, relativa, id o _id | Correcto |
| Tiempo de espera de consulta o imagen y liberación de botones | Correcto |
| Limpieza de listeners después de cancelar imágenes | Correcto |
| Rechazo de URLs de imagen que no usan HTTPS | Correcto |
| Uso de textContent para textos externos | Correcto |

Los casos se agrupan en diez pruebas. Las respuestas simuladas se encuentran solo en `tests/verify.cjs`; no sustituyen los servicios en `js/app.js`.

## Revisión del código

- `fetch` con método GET, `async/await`, validación de `response.ok` y procesamiento JSON.
- Función independiente para cada API.
- `try/catch/finally` común con estado individual por tarjeta.
- Imágenes con textos alternativos, tamaños uniformes y `object-fit: contain`.
- CSS con dos columnas en escritorio y una columna a 740 px o menos.
- HTML con `lang`, viewport, encabezados, mensajes accesibles y estados `aria-busy`.
- Archivos revisados como UTF-8 sin caracteres de sustitución.
- README con instrucciones y las cinco respuestas de reflexión.

## Pendiente de verificar visualmente

La herramienta del navegador bloqueó la apertura de la dirección `file:///.../index.html` porque solo admite HTTP y HTTPS. No se intentó eludir esa restricción. Para continuar con la prueba visual se necesita abrir el proyecto desde un servidor HTTP local y disponer de una pestaña accesible por el navegador conectado.

Queda pendiente comprobar las respuestas reales en ese navegador, las restricciones CORS, la carga real de ambas imágenes, el diseño en escritorio y teléfono y guardar las capturas de éxito y error. El README explica cómo obtenerlas. No hay capturas de éxito fabricadas en esta entrega.

También se intentó consultar los cuatro endpoints mediante solicitudes HTTP desde la terminal. Los cuatro intentos terminaron con `getaddrinfo failed` (fallo de resolución de nombres en este entorno). Ese resultado no demuestra un fallo de los servicios ni permite afirmar que las integraciones ya funcionaron en vivo.
