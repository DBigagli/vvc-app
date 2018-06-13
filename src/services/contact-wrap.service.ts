import {Injectable, NgZone} from '@angular/core';
import {AppState} from '../store/reducers/main.reducer';
import {Store} from '@ngrx/store';
import {VvcDataCollectionService} from './data-collection.service';
import {VvcProtocolService} from './protocol.service';
import {VvcMessageService} from './messages.service';
import {objectToDataCollection} from '@vivocha/public-entities/dist/wrappers/data_collection';
import {VvcUiService} from './ui.service';
import {DataCollectionState} from '../store/models.interface';
import {AgentState} from '../store/models.interface';
import {ClientContactCreationOptions} from '@vivocha/public-entities/dist/contact';
import { Subject } from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';

@Injectable()
export class VvcContactWrap {

  private vivocha;
  private contact;
  private context;

  lastSystemMessageId;
  agent;
  agentRequestCallback;
  dissuasionTimer;
  hasReceivedMsgs = false;
  isClosed = false;
  isWritingTimer;
  isWritingTimeout = 30000;
  incomingCallback;
  incomingOffer;
  incomingMedia;
  interactionStart;

  autoChat = false;
  autoChatInitialData;
  messageArchive = [];

  customActions = {};
  visitorNick;

  constructor(
    private store: Store<AppState>,
    private dcService: VvcDataCollectionService,
    private protocolService: VvcProtocolService,
    private messageService: VvcMessageService,
    private uiService: VvcUiService,
    private zone: NgZone
  ){}

