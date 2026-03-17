// ============================================================
// app.js — Lógica de la tienda (NO editar)
// ============================================================

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let productos = [];
let carrito = [];
let ultimoPedido = null;
let categoriaActiva = null;
let categorias = [];

const carritoIconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61l9.72 0a2 2 0 0 0 2-1.61L23 6 6 6"/></svg>';
const whatsappIconSVG = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.467c-2.482 0-4.908-0.646-7.07-1.87l-0.507-0.292-5.245 1.407 1.417-5.268-0.321-0.525c-1.331-2.197-2.034-4.736-2.034-7.371 0-7.585 6.172-13.757 13.757-13.757s13.757 6.172 13.757 13.757c0 7.585-6.172 13.757-13.757 13.757zM23.314 19.419c-0.411-0.205-2.432-1.201-2.809-1.339s-0.651-0.205-0.925 0.205c-0.274 0.411-1.061 1.339-1.301 1.613s-0.479 0.308-0.89 0.103c-0.411-0.205-1.735-0.641-3.304-2.041-1.221-1.091-2.046-2.439-2.286-2.85s-0.026-0.632 0.18-0.837c0.185-0.185 0.411-0.479 0.616-0.719s0.274-0.411 0.411-0.685 0.068-0.514-0.034-0.719c-0.103-0.205-0.925-2.229-1.268-3.053-0.334-0.802-0.673-0.693-0.925-0.706-0.239-0.012-0.514-0.015-0.788-0.015s-0.719 0.103-1.096 0.514c-0.377 0.411-1.441 1.407-1.441 3.433s1.475 3.983 1.681 4.257c0.205 0.274 2.906 4.435 7.04 6.218 0.983 0.425 1.751 0.679 2.349 0.87 0.994 0.315 1.898 0.271 2.614 0.164 0.798-0.119 2.432-0.993 2.776-1.952s0.342-1.782 0.239-1.952c-0.103-0.171-0.377-0.274-0.788-0.479z"/></svg>';

// ── Inicialización ──────────────────────────────────────────
window.onload = function() {
  // Aplicar datos de EMPRESA al HTML
  document.title = EMPRESA.nombre + ' - ' + EMPRESA.slogan;
  document.getElementById('loadingText').textContent = EMPRESA.nombre;
  document.getElementById('headerNombre').textContent = EMPRESA.nombre;
  document.getElementById('headerSlogan').textContent = EMPRESA.slogan;
  document.getElementById('heroTag').textContent = EMPRESA.heroTag;
  document.getElementById('heroTitulo').textContent = EMPRESA.heroTitulo;
  document.getElementById('heroSlogan').textContent = EMPRESA.slogan;
  document.getElementById('footerNombre').textContent = EMPRESA.nombre;
  document.getElementById('footerSlogan').textContent = EMPRESA.slogan;
  document.getElementById('footerDireccion').textContent = EMPRESA.direccion;
  document.getElementById('footerTelefono').textContent = EMPRESA.telefono;
  document.getElementById('whatsappFloat').href =
    'https://wa.me/' + EMPRESA.whatsapp + '?text=' +
    encodeURIComponent('Hola, estoy interesado en sus productos');

  if (EMPRESA.logo) {
    const logoImg = document.getElementById('logoImg');
    if (logoImg) { logoImg.src = EMPRESA.logo; logoImg.style.display = 'block'; }
  }

  cargarProductos();

  document.addEventListener('click', function(e) {
    const fc = document.querySelector('.filter-container');
    if (fc && !fc.contains(e.target)) cerrarFilterDropdown();
  });
};

// ── Productos ───────────────────────────────────────────────
async function cargarProductos() {
  try {
    const response = await fetch('/api/productos');
    const resultado = await response.json();
    if (!resultado.success) { mostrarError('Error: ' + (resultado.error || 'Desconocido')); return; }
    const data = resultado.productos;
    if (!data || data.length === 0) { mostrarError('No se encontraron productos.'); return; }
    productos = data;
    extraerCategorias();
    mostrarProductos();
    generarOpcionesFiltro();
    ocultarCarga();
  } catch (error) {
    mostrarError('Error de conexión: ' + error.message);
  }
}

function extraerCategorias() {
  const s = new Set();
  productos.forEach(p => { if (p.categoria) s.add(p.categoria); });
  // Ordenar según el orden definido en config.js
  categorias = CATEGORIAS_NEGOCIO.filter(c => s.has(c));
  // Agregar categorías que no estén en config pero sí en el sheet
  s.forEach(c => { if (!categorias.includes(c)) categorias.push(c); });
}

