import {Component, Input, OnInit} from '@angular/core';
import {NgForm} from '@angular/forms';
import {CommonService} from '../../../services/common.service';
import {Observable, Subscription} from 'rxjs';
import {AngularFirestore} from '@angular/fire/firestore';
import * as firebase from 'firebase';
import {AngularFireStorage} from '@angular/fire/storage';
import {finalize} from 'rxjs/operators';
import {aliasTransformFactory} from '@angular/compiler-cli/src/ngtsc/transform';
import {AngularFireDatabase, AngularFireList} from '@angular/fire/database';
import {User} from 'firebase';

@Component({
  selector: 'app-chat-area',
  templateUrl: './chat-area.component.html',
  styleUrls: ['./chat-area.component.scss']
})
export class ChatAreaComponent implements OnInit {

  constructor(private commonService: CommonService,
              private afs: AngularFirestore,
              private storage: AngularFireStorage) {
    this.currentUserId = Object.values(JSON.parse(localStorage.getItem('user') as string))[0];
  }

  @Input() randomSeed!: string;
  subs!: Subscription;
  paramValue!: string;
  roomName!: string;
  downloadURL: Observable<string> | undefined;
  fb: string | undefined;
  currentUserId!: unknown;
  imageUrl: string | undefined;
  imageUploaded = false;

  ngOnInit(): void {
    this.subs = this.commonService.pathParam.subscribe(value => {
      this.paramValue = value;
      // console.log('\nKey: ' + this.paramValue);
      /*console.log(this.isUser);*/
    });
  }

  /**
   * Message upload to Firestore
   * @param form
   */
  formSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    const {message} = form.value;
    form.resetForm();


    this.afs.collection('rooms').doc(this.paramValue).collection('messages').add({
      message,
      user_id: this.commonService.getUser().uid,
      name: this.commonService.getUser().displayName,
      time: firebase.firestore.FieldValue.serverTimestamp()
    });


    // Push Notification for messages
    /**
     * currently not working properly
     */
    /*if (this.currentUserId !== this.commonService.getUser().uid) {
      this.getPermissionMessage(this.commonService.getUser().displayName, message);
      console.log('notification from other user message should be loaded');
    } else {
      console.log('User is the same as message writer');
    }*/

  }

  imageSubmit(): void {
    if (this.imageUploaded) {
      this.afs.collection('rooms').doc(this.paramValue).collection('messages').add({
        imageUrl: this.imageUrl,
        user_id: this.commonService.getUser().uid,
        name: this.commonService.getUser().displayName,
        time: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        this.imageUrl = undefined;
        this.imageUploaded = false;
      });
    }
  }

  chatData(ev: any): void {
    if (ev.chatData !== undefined) {
      ev.chatData.subscribe((roomName: string) => this.roomName = roomName);
    }
  }

  /**
   * Image Upload
   * Function for uploading images to the Firestore database -> saved into storage
   * @param event
   */
  onFileSelected(event: any): void {
    if (this.paramValue !== '') {
      const file = event.target.files[0];
      const type = file.type;
      // type.indexOf('CR2');
      const filename = file.name;
      // Notification API stuff
      let isImage: boolean;

      if (type.indexOf('image') !== 0) {
        isImage = false;
        // show notification if file is not an image
        this.getPermissionUpload(isImage, file);
        return;
      } else {
        if (type.indexOf('CR2') === 6 || type.indexOf('CR3') === 6) {
          alert('transform raw images to valid image format');
          return;
        }
        // console.log(file);
        isImage = true;
        // we add time so we can upload the same image multiple times to our database
        const time = Date.now();
        /*const filePath = `images/${filename}_${time}`;*/
        // maybe needed, this only adds a route for the specific chatroom
        const filePath = `images/${this.roomName}_${this.paramValue}/${filename}_${time}`;
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
        // complete the uploading task
        task
          .snapshotChanges()
          .pipe(
            finalize(() => {
              this.downloadURL = fileRef.getDownloadURL();
              this.downloadURL.subscribe(url => {
                if (url) {
                  this.fb = url;
                  this.imageUrl = url;
                  this.imageUploaded = true;
                  this.imageSubmit();
                }
                console.log(this.fb);
                this.getPermissionUpload(isImage, file);
                // add function to send pic into the group
                // this.pictureSubmit(file);
              });
            })
          ).subscribe(url => {
          if (url) {
            // console.log(url);
          }
        });
      }
    } else {
      alert('cannot send file if no room is chosen');
    }
  }

  /* ******************** Permissions ******************** */
  /**
   * Ask for permssion to show push notification -> show filename and if it was uploaded or not
   * @param isImage
   * @param file
   */
  getPermissionUpload(isImage: boolean, file: any): void {
    const permission = Notification.permission;
    const type = file.type;
    const fileName = file.name;
    let typeName = type.split('/')[1];
    // tslint:disable-next-line:triple-equals
    if (type == ''){
      typeName = fileName.split('.')[1];
    }

    if (permission === 'granted') {
      this.showNotificationUpload(fileName, typeName, isImage);
    } else if (permission !== 'denied') {
      Notification.requestPermission().then(getPermission => {
        if (getPermission === 'granted') {
          this.showNotificationUpload(fileName, typeName, isImage);
        }
      });
    } else if (permission === 'denied' && isImage) {
      alert(`${fileName} has been uploaded`);
    } else {
      alert('File hasn\'t been uploaded\n' + `${fileName}\n${typeName} is not an image`);
    }
  }

  /**
   * Ask for permission to show push notifications -> show username and message
   * @param username
   * @param message
   */
  getPermissionMessage(username: string | null, message: string): void {
    const permission = Notification.permission;

    if (permission === 'granted') {
      this.showNotificationMessage(username, message);
    } else if (permission !== 'denied') {
      Notification.requestPermission().then(getPermission => {
        if (getPermission === 'granted') {
          this.showNotificationMessage(username, message);
        }
      });
    } else {
      console.log('rejected push notifications');
    }
  }

  /* ******************** Permissions ******************** */
  /**
   * Notification for Upload
   * @param filename
   * @param type
   * @param isImage
   */
  showNotificationUpload(filename: string, type: string, isImage: boolean): void {
    let mTitle: string;
    let message: string;
    isImage === true ? mTitle = `${filename} has been uploaded` : mTitle = 'File hasn\'t been uploaded';
    isImage === true ? message = '' : message = `${filename}\n${type} is not an image`;

    if (isImage) {
      const notification = new Notification(mTitle,
        {
          body: message,
          silent: true,
          icon: 'assets/logo_transparent.png',
        }
      );
    } else {
      const notification = new Notification(mTitle,
        {
          body: message,
          silent: false,
          icon: 'assets/logo_transparent.png',
          vibrate: [200, 50, 200] // makes the phone vibrate if user uses one
        }
      ).vibrate;
    }
  }

  /**
   * Notification for new messages
   * @param name
   * @param message
   */
  showNotificationMessage(name: string | null, message: string): void {
    const mTitle = `${name} sent a new message in ${this.roomName}`;

    const notification = new Notification(mTitle, {
      body: message,
      silent: true,
      icon: 'assets/logo_transparent.png'
    });
  }
}
