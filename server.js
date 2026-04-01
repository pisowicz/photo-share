const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'photo-share',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'webm'],
    resource_type: 'auto'
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// In-memory storage
let albums = [
  { id: 'default', name: 'All Photos', createdAt: new Date().toISOString() }
];
let photos = [];

// Get all albums
app.get('/api/albums', (req, res) => {
  res.json(albums);
});

// Create new album
app.post('/api/albums', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Album name required' });
  }
  
  const album = {
    id: Date.now().toString(),
    name,
    createdAt: new Date().toISOString()
  };
  albums.push(album);
  res.json(album);
});

// Delete album
app.delete('/api/albums/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'default') {
    return res.status(400).json({ error: 'Cannot delete default album' });
  }
  
  // Move photos to default album
  photos = photos.map(p => p.albumId === id ? { ...p, albumId: 'default' } : p);
  
  albums = albums.filter(a => a.id !== id);
  res.json({ success: true });
});

// Rename album
app.put('/api/albums/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  const album = albums.find(a => a.id === id);
  if (!album) {
    return res.status(404).json({ error: 'Album not found' });
  }
  
  album.name = name;
  res.json(album);
});

// Get photos (optionally filtered by album)
app.get('/api/photos', (req, res) => {
  const { albumId } = req.query;
  if (albumId && albumId !== 'all') {
    res.json(photos.filter(p => p.albumId === albumId));
  } else {
    res.json(photos);
  }
});

// Upload photo
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { albumId = 'default', caption = '' } = req.body;

    const photo = {
      id: Date.now().toString(),
      url: req.file.path,
      thumbnail: req.file.path.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
      filename: req.file.originalname,
      caption,
      type: req.file.mimetype.startsWith('video') ? 'video' : 'photo',
      albumId,
      uploadedAt: new Date().toISOString(),
      size: req.file.size
    };

    photos.unshift(photo);
    res.json(photo);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Update photo (caption, album)
app.put('/api/photos/:id', (req, res) => {
  const { id } = req.params;
  const { caption, albumId } = req.body;
  
  const photo = photos.find(p => p.id === id);
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  
  if (caption !== undefined) photo.caption = caption;
  if (albumId !== undefined) photo.albumId = albumId;
  
  res.json(photo);
});

// Delete photo
app.delete('/api/photos/:id', async (req, res) => {
  const { id } = req.params;
  const photo = photos.find(p => p.id === id);
  
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  
  // Delete from Cloudinary
  try {
    const publicId = photo.url.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`photo-share/${publicId}`);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
  
  photos = photos.filter(p => p.id !== id);
  res.json({ success: true });
});

// Get album stats
app.get('/api/stats', (req, res) => {
  const stats = albums.map(album => ({
    ...album,
    photoCount: photos.filter(p => p.albumId === album.id).length
  }));
  res.json(stats);
});

// Catch-all handler: send back React's index.html file for any non-API route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Photo share server running on port ${PORT}`);
});
