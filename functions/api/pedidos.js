// functions/api/pedidos.js
// Registra pedidos en Cloudflare D1

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { cliente, items } = body;

    // Validar que vengan datos
    if (!cliente || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Datos incompletos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar stock de cada producto antes de procesar
    for (const item of items) {
      const prod = await env.elegance_db
        .prepare('SELECT stock FROM productos WHERE id = ? AND activo = 1')
        .bind(item.id)
        .first();

      if (!prod) {
        return new Response(
          JSON.stringify({ error: `Producto ${item.id} no encontrado` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (prod.stock < item.cantidad) {
        return new Response(
          JSON.stringify({ error: `Stock insuficiente para ${item.nombre}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generar ID de pedido con prefijo EJ-
    const ts = Date.now();
    const idPedido = `EJ-${ts}`;
    const fecha = new Date().toLocaleDateString('en-US'); // MM/DD/YYYY

    // Calcular totales
    let subtotal = 0;
    let itbmsTotal = 0;

    const detalles = items.map(item => {
      const precioBase  = parseFloat(item.precio_base);
      const itbmsPct    = parseFloat(item.itbms_pct) || 0;
      const itbmsMonto  = parseFloat(((precioBase * itbmsPct) / 100).toFixed(2));
      const precioFinal = parseFloat((precioBase + itbmsMonto).toFixed(2));
      const subItem     = parseFloat((precioFinal * item.cantidad).toFixed(2));

      subtotal   += parseFloat((precioBase * item.cantidad).toFixed(2));
      itbmsTotal += parseFloat((itbmsMonto * item.cantidad).toFixed(2));

      return {
        id_pedido:       idPedido,
        id_producto:     item.id,
        nombre_producto: item.nombre,
        cantidad:        item.cantidad,
        precio_base:     precioBase,
        itbms_pct:       itbmsPct,
        itbms_monto:     itbmsMonto,
        precio_final:    precioFinal,
        subtotal:        subItem,
      };
    });

    const total = parseFloat((subtotal + itbmsTotal).toFixed(2));

    // Insertar pedido + detalles + descontar stock en una sola transacción
    const stmts = [];

    // Insertar pedido principal
    stmts.push(
      env.elegance_db
        .prepare(`
          INSERT INTO pedidos
            (id_pedido, fecha, cliente_nombre, cliente_email, cliente_tel, direccion,
             subtotal, itbms_total, total, estado)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
        `)
        .bind(
          idPedido, fecha,
          cliente.nombre, cliente.email, cliente.telefono, cliente.direccion,
          subtotal, itbmsTotal, total
        )
    );

    // Insertar cada línea de detalle y descontar stock
    for (const d of detalles) {
      stmts.push(
        env.elegance_db
          .prepare(`
            INSERT INTO detalle_pedidos
              (id_pedido, id_producto, nombre_producto, cantidad,
               precio_base, itbms_pct, itbms_monto, precio_final, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            d.id_pedido, d.id_producto, d.nombre_producto, d.cantidad,
            d.precio_base, d.itbms_pct, d.itbms_monto, d.precio_final, d.subtotal
          )
      );

      stmts.push(
        env.elegance_db
          .prepare('UPDATE productos SET stock = stock - ? WHERE id = ?')
          .bind(d.cantidad, d.id_producto)
      );
    }

    // Ejecutar todo como batch atómico
    await env.elegance_db.batch(stmts);

    return new Response(
      JSON.stringify({ ok: true, id_pedido: idPedido, total }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Error al registrar pedido', detalle: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}