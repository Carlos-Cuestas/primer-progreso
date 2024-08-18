'use client';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import dayjs from 'dayjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

export default function Home() {
  const [files, setFiles] = useState([]);
  const [data, setData] = useState([]);
  
  const [selectedTipoDte, setSelectedTipoDte] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableTipoDtes, setAvailableTipoDtes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPageFiles, setCurrentPageFiles] = useState(1);
  const [currentPageData, setCurrentPageData] = useState(1);

  const filesPerPage = 10;
  const dataPerPage = 10;

  const tipoDteLabels = {
    '01': 'Factura',
    '03': 'Comprobante de crédito fiscal',
    '04': 'Nota de remisión',
    '05': 'Nota de crédito',
    '06': 'Nota de débito',
    '07': 'Comprobante de retención',
    '08': 'Comprobante de liquidación',
    '09': 'Documento contable de liquidación',
    '11': 'Facturas de exportación',
    '14': 'Factura de sujeto excluido',
    '15': 'Comprobante de donación'
  };

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]);

    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result);
          setData((prevData) => {
            const updatedData = [...prevData, json];
            const tipoDtes = new Set(updatedData.map((item) => item.dteJson.identificacion.tipoDte));
            setAvailableTipoDtes(Array.from(tipoDtes));
            return updatedData;
          });
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    });
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleTipoDteChange = (event) => {
    const selected = event.target.value;
    setSelectedTipoDte(selected);
    setSelectedMonths([]);
    const filteredData = data.filter((item) => item.dteJson.identificacion.tipoDte === selected);
    const months = new Set(filteredData.map((item) => dayjs(item.dteJson.identificacion.fecEmi).format('YYYY-MM')));
    setAvailableMonths(Array.from(months).sort((a, b) => dayjs(a, 'YYYY-MM').isAfter(dayjs(b, 'YYYY-MM')) ? 1 : -1));
  };

  const handleMonthChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedMonths((prev) => [...prev, value]);
    } else {
      setSelectedMonths((prev) => prev.filter((month) => month !== value));
    }
  };

  const filteredData = data.filter(
    (item) =>
      item.dteJson.identificacion.tipoDte === selectedTipoDte &&
      (selectedMonths.length === 0 || selectedMonths.includes(dayjs(item.dteJson.identificacion.fecEmi).format('YYYY-MM')))
  );

  const filteredDataForSearch = filteredData.filter(
    (item) => item.nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.dteJson.emisor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.dteJson.receptor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
              dayjs(item.dteJson.identificacion.fecEmi).format('YYYY-MM-DD').includes(searchTerm.toLowerCase())
  );

  const chartData = {
    labels: filteredData.map((item) => dayjs(item.dteJson.identificacion.fecEmi).format('YYYY-MM-DD')),
    datasets: [
      {
        label: 'Total a Pagar',
        data: filteredData.map((item) => item.dteJson.resumen.totalPagar),
        borderColor: 'rgba(0, 0, 0, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
      },
    ],
  };

  const indexOfLastFile = currentPageFiles * filesPerPage;
  const indexOfFirstFile = indexOfLastFile - filesPerPage;
  const currentFiles = files.slice(indexOfFirstFile, indexOfLastFile);

  const indexOfLastData = currentPageData * dataPerPage;
  const indexOfFirstData = indexOfLastData - dataPerPage;
  const currentData = filteredDataForSearch.slice(indexOfFirstData, indexOfLastData);

  const paginateFiles = (pageNumber) => setCurrentPageFiles(pageNumber);
  const paginateData = (pageNumber) => setCurrentPageData(pageNumber);

  const handleSave = async () => {
    const zip = new JSZip();
    const selectedData = filteredData;

    selectedData.forEach((item, index) => {
      const fileName = `file_${index + 1}.json`;
      zip.file(fileName, JSON.stringify(item, null, 2));
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${selectedTipoDte}_${selectedMonths.join('-')}.zip`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <div {...getRootProps()} style={{ border: '2px dashed #0070f3', padding: '20px', marginBottom: '20px' }}>
        <input {...getInputProps()} />
        <p>Arrastra y suelta tus archivos JSON aquí, o haz clic para seleccionar archivos</p>
      </div>

      <button onClick={() => setFiles([])} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Ocultar/Mostrar Archivos Subidos
      </button>

      {files.length > 0 && (
        <>
          <h3>Archivos subidos:</h3>
          <ul style={{ paddingLeft: '0', listStyleType: 'none' }}>
            {currentFiles.map((file) => (
              <li key={file.path} style={{ marginBottom: '5px' }}>{file.name}</li>
            ))}
          </ul>
          <Pagination itemsPerPage={filesPerPage} totalItems={files.length} paginate={paginateFiles} currentPage={currentPageFiles} />
        </>
      )}

      <h3>Filtrar por Tipo DTE:</h3>
      <div>
        <select onChange={handleTipoDteChange} value={selectedTipoDte} style={{ padding: '5px', borderRadius: '5px', border: '1px solid #ccc' }}>
          <option value="">Selecciona un Tipo DTE</option>
          {Object.entries(tipoDteLabels).map(([code, label]) => (
            <option key={code} value={code}>{`${code} ${label}`}</option>
          ))}
        </select>
      </div>

      {selectedTipoDte && (
        <>
          <h3>Filtrar por Mes:</h3>
          <div>
            {availableMonths.map((month) => (
              <label key={month} style={{ marginRight: '10px' }}>
                <input type="checkbox" value={month} onChange={handleMonthChange} />
                {dayjs(month, 'YYYY-MM').format('MMMM YYYY')}
              </label>
            ))}
          </div>
        </>
      )}

      

      <h3>Gráfica Lineal:</h3>
      <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (context) => `Total a Pagar: ${context.raw}` } } } }} />
      
      <h3>Buscador de Datos Consolidados:</h3>
      <input 
        type="text" 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
        placeholder="Buscar por NIT, Nombre Emisor, Nombre Receptor, Fecha"
        style={{ padding: '5px', borderRadius: '5px', border: '1px solid #ccc', width: '100%' }}
      />

      <h3>Datos Consolidados:</h3>
      <Table data={currentData} />

      <Pagination itemsPerPage={dataPerPage} totalItems={filteredDataForSearch.length} paginate={paginateData} currentPage={currentPageData} />
<button
onClick={handleSave}
style={{ padding: '10px 20px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' }}
>
Descargar Datos
</button>
</div>
);
}

const Pagination = ({ itemsPerPage, totalItems, paginate, currentPage }) => {
const pageNumbers = [];
const totalPages = Math.ceil(totalItems / itemsPerPage);

for (let i = 1; i <= totalPages; i++) {
pageNumbers.push(i);
}

return (
<div style={{ margin: '20px 0' }}>
<button
onClick={() => paginate(1)}
disabled={currentPage === 1}
style={{ padding: '10px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' }}
>
Volver a Primera Página
</button>
<button
onClick={() => paginate(currentPage - 1)}
disabled={currentPage === 1}
style={{ padding: '10px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' }}
>
Anterior
</button>
{pageNumbers.map(number => (
<button
key={number}
onClick={() => paginate(number)}
style={{ padding: '10px', backgroundColor: currentPage === number ? '#0050b3' : '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' }}
>
{number}
</button>
))}
<button
onClick={() => paginate(currentPage + 1)}
disabled={currentPage === totalPages}
style={{ padding: '10px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' }}
>
Siguiente
</button>
<button
onClick={() => paginate(totalPages)}
disabled={currentPage === totalPages}
style={{ padding: '10px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' }}
>
Ir a Última Página
</button>
</div>
);
};

const Table = ({ data }) => (

  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
    <thead>
      <tr style={{ backgroundColor: '#000', color: '#fff' }}>
        <th style={{ padding: '10px', border: '1px solid #ddd' }}>NIT</th>
        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Nombre Emisor</th>
        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Nombre Receptor</th>
        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Fecha</th>
        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Total a Pagar</th>
      </tr>
    </thead>
    <tbody>
      {data.map((item, index) => (
        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f2f2f2' : '#fff' }}>
          <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.nit}</td>
          <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.dteJson.emisor.nombre}</td>
          <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.dteJson.receptor.nombre}</td>
          <td style={{ padding: '10px', border: '1px solid #ddd' }}>{dayjs(item.dteJson.identificacion.fecEmi).format('YYYY-MM-DD')}</td>
          <td style={{ padding: '10px', border: '1px solid #ddd' }}>${item.dteJson.resumen.totalPagar.toFixed(2)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