function mostrarProductos() {
  const grid = document.getElementById('productosGrid');
  grid.innerHTML = productos.map(p => {
    const agotado = p.stock <= 0;
    const stockBajo = p.stock > 0 && p.stock <= 5;
    const stockClass = agotado ? ' agotado' : (stockBajo ? ' bajo' : '');
    const imgFallback = "this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23f5f0e8%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23C9A84C%22 font-size=%2240%22%3E💍%3C/text%3E%3C/svg%3E'";
    return '<div class="producto-card' + (agotado ? ' producto-agotado' : '') + '" data-categoria="' + p.categoria + '">' +
      (p.destacado && !agotado ? '<div class="destacado-badge">✨ ' + EMPRESA.heroBadge + '</div>' : '') +
      (agotado ? '<div class="agotado-badge">AGOTADO</div>' : '') +
      '<div class="producto-imagen-container">' +
        '<img src="' + p.imagen + '" alt="' + p.nombre + '" class="producto-imagen' + (agotado ? ' imagen-agotado' : '') + '" loading="lazy" onerror="' + imgFallback + '">' +
      '</div>' +
      '<div class="producto-info">' +
        '<div class="producto-categoria">' + p.categoria + '</div>' +
        '<div class="producto-nombre">' + p.nombre + '</div>' +
        '<div class="producto-descripcion">' + p.descripcion + '</div>' +
        '<div class="producto-footer">' +
          '<div class="producto-precio-container">' +
            '<div class="producto-precio">' + (agotado ? '<span class="precio-agotado">$' + fmt(p.precioFinal) + '</span>' : '$' + fmt(p.precioFinal)) + '</div>' +
            '<div class="producto-precio-detalle">' + (p.itbmsPorc > 0 ? 'Incluye ITBMS ' + p.itbmsPorc + '%' : 'Exento de ITBMS') + '</div>' +
            '<div class="producto-stock' + stockClass + '">' +
              (agotado ? '❌ AGOTADO' : (stockBajo ? '🔥 ¡Solo ' + p.stock + '!' : '✓ Stock: ' + p.stock)) +
            '</div>' +
          '</div>' +
          (agotado ?
            '<button class="btn-agregar btn-agotado" disabled>✕</button>' :
            '<button class="btn-agregar" onclick="agregarAlCarrito(\'' + p.id + '\', event)" title="Agregar al carrito">' + carritoIconSVG + '</button>'
          ) +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── Filtros ─────────────────────────────────────────────────
function generarOpcionesFiltro() {
  const dd = document.getElementById('filterDropdown');
  let html = '<div class="filter-option' + (categoriaActiva === null ? ' selected' : '') +
    '" onclick="filtrarPorCategoria(null)"><span class="icon">💎</span><span>Todos los productos</span></div>';
  categorias.forEach(cat => {
    const ic = CATEGORIAS_ICONOS[cat] || CATEGORIAS_ICONOS['default'];
    html += '<div class="filter-option' + (categoriaActiva === cat ? ' selected' : '') +
      '" onclick="filtrarPorCategoria(\'' + cat + '\')"><span class="icon">' + ic + '</span><span>' + cat + '</span></div>';
  });
  dd.innerHTML = html;
}

function toggleFilterDropdown() {
  document.getElementById('filterDropdown').classList.toggle('show');
  document.getElementById('filterBtn').classList.toggle('active');
}
function cerrarFilterDropdown() {
  document.getElementById('filterDropdown').classList.remove('show');
  document.getElementById('filterBtn').classList.remove('active');
}
function filtrarPorCategoria(categoria) {
  categoriaActiva = categoria;
  cerrarFilterDropdown();
  generarOpcionesFiltro();
  const tag = document.getElementById('filterActiveTag');
  if (categoria) {
    document.getElementById('filterActiveText').textContent =
      (CATEGORIAS_ICONOS[categoria] || '📦') + ' ' + categoria;
    tag.style.display = 'inline-flex';
  } else { tag.style.display = 'none'; }
  aplicarFiltro();
}
function clearFilter() { filtrarPorCategoria(null); }
function aplicarFiltro() {
  const cards = document.querySelectorAll('.producto-card');
  let visibles = 0;
  cards.forEach(card => {
    if (categoriaActiva === null || card.getAttribute('data-categoria') === categoriaActiva) {
      card.classList.remove('hidden'); visibles++;
    } else { card.classList.add('hidden'); }
  });
  const nr = document.getElementById('noResults');
  if (nr) nr.remove();
  if (visibles === 0) {
    document.getElementById('productosGrid').innerHTML +=
      '<div id="noResults" class="no-results"><div class="icon">🔍</div>' +
      '<h3>Sin resultados</h3><p>No hay productos en "' + categoriaActiva + '"</p></div>';
  }
}

// ── Carrito ─────────────────────────────────────────────────
function agregarAlCarrito(idProducto, event) {
  event.stopPropagation();
  const producto = productos.find(p => p.id === idProducto);
  if (!producto || producto.stock <= 0) { alert('Producto agotado'); return; }
  const item = carrito.find(i => i.id === idProducto);
  if (item && item.cantidad >= producto.stock) { alert('Stock máximo: ' + producto.stock); return; }
  if (item) { item.cantidad++; } else { carrito.push({...producto, cantidad: 1}); }
  actualizarContadorCarrito();
  const btn = event.target.closest('.btn-agregar');
  btn.innerHTML = '✓';
  btn.style.cssText += 'background:var(--accent);color:var(--secondary);border-color:var(--accent);';
  setTimeout(() => { btn.innerHTML = carritoIconSVG; btn.style.cssText = ''; }, 800);
}

function actualizarContadorCarrito() {
  document.getElementById('cartCount').textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
}

function abrirCarrito() {
  mostrarCarrito();
  document.getElementById('modalCarrito').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function cerrarCarrito() {
  document.getElementById('modalCarrito').classList.remove('active');
  document.body.style.overflow = '';
  if (ultimoPedido) {
    document.getElementById('productosGrid').innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px;">' +
      '<div class="spinner-ring" style="margin:0 auto 20px;"></div>' +
      '<p style="color:var(--primary);font-size:13px;letter-spacing:1px;">Actualizando inventario...</p></div>';
    fetch('/api/productos').then(r => r.json()).then(res => {
      if (res.success && res.productos?.length > 0) {
        productos = res.productos; mostrarProductos(); aplicarFiltro();
      }
      ultimoPedido = null;
    }).catch(() => location.reload());
  }
}

function cerrarModalSiEsFondo(e) {
  if (e.target.id === 'modalCarrito') cerrarCarrito();
}

function mostrarCarrito() {
  const body = document.getElementById('carritoBody');
  if (carrito.length === 0) {
    body.innerHTML = '<div class="carrito-vacio">🛒 Tu carrito está vacío</div>'; return;
  }
  let subtotal = 0, totalITBMS = 0;
  carrito.forEach(i => { subtotal += i.precioBase * i.cantidad; totalITBMS += i.itbmsMonto * i.cantidad; });
  const total = subtotal + totalITBMS;
  body.innerHTML =
    '<div>' + carrito.map((item, idx) =>
      '<div class="carrito-item">' +
        '<img src="' + item.imagen + '" class="carrito-item-img" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23f5f0e8%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E\'">' +
        '<div class="carrito-item-info">' +
          '<div class="carrito-item-nombre">' + item.nombre + '</div>' +
          '<div class="carrito-item-precio">$' + fmt(item.precioBase) + ' c/u' +
            (item.itbmsPorc > 0 ? '<br><small style="color:var(--gray-500);">+ ITBMS ' + item.itbmsPorc + '%</small>' : '') + '</div>' +
          '<div class="carrito-item-controls">' +
            '<button class="qty-btn" onclick="cambiarCantidad(' + idx + ',-1)">−</button>' +
            '<span class="qty-display">' + item.cantidad + '</span>' +
            '<button class="qty-btn" onclick="cambiarCantidad(' + idx + ',1)">+</button>' +
            '<button class="btn-eliminar" onclick="eliminarDelCarrito(' + idx + ')">Eliminar</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    ).join('') + '</div>' +
    '<div class="carrito-total">' +
      '<div class="carrito-total-row"><span>Subtotal:</span><span>$' + fmt(subtotal) + '</span></div>' +
      '<div class="carrito-total-row" style="color:var(--gray-500);"><span>ITBMS:</span><span>$' + fmt(totalITBMS) + '</span></div>' +
      '<div class="carrito-total-row total"><span>Total:</span><span>$' + fmt(total) + '</span></div>' +
    '</div>' +
    '<button class="btn-checkout" onclick="irACheckout()">Proceder al Pago →</button>';
}

function cambiarCantidad(index, cambio) {
  const item = carrito[index];
  const prod = productos.find(p => p.id === item.id);
  const nueva = item.cantidad + cambio;
  if (nueva < 1) { eliminarDelCarrito(index); return; }
  if (nueva > prod.stock) { alert('Stock disponible: ' + prod.stock); return; }
  item.cantidad = nueva;
  actualizarContadorCarrito();
  mostrarCarrito();
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarContadorCarrito();
  mostrarCarrito();
}

// ── Checkout ────────────────────────────────────────────────
function irACheckout() {
  let subtotal = 0, totalITBMS = 0;
  carrito.forEach(i => { subtotal += i.precioBase * i.cantidad; totalITBMS += i.itbmsMonto * i.cantidad; });
  const total = subtotal + totalITBMS;
  document.getElementById('carritoBody').innerHTML =
    '<h3 class="checkout-title">📦 INFORMACIÓN DE ENVÍO</h3>' +
    '<div class="checkout-resumen"><h4>Resumen del Pedido</h4>' +
    carrito.map(item =>
      '<div class="resumen-item">' +
        '<div class="resumen-item-header"><span>' + item.nombre + ' (x' + item.cantidad + ')</span>' +
        '<span>$' + fmt(item.precioFinal * item.cantidad) + '</span></div>' +
        '<div class="resumen-item-detail">Base: $' + fmt(item.precioBase * item.cantidad) +
        (item.itbmsPorc > 0 ? ' | ITBMS: $' + fmt(item.itbmsMonto * item.cantidad) : ' | Exento') + '</div>' +
      '</div>'
    ).join('') +
    '<div class="resumen-totales">' +
      '<div class="resumen-row"><span>Subtotal:</span><span>$' + fmt(subtotal) + '</span></div>' +
      '<div class="resumen-row" style="color:var(--gray-500);"><span>ITBMS:</span><span>$' + fmt(totalITBMS) + '</span></div>' +
      '<div class="resumen-row total"><span>Total:</span><span>$' + fmt(total) + '</span></div>' +
    '</div></div>' +
    '<form id="checkoutForm" onsubmit="finalizarCompra(event)">' +
      '<div class="form-group"><label>Nombre Completo *</label>' +
        '<input type="text" name="nombre" required placeholder="Tu nombre completo"></div>' +
      '<div class="form-group"><label>Email *</label>' +
        '<input type="email" name="email" required placeholder="correo@ejemplo.com"></div>' +
      '<div class="form-group"><label>Teléfono *</label>' +
        '<input type="tel" name="telefono" required placeholder="+507 6000-0000"></div>' +
      '<div class="form-group"><label>Dirección de Envío *</label>' +
        '<textarea name="direccion" required placeholder="Dirección completa para la entrega..."></textarea></div>' +
      '<div class="buttons-row">' +
        '<button type="button" class="btn-volver" onclick="mostrarCarrito()">← Volver</button>' +
        '<button type="submit" class="btn-checkout" style="flex:1;">Finalizar Compra</button>' +
      '</div>' +
    '</form>';
}

async function finalizarCompra(event) {
  event.preventDefault();
  const form = event.target;
  const datosCliente = {
    nombre: form.nombre.value, email: form.email.value,
    telefono: form.telefono.value, direccion: form.direccion.value
  };
  const btnSubmit = form.querySelector('button[type="submit"]');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Procesando...';
  try {
    const response = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: datosCliente,
        productos: carrito.map(item => ({
          id: item.id, nombre: item.nombre, cantidad: item.cantidad,
          precioBase: item.precioBase, itbmsPorc: item.itbmsPorc,
          itbmsMonto: item.itbmsMonto, precioFinal: item.precioFinal
        }))
      })
    });
    const resultado = await response.json();
    if (!resultado.success) throw new Error(resultado.error || 'Error al procesar');
    ultimoPedido = {
      id: resultado.pedido.id, cliente: datosCliente,
      productos: [...carrito],
      fecha: new Date().toLocaleDateString('es-PA', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
      hora: new Date().toLocaleTimeString('es-PA', { hour:'2-digit', minute:'2-digit' }),
      total: resultado.pedido.total, subtotal: resultado.pedido.subtotal,
      itbms: resultado.pedido.itbms
    };
    mostrarExito(resultado.pedido.id);
    carrito = [];
    actualizarContadorCarrito();
  } catch (error) {
    if (error.message.includes('AGOTADO') || error.message.includes('disponible')) {
      alert('⚠️ Error de stock:\n\n' + error.message);
    } else {
      alert('❌ Error al procesar el pedido:\n\n' + error.message);
    }
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Finalizar Compra';
  }
}

// ── WhatsApp ────────────────────────────────────────────────
function codificarTextoWhatsApp(texto) {
  return encodeURIComponent(texto).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));
}

