import { getWeek } from 'date-fns';

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const week = `semana_${getWeek(now, { weekStartsOn: 1 })}`;
  const folder = `prueba-imagenes/${month}/${week}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'ml_default');
  formData.append('cloud_name', 'dhd61lan4');
  formData.append('folder', folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dhd61lan4/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Error al subir la imagen a Cloudinary');
    }

    const data = await response.json();
    // Retornar la URL original sin optimizaciones adicionales de Cloudinary
    return data.secure_url;
  } catch (error) {
    console.error('Error en uploadToCloudinary:', error);
    throw error;
  }
}; 