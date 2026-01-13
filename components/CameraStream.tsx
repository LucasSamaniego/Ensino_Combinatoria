
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, FlipHorizontal, Settings, Monitor } from 'lucide-react';

const CameraStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // Busca lista de câmeras disponíveis
  const getDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      // Se já houver um dispositivo selecionado mas ele sumiu da lista, resetar
      if (selectedDeviceId && !videoDevices.find(d => d.deviceId === selectedDeviceId)) {
        setSelectedDeviceId('');
      }
    } catch (err) {
      console.error("Erro ao listar dispositivos:", err);
    }
  };

  const startCamera = async (deviceId?: string) => {
    // Parar stream anterior se existir
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
      setError(null);

      // Após conseguir permissão, atualizar a lista de dispositivos para obter os nomes (labels)
      await getDevices();
      
      // Marcar qual dispositivo está em uso se não foi especificado
      if (!deviceId) {
        const videoTrack = mediaStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        if (settings.deviceId) setSelectedDeviceId(settings.deviceId);
      } else {
        setSelectedDeviceId(deviceId);
      }

    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setError("Não foi possível acessar a fonte de vídeo selecionada.");
      setIsLive(false);
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

  return (
    <div className="flex-grow flex flex-col bg-slate-950 relative overflow-hidden">
      {/* Video Container */}
      <div className="flex-grow flex items-center justify-center relative bg-black">
        {error ? (
          <div className="text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <CameraOff className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-slate-400 text-sm max-w-xs">{error}</p>
            <button 
              onClick={() => startCamera(selectedDeviceId)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-transform duration-500 ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />
            
            {/* HUD/Overlay Style */}
            <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent border-t-red-500/10 border-l-red-500/10 opacity-20"></div>
            
            <div className="absolute top-6 left-6 flex items-center gap-3">
               <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded shadow-lg animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE FEED</span>
               </div>
               <span className="text-[10px] font-bold text-slate-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 uppercase font-mono">
                  {selectedDeviceId ? "SOURCE ACTIVE" : "AUTO DETECT"}
               </span>
            </div>
          </>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
           <div className="relative group">
              <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <select 
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-slate-800 text-slate-200 text-[10px] font-bold pl-9 pr-8 py-2 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-red-500 transition-all appearance-none cursor-pointer max-w-[200px] truncate"
              >
                {devices.length === 0 && <option value="">Nenhuma câmera detectada</option>}
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Câmera ${device.deviceId.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
              <Settings className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
           </div>

           <button 
             onClick={() => setIsMirrored(!isMirrored)}
             className={`p-2 rounded-lg transition-all ${isMirrored ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
             title="Espelhar Câmera"
           >
             <FlipHorizontal className="w-4 h-4" />
           </button>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
           <button 
             onClick={getDevices}
             className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
             title="Atualizar lista de dispositivos"
           >
             <RefreshCw className="w-4 h-4" />
           </button>
           <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
           <button 
             onClick={isLive ? stopCamera : () => startCamera(selectedDeviceId)}
             className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all shadow-lg ${
               isLive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
             }`}
           >
             {isLive ? 'Interromper' : 'Iniciar'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default CameraStream;
