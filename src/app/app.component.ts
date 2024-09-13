import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {VvcInteractionService, Dimension, UiState, VvcMessageService} from '@vivocha/client-interaction-core';
import {ChatAreaComponent} from '@vivocha/client-interaction-layout';
import {Observable, Subscription} from 'rxjs';
import { filter } from 'rxjs/operators';

interface Dimensions {
  [key: string]: Dimension;
}

@Component({
  selector: 'vvc-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {

  @ViewChild(ChatAreaComponent, {static: false}) chat: ChatAreaComponent;

  public messages: Array<any>;
  public disableMessageGrouping: boolean = window['VVC_VAR_ASSETS']['showAgentAvatarInAllMessages'];
  public showQuickRepliesAsBalloon: boolean = window['VVC_VAR_ASSETS']['showQuickRepliesAsBalloon'];
  public quickRepliesNoInteractionMode = window['VVC_VAR_ASSETS']['quickRepliesBehaviour'];
  public hideQuickRepliesBodyWhenEmpty = window['VVC_VAR_ASSETS']['hideQuickRepliesBodyWhenEmpty'];
  public appState$: Observable<UiState>;

  public closeModalVisible = false;
  public surveyVisible = false;

  public interactionState: string;

  private recorder: AudioRecorder;
  // Single Use Token for Speech Transcription
  private transcriptionToken : TranscriptionToken;

  private isMobile;

  private dimensions: Dimensions = {
    fullscreen: {
      position: 'fixed',
      width: '100%',
      height: '100%',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0'
    },
    minimized: {
      position: 'fixed',
      width: '80px',
      height: '80px',
      right   : window['VVC_VAR_ASSETS']['minimizedRight'],
      bottom  : window['VVC_VAR_ASSETS']['minimizedBottom']
    },
    minimizedCbn: {
      position: 'fixed',
      width: window['VVC_VAR_ASSETS']['initialWidth'],
      height: '45px',
      right: '40px',
      bottom: '0px'
      // right   : window['VVC_VAR_ASSETS']['initialRight'],
      // bottom  : window['VVC_VAR_ASSETS']['initialBottom']
    },
    minimizedCbnMobile: {
      position: 'fixed',
      width: '100%',
      height: '45px',
      left: '0',
      right: '0',
      bottom: '0'
      // right   : window['VVC_VAR_ASSETS']['initialRight'],
      // bottom  : window['VVC_VAR_ASSETS']['initialBottom']
    },
    normal: {
      position: 'fixed',
      width: window['VVC_VAR_ASSETS']['initialWidth'],
      height: window['VVC_VAR_ASSETS']['initialHeight'],
      // right: '40px',
      // bottom: '-10px'
      right   : window['VVC_VAR_ASSETS']['initialRight'],
      bottom  : window['VVC_VAR_ASSETS']['initialBottom']
    },
    custom: {
      position: 'fixed',
      width: '100%',
      height: '100%',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0'
    },
    embedded: {
      position: 'relative',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100%',
      height: window['VVC_VAR_ASSETS']['initialHeight']
    }
  };

  private appUiStateSub: Subscription;

  public closeDimensions: Dimension;

  public selector: string | null = null;

  constructor(private interactionService: VvcInteractionService, private messagesService: VvcMessageService) {}


  ngOnInit() {
    this.appState$ = this.interactionService.getState();
    this.interactionService.init().subscribe(context => this.setInitialDimensions(context));
    this.interactionService.events().subscribe(evt => this.listenForEvents(evt));

    // Initialize Custom Actions handlers
    this.subscribeCustomActions();

    // listen to uiState changes in order to update the local reference used in services
    this.appUiStateSub = this.appState$.subscribe(uiState => {
      this.interactionService.setUiState(uiState);
    });

    this.transcriptionToken = new TranscriptionToken();
    this.interactionState = "Idle";

    
    const threshold = 0.05;
    const silenceTime = 2000; 
    this.recorder = new AudioRecorder(threshold, silenceTime);
    this.recorder.onRecordingEnded = (transcription: string) => {
      this.transcriptionToken.consumeToken();
      this.interactionService.sendText(transcription);
    };
    this.recorder.onRecordingFailed = () => {
      this.setInteractionState("Idle");
    };
  }
  ngOnDestroy() {
    this.appUiStateSub.unsubscribe();
  }
  acceptAgentRequest(requestId) {
    this.interactionService.acceptAgentRequest(requestId);
  }
  acceptOffer() {
    this.interactionService.acceptOffer();
  }
  addChatToFullScreen(show) {
    this.interactionService.addChatToFullScreen(show);
  }
  appendText(text) {
    this.chat.appendText(text);
  }
  askForVideoUpgrade() {
    this.interactionService.askForVideoUpgrade();
  }
  askForVoiceUpgrade() {
    this.interactionService.askForVoiceUpgrade();
  }
  closeApp() {
    this.interactionService.closeApp();
  }
  closeCbn() {
    this.interactionService.closeContact(this.closeDimensions);
    this.closeApp();
  }
  closeInbound() {
    this.interactionService.closeContact(this.closeDimensions);
    this.closeApp();
  }
  closeContact(context) {
    const step = this.getCloseStep(context);
    this.interactionService.track('close-contact', step);
    // console.log('CLOSE CONTACT', step, context.variables, context);
    this.trackMinizedStatus(false);
    switch (step) {
      case 'remove-app':
        this.closeApp();
        break;
      case 'show-survey':
        this.surveyVisible = true;
        this.interactionService.showSurvey();
        break;
      case 'close-and-survey':
        this.surveyVisible = true;
        this.interactionService.closeContact(this.closeDimensions);
        this.interactionService.showSurvey();
        break;
      case 'show-close-modal':
        this.closeModalVisible = true;
        this.interactionService.showCloseModal();
        break;
      case 'close-and-stay':
        this.dismissCloseModal();
        this.closeModalVisible = true;
        this.interactionService.closeContact(this.closeDimensions);
        break;
      case 'close-and-remove':
        this.interactionService.closeContact(this.closeDimensions);
        this.closeApp();
        break;
    }
  }
  closeUploadPanel() {
    this.interactionService.closeUploadPanel();
  }
  dismissCloseModal() {
    this.closeModalVisible = false;
    this.interactionService.dismissCloseModal();
  }
  debugConsole() {
    console.log("Heart Pressed!");
  }
  doUpload(upload) {
    this.interactionService.sendAttachment(upload);
  }
  exitFromFullScreen() {
    this.interactionService.setNormalScreen();
    if (this.isMobile) {
      this.interactionService.setDimensions(this.dimensions.fullscreen);
    }
  }
  expandWidget(isFullScreen) {
    this.trackMinizedStatus(false);
    this.interactionService.maximizeWidget(isFullScreen, (isFullScreen || this.isMobile) ? this.dimensions.fullscreen : this.dimensions.normal);
  }
  getCloseStep(context) {
    if (!context.contactStarted) {
      return 'remove-app';
    }
    if (context.isInQueue) {
      return 'close-and-remove';
    }
    if (context.isClosed) {
      if (context.hasSurvey && context.canRemoveApp) {
        if (this.surveyVisible) {
          return 'remove-app';
        } else {
          return 'show-survey';
        }
      } else {
        return 'remove-app';
      }
    } else {
      if (context.variables.askCloseConfirm) {
        if (this.closeModalVisible) {
          if (context.variables.stayInAppAfterClose) {
            return 'close-and-stay';
          } else {
            if (context.hasSurvey) {
              if (this.surveyVisible) {
                return 'remove-app';
              } else {
                return 'close-and-survey';
              }
            } else {
              return 'close-and-remove';
            }
          }
        } else {
          return 'show-close-modal';
        }
      } else {
        if (context.variables.stayInAppAfterClose) {
          return 'close-and-stay';
        } else {
          if (context.hasSurvey) {
            if (this.surveyVisible) {
              return 'remove-app';
            } else {
              return 'close-and-survey';
            }
          } else {
            return 'close-and-remove';
          }
        }
      }
    }
  }
  hangUpCall() {
    this.interactionService.hangUp(this.closeDimensions);
  }
  hasToStayInApp(context) {
    return (context.isClosed && context.variables.stayInAppAfterClose);
  }
  hideChat() {
    this.interactionService.hideChat();
  }
  listenForEvents(evt) {
    if (evt) {
      switch (evt.type) {
        case 'closedByAgent':
        case 'removedMediaScreen':
        case 'incomingOffer':
          this.interactionService.setDimensions(this.closeDimensions);
          break;
      }
    }
  }
  markRead(msgId: string){
    this.interactionService.markRead(msgId);
  }
  maximizeCbn(isMobile: boolean, notRead: boolean) {
    this.interactionService.maximizeWidget(false, isMobile ? this.dimensions.fullscreen : this.dimensions.normal);
    if (notRead) {
      this.upgradeCbnToChat();
    }
  }
  minimizeCbn(isMobile: boolean) {
    this.interactionService.minimizeWidget(isMobile ? this.dimensions.minimizedCbnMobile : this.dimensions.minimizedCbn);
  }
  minimizeWidget() {
    this.trackMinizedStatus(true);
    this.interactionService.minimizeWidget(this.dimensions.minimized);
  }
  minimizeMedia() {
    this.interactionService.minimizeMedia();
  }
  trackMinizedStatus(status){
    if(this.supportsStorages()){
      if(status){
        sessionStorage.setItem("vvcMinimizedStatus", status);
      }else{
        sessionStorage.removeItem("vvcMinimizedStatus");
      }
    }
  }
  muteToggle(muted) {
    this.interactionService.muteToggle(muted);
  }
  openAttachment(url: string, click?: boolean) {
    if(this.isMobile){
      this.minimizeWidget();
    }
    this.interactionService.openAttachment(url, click);
  }
  processAction(action) {
    this.interactionService.sendPostBack(action);
  }
  processQuickReply(reply) {
    this.interactionService.processQuickReply(reply);
  }
  rejectAgentRequest(requestId) {
    this.interactionService.rejectAgentRequest(requestId);
  }
  rejectOffer() {
    this.interactionService.rejectOffer();
  }
  sendFailed(message){
    this.interactionService.sendText(message.text);
  }
  sendIsWriting() {
    this.interactionService.sendIsWriting();
  }
  sendText(value, isEmojiPanelVisible) {
    if (isEmojiPanelVisible) {
      this.toggleEmojiPanel();
    }
    this.interactionService.sendText(value);
  }
  setFullScreen() {
    this.expandWidget(true);
  }
  setInitialDimensions(context) {
    this.isMobile = context.isMobile;
    this.selector = (context.campaign.channels.web.interaction || {}).selector || null;
    if (this.selector) {
      this.closeDimensions = this.dimensions.embedded;
    } else {
      this.closeDimensions = context.isMobile ? this.dimensions.fullscreen : this.dimensions.normal;
    }
    this.interactionService.setDimensions(this.closeDimensions);

    if (context.mediaPreset === 'sync' || !!context.conversationId || !!context.fromConversation) {
      this.minimizeWidget();
    }
    if(this.supportsStorages()){
      if (sessionStorage.vvcMinimizedStatus && context.variables && (context.variables.rememberMinimizedStatus || (context.variables.minimizeOnLink && this.isMobile))) {
        this.minimizeWidget();
      }
    }
  }
  showCloseDialog(context) {
    return context && !context.isCLosed && context.variables && context.variables.askCloseConfirm && !this.closeModalVisible;
  }
  showCloseModal(closeOpt) {
    if (closeOpt.forceClose) {
      this.interactionService.closeContact(this.closeDimensions);
      if (!closeOpt.stayInAppAfterClose && !closeOpt.hasSurvey) {
        this.closeApp();
      } else if (closeOpt.hasSurvey && !closeOpt.stayInAppAfterClose) {
        this.showSurvey();
      }
    } else {
      this.interactionService.showCloseModal();
    }
  }
  showUploadPanel() {
    this.interactionService.showUploadPanel();
  }
  showSurvey() {
    this.interactionService.showSurvey();
  }
  submitDataCollection(dc) {
    this.interactionService.submitDataCollection(dc);
  }
  toggleCamera() {
    this.interactionService.toggleCamera();
  }
  toggleEmojiPanel() {
    this.interactionService.toggleEmojiPanel();
  }
  trackByMethod(index: number, elem: any){
    return elem.id;
  }
  updateLeftScrollOffset(scrollObject: { scrollLeft: number, messageId: string}) {
    this.interactionService.updateLeftScrollOffset(scrollObject);
  }
  upgradeCbnToChat() {
    this.interactionService.upgradeCbnToChat();
  }
  upgradeInboundToChat() {
    this.interactionService.upgradeInboundToChat();
  }
  videoToggle(show) {
    this.interactionService.toggleVideo(show);
  }
  supportsStorages() { try {
    return (!!window.localStorage
      && !!window.sessionStorage
      && typeof localStorage.getItem === 'function'
      && typeof localStorage.setItem === 'function'
      && typeof localStorage.removeItem === 'function'
      && typeof sessionStorage.getItem === 'function'
      && typeof sessionStorage.setItem === 'function'
      && typeof sessionStorage.removeItem === 'function')
    } catch(e) {
      return false
    };
  }


  setInteractionState(state: string) {
    this.interactionState = state;
    console.log("Interaction State: " + state);
  }

  startRecording() {
    const token = this.transcriptionToken.getToken();
    this.recorder.initializeAudio(token);

    this.setInteractionState("Recording");
  }


  subscribeCustomActions() {
    this.interactionService
      .registerCustomAction({id: 'rawmessage'})
      .pipe(filter((message: RawMessage) => message.type === 'action' && !!message.args))
      .subscribe((message: RawMessage) => {
        if (!!message.action_code) {
          switch (message.action_code) {
            case 'ReproduceAudio': {
              let dataArray = [];

               // Accedi al campo `data` di `message.args[0]`, che contiene i chunk
              if (message.args[0] && Array.isArray(message.args[0].data)) {
                // Ordina i chunk in base all'indice per garantire che siano nella sequenza corretta
                const dataChunks = message.args[0].data;

                // Concatena i dati di ciascun chunk in `dataArray`
                dataChunks.forEach(chunk => {
                    if (Array.isArray(chunk.data)) {
                        dataArray = dataArray.concat(chunk.data);  // Unisce i chunk
                    }
                });
              }

              const audioData = new Uint8Array(dataArray);

              const blob = new Blob([audioData], { type: 'audio/wav' });

              const audioUrl = URL.createObjectURL(blob);

              const audio = new Audio(audioUrl);

              audio.addEventListener('ended', () => {
                this.setInteractionState("Idle");
              });

              audio.play();
            }
            break;

            case 'setIdleState':
              this.setInteractionState("Idle");
              break;

            case 'setProcessingState':
              this.setInteractionState("Processing");
              break;

            case 'setSpeakingState':
              this.setInteractionState("Speaking");
              break;

            case 'setTranscriptionToken':
              const token = message.args[0].token;

              this.transcriptionToken.setToken(token);
              break;
          }
        }
      });
  }

  isSendAreaDisabled() : boolean {
    switch (this.interactionState) {
      case 'Idle':
        return false;
        
      default:
        return true;
    }
  }
}

interface RawMessage {
  type: string;
  args?: {
    data?: any[];
  };
  action_code?: string;
}

class TranscriptionToken {
  token: string;
  used: boolean;

  constructor() {
    this.token = "";
    this.used = true;
  }

  setToken(token: string) {
    this.token = token;
    this.used = false;
  }

  getToken() : string {
    if (this.used === false) {
      return this.token;
    }
    else {
      return null;
    }
  }

  consumeToken() : void {
    this.used = true;
  }
}

export class AudioRecorder {
  threshold: number;
  silenceTime: number;
  silenceStartTime: number | null;
  isRecording: boolean;
  audioChunks: Blob[];
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  dataArray: Uint8Array | null;
  recordingTime: number;
  transcriptionToken: string;
  private eventListenersInitialized: boolean;

  public onRecordingEnded?: (transcription: string) => void;
  public onRecordingFailed?: () => void;

  constructor(threshold: number, silenceTime: number) {
    this.threshold = threshold;
    this.silenceTime = silenceTime;
    this.silenceStartTime = null;
    this.isRecording = false;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.eventListenersInitialized = false; 
  }

  async initializeAudio(transcriptionToken: string): Promise<void> {
    this.silenceStartTime = null;
    this.isRecording = false;
    this.audioChunks = [];
    this.transcriptionToken = transcriptionToken;

    if (!this.eventListenersInitialized) {
      // Aggiungi gli event handler solo una volta
      window.addEventListener('audioRecorded', async (event: CustomEvent) => {
        const audioBlob = event.detail as Blob;

        // Converti WebM in WAV
        const wavBlob = await webmToWav(audioBlob);

        //const audioUrl = URL.createObjectURL(wavBlob);
        // Stampa l'URL in console
        //console.log("Audio URL: ", audioUrl);
        
        const formData = new FormData();
        formData.append('audioData', wavBlob);
        formData.append('token', this.transcriptionToken);
        formData.append('projectId', "65b3b946ef3227405c31d6d3");
        formData.append('googleVoiceName', "en-US-Standard-H");

        const transcriptionUrl = "https://avatargpt.app.covisian.com/GetResponse/GetTranscription";
        try {
          const res = await fetch(transcriptionUrl, {
            method: 'POST',
            body: formData,
            headers: { }
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const transcription = await res.text();
          this.onRecordingEnded(capitalizeFirstLetter(transcription));
        } catch (err) {
          this.onRecordingFailed();
        }
      });

      // Ascolta l'evento personalizzato per il flusso audio
      window.addEventListener('audioStreamAvailable', (event: CustomEvent) => {
        const stream = event.detail as MediaStream;
        this.setupAudioAnalyser(stream);
        this.checkVolume();
      });

      // Imposta il flag per evitare la registrazione multipla degli handler
      this.eventListenersInitialized = true;
    }

    // Chiama direttamente startRecording per avviare la registrazione
    this.startRecording();
  }

  setupAudioAnalyser(stream: MediaStream): void {
    // Imposta l'AudioContext e l'AnalyserNode per monitorare il volume
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    source.connect(this.analyser);
  }

  checkVolume(): void {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteTimeDomainData(this.dataArray);
    let maxVal = 0;

    // Trova il valore massimo nel buffer audio
    for (let i = 0; i < this.dataArray.length; i++) {
      maxVal = Math.max(maxVal, this.dataArray[i] / 128.0 - 1.0);
    }

    // Se il valore massimo è inferiore alla soglia
    if (maxVal < this.threshold) {
      if (!this.silenceStartTime) {
        this.silenceStartTime = Date.now();
      } else if (Date.now() - this.silenceStartTime > this.silenceTime) {
        // Se il volume è troppo basso per troppo tempo, ferma la registrazione
        this.stopRecording();
        return;
      }
    } else {
      this.silenceStartTime = null;  // Reset se non c'è silenzio
    }

    // Continua a monitorare il volume
    requestAnimationFrame(() => this.checkVolume());
  }

  startRecording(): void {
    if (!this.isRecording) {
      this.isRecording = true;
      this.recordingTime = Date.now();
      window.dispatchEvent(new CustomEvent('startRecordingEvent'));
    }
  }

  stopRecording(): void {
    if (this.isRecording) {
      this.isRecording = false;
      const recordingEndTime = Date.now();
      const recordingDuration = (recordingEndTime - this.recordingTime) / 1000;

      window.dispatchEvent(new CustomEvent('stopRecordingEvent'));
    }
  }
}

function capitalizeFirstLetter(text: string): string {
  if (!text) return text; // Verifica che la stringa non sia vuota o null
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

async function webmToWav(webmBlob: Blob): Promise<Blob> {
  try {
    // Usa FileReader per leggere il Blob come ArrayBuffer
    const arrayBuffer = await blobToArrayBuffer(webmBlob);
    
    // Creazione di un contesto audio per decodificare il WebM
    const audioContext = new AudioContext();
    
    // Decodifica del file audio WebM
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Creazione del WAV buffer
    const wavBuffer = audioBufferToWav(audioBuffer);

    // Creazione di un Blob in formato WAV
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    return wavBlob;
  } catch (err) {
    throw err;
  }
}

// Funzione per convertire l'audio buffer in WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numOfChannels * 2 + 44;
  const result = new ArrayBuffer(length);
  const view = new DataView(result);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Scrittura dell'intestazione WAV
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // Lunghezza del file meno l'intestazione
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // Lunghezza del chunk
  setUint16(1); // Audio format (PCM)
  setUint16(numOfChannels); // Numero di canali
  setUint32(buffer.sampleRate); // Sample rate
  setUint32(buffer.sampleRate * 2 * numOfChannels); // Byte rate
  setUint16(numOfChannels * 2); // Block align
  setUint16(16); // Bit depth (16-bit)

  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // Lunghezza del data chunk

  // Scrittura dei campioni audio
  for (let i = 0; i < numOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChannels; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset])); // Normalizza tra -1 e 1
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      pos += 2;
    }
    offset++;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  return result;
}
