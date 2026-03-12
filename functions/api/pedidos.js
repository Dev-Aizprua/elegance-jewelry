// functions/api/pedidos.js — Cloudflare Pages Function
// Elegance Jewelry

const DOMINIOS_PERMITIDOS = [
  'https://elegance-jewelry.pages.dev',
  'http://localhost:3000'
];

function getCORSHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = DOMINIOS_PERMITIDOS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

const toBase64url = (str) =>
  btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header  = toBase64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now
  }));
  const signingInput = `${header}.${payload}`;
  const pemKey = credentials.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryStr = atob(pemKey);
  const keyData = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) keyData[i] = binaryStr.charCodeAt(i);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false, ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' }, cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sigArray = new Uint8Array(signatureBuffer);
  let sigStr = '';
  for (let i = 0; i < sigArray.length; i++) sigStr += String.fromCharCode(sigArray[i]);
  const signature = btoa(sigStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const jwt = `${signingInput}.${signature}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

function getHoraPanama() {
  return new Date().toLocaleString('es-PA', {
    timeZone: 'America/Panama',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export async function onRequestPost({ request, env }) {
  const corsHeaders = getCORSHeaders(request);
  try {
    const body = await request.json();
    const { cliente, productos } = body;

    if (!cliente?.nombre || !cliente?.email || !cliente?.telefono || !cliente?.direccion) {
      return new Response(
        JSON.stringify({ success: false, error: 'Datos del cliente incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!productos || productos.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No hay productos en el pedido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
    const token = await getAccessToken(credentials);
    const SHEET_ID = env.SHEET_ID;

    // Verificar y descontar stock
    const stockUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Productos!A2:K100`;
    const stockRes = await fetch(stockUrl, { headers: { Authorization: `Bearer ${token}` } });
    const stockData = await stockRes.json();
    const filas = stockData.values || [];

    const actualizaciones = [];
    for (const item of productos) {
      const idx = filas.findIndex(f => f[0] === item.id);
      if (idx === -1) throw new Error(`Producto no encontrado: ${item.id}`);
      const stockActual = parseInt(filas[idx][6]) || 0;
      if (stockActual < item.cantidad) {
        throw new Error(`AGOTADO: "${item.nombre}" solo tiene ${stockActual} disponible`);
      }
      actualizaciones.push({ fila: idx + 2, nuevoStock: stockActual - item.cantidad });
    }

    // Descontar stock
    for (const act of actualizaciones) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Productos!G${act.fila}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [[act.nuevoStock]] })
        }
      );
    }

    // Calcular totales
    let subtotal = 0, itbmsTotal = 0;
    productos.forEach(item => {
      subtotal    += item.precioBase  * item.cantidad;
      itbmsTotal  += item.itbmsMonto  * item.cantidad;
    });
    const total = subtotal + itbmsTotal;

    // Generar ID pedido — EJ- para Elegance Jewelry
    const ts = Date.now().toString().slice(-6);
    const idPedido = `EJ-${ts}`;
    const fechaHora = getHoraPanama();

    // Registrar en hoja Pedidos
    // Orden: Fecha, ID Pedido, Cliente, Email, Teléfono, Dirección, Subtotal, ITBMS, Total, Estado
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Pedidos!A:J:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [[
            fechaHora,
            idPedido,
            cliente.nombre,
            cliente.email,
            cliente.telefono,
            cliente.direccion,
            subtotal.toFixed(2),
            itbmsTotal.toFixed(2),
            total.toFixed(2),
            'Pendiente'
          ]]
        })
      }
    );

    // Registrar en hoja DetallePedidos — una fila por producto
    // Orden: ID Pedido, ID Producto, Nombre Producto, Cantidad, Precio Base, ITBMS%, ITBMS Monto, Precio Final, Subtotal
    const filasDetal = productos.map(p => [
      idPedido,
      p.id,
      p.nombre,
      p.cantidad,
      p.precioBase.toFixed(2),
      p.itbmsPorc,
      p.itbmsMonto.toFixed(2),
      p.precioFinal.toFixed(2),
      (p.precioFinal * p.cantidad).toFixed(2)
    ]);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/DetallePedidos!A:I:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: filasDetal })
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        pedido: {
          id: idPedido,
          fecha: fechaHora,
          subtotal: parseFloat(subtotal.toFixed(2)),
          itbms:    parseFloat(itbmsTotal.toFixed(2)),
          total:    parseFloat(total.toFixed(2))
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 200, headers: getCORSHeaders(request) });
}