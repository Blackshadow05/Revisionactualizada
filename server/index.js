const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors());
app.use(express.json());

// Almacenamiento temporal de chunks
const chunks = new Map();

// Inicializar la subida
app.post('/api/upload/init', (req, res) => {
  const { fileId, fileName, fileSize, totalChunks } = req.body;
  
  chunks.set(fileId, {
    fileName,
    fileSize,
    totalChunks,
    receivedChunks: 0,
    chunks: new Array(totalChunks)
  });

  res.json({ success: true });
});

// Subir chunk
app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { fileId, chunkIndex, totalChunks } = req.body;
    const chunkData = chunks.get(fileId);

    if (!chunkData) {
      return res.status(404).json({ error: 'No se encontró la sesión de subida' });
    }

    // Guardar el chunk
    const chunkPath = path.join('uploads', `${fileId}-${chunkIndex}`);
    await writeFileAsync(chunkPath, req.file.buffer);
    chunkData.chunks[chunkIndex] = chunkPath;
    chunkData.receivedChunks++;

    // Si todos los chunks han sido recibidos, procesar el archivo
    if (chunkData.receivedChunks === parseInt(totalChunks)) {
      // Combinar chunks
      const tempFilePath = path.join('uploads', fileId);
      const writeStream = fs.createWriteStream(tempFilePath);

      for (let i = 0; i < chunkData.chunks.length; i++) {
        const chunkContent = await readFileAsync(chunkData.chunks[i]);
        writeStream.write(chunkContent);
        await unlinkAsync(chunkData.chunks[i]); // Eliminar chunk individual
      }

      writeStream.end();

      // Subir a Cloudinary
      const result = await cloudinary.uploader.upload(tempFilePath, {
        folder: 'revisiones',
        resource_type: 'auto'
      });

      // Limpiar
      await unlinkAsync(tempFilePath);
      chunks.delete(fileId);

      res.json({ url: result.secure_url });
    } else {
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error al procesar chunk:', error);
    res.status(500).json({ error: 'Error al procesar el chunk' });
  }
});

// Finalizar subida
app.post('/api/upload/finalize', (req, res) => {
  const { fileId } = req.body;
  const chunkData = chunks.get(fileId);

  if (!chunkData) {
    return res.status(404).json({ error: 'No se encontró la sesión de subida' });
  }

  if (chunkData.receivedChunks !== chunkData.totalChunks) {
    return res.status(400).json({ error: 'No se han recibido todos los chunks' });
  }

  res.json({ success: true });
});

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
}); 