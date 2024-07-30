'use client'
// pages/index.js
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

export default function Home() {
  const [files, setFiles] = useState([]);
  const [data, setData] = useState([]);

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]);

    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result);
          setData((prevData) => [...prevData, json]);
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    });
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  // Prepare data for the line chart
  const chartData = {
    labels: data.map((item, index) => `Data ${index + 1}`), // Labels for X-axis
    datasets: [
      {
        label: 'Total a Pagar',
        data: data.map((item) => item.dteJson.resumen.totalPagar), // Data for Y-axis
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
      },
    ],
  };

  return (
    <div {...getRootProps()} style={{ border: '2px dashed #0070f3', padding: '20px' }}>
      <input {...getInputProps()} />
      <p>Arrastra y suelta tus archivos JSON aquí, o haz clic para seleccionar archivos</p>
      <h3>Archivos subidos:</h3>
      <ul>
        {files.map((file) => (
          <li key={file.path}>{file.name}</li>
        ))}
      </ul>
      <h3>Datos Consolidados:</h3>
      <Table data={data} />
      <h3>Gráfica Lineal:</h3>
      <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (context) => `Total a Pagar: ${context.raw}` } } } }} />
    </div>
  );
}

function Table({ data }) {
  if (data.length === 0) {
    return <p>No hay datos para mostrar.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid black', padding: '8px' }}>NIT</th>
          <th style={{ border: '1px solid black', padding: '8px' }}>Nombre Emisor</th>
          <th style={{ border: '1px solid black', padding: '8px' }}>Nombre Receptor</th>
          <th style={{ border: '1px solid black', padding: '8px' }}>Fecha Emisión</th>
          <th style={{ border: '1px solid black', padding: '8px' }}>Total a Pagar</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            <td style={{ border: '1px solid black', padding: '8px' }}>{item.nit}</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>{item.dteJson.emisor.nombre}</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>{item.dteJson.receptor.nombre}</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>{item.dteJson.identificacion.fecEmi}</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>{item.dteJson.resumen.totalPagar}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
