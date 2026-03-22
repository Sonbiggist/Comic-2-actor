import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Video, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Music, Volume2, VolumeX } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface Dialogue {
  id: string;
  speakerId: string | 'narrator';
  text: string;
  audioFile: File | null;
  audioUrl: string | null;
}

interface BgMedia {
  type: 'image' | 'video' | null;
  url: string | null;
}

interface BgMusic {
  url: string | null;
  volume: number;
  muted: boolean;
}

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const paragraphs = text.split('\n');
  let currentY = y;
  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
};

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([
    { id: 'char1', name: 'Nhân vật 1', imageUrl: null },
    { id: 'char2', name: 'Nhân vật 2', imageUrl: null }
  ]);
  const [bgMedia, setBgMedia] = useState<BgMedia>({ type: null, url: null });
  const [bgMusic, setBgMusic] = useState<BgMusic>({ url: null, volume: 0.5, muted: false });
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgMusicSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const loadedImages = useRef<Record<string, HTMLImageElement>>({});
  const isPlayingRef = useRef(false);

  // Keep track of the last two speakers to show on screen
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  useEffect(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (bgMusic.url) {
      if (!bgMusicRef.current) {
        bgMusicRef.current = new Audio(bgMusic.url);
        bgMusicRef.current.loop = true;
        try {
          bgMusicSourceRef.current = audioCtxRef.current.createMediaElementSource(bgMusicRef.current);
          bgMusicSourceRef.current.connect(audioCtxRef.current.destination);
        } catch (e) {
          console.error("Could not create media element source", e);
        }
      } else {
        bgMusicRef.current.src = bgMusic.url;
      }
      bgMusicRef.current.volume = bgMusic.volume;
      bgMusicRef.current.muted = bgMusic.muted;
    }
  }, [bgMusic.url]);

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = bgMusic.volume;
      bgMusicRef.current.muted = bgMusic.muted;
    }
  }, [bgMusic.volume, bgMusic.muted]);

  const handleBgUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setBgMedia({ type, url });
    
    if (type === 'video') {
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.muted = true; // Mute bg video by default
      video.play();
      bgVideoRef.current = video;
    } else {
      bgVideoRef.current = null;
      const img = new Image();
      img.onload = () => {
        loadedImages.current['bg'] = img;
        drawFrame();
      };
      img.src = url;
    }
  };

  const handleCharImageUpload = (id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, imageUrl: url } : c));
    const img = new Image();
    img.onload = () => {
      loadedImages.current[id] = img;
      drawFrame();
    };
    img.src = url;
  };

  const addCharacter = () => {
    const newId = 'char' + Date.now();
    setCharacters(prev => [...prev, { id: newId, name: `Nhân vật ${prev.length + 1}`, imageUrl: null }]);
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    setDialogues(prev => prev.map(d => d.speakerId === id ? { ...d, speakerId: 'narrator' } : d));
  };

  const drawFrame = (currentDiag?: Dialogue, displayedText: string = '') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw BG
    if (bgMedia.type === 'video' && bgVideoRef.current) {
      ctx.drawImage(bgVideoRef.current, 0, 0, width, height);
    } else if (bgMedia.type === 'image' && loadedImages.current['bg']) {
      ctx.drawImage(loadedImages.current['bg'], 0, 0, width, height);
    } else {
      ctx.fillStyle = '#171717';
      ctx.fillRect(0, 0, width, height);
    }

    // Determine which characters to show
    let leftCharId: string | null = null;
    let rightCharId: string | null = null;
    let speakingId = currentDiag?.speakerId;

    if (activeSpeakers.length > 0) {
      rightCharId = activeSpeakers[activeSpeakers.length - 1];
      if (activeSpeakers.length > 1) {
        leftCharId = activeSpeakers[activeSpeakers.length - 2];
      }
    }

    const drawChar = (charId: string, position: 'left' | 'right') => {
      const img = loadedImages.current[charId];
      if (!img) return;
      const isSpeaking = speakingId === charId;
      ctx.filter = isSpeaking ? 'none' : 'brightness(0.3)';
      const h = height * 0.85;
      const w = img.width * (h / img.height);
      const x = position === 'left' ? width * 0.05 : width * 0.95 - w;
      const y = height - h;
      ctx.drawImage(img, x, y, w, h);
      ctx.filter = 'none';
    };

    if (leftCharId) drawChar(leftCharId, 'left');
    if (rightCharId) drawChar(rightCharId, 'right');

    // Draw Dialogue Box
    if (currentDiag) {
      const boxHeight = height * 0.25;
      const boxY = height - boxHeight - 30;
      const boxX = 40;
      const boxW = width - 80;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxHeight, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 40px sans-serif';
      let speakerName = 'Người dẫn chuyện';
      if (speakingId !== 'narrator') {
        const char = characters.find(c => c.id === speakingId);
        if (char) speakerName = char.name;
      }
      ctx.fillText(speakerName, boxX + 50, boxY + 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = '36px sans-serif';
      wrapText(ctx, displayedText, boxX + 50, boxY + 130, boxW - 100, 50);
    }
  };

  // Animation loop for video background when not playing sequence
  useEffect(() => {
    let animationId: number;
    const loop = () => {
      if (!isPlayingRef.current && bgMedia.type === 'video') {
        drawFrame();
      }
      animationId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationId);
  }, [bgMedia, activeSpeakers, characters]);

  const playSequence = async (record: boolean) => {
    if (isPlaying) return;
    setIsPlaying(true);
    isPlayingRef.current = true;

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current!;
    const dest = audioCtx.createMediaStreamDestination();

    // Setup BG Music
    if (bgMusicRef.current && !bgMusic.muted) {
      bgMusicRef.current.currentTime = 0;
      bgMusicRef.current.play();
      // To record bg music, we need to route it to dest
      if (record && bgMusicSourceRef.current) {
        try {
          bgMusicSourceRef.current.connect(dest);
        } catch (e) {
          console.error("Could not connect bg music to dest", e);
        }
      }
    }

    if (record) {
      const canvasStream = canvasRef.current!.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);
      const options = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus') 
        ? { mimeType: 'video/webm; codecs=vp9,opus' } 
        : { mimeType: 'video/webm' };
      mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.start();
    }

    let currentActiveSpeakers: string[] = [];

    for (let i = 0; i < dialogues.length; i++) {
      if (!isPlayingRef.current) break;
      const diag = dialogues[i];
      setCurrentDialogueIndex(i);

      if (diag.speakerId !== 'narrator') {
        if (!currentActiveSpeakers.includes(diag.speakerId)) {
          currentActiveSpeakers = [...currentActiveSpeakers, diag.speakerId].slice(-2);
          setActiveSpeakers(currentActiveSpeakers);
        }
      }

      await new Promise<void>(async (resolve) => {
        let source: AudioBufferSourceNode | null = null;
        let duration = Math.max(diag.text.length * 0.05, 2);

        if (diag.audioFile) {
          try {
            const arrayBuffer = await diag.audioFile.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            if (record) source.connect(dest);
            source.connect(audioCtx.destination);
            source.start(0);
            duration = audioBuffer.duration;
            source.onended = () => finish();
          } catch (e) {
            console.error("Error playing audio", e);
          }
        }

        const startTime = audioCtx.currentTime;
        let isResolved = false;

        const finish = () => {
          if (!isResolved) {
            isResolved = true;
            if (source) {
              try { source.stop(); } catch(e){}
            }
            resolve();
          }
        };

        const animate = () => {
          if (!isPlayingRef.current) {
            finish();
            return;
          }

          const elapsed = audioCtx.currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const charsToShow = Math.floor(progress * diag.text.length);
          const displayedText = diag.text.substring(0, charsToShow);

          drawFrame(diag, displayedText);

          if (!isResolved) {
            if (!source && progress >= 1) {
               setTimeout(finish, 500);
            } else {
               requestAnimationFrame(animate);
            }
          }
        };
        requestAnimationFrame(animate);
      });
    }

    if (record && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video_hoi_thoai.webm';
        a.click();
      };
    }

    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      if (record && bgMusicSourceRef.current) {
        try {
          bgMusicSourceRef.current.disconnect(dest);
        } catch (e) {}
      }
    }

    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentDialogueIndex(-1);
    drawFrame();
  };

  const stopPlayback = () => {
    isPlayingRef.current = false;
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-white overflow-hidden font-sans">
      <div className="w-[400px] flex flex-col border-r border-neutral-700 bg-neutral-800 z-10 shadow-xl">
        <div className="p-4 border-b border-neutral-700 font-bold text-lg flex items-center gap-2">
          <Video className="text-indigo-400" />
          Tạo Video Hội Thoại
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Background & Music Settings */}
          <div className="space-y-3 bg-neutral-900/50 p-3 rounded-lg border border-neutral-700">
            <h3 className="font-semibold text-neutral-300 text-sm uppercase tracking-wider">Môi trường</h3>
            
            <div className="flex gap-2">
              <label className="flex-1 flex flex-col items-center justify-center p-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 border-dashed rounded cursor-pointer transition-colors relative overflow-hidden">
                {bgMedia.url ? (
                  <div className="absolute inset-0 opacity-50">
                    {bgMedia.type === 'video' ? (
                      <video src={bgMedia.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={bgMedia.url} className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : null}
                <ImageIcon size={20} className="text-neutral-400 mb-1 relative z-10" />
                <span className="text-xs text-center text-neutral-300 relative z-10">Nền (Ảnh/Video)</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={e => e.target.files?.[0] && handleBgUpload(e.target.files[0])} />
              </label>

              <label className="flex-1 flex flex-col items-center justify-center p-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 border-dashed rounded cursor-pointer transition-colors">
                <Music size={20} className={bgMusic.url ? "text-emerald-400 mb-1" : "text-neutral-400 mb-1"} />
                <span className="text-xs text-center text-neutral-300 truncate w-full px-1">{bgMusic.url ? 'Đã tải nhạc' : 'Nhạc nền'}</span>
                <input type="file" accept="audio/*" className="hidden" onChange={e => {
                  if (e.target.files?.[0]) setBgMusic(prev => ({ ...prev, url: URL.createObjectURL(e.target.files![0]) }));
                }} />
              </label>
            </div>

            {bgMusic.url && (
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => setBgMusic(prev => ({ ...prev, muted: !prev.muted }))} className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400">
                  {bgMusic.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={bgMusic.volume} 
                  onChange={e => setBgMusic(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className="flex-1 accent-indigo-500"
                />
                <button onClick={() => setBgMusic({ url: null, volume: 0.5, muted: false })} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Characters */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-neutral-300 text-sm uppercase tracking-wider">Nhân vật</h3>
              <button onClick={addCharacter} className="p-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded flex items-center gap-1 px-2">
                <Plus size={14} /> Thêm
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {characters.map(char => (
                <div key={char.id} className="bg-neutral-900/50 border border-neutral-700 p-2 rounded flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <input 
                      type="text" 
                      value={char.name} 
                      onChange={e => setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, name: e.target.value } : c))}
                      className="bg-transparent border-b border-neutral-600 text-sm w-full focus:outline-none focus:border-indigo-500 px-1"
                    />
                    {characters.length > 2 && (
                      <button onClick={() => removeCharacter(char.id)} className="text-rose-400 hover:text-rose-300"><Trash2 size={14}/></button>
                    )}
                  </div>
                  <label className="flex items-center justify-center h-20 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 border-dashed rounded cursor-pointer relative overflow-hidden">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-neutral-500">Tải ảnh</span>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleCharImageUpload(char.id, e.target.files[0])} />
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dialogues */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-neutral-300 text-sm uppercase tracking-wider">Kịch bản</h3>
              <button onClick={() => setDialogues(prev => [...prev, { id: Date.now().toString(), speakerId: characters[0].id, text: '', audioFile: null, audioUrl: null }])} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors shadow-sm">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {dialogues.map((diag, index) => (
                <div key={diag.id} className={`p-3 rounded-lg border transition-colors ${currentDialogueIndex === index ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-neutral-900/50 border-neutral-700'} space-y-2`}>
                  <div className="flex justify-between items-center">
                    <select 
                      value={diag.speakerId}
                      onChange={e => setDialogues(prev => prev.map(d => d.id === diag.id ? { ...d, speakerId: e.target.value } : d))}
                      className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="narrator">Người dẫn chuyện</option>
                      {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => {
                        const newD = [...dialogues];
                        [newD[index], newD[index-1]] = [newD[index-1], newD[index]];
                        setDialogues(newD);
                      }} disabled={index === 0} className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30"><ArrowUp size={14}/></button>
                      <button onClick={() => {
                        const newD = [...dialogues];
                        [newD[index], newD[index+1]] = [newD[index+1], newD[index]];
                        setDialogues(newD);
                      }} disabled={index === dialogues.length - 1} className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30"><ArrowDown size={14}/></button>
                      <button onClick={() => setDialogues(prev => prev.filter(d => d.id !== diag.id))} className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <textarea 
                    value={diag.text}
                    onChange={e => setDialogues(prev => prev.map(d => d.id === diag.id ? { ...d, text: e.target.value } : d))}
                    placeholder="Nhập lời thoại..."
                    className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-sm resize-none h-16 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 p-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 border-dashed rounded cursor-pointer text-xs">
                      <Music size={14} className={diag.audioFile ? "text-emerald-400" : "text-neutral-400"} />
                      <span className="truncate text-neutral-300">{diag.audioFile ? diag.audioFile.name : 'Tải MP3'}</span>
                      <input type="file" accept="audio/*" className="hidden" onChange={e => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          setDialogues(prev => prev.map(d => d.id === diag.id ? { ...d, audioFile: file, audioUrl: URL.createObjectURL(file) } : d));
                        }
                      }} />
                    </label>
                    {diag.audioFile && (
                      <button onClick={() => setDialogues(prev => prev.map(d => d.id === diag.id ? { ...d, audioFile: null, audioUrl: null } : d))} className="p-1.5 text-neutral-400 hover:text-rose-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-black relative">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative w-full aspect-video max-h-full bg-neutral-900 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
            <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="h-24 border-t border-neutral-800 bg-neutral-900 flex items-center justify-center gap-4 z-10">
          {!isPlaying ? (
            <>
              <button onClick={() => playSequence(false)} disabled={dialogues.length === 0} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-full font-semibold transition-colors shadow-lg shadow-emerald-900/20">
                <Play size={20} /> Phát thử
              </button>
              <button onClick={() => playSequence(true)} disabled={dialogues.length === 0} className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-full font-semibold transition-colors shadow-lg shadow-rose-900/20">
                <Video size={20} /> Ghi hình & Lưu
              </button>
            </>
          ) : (
            <button onClick={stopPlayback} className="flex items-center gap-2 px-6 py-3 bg-neutral-600 hover:bg-neutral-500 rounded-full font-semibold transition-colors shadow-lg">
              <Square size={20} /> Dừng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
