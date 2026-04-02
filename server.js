const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('photo-share');
    console.log('Connected to MongoDB');
    
    // Create default album if none exists
    const albumsCollection = db.collection('albums');
    const defaultAlbum = await albumsCollection.findOne({ id: 'default' });
    if (!defaultAlbum) {
      await albumsCollection.insertOne({
        id: 'default',
        name: 'All Photos',
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

connectDB();

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

// Get all albums
app.get('/api/albums', async (req, res) => {
  try {
    const albums = await db.collection('albums').find({}).toArray();
    res.json(albums);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new album
app.post('/api/albums', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Album name required' });
    }
    
    const album = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString()
    };
    
    await db.collection('albums').insertOne(album);
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete album
app.delete('/api/albums/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'default') {
      return res.status(400).json({ error: 'Cannot delete default album' });
    }
    
    // Move photos to default album
    await db.collection('photos').updateMany(
      { albumId: id },
      { $set: { albumId: 'default' } }
    );
    
    await db.collection('albums').deleteOne({ id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename album
app.put('/api/albums/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    await db.collection('albums').updateOne(
      { id },
      { $set: { name } }
    );
    
    const album = await db.collection('albums').findOne({ id });
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get photos (optionally filtered by album)
app.get('/api/photos', async (req, res) => {
  try {
    const { albumId } = req.query;
    let query = {};
    if (albumId && albumId !== 'all') {
      query = { albumId };
    }
    
    const photos = await db.collection('photos')
      .find(query)
      .sort({ uploadedAt: -1 })
      .toArray();
    
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload photo
app.post('/api/upload', upload.single('file'), async (req, res) => {
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

    await db.collection('photos').insertOne(photo);
    res.json(photo);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Update photo (caption, album)
app.put('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, albumId } = req.body;
    
    const update = {};
    if (caption !== undefined) update.caption = caption;
    if (albumId !== undefined) update.albumId = albumId;
    
    await db.collection('photos').updateOne(
      { id },
      { $set: update }
    );
    
    const photo = await db.collection('photos').findOne({ id });
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete photo
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await db.collection('photos').findOne({ id });
    
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
    
    await db.collection('photos').deleteOne({ id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get album stats
app.get('/api/stats', async (req, res) => {
  try {
    const albums = await db.collection('albums').find({}).toArray();
    const stats = await Promise.all(
      albums.map(async (album) => {
        const count = await db.collection('photos').countDocuments({ albumId: album.id });
        return { ...album, photoCount: count };
      })
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from frontend build (AFTER API routes)
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Catch-all handler: send back React's index.html file for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Photo share server running on port ${PORT}`);
});
