// functions/api/pedidos.js
// Registra pedidos en Cloudflare D1
// CORRECCIÓN: Ahora acepta 'items' o 'productos' para evitar el error 400

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    
    // EXTRAEMOS AMBOS POSIBLES NOMBRES
    const { cliente, items, productos } = body;
    
    // USAMOS EL QUE NO VENGA VACÍO
    const listaArticulos = items || productos;

    // VALIDACIÓN MEJORADA
    if (!cliente || !listaArticulos || listaArticulos.length === 0) {
      return new Response(
        JSON.stringify({ 
            error: 'Datos incompletos', 
            detalle: 'Se esperaba "items" o "productos" y "cliente"' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar stock antes de procesar usando el binding 'elegance_db'
    for (const item of listaArticulos) {
      const prod = await env.elegance_db
        .prepare('SELECT stock FROM productos WHERE id = ? AND activo = 1')
        .bind(item.id)
        .first();

      if (!prod) {
        return new Response(
          JSON.stringify({ success: false, error: `Producto ${item.id} no encontrado` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (prod.stock < item.cantidad) {
        return new Response(
          JSON.stringify({ success: false, error: `Stock insuficiente para ${item.nombre}. Disponible: ${prod.stock}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generar ID y fecha
    const ts       = Date.now();
    const idPedido = `EJ-${ts}`;
    const fecha    = new Date().toLocaleDateString('en-US'); 

    // Calcular totales
    let subtotal   = 0;
    let itbmsTotal = 0;

    const detalles = listaArticulos.map(item => {
      const precioBase  = parseFloat(item.precioBase  ?? item.precio_base  ?? 0);
      const itbmsPct    = parseFloat(item.itbmsPorc   ?? item.itbms_pct    ?? 0);
      const itbmsMonto  = parseFloat(item.itbmsMonto  ?? ((precioBase * itbmsPct) / 100));
      const precioFinal = parseFloat(item.precioFinal ?? (precioBase + itbmsMonto));
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
        itbms_monto:     parseFloat(itbmsMonto.toFixed(2)),
        precio_final:    parseFloat(precioFinal.toFixed(2)),
        subtotal:        subItem,
      };
    });

    const total = parseFloat((subtotal + itbmsTotal).toFixed(2));

    const stmts = [];

    // Insertar Pedido Principal
    stmts.push(
      env.elegance_db
        .prepare(`
          INSERT INTO pedidos
            (id_pedido, fecha, cliente_nombre, cliente_email, cliente_tel,
             direccion, subtotal, itbms_total, total, estado)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
        `)
        .bind(
          idPedido, fecha,
          cliente.nombre, cliente.email,
          cliente.telefono || cliente.tel || '',
          cliente.direccion || '',
          parseFloat(subtotal.toFixed(2)),
          parseFloat(itbmsTotal.toFixed(2)),
          total
        )
    );

    // Insertar detalles y actualizar stock
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

    await env.elegance_db.batch(stmts);

    return new Response(
      JSON.stringify({
        success: true,
        id_pedido: idPedido,
        pedido: { idPedido, total, itbms: parseFloat(itbmsTotal.toFixed(2)) }
      }),
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
      JSON.stringify({ success: false, error: err.message }),
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