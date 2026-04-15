-- SEED de prueba — Elegance Jewelry
-- Ejecutar DESPUÉS del schema.sql
INSERT OR REPLACE INTO productos (id, nombre, descripcion, precio_base, costo, categoria, imagen_url, stock, itbms_pct, destacado) VALUES
('EJ001','Anillo Solitario Oro 18K','Anillo clásico solitario en oro amarillo 18K con diamante central de 0.5 quilates',850.00,520.00,'Anillos','https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop',8,7,1),
('EJ002','Collar Perlas Cultivadas','Collar de perlas cultivadas de agua dulce, cierre en plata 925, largo 45cm',320.00,180.00,'Collares','https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop',12,7,1),
('EJ003','Aretes Argolla Oro 14K','Argollas clásicas en oro amarillo 14K, diámetro 2cm, cierre a presión',195.00,110.00,'Aretes','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&h=500&fit=crop',20,7,0),
('EJ004','Pulsera Tenis Plata','Pulsera tenis en plata 925 con cristales blancos engastados, largo 19cm',145.00,80.00,'Pulseras','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop',15,7,1),
('EJ005','Reloj Mujer Rosado','Reloj analógico para dama en tono rosado dorado, correa de malla milanesa',210.00,125.00,'Relojes','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',6,7,0);