import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Navbar from "../components/Navbar";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dhdzuwakd";
const CLOUDINARY_UPLOAD_PRESET = "uuouov8i";

function PhotoUpload() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const previousState = location.state || {};
  const MIN_PHOTOS = 5;

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [photos, setPhotos] = useState(
    previousState.photoFiles ||
    (previousState.photoUrls
      ? previousState.photoUrls.map((url) => ({ file: null, preview: url, url }))
      : [])
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedUploads, setFailedUploads] = useState([]);
  const [draftId, setDraftId] = useState(previousState.draftId || previousState.listingDraftId || "");

  // Retrieve state from previous step
  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const isExperience = selectedType.toLowerCase() === "experience";
  const isService = selectedType.toLowerCase() === "service";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;
  const amenities = previousState.amenities || [];
  const currentPhotoUrls = photos.filter((photo) => photo.url).map((photo) => photo.url);

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
      if (!draftId) {
        const generated = previousState.draftId || previousState.listingDraftId || `draft_${user.uid}_${Date.now()}`;
        setDraftId(generated);
      }
    }
  }, []);

  useEffect(() => {
    if (window.__PhotoUploadNetworkDebugInstalled) return undefined;
    window.__PhotoUploadNetworkDebugInstalled = true;

    const originalXHROpen = window.XMLHttpRequest.prototype.open;
    const originalXHRSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
    const originalXHRSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
      this.__debugMethod = method;
      this.__debugUrl = url;
      this.__debugHeaders = {};
      return originalXHROpen.apply(this, [method, url, async, user, password]);
    };

    window.XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      if (!this.__debugHeaders) {
        this.__debugHeaders = {};
      }
      this.__debugHeaders[header] = value;
      return originalXHRSetRequestHeader.apply(this, [header, value]);
    };

    window.XMLHttpRequest.prototype.send = function (body) {
      const onError = () => {
        console.warn('Network request failed for PhotoUpload debug:', {
          method: this.__debugMethod,
          url: this.__debugUrl,
          status: this.status,
          statusText: this.statusText,
          requestHeaders: this.__debugHeaders,
          requestBody: body,
        });
      };

      this.addEventListener('error', onError);
      this.addEventListener('abort', onError);
      this.addEventListener('load', () => {
        if (this.status >= 400) {
          console.warn('Network request returned error status for PhotoUpload debug:', {
            method: this.__debugMethod,
            url: this.__debugUrl,
            status: this.status,
            statusText: this.statusText,
            requestHeaders: this.__debugHeaders,
            responseHeaders: this.getAllResponseHeaders(),
          });
        }
      });

      return originalXHRSend.apply(this, [body]);
    };

    return () => {
      window.XMLHttpRequest.prototype.open = originalXHROpen;
      window.XMLHttpRequest.prototype.setRequestHeader = originalXHRSetRequestHeader;
      window.XMLHttpRequest.prototype.send = originalXHRSend;
      delete window.__PhotoUploadNetworkDebugInstalled;
    };
  }, []);

  const uploadErrorMessage = (error) => {
    const message = error?.message || String(error || 'Unknown error');
    if (/network error|failed/.test(message.toLowerCase())) {
      return 'Upload failed due to network error. Please check your connection and try again.';
    }
    return message;
  };

  const fileToDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const savePhotoToFirestore = async (file, user, draftIdLocal) => {
    const dataUrl = await fileToDataURL(file);
    await addDoc(collection(db, 'listingDrafts', draftIdLocal, 'photos'), {
      url: dataUrl,
      fileName: file.name,
      contentType: file.type,
      userId: user.uid,
      createdAt: serverTimestamp(),
      storageFallback: true,
    });
    return dataUrl;
  };

  const handleBack = () => {
    navigate("/host/create-listing/amenities", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        photoFiles: photos,
        photoUrls: currentPhotoUrls,
        draftId,
      },
    });
  };

  const handleNext = async () => {
    if (photos.length < MIN_PHOTOS) {
      alert(`Please add at least ${MIN_PHOTOS} photos before proceeding.`);
      return;
    }

    let updatedPhotos = photos;
    if (photos.some((photo) => photo.file)) {
      try {
        updatedPhotos = await uploadPendingPhotos(photos);
      } catch (err) {
        console.error('Upload failed on Next:', err);
        setLastUploadError(uploadErrorMessage(err));
        setFailedUploads(photos.filter((p) => p.file).map((p) => p.file));
        setIsUploading(false);
        alert(`Upload failed: ${uploadErrorMessage(err)}`);
        return;
      }
    }

    if (updatedPhotos.some((photo) => photo.file)) {
      alert('Some photos still need to finish uploading before continuing. Please try again.');
      return;
    }

    const uploadedUrls = updatedPhotos.filter((photo) => photo.url).map((photo) => photo.url);

    if (uploadedUrls.length < MIN_PHOTOS) {
      alert(`Please make sure at least ${MIN_PHOTOS} photos are uploaded before continuing.`);
      return;
    }

    navigate('/host/create-listing/title', {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        photoFiles: updatedPhotos,
        photoUrls: uploadedUrls,
        draftId,
      },
    });
  };

  const handleUploadSelected = async () => {
    if (!photos.some((photo) => photo.file)) {
      alert('Select at least one new photo before uploading.');
      return;
    }

    try {
      await uploadPendingPhotos(photos);
    } catch (err) {
      console.error('Upload selected photos failed:', err);
      setLastUploadError(uploadErrorMessage(err));
      setFailedUploads(photos.filter(p => p.file).map(p => p.file));
      setIsUploading(false);
      alert(`Upload failed: ${uploadErrorMessage(err)}`);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
      if (files.length === 0) return;
      const newPhotos = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      // Do not auto-upload on selection to avoid confusion. Upload manually with the button below.
      // Clear the input value so selecting the same file again will trigger onChange
      try {
        e.target.value = "";
      } catch (err) {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newPhotos = Array.from(e.dataTransfer.files)
        .filter(file => file.type.startsWith('image/'))
        .map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      // Do not auto-upload on drop so the user can choose when to send files.
    }
  };

  // Helper: upload a single File to Cloudinary with retries
  const uploadFileWithRetries = async (file, onProgress) => {
    const maxAttempts = 5;
    let attempt = 0;
    let lastErr = null;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        console.log(`Upload attempt ${attempt} start for`, file.name, 'size:', file.size);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        // eslint-disable-next-line no-loop-func
        return await new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              onProgress && onProgress({ bytesTransferred: e.loaded, totalBytes: e.total, percentComplete });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              console.log(`Upload attempt ${attempt} succeeded for`, file.name);
              resolve(response.secure_url);
            } else {
              let errorMsg = `Upload failed with status ${xhr.status}`;
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMsg += ` - ${errorResponse.error?.message || JSON.stringify(errorResponse)}`;
                console.error('Cloudinary error response:', errorResponse);
              } catch (e) {
                console.error('Cloudinary response body:', xhr.responseText);
              }
              const error = new Error(errorMsg);
              reject(error);
            }
          });

          xhr.addEventListener('error', () => {
            const error = new Error('Upload failed - network error');
            reject(error);
          });

          xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
          xhr.send(formData);
        });
      } catch (err) {
        lastErr = err;
        console.error(`Upload attempt ${attempt} error for ${file.name}:`, err);
        const backoff = Math.min(30 * 1000, Math.pow(2, attempt) * 500);
        if (attempt < maxAttempts) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }
    throw lastErr;
  };

  // Helper: upload multiple files to Cloudinary
  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return [];
    const user = auth.currentUser;
    if (!user) {
      throw new Error('You must be logged in to upload photos.');
    }

    setIsUploading(true);
    setLastUploadError(null);
    setFailedUploads([]);
    setUploadProgress(0);

    const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
    let uploadedBytes = 0;
    let uploadedCount = 0;
    const useEqualWeights = totalBytes === 0;
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // eslint-disable-next-line no-loop-func
        const downloadURL = await uploadFileWithRetries(file, (snapshot) => {
          if (!useEqualWeights) {
            const currentProgress = Math.min(100, Math.round(((uploadedBytes + snapshot.bytesTransferred) / totalBytes) * 100));
            setUploadProgress(currentProgress);
          } else {
            const approx = Math.round(((uploadedCountNum + (snapshot.bytesTransferred > 0 ? 0.5 : 0)) / files.length) * 100);
            setUploadProgress(Math.min(100, approx));
          }
        });

        results.push({ file, url: downloadURL });
        uploadedBytesNum += file.size || 0;
        uploadedCountNum += 1;
        if (!useEqualWeights) {
          setUploadProgress(Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)));
        } else {
          setUploadProgress(Math.min(100, Math.round((uploadedCount / files.length) * 100)));
        }
      } catch (fileErr) {
        const friendlyMessage = uploadErrorMessage(fileErr);
        console.error('Failed to upload file after retries:', file.name, fileErr);

        const draftIdLocal = draftId || `draft_${user.uid}_${Date.now()}`;
        if (!draftId) setDraftId(draftIdLocal);
        try {
          const dataUrl = await savePhotoToFirestore(file, user, draftIdLocal);
          results.push({ file, url: dataUrl, storageFallback: true });
          setStorageFallbackUsed(true);
          uploadedCount += 1;
          setUploadProgress(Math.min(100, Math.round((uploadedCount / files.length) * 100)));
          continue;
        } catch (fallbackErr) {
          console.error('Firestore fallback failed:', fallbackErr);
        }

        setFailedUploads((prev) => [...prev, file]);
        setLastUploadError(friendlyMessage);
        break;
      }
    }

    // Persist metadata for successfully uploaded files to Firestore under a draft
    try {
      const draftIdLocal = draftId || `draft_${user.uid}_${Date.now()}`;
      if (!draftId) setDraftId(draftIdLocal);
      for (const r of results) {
        if (r.storageFallback) continue;
        try {
          await addDoc(collection(db, 'listingDrafts', draftIdLocal, 'photos'), {
            url: r.url,
            fileName: `${r.file.name}`,
            userId: user.uid,
            createdAt: serverTimestamp(),
          });
        } catch (metaErr) {
          console.error('Failed to save photo metadata to Firestore', metaErr);
        }
      }
    } catch (e) {
      console.error('Error saving photo metadata for draft:', e);
    }

    setUploadProgress(100);
    setIsUploading(false);
    return results;
  };

  const uploadPendingPhotos = async (photoList) => {
    if (!photoList || photoList.length === 0) return photoList;
    const pendingPhotos = photoList.filter((photo) => photo.file);
    if (pendingPhotos.length === 0) return photoList;

    const results = await uploadFiles(pendingPhotos.map((photo) => photo.file));
    const updatedPhotos = photoList.map((photo) => {
      if (!photo.file) return photo;
      const match = results.find((r) => r.file.name === photo.file.name && r.file.size === photo.file.size && r.file.lastModified === photo.file.lastModified);
      if (match) {
        return { ...photo, file: null, url: match.url };
      }
      return photo;
    });

    setPhotos(updatedPhotos);
    return updatedPhotos;
  };

  // Handle pasted images from the clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e) => {
      try {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items || [];
        const pastedImages = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item) continue;
          // If the clipboard item is a file/blob image
          if (item.type && item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile ? item.getAsFile() : item.getAsBlob();
            if (blob) {
              const fileName = `pasted_${Date.now()}.png`;
              const file = new File([blob], fileName, { type: blob.type });
              pastedImages.push({ file, preview: URL.createObjectURL(file) });
            }
          }
        }

        // Some browsers may expose files directly on clipboardData.files
        if (pastedImages.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
          const files = Array.from(clipboardData.files).filter(f => f.type.startsWith('image/'));
          for (const f of files) {
            pastedImages.push({ file: f, preview: URL.createObjectURL(f) });
          }
        }

        if (pastedImages.length > 0) {
          setPhotos((prevPhotos) => [...prevPhotos, ...pastedImages]);
        }
      } catch (err) {
        console.error('Error handling paste event:', err);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const removePhoto = (indexToRemove) => {
    setPhotos((prev) => prev.filter((_, index) => index !== indexToRemove));
  };
    if (!failedUploads || failedUploads.length === 0) return;
    try {
      const results = await uploadFiles(failedUploads);
      // Map results back into photos state
      setPhotos((prev) => prev.map((p) => {
        if (p.file) {
          const match = results.find(r => r.file.name === p.file.name && r.file.size === p.file.size);
          if (match) return { ...p, file: null, url: match.url };
        }
        return p;
      }));
      // remove uploaded files from failedUploads
      setFailedUploads((prev) => prev.filter(f => !results.find(r => r.file.name === f.name && r.file.size === f.size)));
      if (results.length > 0) {
        alert('Retry complete; check console for any remaining failures.');
      }
    } catch (err) {
      console.error('Retry failed:', err);
      alert(`Retry failed: ${err?.message || String(err)}`);
    }
  };

  const setCoverPhoto = (indexToSet) => {
    if (indexToSet === 0) return;
    setPhotos((prev) => {
      const nextPhotos = [...prev];
      const [selectedPhoto] = nextPhotos.splice(indexToSet, 1);
      nextPhotos.unshift(selectedPhoto);
      return nextPhotos;
    });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <main className="host-shell create-listing-page">
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
        homePath="/host"
        isHost
      />

      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed">
          {/* Menu items removed for brevity, assuming standard component later or keeping here if needed. 
              Keeping original menu for consistency. */}
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/account-settings")}> 
            <i className="fa-solid fa-gear" aria-hidden="true" />
            <span>Account settings</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-book-open" aria-hidden="true" />
            <span>Hosting resources</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-circle-question" aria-hidden="true" />
            <span>Get help</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/host/cohosts")}> 
            <i className="fa-solid fa-users" aria-hidden="true" />
            <span>Find a co-host</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/host/create-listing")}> 
            <i className="fa-solid fa-square-plus" aria-hidden="true" />
            <span>Create a new listing</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            <span>Refer a host</span>
          </button>

          <div className="menu-divider" />

          <button type="button" className="menu-item menu-item-icon" onClick={handleLogout}> 
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}

      <section className="create-listing-container">
        <div className="structure-page-card photo-upload-card">
          <div className="structure-page-header">
            <h1 className="create-listing-title">
              {isService ? "Add some photos of your service" : isExperience ? "Add some photos of your experience" : "Add some photos of your house"}
            </h1>
          </div>

          <div className="photo-upload-content">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden-file-input" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {photos.length === 0 ? (
              <div 
                className={`empty-dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <div className="empty-dropzone-content">
                  <i className="fa-solid fa-camera photo-upload-icon"></i>
                  <span className="photo-upload-text">Add photos</span>
                  <span className="photo-upload-subtext">or drag and drop</span>
                </div>
              </div>
            ) : (
              <div className="photo-grid-container">
                <div className="photo-grid-header">
                  <div>
                    <h3>Ta-da! How does this look?</h3>
                    <p className="photo-upload-help">Click a thumbnail to make it the cover photo.</p>
                  </div>
                </div>
                
                <div className="photo-grid">
                  <div className="photo-cover">
                    <span className="photo-badge">Cover Photo</span>
                    <button className="photo-delete-btn" onClick={() => removePhoto(0)} aria-label="Delete cover photo">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M9 3v1H4v2h16V4h-5V3H9z" />
                        <path d="M6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9H6z" />
                      </svg>
                    </button>
                    <img src={photos[0].preview} alt="Cover" />
                  </div>
                  
                  <div className="photo-thumbnails">
                    {photos.slice(1).map((photo, index) => (
                      <div key={index} className="photo-thumbnail">
                        <span className="photo-badge photo-badge-compact" onClick={() => setCoverPhoto(index + 1)} role="button" tabIndex={0}>
                          Set as cover
                        </span>
                        <button className="photo-delete-btn" onClick={() => removePhoto(index + 1)} aria-label={`Delete photo ${index + 1}`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M9 3v1H4v2h16V4h-5V3H9z" />
                            <path d="M6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9H6z" />
                          </svg>
                        </button>
                        <img src={photo.preview} alt={`Thumbnail ${index + 1}`} />
                      </div>
                    ))}
                    
                    <div className="photo-thumbnail add-more-thumbnail" onClick={triggerFileInput}>
                      <div className="add-more-content">
                        <i className="fa-solid fa-plus"></i>
                        <span>Add more</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isUploading && (
            <div className="upload-progress-panel">
              <div className="upload-progress-label">Uploading photos: {uploadProgress}%</div>
              <div className="upload-progress-track">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div className="structure-footer">
            <button type="button" className="create-listing-back-button" onClick={handleBack}>
              Back
            </button>
            <button 
              type="button" 
              className={`create-listing-button ${ photos.length < MIN_PHOTOS || isUploading ? 'disabled-button' : ''}`} 
              onClick={handleNext}
              disabled={photos.length < MIN_PHOTOS || isUploading}
            >
              {isUploading ? `Uploading ${uploadProgress}%...` : 'Next'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PhotoUpload;


