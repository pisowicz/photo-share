// api/albums.js
const { getAlbums, createAlbum, deleteAlbum, renameAlbum } = require('../lib/data');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        const albums = await getAlbums();
        return res.json(albums);
      
      case 'POST':
        const { name } = req.body;
        const newAlbum = await createAlbum(name);
        return res.json(newAlbum);
      
      case 'PUT':
        const { id } = req.query;
        const { name: newName } = req.body;
        const updated = await renameAlbum(id, newName);
        return res.json(updated);
      
      case 'DELETE':
        const { id: deleteId } = req.query;
        await deleteAlbum(deleteId);
        return res.json({ success: true });
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Albums API error:', error);
    return res.status(500).json({ error: error.message });
  }
};