function generarMensajeWhatsApp() {
  if (!ultimoPedido) return '';
  let subtotal = 0, totalITBMS = 0;
  ultimoPedido.productos.forEach(i => { subtotal += i.precioBase * i.cantidad; totalITBMS += i.itbmsMonto * i.cantidad; });
  const total = subtotal + totalITBMS;
  let msg = '=== ' + EMPRESA.nombre + ' ===\nConfirmacion de Pedido\n\n' +
    'Pedido: ' + ultimoPedido.id +
    '\nCliente: ' + ultimoPedido.cliente.nombre +
    '\nEmail: ' + ultimoPedido.cliente.email +
    '\nTelefono: ' + ultimoPedido.cliente.telefono +
    '\nFecha: ' + ultimoPedido.fecha +
    '\n\nDireccion:\n' + ultimoPedido.cliente.direccion +
    '\n\n--- Productos ---\n';
  ultimoPedido.productos.forEach(i => {
    msg += '* ' + i.nombre + ' (x' + i.cantidad + ') - $' + fmt(i.precioFinal * i.cantidad) + '\n';
  });
  msg += '\n---------------------------' +
    '\nSubtotal: $' + fmt(subtotal) +
    '\nITBMS: $' + fmt(totalITBMS) +
    '\nTOTAL: $' + fmt(total) +
    '\n---------------------------\n\n' + EMPRESA.nombre + ' - ' + EMPRESA.slogan;
  return codificarTextoWhatsApp(msg);
}