  acceptAgentRequest(requestId){
    this.agentRequestCallback(null, true);
    this.messageService.removeMessage(this.lastSystemMessageId);
    this.messageService.sendSystemMessage('STRINGS.MESSAGES.'+requestId.toUpperCase()+'_ACCEPTED');
  }
  acceptOffer(){
    this.mergeOffer(this.incomingOffer, this.incomingCallback);
  }
  addChatToFullScreen(show){
    this.uiService.setFullScreenChat(show);
    if (this.context.mediaPreset !== 'chat') this.askForUpgrade('Chat');
  }
  askForUpgrade(media){
    if (media !== 'Chat') this.uiService.setIsOffering(media);
    this.contact.getMediaOffer().then(offer => {
      if (media === 'Chat'){
        offer[media] = {
          tx: 'required',
          rx: 'required'
        };
      }
      else {
        offer[media] = {
          tx: 'required',
          rx: 'required',
          via: 'net',
          engine: 'WebRTC'
        };
      }
      if (media === 'Video'){
        offer['Voice'] = {
          tx: 'required',
          rx: 'required',
          via: 'net',
          engine: 'WebRTC'
        };
      }
      this.contact.offerMedia(offer).then(() => {
        this.zone.run( () => {

        });
      }, (err) => {
        this.zone.run( () => {
          this.uiService.setOfferRejected();
        })
      })
    })

  }
  attachDataAndCreateContact(context){
    const contactOptions: { data: any[], nick?: string} = { data: [] };
    const dataCollection = context.dataCollections[0];
    const data = {};
    for (let i = 0; i < dataCollection.fields.length; i++) {
      const field = dataCollection.fields[i];
      if (field.format === 'nickname' && field.id) {
        contactOptions.nick = data[field.id];
      }
      const hasDefault = typeof field.defaultConstant !== 'undefined';

      field.value = hasDefault ? field.defaultConstant.toString() : field.defaultConstant;

      data[field.id] = field.value;
    }
    contactOptions.data.push(objectToDataCollection(data, dataCollection.id, dataCollection));
    this.createContact(contactOptions);
  }
  checkForTranscript() {
    const transcript = this.contact.contact.transcript;
    for (const m in transcript) {
      const msg = transcript[m];
      switch (msg.type) {
        case 'text':
          const agent = (msg.agent) ? this.agent : false;
          if (msg.quick_replies){
            this.messageService.addQuickRepliesMessage(msg, this.agent);
          }
          else if (msg.template) {
            this.messageService.addTemplateMessage(msg, this.agent);
          } else {
            this.messageService.addChatMessage(msg, agent, this.visitorNick);
          }
          break;
        case 'attachment':
          const meta = msg.meta;
          meta.url = (meta.originalUrl) ? meta.originalUrl : msg.url;
          const attachment = {
            body: meta.desc || meta.originalName,
            type: 'chat',
            meta: meta,
            from_nick: msg.from_nick,
            from_id: msg.from_id
          };
          if (msg.agent) this.messageService.addChatMessage(attachment, this.agent, this.visitorNick);
          else this.messageService.addChatMessage(attachment, null, this.visitorNick);
          break;
      }
    }
  }
  closeApp() {
    this.leave().then((reason) => {
      if (reason === 'failed') {

      } else {
        this.vivocha.pageRequest('interactionClosed', reason);
      }
      this.vivocha.pageRequest('interactionClosed', 'destroy');
    });
  }
  closeContact(){
    this.leave().then((reason) => {
      this.zone.run(() => {
        this.uiService.setClosedByVisitor();
        this.messageService.sendSystemMessage('STRINGS.MESSAGES.LOCAL_CLOSE');
        this.vivocha.setNormalScreen();
        this.isClosed = true;
        if (!this.context.variables.stayInAppAfterClose && !this.dcService.hasSurvey()){
          this.vivocha.pageRequest('interactionClosed', reason);
          this.vivocha.pageRequest('interactionClosed', 'destroy');
        }
      });
    });
  }
  closeUploadPanel(){
    this.uiService.setUploadPanel(false);
  }
  createAutoContact(dataToMerge?){
    this.autoChat = true;
    this.autoChatInitialData = dataToMerge;
    this.uiService.setAutoChat();
    this.uiService.setTopBar({ title: 'STRINGS.TOPBAR.TITLE_DEFAULT', subtitle: 'STRINGS.TOPBAR.SUBTITLE_DEFAULT'});
  }
  createContact(dataToMerge?){
    const conf: ClientContactCreationOptions = this.getContactOptions(dataToMerge);
    if (conf && conf.nick) this.visitorNick = conf.nick;
    this.vivocha.pageRequest('interactionCreation', conf, (opts: ClientContactCreationOptions = conf) => {
      console.log('pre-routing callback', opts);
      this.interactionStart = +new Date();
      const timeout = (this.context.routing.dissuasionTimeout || 60) * 1000;
      this.dissuasionTimer = setTimeout(() => {
        this.leave('dissuasion').then(() => {
          this.zone.run(() => {
            console.log('PRE-DISSUASION', JSON.stringify(this.context, null, 2));
            this.uiService.setDissuasion();
          });
        });
      }, timeout);
      this.vivocha.createContact(opts).then( (contact) => {
        this.zone.run( () => {
          console.log('contact created', JSON.stringify(contact.contact.initial_offer, null, 2));

          this.uiService.initializeProtocol(this.context, {
            initialOffer: contact.contact.initial_offer
          });
          this.contact = contact;
          this.mapContact();
        });
      }, (err) => {
        console.log('Failed to create contact', err);
        this.vivocha.pageRequest('interactionFailed', err.message);
        this.zone.run( () => {
          this.uiService.setCreationFailed();
        })
      });
    });
  }
  getContactOptions(dataToMerge?):ClientContactCreationOptions {
    const initialOpts:ClientContactCreationOptions = {
      campaignId: this.context.campaign.id,
      version: this.context.campaign.version,
      channelId: 'web',
      entryPointId: this.context.entryPointId,
      engagementId: this.context.engagementId,
      mediaPreset: this.context.mediaPreset,
      lang: this.context.language,
      vvcu: this.context.page.vvcu,
      vvct: this.context.page.vvct,
      first_uri: this.context.page.first_uri,
      first_title: this.context.page.first_title
    };
    if (this.context.page.first_uri) {
      initialOpts.first_uri = this.context.page.first_uri;
    }
    if (this.context.page.first_title) {
      initialOpts.first_title = this.context.page.first_title;
    }
    if (dataToMerge){
      return Object.assign({}, initialOpts, dataToMerge);
    }
    else return Object.assign({}, initialOpts);
  }
  hangUp(){
    this.contact.getMediaOffer().then(mediaOffer => {
      if (mediaOffer['Voice']) {
        mediaOffer['Voice'].tx = 'off';
        mediaOffer['Voice'].rx = 'off';
      }
      if (mediaOffer['Video']) {
        mediaOffer['Video'].tx = 'off';
        mediaOffer['Video'].rx = 'off';
      }
      this.zone.run(() => {
        this.vivocha.setNormalScreen();
        this.uiService.setHangUpState();
      });
      this.contact.offerMedia(mediaOffer).then( () => {
        this.zone.run( () => {
          if (this.context.mediaPreset != 'chat') this.askForUpgrade('Chat');
        })
      });
    });
  }
  hasRecallForNoAgent(){
    return false;
  }
  hideChat(){
    this.uiService.hideChat();
  }
  initializeContact(vivocha, context){
    this.vivocha = vivocha;
    this.context = context;
    this.dcService.setInitialContext(context);
    if (this.isInPersistence()) {
      this.resumeContact(context);
      if (this.dcService.hasSurvey()){
        this.dcService.onSurveyCompleted().subscribe( (survey) => {
          if (survey && survey.completed){
            this.contact.storeSurvey(survey.item);
          }
        });
      }
    }
    else {
      this.dcService.onDataCollectionCompleted().subscribe((data: DataCollectionState) => {
        if (data && data.completed) {
          if (this.isAutoChat()){
            this.createAutoContact(data.creationOptions)
          }
          else {
            this.uiService.showQueuePanel();
            this.createContact(data.creationOptions);
          }
        }
      });
      if (this.dcService.hasSurvey()) {
        this.dcService.onSurveyCompleted().subscribe((survey) => {
          if (survey && survey.completed) {
            this.contact.storeSurvey(survey.item);
          }
        });
      }
      this.dcService.processDataCollections();
    }
  }
  isAutoChat(){
    return this.context.mediaPreset === 'chat' && this.context.variables.autoChat;
  }
  isChatEmulationContact(){
    return false;
  }
  isOfflineMessage(text){
    const m = this.messageArchive.filter( m => m === text)[0];
    if (m){
      this.messageArchive = [...this.messageArchive.filter( m => m !== text)];
      return true;
    }
    return false;
  }
  isRecallContact(){
    return false;
  }
  isInPersistence(){
    return !!this.context.persistenceId
  }
  leave(reason?: string){
    return new Promise((resolve, reject) => {
      if (this.contact) {
        const now = +new Date();
        const contactTime = (now - this.interactionStart);
        const ev = reason ? reason : (this.hasReceivedMsgs ? "closed" : (contactTime > 10000 ? "abandoned" : "cancelled") );

        this.contact.leave(ev, () => {
          this.contact.release();
          if (this.contact.channel.isConnected()) {
            this.contact.channel.disconnect();
          }
          resolve(ev);
        });
      }
      else {
        resolve('failed');
      }
    });
  }
  mapContact(){
    this.vivocha.pageRequest('interactionCreated', this.contact);
    this.contact.on('agentrequest', (message, cb) => {
      this.zone.run( () => {
        this.onAgentRequest(message, cb);
      });
    });
    this.contact.on('attachment', (url, meta, fromId, fromNick, isAgent) => {
      this.zone.run( () => {
        const attachment = {url, meta, fromId, fromNick, isAgent};
        meta.url = (meta.originalUrl) ? meta.originalUrl : url;
        const msg = {
          body: meta.desc || meta.originalName,
          type: 'chat',
          meta: meta,
          from_nick: fromNick,
          from_id: fromId
        };
        if (isAgent) this.messageService.addChatMessage(msg, this.agent, this.visitorNick);
        else this.messageService.addChatMessage(msg, null, this.visitorNick);
      });
    });
    this.contact.on('joined', (c) => {
        if (c.user) {
          if (this.dissuasionTimer) {
            clearTimeout(this.dissuasionTimer);
            delete this.dissuasionTimer;
          }
          this.onAgentJoin(c);
        } else {
          this.onLocalJoin(c);
        }
    });
    this.contact.on('rawmessage', (msg) => {
      this.zone.run( () => {
        if (msg.type != 'text') return;
        if (msg.quick_replies){
          this.messageService.addQuickRepliesMessage(msg, this.agent);
        }
        else if (msg.template) {
          this.messageService.addTemplateMessage(msg, this.agent);
        } else {
          this.messageService.addChatMessage(msg, this.agent, this.visitorNick);
        }
        if (msg.agent) this.uiService.setIsWriting(false);
        this.uiService.newMessageReceived();
        if (this.context.variables.playAudioNotification) this.playAudioNotification();
        this.hasReceivedMsgs = true;
      });

    });
    this.contact.on('iswriting', (from_id, from_nick, agent) => {
      this.zone.run( () => {
        if (agent) {
          this.setIsWriting();
        }
      });
    });
    this.contact.on('localtext', (text) => {
      this.zone.run( () => {
        if (this.agent && this.agent.is_bot){
          this.setIsWriting();
        }
        if (!this.isOfflineMessage(text)) this.messageService.addLocalMessage(text);
      });
    });
    this.contact.on('left', obj => {
      this.zone.run( () => {
        console.log('LEFT', obj);
        if (obj.channels && (obj.channels.user !== undefined) && obj.channels.user === 0) {
          this.uiService.setClosedByAgent();
          this.vivocha.setNormalScreen();
          this.messageService.sendSystemMessage('STRINGS.MESSAGES.REMOTE_CLOSE');
          this.isClosed = true;
        }
      });

    });
    this.contact.on('localcapabilities', caps => {
      //console.log('ON_LOCAL',caps);
    });
    this.contact.on('capabilities', caps => {
      //console.log('ON_REMOTE',caps);
    });
    this.contact.on('mediachange', (media, changed) => {
      console.log('MEDIACHANGE', JSON.stringify(media,null,2));
      this.zone.run( () => {
        this.protocolService.setMediaChange(media);
        this.uiService.setMediaState(media);
      })
    });
    this.contact.on('mediaoffer', (offer, cb) => {
      this.zone.run( () => {
        this.onMediaOffer(offer, cb);
      })
    });
    this.contact.on('transferred', () => {
      this.zone.run( () => {
        this.messageService.sendSystemMessage('STRINGS.MESSAGES.TRANSFERRED');
      });
    });
    Object.keys(this.customActions).forEach( a => {
      this.contact.on(a, (message, callback) => {
        this.zone.run( () => {
          this.customActions[a]['callback'] = callback;
          this.customActions[a].stream.next(message);
        });
      })
    })
  }
  mergeOffer(diffOffer, cb){
    this.contact.mergeMedia(diffOffer).then(mergedMedia => {
      this.zone.run( () => {
        cb(undefined, mergedMedia);
        //this.uiService.setOfferAccepted();
      })
    });
  }
  muteToggle(muted){
    this.uiService.setMuteInProgress();
    this.contact.getMediaEngine('WebRTC').then( engine => {
      if (muted) {
        engine.muteLocalAudio();
      } else {
        engine.unmuteLocalAudio();
      }
      this.zone.run( () => {
        this.uiService.setMuted(muted);
      });
    });
  }
  minimize(minimize: boolean, isFullScreen?: boolean, positionObject?: any, sizeObject?: any){
    if (minimize) {
      this.vivocha.minimize({
        bottom: (positionObject && positionObject.bottom) ? positionObject.bottom : '10px',
        right: (positionObject && positionObject.right) ? positionObject.right : '10px'
      }, {
        width: (sizeObject && sizeObject.width) ? sizeObject.width : '70px',
        height: (sizeObject && sizeObject.height) ? sizeObject.height : '70px'
      });

      this.uiService.setMinimizedState();
    } else {
      if (isFullScreen){
       this.setFullScreen();
      } else {
        this.vivocha.maximize();
        this.uiService.setNormalState();
      }
    }
  }
  minimizeMedia(){
    if (!this.protocolService.isAlreadyConnectedWith('Chat')){
      this.askForUpgrade('Chat');
    }
    this.uiService.setMinimizedMedia();
  }
  noAgents(){
    return false;
  }
  onAgentJoin(join){
    this.contact.getMedia().then( (media) => {
      this.zone.run( () => {
        const agent : AgentState  = {
          id: join.user,
          nick: join.nick,
          is_bot: !!join.is_bot,
          is_agent: !join.is_bot,
        };
        if (join.avatar){
          agent.avatar = join.avatar
        }
        this.agent = agent;
        this.vivocha.pageRequest('interactionAnswered', agent);
        this.protocolService.setMediaChange(media);
        this.uiService.initializeMedia(media);
        this.setAnsweredState(agent);
      });
    });
  }
  onAgentRequest(message, cb){
    this.agentRequestCallback = cb;
    this.lastSystemMessageId = this.messageService.sendRequestMessage(message);
  }
  onLocalJoin(join){
    if (join.reason && join.reason === 'resume') {
      this.contact.getMedia().then((media) => {
        this.zone.run( () => {
          const agentInfo = this.contact.contact.agentInfo;
          const agent : AgentState = {
            id: agentInfo.id,
            nick: agentInfo.nick,
            is_bot: !!agentInfo.bot,
            is_agent: !agentInfo.bot,
          };
          if (agentInfo.avatar){
            agent.avatar = agentInfo.avatar;
          }
          console.log('LOCAL JOIN', agent, this.contact);
          this.agent = agent;
          this.uiService.setAgent(agent);
          if (this.context.variables.showAgentInfoOnTopBar){
            this.uiService.setTopBarWithAgentInfo(agent);
          } else {
            this.uiService.setTopBar({ title: 'STRINGS.TOPBAR.TITLE_DEFAULT', subtitle: 'STRINGS.TOPBAR.SUBTITLE_DEFAULT'});
          }
          this.protocolService.setMediaChange(media);
          this.uiService.initializeMedia(media);
          this.checkForTranscript();
        });
      });
    }
    if (this.autoChat){
      this.messageArchive.map( m => this.contact.sendText(m));
      this.autoChat = false;
    }
  }
  onMediaOffer(offer, cb){
    this.uiService.setMediaOffer(offer);
    const o = this.protocolService.confirmNeeded(offer);
    if (o.askForConfirmation){
      this.incomingMedia = o.media;
      this.uiService.setIncomingMedia(o.media);
      this.incomingCallback = cb;
      this.incomingOffer = o.offer;
    }
    else {
      const newOffer = this.protocolService.mergeOffer(offer);
      this.mergeOffer(newOffer, cb);

    }
  }
  openAttachment(url){
    const msg = { type: 'web_url', url: url };
    this.vivocha.pageRequest('interactionEvent', msg.type, msg);
  }
  playAudioNotification() {
    const notif = new Audio();
    notif.src = window['beepmp3'];
    notif.load();
    notif.play();
  }
  processQuickReply(reply){
    this.messageService.updateQuickReply(reply.msgId);
    const vvcQuickReply: any = {
      code: "message",
      type: "text",
      body: reply.action.title
    };
    if (reply.action.payload !== undefined){
      vvcQuickReply.payload = reply.action.payload;
    }
    this.contact.send(vvcQuickReply);
    this.messageService.addLocalMessage(reply.action.title);
  }
  registerCustomAction(action): Observable<any>{
    this.customActions[action.id] = { stream: new Subject() };
    return this.customActions[action.id].stream;
  }
  rejectAgentRequest(requestId){
    this.agentRequestCallback(null, false);
    this.messageService.removeMessage(this.lastSystemMessageId);
    this.messageService.sendSystemMessage('STRINGS.MESSAGES.'+requestId.toUpperCase()+'_REJECTED');
  }
  rejectOffer(){
    this.incomingCallback('error', {});
    this.messageService.sendSystemMessage('STRINGS.CALL_REJECTED');
    this.uiService.setOfferRejected();
  }
  resumeContact(context: any){
    this.vivocha.dataRequest('getData', 'persistence.contact').then((contactData) => {
      this.vivocha.resumeContact(contactData).then((contact) => {
        this.zone.run( () => {
          this.uiService.initializeProtocol(context, {
            initialOffer: contact.initial_offer
          });
          this.contact = contact;
          this.mapContact();
        });
      }, (err) => {
        console.log('Failed to resume contact', err);
        this.vivocha.pageRequest('interactionFailed', err.message);
      });
    });
  }
  sendAttachment(upload) {
    this.uiService.setUploading();
    this.contact.attach(upload.file, upload.text).then(() => {
      this.zone.run( () => {
        this.uiService.setUploaded();
      })
    })
  }
  sendIsWriting(){
    if (!this.autoChat) this.contact.sendIsWriting();
  }
  sendPostBack(msg){
    const vvcPostBack: any = {
      code: "message",
      type: "postback",
      body: msg.title
    };
    if (msg.payload !== undefined){
      vvcPostBack.payload = msg.payload;
    }
    if (msg.type === "postback") {
      this.contact.send(vvcPostBack);
    }
    else {
      this.vivocha.pageRequest('interactionEvent', msg.type, msg);
    }
  }
  sendRequest(requestId, requestData){
    return this.contact.request(requestId, requestData);
  }
  sendText(text){
    if (this.autoChat){
      this.messageArchive.push(text);
      this.messageService.addChatMessage({ body: text, ts: +new Date().getTime()});
      if (this.messageArchive.length === 1) this.createContact(this.autoChatInitialData);
    }
    else {
      this.contact.sendText(text);
    }
  }
  setAnsweredState(agent){
    this.messageService.removeMessage(this.lastSystemMessageId);
    this.uiService.setAgent(agent);
    if (this.context.variables.showAgentInfoOnTopBar){
      this.uiService.setTopBarWithAgentInfo(agent);
    } else {
      this.uiService.setTopBar({ title: 'STRINGS.TOPBAR.TITLE_DEFAULT', subtitle: 'STRINGS.TOPBAR.SUBTITLE_DEFAULT'});
    }
    if (this.context.variables.showWelcomeMessage){
      this.lastSystemMessageId = this.messageService.sendSystemMessage('STRINGS.CHAT.WELCOME_MESSAGE', { nickname: agent.nick });
    }
  }
  setIsWriting(){
    clearTimeout(this.isWritingTimer);
    this.uiService.setIsWriting(true);
    this.isWritingTimer = setTimeout( () => {
      this.uiService.setIsWriting(false);
    }, this.isWritingTimeout);
  }
  setQueueState(){
    this.lastSystemMessageId = this.messageService.sendSystemMessage('STRINGS.QUEUE.CONNECTING');
  }
  setFullScreen(){
    this.uiService.setFullScreen();
    this.vivocha.setFullScreen();
  }
  setNormalScreen(){
    this.uiService.setNormalScreen();
    this.vivocha.setNormalScreen();
  }
  setTopBar(avatarUrl: string, title: string, subtitle: string){
    this.uiService.setTopBarWithAvatar(avatarUrl,title,subtitle);
  }
  setTopBarAvatar(avatarUrl: string){
    this.uiService.setTopBarAvatar(avatarUrl);
  }
  setTopBarSubtitle(subtitle: string){
    this.uiService.setTopBarSubtitle(subtitle);
  }
  setTopBarTitle(title: string){
    this.uiService.setTopBarTitle(title);
  }
  showCloseModal(show: boolean){
    this.uiService.setCloseModal(show);
  }
  showUploadPanel(){
    this.uiService.setUploadPanel(true);
  }
  showSurvey(){
    this.dcService.showSurvey();
  }
  submitDataCollection(dc){
    this.dcService.submitDataCollection(dc);
  }
  submitSurvey(survey){
    this.dcService.submitSurvey(survey)
  }
  toggleEmojiPanel(){
    this.uiService.toggleEmojiPanel();
  }
  toggleVideo(show){
    this.contact.getMediaOffer().then(mediaOffer => {
      if (mediaOffer['Video']) {
        //const mode = show ? 'required' : 'off';
        const videoTx = mediaOffer['Video'].tx;
        if (videoTx === 'required') mediaOffer['Video'].tx = 'off';
        else mediaOffer['Video'].tx = 'required';
      }
      this.zone.run( () => {
        this.uiService.setInTransit(true);
      });
      console.log('TOGGLE VIDEO', show, JSON.stringify(mediaOffer, null, 2));
      this.contact.offerMedia(mediaOffer).then( () => {
        this.zone.run( () => {
          this.uiService.setInTransit(false);
        });
      });
    });
  }
}
