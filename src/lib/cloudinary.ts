import { getWeek } from 'date-fns';

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const week = `semana_${getWeek(now, { weekStartsOn: 1 })}`;
  const folder = `prueba-imagenes/${month}/${week}`;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name no está configurado');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'PruebaSubir');
  formData.append('cloud_name', cloudName);
  formData.append('folder', folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Error al subir la imagen a Cloudinary');
    }

    const data = await response.json();
    const url = new URL(data.secure_url);
    url.pathname = url.pathname.replace('/upload/', '/upload/f_auto,q_auto/');
    return url.toString();
  } catch (error) {
    console.error('Error en uploadToCloudinary:', error);
    throw error;
  }
}; 