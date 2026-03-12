// ============================================================
// ★ CONFIGURACIÓN DE TU NEGOCIO — EDITAR AQUÍ ★
// ============================================================

const EMPRESA = {
  nombre:    'ELEGANCE JEWELRY',
  slogan:    'Donde cada pieza cuenta una historia',
  direccion: 'Ciudad de Panamá, Panamá',
  telefono:  '+507 6423-0862',
  whatsapp:  '50764230862',
  email:     'eduardo.aizpruap@gmail.com',
  logo:      '',                          // ← URL del logo (opcional)
  heroTag:   '✨ Envíos a todo Panamá',
  heroTitulo:'ELEGANCE JEWELRY',
  heroBadge: 'HOT'                        // ← texto del badge de destacado
};

// ============================================================
// ★ CATEGORÍAS DE TU NEGOCIO — DESCOMENTA UNA OPCIÓN ★
// ============================================================

// --- JOYERÍA ✅ ACTIVA ---
const CATEGORIAS_NEGOCIO = [
  'Anillos', 'Collares', 'Aretes', 'Pulseras',
  'Relojes', 'Cadenas', 'Dijes', 'Sets'
];

// --- ELECTRÓNICA (comentada) ---
// const CATEGORIAS_NEGOCIO = [
//   'Celulares', 'Laptops', 'Audio', 'Tablets',
//   'Accesorios', 'Gaming', 'Cables y Cargadores', 'Smart Home'
// ];

// --- ROPA (comentada) ---
// const CATEGORIAS_NEGOCIO = [
//   'Camisas', 'Pantalones', 'Vestidos', 'Calzado',
//   'Accesorios', 'Ropa Deportiva', 'Bolsos', 'Ropa Interior'
// ];

// --- ALIMENTOS (comentada) ---
// const CATEGORIAS_NEGOCIO = [
//   'Frescos', 'Lácteos', 'Panadería', 'Bebidas',
//   'Snacks', 'Carnes', 'Mariscos', 'Orgánicos'
// ];

// --- SERVICIOS (comentada) ---
// const CATEGORIAS_NEGOCIO = [
//   'Consultoría', 'Diseño', 'Mantenimiento', 'Limpieza',
//   'Tecnología', 'Legal', 'Contabilidad', 'Otros'
// ];

// --- GENÉRICO (comentada) ---
// const CATEGORIAS_NEGOCIO = [
//   'Categoría 1', 'Categoría 2', 'Categoría 3', 'Categoría 4'
// ];

// ============================================================
// Iconos por categoría (se pueden personalizar)
// ============================================================
const CATEGORIAS_ICONOS = {
  // Joyería
  'Anillos': '💍', 'Collares': '📿', 'Aretes': '✨',
  'Pulseras': '🪬', 'Relojes': '⌚', 'Cadenas': '⛓️',
  'Dijes': '🌟', 'Sets': '🎁',
  // Electrónica
  'Celulares': '📱', 'Laptops': '💻', 'Audio': '🎧',
  'Tablets': '📲', 'Gaming': '🎮', 'Smart Home': '🏠',
  // Ropa
  'Camisas': '👔', 'Pantalones': '👖', 'Vestidos': '👗',
  'Calzado': '👟', 'Bolsos': '👜',
  // Alimentos
  'Frescos': '🥬', 'Lácteos': '🥛', 'Panadería': '🥐',
  'Bebidas': '🥤', 'Carnes': '🥩', 'Mariscos': '🦐',
  // Default
  'default': '📦'
};