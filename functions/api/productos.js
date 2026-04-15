// functions/api/productos.js
// Lee productos desde Cloudflare D1

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

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Error al obtener productos', detalle: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}