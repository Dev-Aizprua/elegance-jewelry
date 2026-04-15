// functions/api/productos.js
// Lee productos desde Cloudflare D1
// Devuelve el formato exacto que espera app.js

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.elegance_db
      .prepare(`
        SELECT id, nombre, descripcion, precio_base, categoria,
               imagen_url, stock, itbms_pct, destacado
        FROM productos
        WHERE activo = 1
        ORDER BY categoria, nombre
      `)
      .all();

    // Mapear campos D1 → nombres que espera app.js
    const productos = results.map(p => {
      const itbmsMonto  = parseFloat(((p.precio_base * p.itbms_pct) / 100).toFixed(2));
      const precioFinal = parseFloat((p.precio_base + itbmsMonto).toFixed(2));
      return {
        id:          p.id,
        nombre:      p.nombre,
        descripcion: p.descripcion,
        precio_base: p.precio_base,   // para compatibilidad
        precioBase:  p.precio_base,   // nombre que usa app.js en carrito
        precioFinal: precioFinal,     // precio con ITBMS incluido
        itbmsPorc:   p.itbms_pct,     // nombre que usa app.js
        itbmsMonto:  itbmsMonto,      // monto calculado
        categoria:   p.categoria,
        imagen:      p.imagen_url,    // app.js usa p.imagen
        imagen_url:  p.imagen_url,    // alias por compatibilidad
        stock:       p.stock,
        destacado:   p.destacado === 1,
      };
    });

    return new Response(
      JSON.stringify({ success: true, productos }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}