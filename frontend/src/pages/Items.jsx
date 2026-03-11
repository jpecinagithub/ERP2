import CrudPage from '../components/CrudPage';

const fmtMoney = (value) => `${Number(value || 0).toFixed(2)} EUR`;

export default function Items() {
  return (
    <CrudPage
      title="Articulos"
      subtitle="Productos y servicios para facturacion"
      endpoint="/items"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'Nombre' },
        { key: 'unit_price', label: 'Precio', render: fmtMoney }
      ]}
      formFields={[
        { key: 'sku', label: 'SKU', required: true, placeholder: 'ART-001' },
        { key: 'name', label: 'Nombre', required: true, placeholder: 'Nombre del articulo' },
        { key: 'description', label: 'Descripcion', type: 'textarea', placeholder: 'Descripcion del articulo' },
        { key: 'unit_price', label: 'Precio Unitario', type: 'number', step: '0.01', placeholder: '0.00' }
      ]}
    />
  );
}
