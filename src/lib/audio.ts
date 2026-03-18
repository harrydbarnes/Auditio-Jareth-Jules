export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onDataAvailable?: (data: Blob) => void;
  public audioContext: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public dataArray: any = null;
  private animFrameId: number | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  constructor(onDataAvailable?: (data: Blob) => void) {
    this.onDataAvailable = onDataAvailable;
  }

  async start(captureMic: boolean = true, captureSystem: boolean = true, onAudioLevel?: (level: number) => void) {
    try {
      const streams: MediaStream[] = [];

      if (captureMic) {
        // Look up preferred microphone if saved in localStorage
        const preferredMic = localStorage.getItem('app_preferred_mic');
        const constraints: MediaStreamConstraints = {
          audio: preferredMic ? { deviceId: { exact: preferredMic } } : true
        };
        const micStream = await navigator.mediaDevices.getUserMedia(constraints);
        streams.push(micStream);
      }

      if (captureSystem) {
        const sysStream = await navigator.mediaDevices.getDisplayMedia({
          video: true, // required to trigger getDisplayMedia dialog in many environments
          audio: true,
        });
        
        const audioTracks = sysStream.getAudioTracks();
        if (audioTracks.length > 0) {
           const onlyAudioStream = new MediaStream(audioTracks);
           streams.push(onlyAudioStream);
        }
        sysStream.getVideoTracks().forEach(track => track.stop());
      }

      if (streams.length === 0) {
        throw new Error("No audio sources selected");
      }

      // Merge streams using Web Audio API
      this.audioContext = new AudioContext();
      const dest = this.audioContext.createMediaStreamDestination();

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      streams.forEach(stream => {
        const source = this.audioContext!.createMediaStreamSource(stream);
        source.connect(dest);
        source.connect(this.analyser!); // Connect to analyser for level meter
      });

      // We will record as webm first, then convert to wav later if needed
      this.mediaRecorder = new MediaRecorder(dest.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          if (this.onDataAvailable) {
            this.onDataAvailable(event.data);
          }
        }
      };

      this.mediaRecorder.start(1000); // chunk every 1 second

      if (onAudioLevel && this.analyser && this.dataArray) {
        const updateLevel = () => {
          if (!this.analyser || !this.dataArray) return;
          this.analyser.getByteFrequencyData(this.dataArray);
          let sum = 0;
          for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
          }
          const avg = sum / this.dataArray.length;
          // Normalize to 0-100 roughly
          const level = Math.min(100, (avg / 255) * 200);
          onAudioLevel(level);
          this.animFrameId = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      return true;

    } catch (err) {
      console.error("Error starting recording:", err);
      return false;
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
      }
      
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        if (this.audioContext) {
          this.audioContext.close();
        }
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}

// Utility to convert webm blob to WAV format
export async function webmToWav(webmBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  
  // Write WAV header
  let offset = 0;
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + audioBuffer.length * numOfChan * 2, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, audioBuffer.sampleRate, true); offset += 4;
  view.setUint32(offset, audioBuffer.sampleRate * 2 * numOfChan, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, audioBuffer.length * numOfChan * 2, true); offset += 4;

  // Write PCM data
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    const channelData = audioBuffer.getChannelData(i);
    let sampleOffset = offset + (i * 2);
    for (let j = 0; j < channelData.length; j++, sampleOffset += (numOfChan * 2)) {
      let sample = Math.max(-1, Math.min(1, channelData[j]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(sampleOffset, sample, true);
    }
  }

  audioContext.close();
  return new Blob([view], { type: 'audio/wav' });
}
