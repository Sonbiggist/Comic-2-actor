import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Video, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Music } from 'lucide-react';

type Speaker = 'char1' | 'char2' | 'narrator';

interface Dialogue {
  id: string;
  speaker: Speaker;
  text: string;
  audioFile: File | null;
  audioUrl: string | null;
  duration: number;
}

interface Images {
  bg: string | null;
  char1: string | null;
  char2: string | null;
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
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
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

const drawScene = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  imagesElements: { bg?: HTMLImageElement, char1?: HTMLImageElement, char2?: HTMLImageElement },
  currentDialogue: Dialogue | null,
  displayedText: string
) => {
  ctx.clearRect(0, 0, width, height);

  if (imagesElements.bg) {
    ctx.drawImage(imagesElements.bg, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#404040';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chưa có ảnh nền', width / 2, height / 2);
    ctx.textAlign = 'left';
  }

  const speaker = currentDialogue?.speaker || 'narrator';

  if (imagesElements.char1) {
    ctx.filter = speaker === 'char1' ? 'none' : 'brightness(0.3)';
    const h = height * 0.85;
    const w = imagesElements.char1.width * (h / imagesElements.char1.height);
    const x = width * 0.05;
    const y = height - h;
    ctx.drawImage(imagesElements.char1, x, y, w, h);
  }

  if (imagesElements.char2) {
    ctx.filter = speaker === 'char2' ? 'none' : 'brightness(0.3)';
    const h = height * 0.85;
    const w = imagesElements.char2.width * (h / imagesElements.char2.height);
    const x = width * 0.95 - w;
    const y = height - h;
    ctx.drawImage(imagesElements.char2, x, y, w, h);
  }

  ctx.filter = 'none';

  if (currentDialogue) {
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
    let speakerName = '';
    if (speaker === 'char1') speakerName = 'Nhân vật 1';
    if (speaker === 'char2') speakerName = 'Nhân vật 2';
    if (speaker === 'narrator') speakerName = 'Người dẫn chuyện';
    ctx.fillText(speakerName, boxX + 50, boxY + 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '36px sans-serif';
    wrapText(ctx, displayedText, boxX + 50, boxY + 130, boxW - 100, 50);
  }
};

export default function App() {
  const [images, setImages] = useState<Images>({ bg: null, char1: null, char2: null });
  const [dialogues, setDialogues] = useState<Dialogue[]>([
    { id: '1', speaker: 'char1', text: 'Xin chào, bạn khỏe không?', audioFile: null, audioUrl: null, duration: 0 }
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImages = useRef<{ bg?: HTMLImageElement, char1?: HTMLImageElement, char2?: HTMLImageElement }>({});
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (canvasRef.current) {
      drawScene(
        canvasRef.current.getContext('2d')!,
        canvasRef.current.width,
        canvasRef.current.height,
        loadedImages.current,
        null,
        ''
      );
    }
  }, []);

  const handleImageUpload = (type: 'bg' | 'char1' | 'char2', file: File) => {
    const url = URL.createObjectURL(file);
    setImages(prev => ({ ...prev, [type]: url }));
    
    const img = new Image();
    img.onload = () => {
      loadedImages.current[type] = img;
      if (!isPlayingRef.current && canvasRef.current) {
        drawScene(
          canvasRef.current.getContext('2d')!,
          canvasRef.current.width,
          canvasRef.current.height,
          loadedImages.current,
          null,
          ''
        );
      }
    };
    img.src = url;
  };

  const addDialogue = () => {
    setDialogues(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(7), speaker: 'char1', text: '', audioFile: null, audioUrl: null, duration: 0 }
    ]);
  };

  const updateDialogue = (id: string, updates: Partial<Dialogue>) => {
    setDialogues(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteDialogue = (id: string) => {
    setDialogues(prev => prev.filter(d => d.id !== id));
  };

  const moveDialogue = (index: number, direction: number) => {
    const newDialogues = [...dialogues];
    const temp = newDialogues[index];
    newDialogues[index] = newDialogues[index + direction];
    newDialogues[index + direction] = temp;
    setDialogues(newDialogues);
  };

  const handleAudioUpload = (id: string, file: File) => {
    const url = URL.createObjectURL(file);
    updateDialogue(id, { audioFile: file, audioUrl: url });
  };

  const playAudioBuffer = async (audioCtx: AudioContext, dest: MediaStreamAudioDestinationNode | null, file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    if (dest) {
      source.connect(dest);
    }
    source.connect(audioCtx.destination);
    source.start(0);
    
    return { source, duration: audioBuffer.duration };
  };

  const playSequence = async (record: boolean) => {
    if (isPlaying) return;
    setIsPlaying(true);
    isPlayingRef.current = true;

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let audioCtx = new AudioContext();
    let dest: MediaStreamAudioDestinationNode | null = null;

    if (record) {
      dest = audioCtx.createMediaStreamDestination();
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

    for (let i = 0; i < dialogues.length; i++) {
      if (!isPlayingRef.current) break;
      const diag = dialogues[i];
      setCurrentDialogueIndex(i);

      await new Promise<void>(async (resolve) => {
        let source: AudioBufferSourceNode | null = null;
        let duration = Math.max(diag.text.length * 0.05, 2);

        if (diag.audioFile) {
          try {
            const res = await playAudioBuffer(audioCtx, dest, diag.audioFile);
            source = res.source;
            duration = res.duration;
            source.onended = () => {
              finish();
            };
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

          if (canvasRef.current) {
            drawScene(
              canvasRef.current.getContext('2d')!,
              canvasRef.current.width,
              canvasRef.current.height,
              loadedImages.current,
              diag,
              displayedText
            );
          }

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

    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentDialogueIndex(-1);
    
    if (canvasRef.current) {
      drawScene(
        canvasRef.current.getContext('2d')!,
        canvasRef.current.width,
        canvasRef.current.height,
        loadedImages.current,
        null,
        ''
      );
    }
  };

  const stopPlayback = () => {
    isPlayingRef.current = false;
  };

  const ImageUpload = ({ label, type, image }: { label: string, type: 'bg' | 'char1' | 'char2', image: string | null }) => (
    <label className="flex flex-col items-center justify-center p-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 border-dashed rounded cursor-pointer aspect-square transition-colors relative overflow-hidden">
      {image ? (
        <>
          <img src={image} alt={label} className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="relative z-10 bg-black/70 px-2 py-1 rounded text-xs font-medium">{label}</div>
        </>
      ) : (
        <>
          <ImageIcon size={24} className="text-neutral-400 mb-1" />
          <span className="text-xs text-center text-neutral-400">{label}</span>
        </>
      )}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={e => {
          if (e.target.files?.[0]) handleImageUpload(type, e.target.files[0]);
        }}
      />
    </label>
  );

  return (
    <div className="flex h-screen bg-neutral-900 text-white overflow-hidden font-sans">
      <div className="w-1/3 flex flex-col border-r border-neutral-700 bg-neutral-800 z-10 shadow-xl">
        <div className="p-4 border-b border-neutral-700 font-bold text-lg flex items-center gap-2">
          <Video className="text-indigo-400" />
          Trình tạo Video Hội thoại
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-300 text-sm uppercase tracking-wider">Hình ảnh</h3>
            <div className="grid grid-cols-3 gap-3">
              <ImageUpload label="Nền" type="bg" image={images.bg} />
              <ImageUpload label="Nhân vật 1" type="char1" image={images.char1} />
              <ImageUpload label="Nhân vật 2" type="char2" image={images.char2} />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-neutral-300 text-sm uppercase tracking-wider">Kịch bản thoại</h3>
              <button onClick={addDialogue} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors shadow-sm">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {dialogues.map((diag, index) => (
                <div key={diag.id} className={`p-3 rounded-lg border transition-colors ${currentDialogueIndex === index ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-neutral-900/50 border-neutral-700'} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <select 
                      value={diag.speaker}
                      onChange={e => updateDialogue(diag.id, { speaker: e.target.value as Speaker })}
                      className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="char1">Nhân vật 1</option>
                      <option value="char2">Nhân vật 2</option>
                      <option value="narrator">Người dẫn chuyện</option>
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => moveDialogue(index, -1)} disabled={index === 0} className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30 transition-colors"><ArrowUp size={16}/></button>
                      <button onClick={() => moveDialogue(index, 1)} disabled={index === dialogues.length - 1} className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30 transition-colors"><ArrowDown size={16}/></button>
                      <button onClick={() => deleteDialogue(diag.id)} className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <textarea 
                    value={diag.text}
                    onChange={e => updateDialogue(diag.id, { text: e.target.value })}
                    placeholder="Nhập lời thoại..."
                    className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-sm resize-none h-20 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 p-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 border-dashed rounded cursor-pointer text-sm transition-colors">
                      <Music size={16} className={diag.audioFile ? "text-emerald-400" : "text-neutral-400"} />
                      <span className="truncate text-neutral-300">{diag.audioFile ? diag.audioFile.name : 'Tải lên MP3'}</span>
                      <input 
                        type="file" 
                        accept="audio/*" 
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files?.[0]) handleAudioUpload(diag.id, e.target.files[0]);
                        }}
                      />
                    </label>
                    {diag.audioFile && (
                      <button onClick={() => updateDialogue(diag.id, { audioFile: null, audioUrl: null })} className="p-2 text-neutral-400 hover:text-rose-400 transition-colors" title="Xóa âm thanh">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {dialogues.length === 0 && (
                <div className="text-center p-6 text-neutral-500 border border-neutral-700 border-dashed rounded-lg">
                  Chưa có lời thoại nào. Hãy thêm mới!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-black relative">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative w-full aspect-video max-h-full bg-neutral-900 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
            <canvas 
              ref={canvasRef} 
              width={1920} 
              height={1080} 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div className="h-24 border-t border-neutral-800 bg-neutral-900 flex items-center justify-center gap-4 z-10">
          {!isPlaying ? (
            <>
              <button onClick={() => playSequence(false)} disabled={dialogues.length === 0} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded-full font-semibold transition-colors shadow-lg shadow-emerald-900/20">
                <Play size={20} /> Phát thử
              </button>
              <button onClick={() => playSequence(true)} disabled={dialogues.length === 0} className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 rounded-full font-semibold transition-colors shadow-lg shadow-rose-900/20">
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
