const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { createClient } = require('@supabase/supabase-js');
const { getWeek } = require('date-fns');

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

const app = express();
const port = process.env.PORT || 10000;

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuración de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

app.use(cors({
  origin: [process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Directorio temporal para los chunks
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Almacenamiento de información de subida
const uploads = new Map();

// Configuración de multer para los chunks
const upload = multer({ dest: TEMP_DIR });

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Iniciar una nueva subida
app.post('/upload/init', (req, res) => {
  try {
    const { uploadId, fileName, fileSize, id } = req.body;
    
    if (!uploadId || !fileName || !fileSize || !id) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    uploads.set(uploadId, {
      fileName,
      fileSize,
      id,
      chunks: [],
      uploadedSize: 0,
      createdAt: Date.now(),
    });

    res.json({ message: 'Subida iniciada' });
  } catch (error) {
    console.error('Error al iniciar subida:', error);
    res.status(500).json({ error: 'Error al iniciar la subida' });
  }
});

// Subir un chunk
app.post('/upload/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks } = req.body;
    const uploadInfo = uploads.get(uploadId);

    if (!uploadInfo) {
      return res.status(404).json({ error: 'Subida no encontrada' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún chunk' });
    }

    // Mover el chunk al directorio temporal
    const chunkPath = path.join(TEMP_DIR, `${uploadId}-${chunkIndex}`);
    await writeFileAsync(chunkPath, fs.readFileSync(req.file.path));
    await unlinkAsync(req.file.path);

    uploadInfo.chunks[chunkIndex] = chunkPath;
    uploadInfo.uploadedSize += req.file.size;

    res.json({ message: 'Chunk recibido' });
  } catch (error) {
    console.error('Error al procesar chunk:', error);
    res.status(500).json({ error: 'Error al procesar el chunk' });
  }
});

// Finalizar la subida y subir a Cloudinary
app.post('/upload/finalize', async (req, res) => {
  try {
    const { uploadId, fileName, id } = req.body;
    const uploadInfo = uploads.get(uploadId);

    if (!uploadInfo) {
      return res.status(404).json({ error: 'Subida no encontrada' });
    }

    if (!id) {
      return res.status(400).json({ error: 'ID de revisión no proporcionado' });
    }

    // Verificar que todos los chunks estén presentes
    const missingChunks = uploadInfo.chunks.findIndex(chunk => !chunk);
    if (missingChunks !== -1) {
      return res.status(400).json({ error: `Falta el chunk ${missingChunks}` });
    }

    // Crear el archivo completo
    const filePath = path.join(TEMP_DIR, fileName);
    const writeStream = fs.createWriteStream(filePath);

    for (const chunkPath of uploadInfo.chunks) {
      const chunkBuffer = fs.readFileSync(chunkPath);
      writeStream.write(chunkBuffer);
      await unlinkAsync(chunkPath);
    }

    writeStream.end();

    // Esperar a que se complete la escritura
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Verificar configuración de Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Faltan credenciales de Cloudinary');
    }

    // Subir a Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder: `prueba-imagenes/${new Date().getMonth() + 1}/semana_${getWeek(new Date(), { weekStartsOn: 1 })}`,
      upload_preset: 'PruebaSubir'
    });

    // Actualizar Supabase con la URL de la imagen
    const { data: revisionData, error: revisionError } = await supabase
      .from('revisiones_casitas')
      .select('imagenes')
      .eq('id', id)
      .single();

    if (revisionError) {
      console.error('Error al obtener datos de la revisión:', revisionError);
      throw new Error(`Error al obtener datos de la revisión: ${revisionError.message}`);
    }

    if (!revisionData) {
      throw new Error('No se encontró la revisión en la base de datos');
    }

    const imagenes = revisionData.imagenes || [];
    imagenes.push(result.secure_url);

    const { error: updateError } = await supabase
      .from('revisiones_casitas')
      .update({ imagenes })
      .eq('id', id);

    if (updateError) {
      console.error('Error al actualizar la revisión:', updateError);
      throw new Error(`Error al actualizar la revisión: ${updateError.message}`);
    }

    // Limpiar
    await unlinkAsync(filePath);
    uploads.delete(uploadId);

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Error al finalizar la subida:', error);
    res.status(500).json({ 
      error: 'Error al finalizar la subida',
      details: error.message,
      cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? 'configurada' : 'no configurada',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'configurada' : 'no configurada'
      }
    });
  }
});

// Limpiar subidas antiguas periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [uploadId, uploadInfo] of uploads.entries()) {
    if (now - uploadInfo.createdAt > 24 * 60 * 60 * 1000) { // 24 horas
      uploads.delete(uploadId);
    }
  }
}, 60 * 60 * 1000);

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
}); 