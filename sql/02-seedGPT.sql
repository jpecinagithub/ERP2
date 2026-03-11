USE ERP2;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- USERS
-- =====================================================

INSERT INTO users (username,password,role)
VALUES ('admin','admin','superadmin')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO users (username,password,role)
VALUES ('compras_user','compras','compras')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO users (username,password,role)
VALUES ('conta_user','contabilidad','contabilidad')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO users (username,password,role)
VALUES ('teso_user','tesoreria','tesoreria')
ON DUPLICATE KEY UPDATE username=username;


-- =====================================================
-- UNITS
-- =====================================================

INSERT INTO units (code,name,description,created_by)
VALUES ('ud','unidad','pieza individual',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('kg','kilogramo','peso en kg',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('g','gramo','peso fino',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('l','litro','volumen en litros',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('ml','mililitro','volumen pequeno',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('m','metro','longitud',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('m2','metro cuadrado','superficie',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('caja','caja','caja estandar',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('pack','pack','paquete o blister',1)
ON DUPLICATE KEY UPDATE code=code;

INSERT INTO units (code,name,description,created_by)
VALUES ('rollo','rollo','rollo de cable',1)
ON DUPLICATE KEY UPDATE code=code;


-- =====================================================
-- CATEGORIES
-- =====================================================

INSERT INTO categories (code,name,parent_id,created_by)
VALUES ('MAT','Materiales Construccion',NULL,1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'FER',
'Ferreteria General',
(SELECT id FROM (SELECT id FROM categories WHERE code='MAT') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'TOR',
'Tornilleria',
(SELECT id FROM (SELECT id FROM categories WHERE code='FER') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'SAN',
'Sanitarios y Griferia',
(SELECT id FROM (SELECT id FROM categories WHERE code='MAT') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'ELE',
'Material Electrico',
(SELECT id FROM (SELECT id FROM categories WHERE code='MAT') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'CAB',
'Cables y Conductos',
(SELECT id FROM (SELECT id FROM categories WHERE code='ELE') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'PIN',
'Pinturas y Barnices',
(SELECT id FROM (SELECT id FROM categories WHERE code='MAT') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'INT',
'Pintura Interior',
(SELECT id FROM (SELECT id FROM categories WHERE code='PIN') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'EXT',
'Pintura Exterior',
(SELECT id FROM (SELECT id FROM categories WHERE code='PIN') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'HER',
'Herramientas Manuales',
(SELECT id FROM (SELECT id FROM categories WHERE code='FER') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'ELEH',
'Herramientas Electricas',
(SELECT id FROM (SELECT id FROM categories WHERE code='FER') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code,name,parent_id,created_by)
VALUES (
'CER',
'Ceramica y Baldosas',
(SELECT id FROM (SELECT id FROM categories WHERE code='MAT') tmp),
1
)
ON DUPLICATE KEY UPDATE name=VALUES(name);


-- =====================================================
-- CHART OF ACCOUNTS
-- =====================================================

INSERT INTO accounts (code,name,type,parent_account,created_by) VALUES
('100','Capital social','pasivo',NULL,1),
('120','Reservas voluntarias','pasivo',NULL,1),
('129','Resultado del ejercicio','pasivo',NULL,1),
('200','Inmovilizado','activo',NULL,1),
('220','Inmovilizado material','activo',NULL,1),
('281','Amortizacion acumulada del inmovilizado','activo',NULL,1),
('300','Existencias','activo',NULL,1),
('400','Proveedores','pasivo',NULL,1),
('410','Acreedores por servicios','pasivo',NULL,1),
('430','Clientes','activo',NULL,1),
('440','Deudores','activo',NULL,1),
('472','IVA soportado','activo',NULL,1),
('4751','HP acreedora por IVA','pasivo',NULL,1),
('477','IVA repercutido','pasivo',NULL,1),
('570','Caja','activo',NULL,1),
('572','Bancos','activo',NULL,1),
('600','Compras','gasto',NULL,1),
('620','Arrendamientos','gasto',NULL,1),
('628','Suministros','gasto',NULL,1),
('640','Sueldos y salarios','gasto',NULL,1),
('681','Amortizacion','gasto',NULL,1),
('700','Ventas','ingreso',NULL,1),
('705','Prestacion servicios','ingreso',NULL,1)
ON DUPLICATE KEY UPDATE name=VALUES(name);


-- =====================================================
-- CUSTOMERS
-- =====================================================

INSERT INTO customers (name,tax_id,address,email,created_by) VALUES
('Tecnologias Avanzadas SA','A11122233','Av Parque 10 Valencia','info@tecavanzada.example',1),
('Distribuidora Norte SL','B44455566','Calle Rio 45 Santander','pedidos@distrinorte.example',1),
('Inversiones Pecina 2026','B77788899','Paseo Gracia 15 Barcelona','admin@pecina2026.example',1),
('Manufacturas Modernas','A99900011','Poligono Oeste Murcia','fabrica@manumoderna.example',1),
('Servicios Integrales SA','A22233344','Calle Mayor 1 Madrid','servicios@sintegrales.example',1),
('Soluciones IT Global','B55566677','Edificio Tech Malaga','soporte@itglobal.example',1),
('Almacenes Centrales SL','B88899900','Via Carga 7 Zaragoza','almacen@centrales.example',1),
('Consultoria Riesgos','B33344455','Velazquez 30 Madrid','riesgos@consultoria.example',1),
('Suministros Energeticos','A66677788','Plaza Luz 4 Sevilla','comercial@sumenerge.example',1),
('Importaciones Europa','B00011122','Puerto Seco Bilbao','import@europa.example',1)
ON DUPLICATE KEY UPDATE name=VALUES(name);


-- =====================================================
-- SUPPLIERS
-- =====================================================

INSERT INTO suppliers (name,tax_id,address,email,created_by) VALUES
('Suministros Industriales SA','A98765432','Poligono Viso Malaga','ventas@sumindustrial.example',1),
('Logistica Integrada Express','B12312312','Calle Transporte 12 Zaragoza','info@logisticaexp.example',1),
('Sistemas Energeticos Pecina','B45645645','Calle Goya 25 Madrid','proyectos@enerpecina.example',1),
('Papeleria Oficina Global','B78978978','Av Constitucion 4 Sevilla','pedidos@papelera.example',1),
('Componentes Tecnologicos','A32132132','Parque Tecnologico Zamudio','comercial@compotech.example',1),
('Limpiezas Mantenimiento SL','B65465464','Calle Limpieza 3 Valencia','servicios@limpsa.example',1),
('Seguridad Proactiva 24h','A96385274','Calle Almagro 10 Madrid','central@seguro24.example',1),
('Distribuidora Alimentos SA','A14725836','Mercamadrid Nave 5','logistica@distrialim.example',1),
('Consultoria Software 2026','B25836914','Torre Picasso Madrid','it@soft2026.example',1),
('Gestion Residuos Eco','B36914725','Camino Vertedero Barcelona','contacto@ecogestion.example',1)
ON DUPLICATE KEY UPDATE name=VALUES(name);


-- =====================================================
-- ITEMS
-- =====================================================

INSERT INTO items (sku,name,description,unit_id,cost_price,is_active,created_by) VALUES
('ART-003','Servidor Pro 2026','Servidor alto rendimiento',1,1200.00,1,1),
('ART-004','Monitor 27 4K','Monitor profesional',1,350.00,1,1),
('ART-005','Licencia ERP Anual','Suscripcion ERP contabilidad',1,500.00,1,1),
('ART-006','Teclado Mecanico','Teclado ergonomico',1,85.00,1,1),
('ART-007','Disco SSD 2TB','Unidad estado solido',1,150.00,1,1),
('ART-008','Cable Red Cat7','Cable red profesional',1,12.50,1,1),
('ART-009','Raton Inalambrico','Raton optico precision',1,45.00,1,1),
('ART-010','Silla Ergonomica','Silla oficina',1,280.00,1,1),
('ART-011','SAI 1500VA','Sistema alimentacion UPS',1,190.00,1,1),
('ART-012','Pack Limpieza PC','Kit limpieza equipos',1,15.00,1,1)
ON DUPLICATE KEY UPDATE name=VALUES(name);


SET FOREIGN_KEY_CHECKS = 1;