function enviarWhatsAppPedido() {
  window.open('https://wa.me/' + EMPRESA.whatsapp + '?text=' + generarMensajeWhatsApp(), '_blank');
  function actualizarAlRegresar() {
    if (!document.hidden) {
      document.removeEventListener('visibilitychange', actualizarAlRegresar);
      fetch('/api/productos').then(r => r.json()).then(res => {
        if (res.success && res.productos?.length > 0) productos = res.productos;
      }).catch(err => console.error('Error:', err));
    }
  }
  document.addEventListener('visibilitychange', actualizarAlRegresar);
}

// ── Éxito ───────────────────────────────────────────────────
function mostrarExito(idPedido) {
  document.getElementById('carritoBody').innerHTML =
    '<div class="success-message">' +
      '<div class="success-icon">✅</div>' +
      '<h3>PEDIDO CONFIRMADO</h3>' +
      '<div class="pedido-id">#' + idPedido + '</div>' +
      '<p>Recibirás un correo con los detalles de tu compra.</p>' +
      '<p>Nos pondremos en contacto para coordinar la entrega.</p>' +
    '</div>' +
    '<div class="whatsapp-section">' +
      '<h4>📱 Guardar Comprobante</h4>' +
      '<p>Envía el resumen de tu pedido a WhatsApp.</p>' +
      '<button class="btn-whatsapp-pedido" onclick="enviarWhatsAppPedido()">' + whatsappIconSVG + ' Enviar por WhatsApp</button>' +
    '</div>' +
    '<button class="btn-checkout" onclick="seguirComprando()">Seguir Comprando</button>';
}

