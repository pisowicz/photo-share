import { useState, useEffect, useCallback } from 'react'
import './App.css'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const API_URL = 'http://localhost:3003'

function App() {
  const [photos, setPhotos] = useState([])
  const [albums, setAlbums] = useState([])
  const [currentAlbum, setCurrentAlbum] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [showNewAlbum, setShowNewAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [editAlbumName, setEditAlbumName] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedPhotos, setSelectedPhotos] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)

  useEffect(() => {
    fetchAlbums()
    fetchPhotos()
  }, [currentAlbum])

  const fetchAlbums = async () => {
    try {
      const response = await fetch(`${API_URL}/api/albums`)
      const data = await response.json()
      setAlbums(data)
    } catch (error) {
      console.error('Error fetching albums:', error)
    }
  }

  const fetchPhotos = async () => {
    try {
      const url = currentAlbum === 'all' 
        ? `${API_URL}/api/photos`
        : `${API_URL}/api/photos?albumId=${currentAlbum}`
      const response = await fetch(url)
      const data = await response.json()
      setPhotos(data)
    } catch (error) {
      console.error('Error fetching photos:', error)
    }
  }

  const createAlbum = async () => {
    if (!newAlbumName.trim()) return
    
    try {
      const response = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAlbumName })
      })
      
      if (response.ok) {
        setNewAlbumName('')
        setShowNewAlbum(false)
        fetchAlbums()
      }
    } catch (error) {
      console.error('Error creating album:', error)
    }
  }

  const deleteAlbum = async (albumId) => {
    if (!confirm('Delete this album? Photos will move to All Photos.')) return
    
    try {
      await fetch(`${API_URL}/api/albums/${albumId}`, { method: 'DELETE' })
      if (currentAlbum === albumId) setCurrentAlbum('all')
      fetchAlbums()
      fetchPhotos()
    } catch (error) {
      console.error('Error deleting album:', error)
    }
  }

  const renameAlbum = async (albumId) => {
    if (!editAlbumName.trim()) return
    
    try {
      await fetch(`${API_URL}/api/albums/${albumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editAlbumName })
      })
      setEditingAlbum(null)
      fetchAlbums()
    } catch (error) {
      console.error('Error renaming album:', error)
    }
  }

  const deletePhoto = async (photoId, e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    try {
      const response = await fetch(`${API_URL}/api/photos/${photoId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        fetchPhotos()
        setSelectedPhotos(prev => {
          const newSet = new Set(prev)
          newSet.delete(photoId)
          return newSet
        })
        if (selectedPhoto?.id === photoId) setSelectedPhoto(null)
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
    }
  }

  const deleteSelectedPhotos = async () => {
    if (!confirm(`Delete ${selectedPhotos.size} photos?`)) return
    
    for (const photoId of selectedPhotos) {
      await deletePhoto(photoId)
    }
    setSelectMode(false)
    setSelectedPhotos(new Set())
  }

  const movePhoto = async (photoId, albumId) => {
    try {
      await fetch(`${API_URL}/api/photos/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId })
      })
      fetchPhotos()
    } catch (error) {
      console.error('Error moving photo:', error)
    }
  }

  const togglePhotoSelection = (photoId, e) => {
    e.stopPropagation()
    const newSelected = new Set(selectedPhotos)
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId)
    } else {
      newSelected.add(photoId)
    }
    setSelectedPhotos(newSelected)
  }

  const selectAllPhotos = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set())
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)))
    }
  }

  const downloadPhotoWithSaveAs = async (photo) => {
    try {
      // Open the image in a new tab - user can right-click and Save As
      window.open(photo.url, '_blank')
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to open photo. Please try again.')
    }
  }

  const downloadSelectedPhotosAsZip = async () => {
    const selectedPhotosList = photos.filter(p => selectedPhotos.has(p.id))
    
    if (selectedPhotosList.length === 0) return
    
    // Open selected photos in new tabs
    alert(`Opening ${selectedPhotosList.length} photos in new tabs. You can save each one using Ctrl+S (or Cmd+S on Mac).`)
    
    for (let i = 0; i < selectedPhotosList.length; i++) {
      setTimeout(() => {
        window.open(selectedPhotosList[i].url, '_blank')
      }, i * 500)
    }
    
    setSelectMode(false)
    setSelectedPhotos(new Set())
  }

  const downloadAllPhotosAsZip = async () => {
    if (photos.length === 0) {
      alert('No photos to download')
      return
    }
    
    console.log('Starting ZIP download for', photos.length, 'photos')
    
    try {
      const zip = new JSZip()
      
      // Add each photo to the zip
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        console.log(`Fetching photo ${i + 1}/${photos.length}: ${photo.filename}`)
        
        const response = await fetch(photo.url)
        if (!response.ok) {
          console.error(`Failed to fetch ${photo.filename}`)
          continue
        }
        
        const blob = await response.blob()
        zip.file(photo.filename, blob)
      }
      
      console.log('All photos added, generating ZIP...')
      
      // Generate ZIP with progress callback
      const content = await zip.generateAsync(
        { type: 'blob' },
        (metadata) => {
          console.log(`ZIP progress: ${metadata.percent.toFixed(0)}%`)
        }
      )
      
      console.log('ZIP generated, size:', (content.size / 1024 / 1024).toFixed(2), 'MB')
      
      // Use FileReader to convert blob to data URL (more compatible)
      const reader = new FileReader()
      reader.onload = function(e) {
        const dataUrl = e.target.result
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `photos-${new Date().toISOString().split('T')[0]}.zip`
        link.style.display = 'none'
        document.body.appendChild(link)
        
        // Trigger click in a user-initiated context
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        })
        link.dispatchEvent(clickEvent)
        
        setTimeout(() => {
          document.body.removeChild(link)
          console.log('Download link clicked')
        }, 100)
      }
      
      reader.onerror = function(e) {
        console.error('FileReader error:', e)
        alert('Failed to prepare download')
      }
      
      reader.readAsDataURL(content)
      
    } catch (error) {
      console.error('ZIP creation error:', error)
      alert('Failed to create ZIP: ' + error.message)
    }
  }

  const handleUpload = async (files) => {
    if (!files.length) return
    
    setUploading(true)
    
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('albumId', currentAlbum === 'all' ? 'default' : currentAlbum)
      
      try {
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const newPhoto = await response.json()
          setPhotos(prev => [newPhoto, ...prev])
        }
      } catch (error) {
        console.error('Upload error:', error)
      }
    }
    
    setUploading(false)
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files)
    }
  }, [])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const currentAlbumName = currentAlbum === 'all' 
    ? 'All Photos' 
    : albums.find(a => a.id === currentAlbum)?.name || 'All Photos'

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>📸 Photo Share</h1>
        </div>
        
        <nav className="album-nav">
          <div 
            className={`album-item ${currentAlbum === 'all' ? 'active' : ''}`}
            onClick={() => setCurrentAlbum('all')}
          >
            <span className="album-icon">🖼️</span>
            <span className="album-name">All Photos</span>
            <span className="album-count">{photos.length}</span>
          </div>
          
          {albums.filter(a => a.id !== 'default').map(album => (
            <div 
              key={album.id}
              className={`album-item ${currentAlbum === album.id ? 'active' : ''}`}
              onClick={() => setCurrentAlbum(album.id)}
            >
              <span className="album-icon">📁</span>
              {editingAlbum === album.id ? (
                <input
                  type="text"
                  value={editAlbumName}
                  onChange={(e) => setEditAlbumName(e.target.value)}
                  onBlur={() => renameAlbum(album.id)}
                  onKeyPress={(e) => e.key === 'Enter' && renameAlbum(album.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="album-name">{album.name}</span>
              )}
              <span className="album-count">
                {photos.filter(p => p.albumId === album.id).length}
              </span>
              <div className="album-actions">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingAlbum(album.id)
                    setEditAlbumName(album.name)
                  }}
                  title="Rename"
                >
                  ✏️
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteAlbum(album.id)
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </nav>
        
        {showNewAlbum ? (
          <div className="new-album-form">
            <input
              type="text"
              placeholder="Album name"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createAlbum()}
              autoFocus
            />
            <div className="new-album-buttons">
              <button onClick={createAlbum}>Create</button>
              <button onClick={() => setShowNewAlbum(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="new-album-btn" onClick={() => setShowNewAlbum(true)}>
            + New Album
          </button>
        )}
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h2>{currentAlbumName}</h2>
          <div className="header-actions">
            {photos.length > 0 && (
              <>
                <button 
                  className="download-all-btn"
                  onClick={downloadAllPhotosAsZip}
                  title="Download all photos as ZIP"
                >
                  ⬇️ Download All (ZIP)
                </button>
                <button 
                  className={`select-mode-btn ${selectMode ? 'active' : ''}`}
                  onClick={() => {
                    setSelectMode(!selectMode)
                    setSelectedPhotos(new Set())
                  }}
                >
                  {selectMode ? 'Cancel' : 'Select'}
                </button>
              </>
            )}
            <div className="view-toggle">
              <button 
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
              >
                ⊞
              </button>
              <button 
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                ☰
              </button>
            </div>
          </div>
        </header>

        {selectMode && selectedPhotos.size > 0 && (
          <div className="selection-bar">
            <span>{selectedPhotos.size} selected</span>
            <div className="selection-actions">
              <button onClick={selectAllPhotos}>
                {selectedPhotos.size === photos.length ? 'Deselect All' : 'Select All'}
              </button>
              <button onClick={downloadSelectedPhotosAsZip} className="download-btn">
                ⬇️ Download Selected (ZIP)
              </button>
              <button onClick={deleteSelectedPhotos} className="delete-btn-bar">
                🗑️ Delete Selected
              </button>
            </div>
          </div>
        )}

        <div 
          className={`upload-area ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <p>Drag & drop photos and videos here</p>
            <p className="or">or</p>
            <label className="upload-button">
              <input 
                type="file" 
                multiple 
                accept="image/*,video/*"
                onChange={(e) => handleUpload(e.target.files)}
                hidden
              />
              Choose Files
            </label>
            {uploading && <p className="uploading">Uploading...</p>}
          </div>
        </div>

        <div className={`gallery ${viewMode}`}>
          {photos.length === 0 ? (
            <div className="empty-state">
              <p>No photos in this album yet.</p>
              <p>Upload some memories!</p>
            </div>
          ) : (
            <div className={`photo-${viewMode}`}>
              {photos.map(photo => (
                <div 
                  key={photo.id} 
                  className={`photo-item ${selectedPhotos.has(photo.id) ? 'selected' : ''}`}
                >
                  {selectMode && (
                    <div 
                      className="photo-checkbox"
                      onClick={(e) => togglePhotoSelection(photo.id, e)}
                    >
                      {selectedPhotos.has(photo.id) ? '☑️' : '⬜'}
                    </div>
                  )}
                  <div onClick={() => !selectMode && setSelectedPhoto(photo)}>
                    {photo.type === 'video' ? (
                      <div className="video-thumbnail">
                        <img src={photo.thumbnail} alt={photo.filename} loading="lazy" />
                        <div className="play-icon">▶</div>
                      </div>
                    ) : (
                      <img src={photo.thumbnail} alt={photo.filename} loading="lazy" />
                    )}
                  </div>
                  {!selectMode && (
                    <>
                      <button 
                        className="delete-btn"
                        onClick={(e) => deletePhoto(photo.id, e)}
                        title="Delete photo"
                      >
                        ×
                      </button>
                      <button 
                        className="download-btn-single"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadPhotoWithSaveAs(photo)
                        }}
                        title="Download photo"
                      >
                        ⬇️
                      </button>
                    </>
                  )}
                  <div className="photo-overlay">
                    <span className="photo-date">{formatDate(photo.uploadedAt)}</span>
                    {!selectMode && (
                      <div className="photo-actions">
                        <select
                          value={photo.albumId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => movePhoto(photo.id, e.target.value)}
                        >
                          {albums.map(album => (
                            <option key={album.id} value={album.id}>{album.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  {photo.caption && <p className="photo-caption">{photo.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedPhoto && (
        <div className="lightbox" onClick={() => setSelectedPhoto(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedPhoto(null)}>×</button>
            <button 
              className="download-btn-lightbox"
              onClick={() => downloadPhotoWithSaveAs(selectedPhoto)}
            >
              ⬇️ Download
            </button>
            {selectedPhoto.type === 'video' ? (
              <video src={selectedPhoto.url} controls autoPlay />
            ) : (
              <img src={selectedPhoto.url} alt={selectedPhoto.filename} />
            )}
            <div className="lightbox-info">
              <p>{selectedPhoto.filename}</p>
              <p className="date">{formatDate(selectedPhoto.uploadedAt)}</p>
              <select
                value={selectedPhoto.albumId}
                onChange={(e) => {
                  movePhoto(selectedPhoto.id, e.target.value)
                  setSelectedPhoto({...selectedPhoto, albumId: e.target.value})
                }}
              >
                {albums.map(album => (
                  <option key={album.id} value={album.id}>{album.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
