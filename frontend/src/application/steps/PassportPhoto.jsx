import React, { useRef, useState, useEffect } from 'react';
import Tesseract from 'tesseract.js'
import { useTranslation } from 'react-i18next';

export function PassportPhoto(props) {
    const { t } = useTranslation();
    const [photo, setPhoto] = props.photo
    const [photoBlob, setPhotoBlob] = useState(null)
    const [stream, setStream] = useState(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const intervalRef = useRef(null)
    const [cameraDimensions, setCameraDimensions] = useState({width: 0, height: 0})
    const [error, setError] = useState("");
    
    // New states for document detection and text extraction
    const [documentDetected, setDocumentDetected] = useState(false)
    const [isProcessingText, setIsProcessingText] = useState(false)
    const [sdnDetected, setSdnDetected] = useState(false)
    const [extractedText, setExtractedText] = useState("")

    useEffect(() => {
        const calculateDimensions = () => {
          const aspectRatio = 4/3;
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
    
    // CRITICAL: Effect to connect stream to video element
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        } else if (!stream && videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [stream]);

    // Document detection using edge detection
    const detectDocument = (canvas) => {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert to grayscale and apply simple edge detection
        let edgeCount = 0;
        const threshold = 50;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Simple edge detection by checking neighboring pixels
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            if (x > 0 && x < canvas.width - 1 && y > 0 && y < canvas.height - 1) {
                const nextPixelIndex = i + 4;
                const nextR = data[nextPixelIndex];
                const nextG = data[nextPixelIndex + 1];
                const nextB = data[nextPixelIndex + 2];
                const nextGray = 0.299 * nextR + 0.587 * nextG + 0.114 * nextB;
                
                if (Math.abs(gray - nextGray) > threshold) {
                    edgeCount++;
                }
            }
        }
        
        // If we have enough edges, likely a document is present
        const edgeRatio = edgeCount / (canvas.width * canvas.height);
        return edgeRatio < 0.001; // Adjust this threshold as needed
    };

    const startCamera = async () => {
        try {
            setPhoto(null);
            setSdnDetected(false);
            setExtractedText("");
            // Request camera with preferred resolution
            const cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: { ideal: 'environment' }
                }
            });
            setStream(cameraStream);
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    }  
    
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }
    
    const cancel = () => {
        // Properly stop camera and reset states
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setPhoto(null);
        setStream(null);
        setPhotoBlob(null);
        setDocumentDetected(false);
        setSdnDetected(false);
        setExtractedText("");
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }

    const handlePlay = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
            if (!videoRef.current) return;
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = cameraDimensions.width;
            tempCanvas.height = cameraDimensions.height;
            drawVideoToCanvas(tempCtx, videoRef.current, cameraDimensions.width, cameraDimensions.height);
            
            // Check for document presence
            const hasDocument = detectDocument(tempCanvas);
            setDocumentDetected(hasDocument);
        }, 500) // Check every 500ms to avoid performance issues
    }
    
    const takePhoto = async () => {
        const video = videoRef.current;
        if (!video) {
            console.log("no video");
            return;
        }

        // Create a new canvas for the final photo
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas to desired aspect ratio
        canvas.width = cameraDimensions.width;
        canvas.height = cameraDimensions.height;
        
        // Draw video to canvas with proper cropping
        drawVideoToCanvas(context, video, cameraDimensions.width, cameraDimensions.height);
        
        // Get image data as PNG
        const imageDataURL = canvas.toDataURL('image/png');
        setPhoto(imageDataURL);
        
        // Convert to blob for saving and text extraction
        canvas.toBlob(async (blob) => {
            setPhotoBlob(blob);
            
            // Extract text from the captured image
            setIsProcessingText(true);
            try {
                const text = await extractTextOptimized(blob);
                setExtractedText(text);
                console.log(text)
                
                // Check for SDN in the text
                const hasSDN = checkForSDN(text);
                if (hasSDN) {
                    setSdnDetected(true);
                    setError("");
                } else {
                    setPhoto(null)
                    setError(t('sdnNotDetected'));
                }
            } catch (err) {
                console.error('Text extraction error:', err);
                setError(t('failedToExtractText'));
            } finally {
                setIsProcessingText(false);
            }
        }, 'image/png');
        
        stopCamera();
    }

    const drawVideoToCanvas = (ctx, video, targetWidth, targetHeight) => {
        if(!video){
            return
        }
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

    // Fixed Tesseract implementation
    async function extractTextOptimized(imageFile) {
        try {
            console.log('Starting text extraction...');
            
            // Use the direct recognize method with options
            const { data: { text } } = await Tesseract.recognize(
                imageFile,
                'eng',
                {
                    logger: m => console.log('Tesseract progress:', m),
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.:/- ',
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                }
            );
            
            console.log('Text extraction completed');
            return text;
        } catch (error) {
            console.error('Tesseract error:', error);
            throw error;
        }
    }

    // Function to check for SDN in text
    const checkForSDN = (text) => {
        const cleanText = text.toUpperCase().replace(/\s+/g, ' ').replace(/[|]/g, 'I');
        console.log('Checking for SDN in text:', cleanText);
        const commonFields = [
            'SDN', 'SUDAN', 'PC', 'PASSPORT'
        ]
        for (const field in commonFields){
            if (cleanText.includes(field)){
                return true
            }
        }
        
        return false;
    };
   
    return (
        <>
            <div role="alert" className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{t('passportPhotoInstruction')}</span>
            </div>
            
            {error && <div role="alert" className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
            </div>}

            {sdnDetected && (
                <div role="alert" className="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{t('sdnDetected')}</span>
                </div>
            )}

            {isProcessingText && (
                <div role="alert" className="alert alert-info">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>{t('processingAndChecking')}</span>
                </div>
            )}
            
            {!stream && !photo && (
                <div className="min-h-50 flex justify-center align-middle rounded-2xl border-2 m-4 border-dashed">
                    <button
                        className=" btn btn-primary m-auto" 
                        onClick={startCamera}
                    >
                        {t('startCamera')}
                    </button>
                </div>
            )}
            
            {stream && !photo && (
                <div className='bg-white absolute top-0 left-0  w-full h-dvh flex align-middle justify-center z-10'>
                    <video 
                        className='my-auto -scale-x-100'
                        autoPlay
                        onPlay={handlePlay}
                        muted
                        ref={videoRef}
                        style={{
                            width: cameraDimensions.width,
                            height: cameraDimensions.height,
                            objectFit: "cover"
                        }}
                    />

                    {/* Document detection overlay */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-dashed rounded-2xl transition-colors ${
                        documentDetected ? 'border-green-400' : 'border-white'
                    }`}
                      style={{
                            width: cameraDimensions.width * 0.9,
                            height: cameraDimensions.height * 0.9,
                            objectFit: "cover"
                        }}
                    >
                        {/* Document detection indicator */}
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-sm font-bold ${
                            documentDetected 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                        }`}>
                            {documentDetected ? t('documentDetected') : t('noDocument')}
                        </div>
                    </div>

                    <div className='flex justify-center gap-10 pt-5 absolute bottom-20'>
                        <button onClick={stopCamera} className='btn'>{t('cancel')}</button>
                        <button 
                            onClick={takePhoto} 
                            className={`btn ${documentDetected ? 'btn-primary' : 'btn-disabled'}`}
                            disabled={!documentDetected}
                        >
                            {documentDetected ? t('takePhoto') : t('positionDocument')}
                        </button>
                    </div>
                </div>
            )}
            
            {photo && (
                <div className='flex flex-col items-center m-10'>
                    <img 
                        className='p-4 border-4 border-gray-400 border-dashed'
                        style={{
                            width: cameraDimensions.width/2,
                            height: cameraDimensions.height/2,
                            objectFit: "cover"
                        }}
                        src={photo}
                        alt="Captured passport"
                    />
                    
                    {/* Show extracted text for debugging */}
                    {extractedText && (
                        <div className="mt-4 p-4 bg-gray-100 rounded max-w-full overflow-auto">
                            <h4 className="font-bold">Extracted Text:</h4>
                            <pre className="text-xs whitespace-pre-wrap">{extractedText}</pre>
                        </div>
                    )}
                    
                    <div className='flex justify-center gap-10 pt-5'>
                        <button onClick={cancel} className='btn'>{t('remove')}</button>
                        <button onClick={startCamera} className='btn'>{t('retake')}</button>
                    </div>
                </div>
            )}
        </>
    )
}