import CrudPage from '../components/CrudPage';

export default function Suppliers() {
  return (
    <CrudPage
      title="Proveedores"
      subtitle="Gestion del catalogo de proveedores"
      endpoint="/suppliers"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nombre' },
        { key: 'email', label: 'Email' }
      ]}
      formFields={[
        { key: 'name', label: 'Nombre', required: true, placeholder: 'Nombre del proveedor' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'compras@proveedor.com' },
        { key: 'tax_id', label: 'NIF/CIF', placeholder: 'B12345678' },
        { key: 'address', label: 'Direccion', type: 'textarea', placeholder: 'Direccion completa' }
      ]}
    />
  );
}
