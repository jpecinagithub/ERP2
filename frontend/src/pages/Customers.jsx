import CrudPage from '../components/CrudPage';

export default function Customers() {
  return (
    <CrudPage
      title="Clientes"
      subtitle="Gestion de clientes corporativos"
      endpoint="/customers"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nombre' },
        { key: 'email', label: 'Email' }
      ]}
      formFields={[
        { key: 'name', label: 'Nombre', required: true, placeholder: 'Nombre del cliente' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'email@empresa.com' },
        { key: 'tax_id', label: 'NIF/CIF', placeholder: 'B12345678' },
        { key: 'address', label: 'Direccion', type: 'textarea', placeholder: 'Direccion completa' }
      ]}
    />
  );
}
