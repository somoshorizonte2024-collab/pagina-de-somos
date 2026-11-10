/**
 * Motor de Paisajes Sonoros Procedurales Cinemáticos de Alta Fidelidad (Web Audio API)
 * Recrea con fidelidad acústica la atmósfera viva de las cuatro regiones de Jujuy:
 *
 * 0. HORNOCAL / QUEBRADA: Viento andino estéreo arremolinado, melodías ancestrales de quena
 *    y siku en escala pentatónica andina con eco de cañadones, bombo legüero distante y chajchas.
 * 1. YUNGAS: Nuboselva tropical, brisa húmeda entre helechos, micro-gotas y trinos de aves nativas.
 * 2. SALINAS GRANDES / PUNA: Silencio cristalino del altiplano, resonancia pura de cuarzo y aire helado.
 * 3. COMUNIDAD: Acordes cálidos de charango y guitarra jujeña, pulso de latido popular y esperanza.
 */

export type LandscapeType = 'hornocal' | 'yungas' | 'salinas' | 'comunidad';

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentLandscapeGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private currentLandscape: LandscapeType = 'hornocal';
  private activeNodes: AudioNode[] = [];
  private activeIntervals: number[] = [];
  private listeners: Set<(isPlaying: boolean, isMuted: boolean, landscape: LandscapeType) => void> = new Set();

  private initContext() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public subscribe(fn: (isPlaying: boolean, isMuted: boolean, landscape: LandscapeType) => void) {
    this.listeners.add(fn);
    fn(this.isPlaying, this.isMuted, this.currentLandscape);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.isPlaying, this.isMuted, this.currentLandscape));
  }

  private clearIntervals() {
    this.activeIntervals.forEach((id) => clearInterval(id));
    this.activeIntervals = [];
  }

  // -------------------------------------------------------------
  // 1. HORNOCAL / QUEBRADA DE HUMAHUACA: Viento vivo, quena andina y pulso de bombo
  // -------------------------------------------------------------
  private buildHornocalSoundscape(dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // A. Unidad de Eco / Delay de Cañadón (simula el rebote en las paredes del Hornocal)
    const delay = ctx.createDelay();
    delay.delayTime.setValueAtTime(0.42, ctx.currentTime);
    const feedback = ctx.createGain();
    feedback.gain.setValueAtTime(0.38, ctx.currentTime);
    const delayDamp = ctx.createBiquadFilter();
    delayDamp.type = 'lowpass';
    delayDamp.frequency.setValueAtTime(1400, ctx.currentTime);

    delay.connect(feedback);
    feedback.connect(delayDamp);
    delayDamp.connect(delay);
    delay.connect(dest);

    // B. Viento de Quebrada Estéreo con Ráfagas Dinámicas
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const leftData = noiseBuffer.getChannelData(0);
    const rightData = noiseBuffer.getChannelData(1);
    for (let i = 0; i < bufferSize; i++) {
      leftData[i] = (Math.random() * 2 - 1) * 0.08;
      rightData[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    // Filtro pasa-banda principal para el aullido del viento andino
    const windBandpass = ctx.createBiquadFilter();
    windBandpass.type = 'bandpass';
    windBandpass.frequency.setValueAtTime(420, ctx.currentTime);
    windBandpass.Q.setValueAtTime(2.8, ctx.currentTime);

    // LFO lento para simular ráfagas de viento que suben y bajan orgánicamente
    const windLfo = ctx.createOscillator();
    const windLfoGain = ctx.createGain();
    windLfo.frequency.setValueAtTime(0.12, ctx.currentTime); // Ciclo de ~8 segundos
    windLfoGain.gain.setValueAtTime(220, ctx.currentTime);
    windLfo.connect(windBandpass.frequency);
    windLfo.start();
    this.activeNodes.push(windLfo);

    // Sub-graves que dan la sensación de estar a 4.300 metros de altura
    const subBass = ctx.createOscillator();
    const subBassGain = ctx.createGain();
    subBass.type = 'sine';
    subBass.frequency.setValueAtTime(55, ctx.currentTime);
    subBassGain.gain.setValueAtTime(0.04, ctx.currentTime);
    subBass.connect(subBassGain);
    subBassGain.connect(dest);
    subBass.start();
    this.activeNodes.push(subBass);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.16, ctx.currentTime);

    windSource.connect(windBandpass);
    windBandpass.connect(windGain);
    windGain.connect(dest);
    windSource.start();
    this.activeNodes.push(windSource);

    // C. Quena & Siku Andino: Fraseo melódico pentatónico ancestral
    // Escala pentatónica andina en La menor (A3, C4, D4, E4, G4, A4, C5)
    const andeanNotes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    let noteIndex = 0;

    const playQuenaNote = () => {
      if (!this.ctx || !this.isPlaying || this.isMuted) return;
      try {
        const now = ctx.currentTime;
        const freq = andeanNotes[noteIndex % andeanNotes.length];
        noteIndex = (noteIndex + Math.floor(1 + Math.random() * 3)) % andeanNotes.length;

        // Oscilador de tono fundamental (timbre dulce de caña)
        const fluteOsc = ctx.createOscillator();
        fluteOsc.type = 'triangle';
        fluteOsc.frequency.setValueAtTime(freq, now);

        // 2do armónico sutil para la riqueza acústica de la madera
        const overtoneOsc = ctx.createOscillator();
        overtoneOsc.type = 'sine';
        overtoneOsc.frequency.setValueAtTime(freq * 2, now);

        // Trémolo y vibrato natural de aliento andino (4.8 Hz)
        const vibratoLfo = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibratoLfo.frequency.setValueAtTime(4.8, now);
        vibratoGain.gain.setValueAtTime(1.8, now);
        vibratoLfo.connect(fluteOsc.frequency);
        vibratoLfo.start(now);

        // Envolvente de volumen de la nota
        const noteGain = ctx.createGain();
        const duration = 2.4 + Math.random() * 1.2;

        noteGain.gain.setValueAtTime(0.0001, now);
        // Ataque suave con soplo
        noteGain.gain.linearRampToValueAtTime(0.07, now + 0.35);
        // Sostén expresivo
        noteGain.gain.setValueAtTime(0.065, now + duration * 0.6);
        // Relajación suave que se disuelve en el cañadón
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.015, now);

        fluteOsc.connect(noteGain);
        overtoneOsc.connect(overtoneGain);
        overtoneGain.connect(noteGain);

        // Conectar a la salida directa y a la línea de delay con eco
        noteGain.connect(dest);
        noteGain.connect(delay);

        fluteOsc.start(now);
        overtoneOsc.start(now);
        fluteOsc.stop(now + duration + 0.1);
        overtoneOsc.stop(now + duration + 0.1);
        vibratoLfo.stop(now + duration + 0.1);
      } catch {
        // Safe
      }
    };

    // Tocar una nota inicial y programar las siguientes frases
    playQuenaNote();
    const quenaTimer = window.setInterval(playQuenaNote, 3200);
    this.activeIntervals.push(quenaTimer);

    // D. Bombo Legüero Jujeño y Caja Coplera: Latido ceremonial andino (62 BPM)
    let beatCount = 0;
    const playAndeanBeat = () => {
      if (!this.ctx || !this.isPlaying || this.isMuted) return;
      try {
        const now = ctx.currentTime;
        beatCount++;

        // Golpe de parche del bombo (grave resonante)
        const drumOsc = ctx.createOscillator();
        const drumGain = ctx.createGain();
        drumOsc.type = 'sine';
        drumOsc.frequency.setValueAtTime(82, now);
        drumOsc.frequency.exponentialRampToValueAtTime(38, now + 0.22);

        drumGain.gain.setValueAtTime(0.08, now);
        drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        drumOsc.connect(drumGain);
        drumGain.connect(dest);
        drumOsc.start(now);
        drumOsc.stop(now + 0.26);

        // Golpe en el aro ("chac") en compás sincopado cada 2 pulsos
        if (beatCount % 2 === 0) {
          const rimOsc = ctx.createOscillator();
          const rimGain = ctx.createGain();
          rimOsc.type = 'triangle';
          rimOsc.frequency.setValueAtTime(320, now + 0.28);
          rimOsc.frequency.exponentialRampToValueAtTime(140, now + 0.34);

          rimGain.gain.setValueAtTime(0.03, now + 0.28);
          rimGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          rimOsc.connect(rimGain);
          rimGain.connect(dest);
          rimOsc.start(now + 0.28);
          rimOsc.stop(now + 0.36);
        }
      } catch {
        // Safe
      }
    };

    const drumTimer = window.setInterval(playAndeanBeat, 1900);
    this.activeIntervals.push(drumTimer);
  }

  // -------------------------------------------------------------
  // 2. YUNGAS: Nuboselva tropical, gotas y cantos de aves nativas
  // -------------------------------------------------------------
  private buildYungasSoundscape(dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // A. Brisa húmeda de selva subtropical (ruido filtrado)
    const bufferSize = ctx.sampleRate * 2.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noiseSource.start();
    this.activeNodes.push(noiseSource);

    // B. Armónicos verdes y cálidos (Sol Mayor / Do9)
    [196.0, 246.94, 293.66, 392.0].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      oscGain.gain.setValueAtTime(0.035 / (i + 1), ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(dest);
      osc.start();
      this.activeNodes.push(osc);
    });

    // C. Micro-gotas entre las hojas
    const dropTimer = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying || this.isMuted) return;
      try {
        const dropOsc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        const freq = 1700 + Math.random() * 700;
        const now = ctx.currentTime;

        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(freq, now);
        dropOsc.frequency.exponentialRampToValueAtTime(freq * 0.35, now + 0.055);

        dropGain.gain.setValueAtTime(0.016, now);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

        dropOsc.connect(dropGain);
        dropGain.connect(dest);
        dropOsc.start(now);
        dropOsc.stop(now + 0.065);
      } catch {
        // Safe
      }
    }, 550);
    this.activeIntervals.push(dropTimer);

    // D. Trinos de aves de las Yungas (Calilegua)
    const birdTimer = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying || this.isMuted) return;
      try {
        const now = ctx.currentTime;
        const baseFreq = 2600 + Math.random() * 800;

        [0, 0.08, 0.16].forEach((offset, idx) => {
          const birdOsc = ctx.createOscillator();
          const birdGain = ctx.createGain();
          const chirpTime = now + offset;

          birdOsc.type = 'sine';
          birdOsc.frequency.setValueAtTime(baseFreq + idx * 180, chirpTime);
          birdOsc.frequency.exponentialRampToValueAtTime(baseFreq + 350, chirpTime + 0.04);

          birdGain.gain.setValueAtTime(0.012, chirpTime);
          birdGain.gain.exponentialRampToValueAtTime(0.0001, chirpTime + 0.05);

          birdOsc.connect(birdGain);
          birdGain.connect(dest);
          birdOsc.start(chirpTime);
          birdOsc.stop(chirpTime + 0.06);
        });
      } catch {
        // Safe
      }
    }, 4200);
    this.activeIntervals.push(birdTimer);
  }

  // -------------------------------------------------------------
  // 3. SALINAS GRANDES / PUNA: Silencio cristalino y cuarzo puro
  // -------------------------------------------------------------
  private buildSalinasSoundscape(dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // A. Viento puro y blanco de alta montaña (filtro pasa-altos diáfano)
    const bufferSize = ctx.sampleRate * 2.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.025;
    }

    const air = ctx.createBufferSource();
    air.buffer = noiseBuffer;
    air.loop = true;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'highpass';
    airFilter.frequency.setValueAtTime(1600, ctx.currentTime);

    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.06, ctx.currentTime);

    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(dest);
    air.start();
    this.activeNodes.push(air);

    // B. Resonancia cristalina sagrada (528 Hz frecuencia de transformación y 792 Hz)
    [528.0, 792.0, 1056.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.026 / (idx + 1), ctx.currentTime);

      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      this.activeNodes.push(osc);
    });
  }

  // -------------------------------------------------------------
  // 4. COMUNIDAD: Charango jujeño, pulso de latido y esperanza popular
  // -------------------------------------------------------------
  private buildComunidadSoundscape(dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // A. Acordes cálidos de charango y guitarra criolla
    [130.81, 164.81, 196.0, 261.63, 329.63, 392.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(460, ctx.currentTime);

      gain.gain.setValueAtTime(0.024 / (idx + 1), ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start();
      this.activeNodes.push(osc);
    });

    // B. Pulso humano constante (68 BPM) que representa el encuentro popular
    const pulseTimer = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying || this.isMuted) return;
      try {
        const now = ctx.currentTime;
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(68, now);
        subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.16);

        subGain.gain.setValueAtTime(0.08, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

        subOsc.connect(subGain);
        subGain.connect(dest);
        subOsc.start(now);
        subOsc.stop(now + 0.18);
      } catch {
        // Safe
      }
    }, 880);
    this.activeIntervals.push(pulseTimer);
  }

  // -------------------------------------------------------------
  // CONTROL Y TRANSICIONES SUAVES
  // -------------------------------------------------------------
  public setLandscapeByIndex(index: number) {
    const landscapes: LandscapeType[] = ['hornocal', 'yungas', 'salinas', 'comunidad'];
    const chosen = landscapes[index % landscapes.length];
    this.transitionToLandscape(chosen);
  }

  public transitionToLandscape(newLandscape: LandscapeType) {
    this.currentLandscape = newLandscape;
    if (!this.isPlaying) {
      this.notify();
      return;
    }

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Limpiar intervalos activos del paisaje anterior
    this.clearIntervals();

    // Crear un nuevo nodo de ganancia con fundido cruzado (fade-in suave de 0.8s)
    const newGain = this.ctx.createGain();
    newGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    newGain.gain.linearRampToValueAtTime(0.75, this.ctx.currentTime + 0.8);
    newGain.connect(this.masterGain);

    // Fade-out suave del paisaje anterior
    if (this.currentLandscapeGain) {
      const oldGain = this.currentLandscapeGain;
      oldGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
      setTimeout(() => {
        try {
          oldGain.disconnect();
        } catch {
          // Safe
        }
      }, 700);
    }

    // Detener osciladores viejos
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as unknown as { stop: () => void }).stop === 'function') {
          (node as unknown as { stop: () => void }).stop();
        }
        node.disconnect();
      } catch {
        // Safe
      }
    });
    this.activeNodes = [];

    this.currentLandscapeGain = newGain;

    // Disparar generador de audio según el paisaje activo
    switch (newLandscape) {
      case 'hornocal':
        this.buildHornocalSoundscape(newGain);
        break;
      case 'yungas':
        this.buildYungasSoundscape(newGain);
        break;
      case 'salinas':
        this.buildSalinasSoundscape(newGain);
        break;
      case 'comunidad':
        this.buildComunidadSoundscape(newGain);
        break;
    }

    this.notify();
  }

  public async startAmbient() {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.isPlaying = true;
    this.transitionToLandscape(this.currentLandscape);
  }

  public stopAmbient() {
    this.isPlaying = false;
    this.clearIntervals();

    if (this.currentLandscapeGain && this.ctx) {
      this.currentLandscapeGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
    }

    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as unknown as { stop: () => void }).stop === 'function') {
          (node as unknown as { stop: () => void }).stop();
        }
        node.disconnect();
      } catch {
        // Safe
      }
    });
    this.activeNodes = [];
    this.notify();
  }

  public toggleAmbient() {
    if (this.isPlaying) {
      this.stopAmbient();
    } else {
      this.startAmbient();
    }
  }

  public toggleMute() {
    this.initContext();
    if (!this.masterGain || !this.ctx) return;
    this.isMuted = !this.isMuted;
    const targetGain = this.isMuted ? 0.0001 : 0.75;
    this.masterGain.gain.exponentialRampToValueAtTime(targetGain, this.ctx.currentTime + 0.15);
    this.notify();
  }

  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Safe
    }
  }

  public playCarnetIssued() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.0001, noteTime);
        gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.5);
      });
    } catch {
      // Safe
    }
  }

  public playRegionTransition(index: number = 0) {
    this.setLandscapeByIndex(index);
    this.playClick();
  }
}

export const soundscape = new SoundscapeEngine();
