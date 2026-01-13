
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, FlipHorizontal, Settings, Monitor, ShieldAlert } from 'lucide-react';

const CameraStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [errorType, setErrorType] = useState<'permission' | 'notFound' | 'other' | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const getDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (selectedDeviceId && !videoDevices.find(d => d.deviceId === selectedDeviceId)) {
        setSelectedDeviceId('');
      }
    } catch (err) {
      console.error("Erro ao listar dispositivos:", err);
    }
  };

  const startCamera = async (deviceId?: string) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          deviceId: deviceId ? { exact: deviceId } : undefined
        },
        audio: false 
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsLive(true);
      setErrorType(null);
      await getDevices();
      if (!deviceId) {
        const videoTrack = mediaStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        if (settings.deviceId) setSelectedDeviceId(settings.deviceId);
      } else {
        setSelectedDeviceId(deviceId);
      }
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);
      setIsLive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorType('permission');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorType('notFound');
      } else {
        setErrorType('other');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsLive(false);
    }
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    startCamera(newDeviceId);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const renderError = () => {
    if (errorType === 'permission') {
      return (
        <div className="text-center p-8 space-y-4 bg-slate-900/50 rounded-2xl border border-red-500/20 max-w-sm mx-auto">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white font-bold">Acesso Negado</h3>
          <p className="text-slate-400 text-xs">
            Você bloqueou o acesso à câmera. Para usar o estúdio, clique no ícone de <b>cadeado</b> na barra de endereços do seu navegador e ative a "Câmera".
          </p>
          <button onClick={() => startCamera(selectedDeviceId)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all">
            Tentar Reativar
          </button>
        </div>
      );
    }
    if (errorType) {
      return (
        <div className="text-center p-8 space-y-4">
          <CameraOff className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">Câmera não encontrada ou ocupada.</p>
          <button onClick={() => startCamera(selectedDeviceId)} className="text-indigo-400 text-xs font-bold underline">Tentar novamente</button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-grow flex flex-col bg-slate-950 relative overflow-hidden">
      <div className="flex-grow flex items-center justify-center relative bg-black">
        {errorType ? renderError() : (
          <>
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`} />
            <div className="absolute top-6 left-6 flex items-center gap-3">
               <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded shadow-lg animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">LIVE</span>
               </div>
               <span className="text-[9px] font-bold text-slate-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 uppercase font-mono">
                  {selectedDeviceId ? "SOURCE SYNCED" : "AUTO DETECT"}
               </span>
            </div>
          </>
        )}
      </div>

      <div className="bg-slate-900 border-t border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
           <div className="relative">
              <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <select 
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-slate-800 text-slate-200 text-[10px] font-bold pl-9 pr-8 py-2 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-red-500 transition-all appearance-none cursor-pointer max-w-[180px] truncate"
              >
                {devices.length === 0 && <option value="">Nenhuma câmera</option>}
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
           </div>
           <button onClick={() => setIsMirrored(!isMirrored)} className={`p-2 rounded-lg ${isMirrored ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}`}>
             <FlipHorizontal className="w-4 h-4" />
           </button>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={getDevices} className="p-2 bg-slate-800 text-slate-400 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
           <button onClick={isLive ? stopCamera : () => startCamera(selectedDeviceId)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${isLive ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
             {isLive ? 'Off' : 'On'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default CameraStream;
