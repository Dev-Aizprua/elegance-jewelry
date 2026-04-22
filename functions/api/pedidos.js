// ============================================================
// functions/api/pedidos.js
// TIENDA — elegance-jewelry
// POST /api/pedidos → crear pedido con estado "pendiente"
// GET  /api/pedido?id=EJ-xxx&key=token → estado para el cliente
// ============================================================

// ── Generar token único ────────────────────────────────────
function generarToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ── Datos de pago que se muestran al cliente ───────────────
function getDatosPago(metodo) {
  const datos = {
    yappy: {
      titulo: 'Pago por Yappy',
      numero: '6016-4559',
      nombre: 'Elegance Jewelry',
      instruccion: 'Envía el monto exacto al número Yappy indicado y adjunta el comprobante por WhatsApp.',
    },
    transferencia: {
      titulo: 'Transferencia Bancaria',
      banco: 'Banco Nacional de Panamá',
      cuenta: '04-23-01-123456-7',
      titular: 'Elegance Jewelry S.A.',
      instruccion: 'Realiza la transferencia e incluye el número de pedido en el concepto. Adjunta el comprobante por WhatsApp.',
    },
  };
  return datos[metodo] || datos.yappy;
}

// ── POST — Crear pedido ────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { cliente, productos: items, metodo_pago = 'yappy' } = body;

    // Validar campos
    if (!cliente || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Datos incompletos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['yappy', 'transferencia'].includes(metodo_pago)) {
      return new Response(
        JSON.stringify({ error: 'Método de pago no válido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar stock de todos los productos
    for (const item of items) {
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

    // Calcular totales
    const ts       = Date.now();
    const idPedido = `EJ-${ts}`;
    const fecha    = new Date().toLocaleDateString('en-US');
    const token    = generarToken();

    let subtotal   = 0;
    let itbmsTotal = 0;

    const detalles = items.map(item => {
      const precioBase  = parseFloat(item.precioBase  ?? item.precio_base  ?? 0);
      const itbmsPct    = parseFloat(item.itbmsPorc   ?? item.itbms_pct    ?? 0);
      const itbmsMonto  = parseFloat(item.itbmsMonto  ?? ((precioBase * itbmsPct) / 100));
      const precioFinal = parseFloat(item.precioFinal ?? (precioBase + itbmsMonto));
      const subItem     = parseFloat((precioFinal * item.cantidad).toFixed(2));

      subtotal   += parseFloat((precioBase  * item.cantidad).toFixed(2));
      itbmsTotal += parseFloat((itbmsMonto  * item.cantidad).toFixed(2));

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
    const datosPago = getDatosPago(metodo_pago);

    // ── Batch atómico ──────────────────────────────────────
    const stmts = [];

    // Insertar pedido con estado_pago = 'pendiente'
    stmts.push(
      env.elegance_db.prepare(`
        INSERT INTO pedidos
          (id_pedido, fecha, cliente_nombre, cliente_email, cliente_tel,
           direccion, subtotal, itbms_total, total, estado,
           estado_pago, metodo_pago, token_vista, datos_pago, correo_enviado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente',
                'pendiente', ?, ?, ?, 0)
      `).bind(
        idPedido, fecha,
        cliente.nombre, cliente.email,
        cliente.telefono || cliente.tel || '',
        cliente.direccion || '',
        parseFloat(subtotal.toFixed(2)),
        parseFloat(itbmsTotal.toFixed(2)),
        total,
        metodo_pago,
        token,
        JSON.stringify(datosPago)
      )
    );

    // Insertar detalles y descontar stock
    for (const d of detalles) {
      stmts.push(
        env.elegance_db.prepare(`
          INSERT INTO detalle_pedidos
            (id_pedido, id_producto, nombre_producto, cantidad,
             precio_base, itbms_pct, itbms_monto, precio_final, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          d.id_pedido, d.id_producto, d.nombre_producto, d.cantidad,
          d.precio_base, d.itbms_pct, d.itbms_monto, d.precio_final, d.subtotal
        )
      );

      // Descontar stock inmediatamente (reserva de inventario)
      stmts.push(
        env.elegance_db
          .prepare('UPDATE productos SET stock = stock - ? WHERE id = ?')
          .bind(d.cantidad, d.id_producto)
      );
    }

    await env.elegance_db.batch(stmts);

    // URL de seguimiento para el cliente
    const origin = new URL(request.url).origin;
    const urlSeguimiento = `${origin}/pedido?id=${idPedido}&key=${token}`;

    return new Response(
      JSON.stringify({
        success:    true,
        id_pedido:  idPedido,
        token:      token,
        url_seguimiento: urlSeguimiento,
        metodo_pago,
        datos_pago: datosPago,
        total:      total,
        subtotal:   parseFloat(subtotal.toFixed(2)),
        itbms:      parseFloat(itbmsTotal.toFixed(2)),
        pedido: {
          idPedido,
          total,
          itbms:    parseFloat(itbmsTotal.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
        }
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

// ── GET — Estado del pedido para el cliente ────────────────
export async function onRequestGet(context) {
  const { request, env } = context;
  const url     = new URL(request.url);
  const idPedido = url.searchParams.get('id');
  const token   = url.searchParams.get('key');

  if (!idPedido || !token) {
    return new Response(
      JSON.stringify({ success: false, error: 'Parámetros requeridos' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const pedido = await env.elegance_db.prepare(`
      SELECT p.id_pedido, p.fecha, p.cliente_nombre, p.estado,
             p.estado_pago, p.metodo_pago, p.datos_pago,
             p.subtotal, p.itbms_total, p.total, p.token_vista,
             p.aprobado_at, p.cancelado_at,
             json_group_array(json_object(
               'nombre_producto', dp.nombre_producto,
               'cantidad',        dp.cantidad,
               'precio_final',    dp.precio_final,
               'subtotal',        dp.subtotal
             )) AS detalle
      FROM pedidos p
      LEFT JOIN detalle_pedidos dp ON dp.id_pedido = p.id_pedido
      WHERE p.id_pedido = ? AND p.token_vista = ?
      GROUP BY p.id_pedido
    `).bind(idPedido, token).first();

    if (!pedido) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pedido: {
          ...pedido,
          detalle:    JSON.parse(pedido.detalle || '[]'),
          datos_pago: JSON.parse(pedido.datos_pago || '{}'),
        }
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
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
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}