function seguirComprando() {
  carrito = []; ultimoPedido = null;
  actualizarContadorCarrito();
  cerrarCarrito();
  document.getElementById('productosGrid').innerHTML =
    '<div style="grid-column:1/-1;text-align:center;padding:60px;">' +
    '<div class="spinner-ring" style="margin:0 auto 20px;"></div>' +
    '<p style="color:var(--primary);font-size:13px;">Actualizando inventario...</p></div>';
  fetch('/api/productos').then(r => r.json()).then(res => {
    if (res.success && res.productos?.length > 0) { productos = res.productos; mostrarProductos(); aplicarFiltro(); }
    window.scrollTo({top: 0, behavior: 'smooth'});
  }).catch(() => location.reload());
}

// ── Utilidades ──────────────────────────────────────────────
function mostrarError(msg) {
  document.getElementById('loadingScreen').innerHTML =
    '<div class="error-message"><h3>⚠️ Error</h3><p>' + msg + '</p>' +
    '<button onclick="location.reload()" style="margin-top:18px;padding:12px 24px;' +
    'background:var(--secondary);color:var(--primary);border:2px solid var(--primary);' +
    'border-radius:8px;cursor:pointer;font-weight:600;">Reintentar</button></div>';
}

function ocultarCarga() {
  document.getElementById('loadingScreen').style.display = 'none';
  ['mainHeader','heroSection','filterSection','mainContent','mainFooter'].forEach(id => {
    document.getElementById(id).style.display = 'block';
  });
}