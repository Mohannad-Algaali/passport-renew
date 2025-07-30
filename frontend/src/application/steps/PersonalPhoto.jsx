import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js'
import { useTranslation } from 'react-i18next';

export default function PersonalPhoto(props) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceCanvasRef = useRef(null)
  const [photo, setPhoto] = props.photo
  
  const [photoBlob, setPhotoBlob] = useState(null); // Store as blob for saving
  const [stream, setStream] = useState(null);
  const intervalRef = useRef(null);
  const [isFace,setIsFace] = useState(false)
  const [hasWhiteBackground, setHasWhiteBackground] = useState(false);
  const [isFaceCentered, setIsFaceCentered] = useState(false); // New state for face centering
  const [cameraDimensions, setCameraDimensions] = useState({ width: 0, height: 0 });
  const [error, setError] = useState("");
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  

  useEffect(() => {
    const loadModels = async () => {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
            faceapi.nets.faceRecognitionNet.loadFromUri("/models")
        ]);
    };
    loadModels();
  }, []);

  useEffect(() => {
    const calculateDimensions = () => {
      const aspectRatio = 3/4;
      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight;
      const windowAspectRatio = availableWidth / availableHeight;

      let cameraWidth;
      let cameraHeight;

      if (windowAspectRatio > aspectRatio) {
        // Window is wider than the video, so fit to height.
        cameraHeight = availableHeight;
        cameraWidth = availableHeight * aspectRatio;
      } else {
        // Window is taller or has the same aspect ratio, so fit to width.
        cameraWidth = availableWidth;
        cameraHeight = availableWidth / aspectRatio;
      }
      // Using 90% of the calculated size to leave some margin.
      setCameraDimensions({ width: cameraWidth * 0.9, height: cameraHeight * 0.9 });
    };

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);

    return () => {
      window.removeEventListener('resize', calculateDimensions);
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [stream]);

  const handleVideoPlay = () => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }

  intervalRef.current = setInterval(async () => {
    // Check if video is ready and has valid dimensions
    if (
      videoRef.current && 
      faceCanvasRef.current && 
      !videoRef.current.paused 
    ) {
      
      
      try {
        // Set up the canvas for face detection visualization
        faceCanvasRef.current.width = cameraDimensions.width;
        faceCanvasRef.current.height = cameraDimensions.height;
        
        faceapi.matchDimensions(faceCanvasRef.current, {
          width: cameraDimensions.width,
          height: cameraDimensions.height
        });

        // Detect faces with more lenient options
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416, // Higher resolution for better detection
            scoreThreshold: 0.3 // Lower threshold to catch more faces
          })
        );
        
        
        // Resize detections to match canvas dimensions
        const resizedDetections = faceapi.resizeResults(detections, {
          width: cameraDimensions.width,
          height: cameraDimensions.height
        });

        // Clear and redraw face detection boxes
        const context = faceCanvasRef.current.getContext('2d');
        context.clearRect(0, 0, faceCanvasRef.current.width, faceCanvasRef.current.height);
        
        // Apply mirroring transformation if front camera is used
        if (isFrontCamera) {
          context.save();
          context.scale(-1, 1);
          context.translate(-cameraDimensions.width, 0);
        }
        
        if (resizedDetections.length > 0) {
          // If using front camera, we need to mirror the detection coordinates
          let drawDetections = resizedDetections;
          if (isFrontCamera) {
            drawDetections = resizedDetections.map(detection => {
              const mirroredBox = {
                ...detection.box,
                x: cameraDimensions.width - detection.box.x - detection.box.width
              };
              return {
                ...detection,
                box: mirroredBox
              };
            });
          }
          faceapi.draw.drawDetections(faceCanvasRef.current, drawDetections);
        }
        
        // Restore canvas transformation
        if (isFrontCamera) {
          context.restore();
        }

        // Process face detection results
        if (detections && detections.length > 0) {
          
          
          const face = detections[0];
          const faceScore = face.score;
          let box = face.box;
          
          // Mirror the box coordinates for front camera for calculations
          if (isFrontCamera) {
            box = {
              ...box,
              x: cameraDimensions.width - box.x - box.width
            };
          }

          // Check if face is centered
          const faceCenterX = box.x + box.width / 2;
          const faceCenterY = box.y + box.height / 2;
          const canvasCenterX = cameraDimensions.width / 2;
          const canvasCenterY = cameraDimensions.height / 2;
          
          // Define tolerance for "centered" (as percentage of canvas dimensions)
          const centerToleranceX = cameraDimensions.width * 0.15; // 15% tolerance
          const centerToleranceY = cameraDimensions.height * 0.15; // 15% tolerance
          
          const isXCentered = Math.abs(faceCenterX - canvasCenterX) >= centerToleranceX;
          const isYCentered = Math.abs(faceCenterY - canvasCenterY) <= centerToleranceY;
          const isCentered = isXCentered && isYCentered;

          // Create temporary canvas for background analysis
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = cameraDimensions.width;
          tempCanvas.height = cameraDimensions.height;
          
          // Draw the current video frame
          drawVideoToCanvas(tempCtx, videoRef.current, cameraDimensions.width, cameraDimensions.height);

          // Sample corner points for white background detection
          const samplePoints = [
            { x: 0, y: 0 },
            { x: tempCanvas.width - 1, y: 0 },
            { x: 0, y: tempCanvas.height - 1 },
            { x: tempCanvas.width - 1, y: tempCanvas.height - 1 }
          ];

          let whitePixelCount = 0;
          const whiteThreshold = 100; // More reasonable threshold for white detection

          samplePoints.forEach(point => {
            // Only sample points outside the face bounding box
            if (point.x < box.x || point.x > box.x + box.width || 
                point.y < box.y || point.y > box.y + box.height) {
              const pixelData = tempCtx.getImageData(point.x, point.y, 1, 1).data;
              const isWhite = pixelData[0] > whiteThreshold && 
                            pixelData[1] > whiteThreshold && 
                            pixelData[2] > whiteThreshold;
              if (isWhite) {
                whitePixelCount++;
              }
            }
          });

          // Update state based on detection results
          const hasGoodFace = faceScore >= 0.4; // Slightly lower threshold for better UX
          const hasWhiteBg = whitePixelCount >= 3;
          
          setIsFace(hasGoodFace);
          setHasWhiteBackground(hasWhiteBg);
          setIsFaceCentered(isCentered);
          
          
        } else {
          // No faces detected
          console.log('No faces detected');
          setIsFace(false);
          setHasWhiteBackground(false);
          setIsFaceCentered(false);
        }
        
      } catch (error) {
        console.error('Face detection error:', error);
        // Don't update state on error to avoid flickering
      }
    }
  }, 100); // Slightly longer interval to reduce CPU usage
};

  // Helper function to draw video to canvas with proper cropping for aspect ratio
  const drawVideoToCanvas = (ctx, video, targetWidth, targetHeight) => {
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    const targetAspectRatio = targetWidth / targetHeight;
    
    let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;
    
    if (videoAspectRatio > targetAspectRatio) {
      // Video is wider than target, crop horizontally
      sWidth = video.videoHeight * targetAspectRatio;
      sx = (video.videoWidth - sWidth) / 2;
    } else {
      // Video is taller than target, crop vertically
      sHeight = video.videoWidth / targetAspectRatio;
      sy = (video.videoHeight - sHeight) / 2;
    }
    
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
  };

  const startCamera = async () => {
    try {
      setPhoto(null);
      setPhotoBlob(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Request camera with preferred resolution
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      setStream(cameraStream);
      const videoTrack = cameraStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      setIsFrontCamera(settings.facingMode === 'user');
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    setStream(null);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    
    // Set canvas to desired aspect ratio
    canvas.width = cameraDimensions.width;
    canvas.height = cameraDimensions.height;
    
    // Draw video to canvas with proper cropping
    drawVideoToCanvas(context, video, cameraDimensions.width, cameraDimensions.height);
    
    // Get image data as PNG
    const imageDataURL = canvas.toDataURL('image/png');
    setPhoto(imageDataURL);
    
    // Convert to blob for saving
    canvas.toBlob((blob) => {
      setPhotoBlob(blob);
    }, 'image/png');
    
    stopCamera();
  };

  const retakePhoto = ()=> {
    startCamera()
  }

  // Function to save the image
  

  return (
    <div className=''>
        <div role="alert" className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{t('personalPhotoInstruction')}</span>
        </div>
        
        {/* Status indicators */}
        {stream && (
          <div className="flex justify-center gap-4 mb-4 z-30 absolute top-1/10 w-full">
            <div className={`badge p-auto ${isFace ? 'badge-success' : 'badge-error'}`}>
              {isFace ? t('faceDetected') : t('noFace')}
            </div>
            <div className={`badge p-auto ${isFaceCentered ? 'badge-success' : 'badge-warning'}`}>
              {isFaceCentered ? t('centered') : t('moveToCenter')}
            </div>
            <div className={`badge p-auto ${hasWhiteBackground ? 'badge-success' : 'badge-warning'}`}>
              {hasWhiteBackground ? t('whiteBackground') : t('needWhiteBackground')}
            </div>
          </div>
        )}
        
        {error && <div role="alert" className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
        </div>}
      
      <div className={!photo?' min-h-50 flex justify-center align-middle border-2 m-4 border-dashed rounded-2xl':""}>
        {!stream && !photo ? (
          <button
          className="btn-primary btn m-auto" 
            onClick={startCamera}
            text="StartCamera"

          >
            {t('startCamera')}
          </button>
        ) : null}

      </div>

      <div className={stream ? "bg-white absolute top-0 left-0  w-full h-dvh flex align-middle justify-center z-10" : 'none'}>

         {stream && (
          <div className='absolute bottom-1/12 gap-10 flex justify-center z-20'>
            <button 
            className='btn'
              onClick={stopCamera}
            >
              {t('cancel')}
            </button>
            <button 
            className='btn btn-primary'
              onClick={takePhoto}
               disabled={!isFace || !isFaceCentered}
            >
              {t('takePhoto')}
            </button>
          </div>
        )}

        {photo && (
          <div className='flex space-x-10 justify-center p-10 z-10'>
            <button 
                onClick={() => {
                    setPhoto(null)
                    setPhotoBlob(null)
                }}
                className="btn"
            >
              {t('remove')}
            </button>
            <button 
                onClick={retakePhoto}
                className="btn"
                text="Retake"
            >
                {t('retake')}
            </button>
            
          </div>
        )}
      
        <div className='w-full h-full flex justify-center items-center'>
          <video 
            ref={videoRef} 
            autoPlay 
            muted
            onPlay={handleVideoPlay}
            className={`${stream && !photo ? ('m-auto '+isFrontCamera?"-scale-x-100":"") : 'hidden'}`}
            style={{
              width:cameraDimensions.width,
              height:cameraDimensions.height,
              objectFit: 'cover',
            }}
          />

          {/* {stream&&<div className={`absolute p-[25%] border-dashed rounded-full min-w-[${cameraDimensions.width}px] min-h-[${cameraDimensions.height}px] border-green-400 border-2 ${!stream?"none hidden":""}`}>

          </div>} */}
          <canvas
          ref={faceCanvasRef}
          className={`absolute opacity-40 ${!stream?`none hidden ${isFrontCamera?"-scale-x-100":""}`:""}`}
          style={{
              width:cameraDimensions.width,
              height:cameraDimensions.height,
              objectFit: 'cover',
              transform: 'scaleX(-1)'

              
          }}
          />
            
      
        </div>

        <canvas 
          ref={canvasRef} 
          // className={photo ? 'mx-auto my-10 p-4 border-4 border-gray-400 border-dashed' : 'hidden'}
          className='hidden none'
          style={{
            width: `${cameraDimensions.width/2}px`,
            height: `${cameraDimensions.height/2}px`
          }}
        />
        <img src={photo} alt="personal photo"
        className={photo ? 'mx-auto my-10 p-4 border-4 border-gray-400 border-dashed' : 'hidden'} 
         style={{
            width: `${cameraDimensions.width/2}px`,
            height: `${cameraDimensions.height/2}px`
          }}
          />

      </div>
    </div>
  );
}