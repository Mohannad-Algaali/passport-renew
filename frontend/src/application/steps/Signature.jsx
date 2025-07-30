import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function Signature(props) {
  const { t } = useTranslation();
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isClear, setIsClear] = useState(true);
  const [photo, setPhoto] = props.photo;
  const maxStrokes = 3;
  const [strokesLeft, setStrokesLeft] = useState(maxStrokes);
  const [error, setError] = useState("");

  
  // Fixed resolution for consistent output
  const CANVAS_WIDTH = 400;  // Fixed width for consistent resolution
  const CANVAS_HEIGHT = 400; // Fixed height for consistent resolution

  useEffect(() => {
    prepareCanvas();
    
    // Handle window resize
    const handleResize = () => {
      prepareCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const prepareCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set fixed internal resolution
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Get the container dimensions for responsive display
    const container = canvas.parentElement;
    const containerWidth = container ? container.clientWidth : window.innerWidth;
    const maxWidth = Math.min(containerWidth - 40, 600); // 20px padding on each side, max 600px
    
    // Calculate responsive display size while maintaining aspect ratio
    const aspectRatio = CANVAS_HEIGHT / CANVAS_WIDTH;
    const displayWidth = maxWidth;
    const displayHeight = displayWidth * aspectRatio;
    
    // Set display size
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Configure drawing context
    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.strokeStyle = "black";
    context.lineWidth = 2; // A bit thicker for better visibility
    contextRef.current = context;
    setIsClear(true);
  };

  const getScaledCoordinates = (nativeEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get coordinates relative to canvas and scale them
    const x = (nativeEvent.clientX - rect.left) * scaleX;
    const y = (nativeEvent.clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  const startDrawing = (event) => {
    if (strokesLeft <= 0) return;
    if (!contextRef.current) {
      prepareCanvas();
      if (!contextRef.current) return;
    }
    
    const { x, y } = getScaledCoordinates(event);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (!contextRef.current || !isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    setIsClear(false);
    const newStrokesLeft = strokesLeft - 1;
    setStrokesLeft(newStrokesLeft);

    if (newStrokesLeft <= 0) {
        handleConfirm();
    }
  };

  const draw = (event) => {
    if (!isDrawing || !contextRef.current) return;
    
    const { x, y } = getScaledCoordinates(event);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const handleMouseDown = (e) => {
    startDrawing(e.nativeEvent);
  };

  const handleMouseMove = (e) => {
    draw(e.nativeEvent);
  };

  const handleMouseUp = () => {
    finishDrawing();
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    startDrawing(e.touches[0]);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    draw(e.touches[0]);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    finishDrawing();
  };

  const clearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return;
    contextRef.current.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setIsClear(true);
    setStrokesLeft(maxStrokes);
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    setPhoto(dataURL);
  };

  const handleRetry = () => {
    setPhoto(null);
    setIsDrawing(false);
    setIsClear(true);
    setStrokesLeft(maxStrokes);
    
    setTimeout(() => {
      if (canvasRef.current && contextRef.current) {
        contextRef.current.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        prepareCanvas();
      }
    }, 0);
  };

  return (
    <div className="w-full min-h-screen/2 flex flex-col px-4">
        <div role="alert" className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{t('signatureInstruction', { maxStrokes })}</span>
        </div>
        {error && <div role="alert" className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
        </div>}
      {!photo && (
        <>
          <div className="text-center mb-2 text-lg font-semibold">
            {t('strokesLeft', {strokesLeft})} 
          </div>
          <div className="flex justify-center w-full my-10">
            <canvas
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves canvas
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              className="bg-white rounded-2xl border-2 border-dashed cursor-crosshair touch-none"
              ref={canvasRef}
              id="sign-canvas"
            />
          </div>
          <div className="flex justify-center items-center w-full space-x-10">
            {!isClear && (
              <button
                className="btn btn-error text-white font-bold py-2 px-4 rounded"
                onClick={clearCanvas}
              >
                {t('clear')}
              </button>
            )}
            {!isClear && (
              <button
                className="btn btn-primary text-white font-bold py-2 px-4 rounded"
                onClick={handleConfirm}
              >
                {t('confirm')}
              </button>
            )}
          </div>
        </>
      )}
      {photo && (
        <div className="flex flex-col justify-center items-center space-y-4 p-4">
          <img
            className="max-w-full max-h-80 border-2 border-gray-300 rounded"
            src={photo}
            alt="Signature"
          />
          <button
            className="btn-error btn text-white font-bold py-2 px-4 rounded"
            onClick={handleRetry}
          >
            {t('retake')}
          </button>
        </div>
      )}
    </div>
  );
}