import {Component, Input, OnInit} from '@angular/core';
import {NgForm} from '@angular/forms';
import {CommonService} from '../../../services/common.service';
import {Observable, Subscription} from 'rxjs';
import {AngularFirestore} from '@angular/fire/firestore';
import * as firebase from 'firebase';
import {AngularFireStorage, AngularFireStorageModule} from '@angular/fire/storage';
import {finalize} from 'rxjs/operators';
import {aliasTransformFactory} from '@angular/compiler-cli/src/ngtsc/transform';
import {AngularFireDatabase, AngularFireList} from '@angular/fire/database';


@Component({
  selector: 'app-chat-area',
  templateUrl: './chat-area.component.html',
  styleUrls: ['./chat-area.component.scss']
})
export class ChatAreaComponent implements OnInit {
  @Input() randomSeed!: string;
  subs!: Subscription;
  paramValue!: string;
  roomName!: string;
  downloadURL: Observable<string> | undefined;
  fb: string | undefined;
  /*imageList: AngularFireList<any> | undefined;*/

  constructor(private commonService: CommonService,
              private afs: AngularFirestore,
              private storage: AngularFireStorage,
              private firedatabase: AngularFireDatabase) {
  }

  ngOnInit(): void {
    this.subs = this.commonService.pathParam.subscribe(value => {
      this.paramValue = value;
      // console.log('\nKey: ' + this.paramValue);
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
    this.getPermissionMessage(this.commonService.getUser().displayName, message);

  }

  /** CURRENTLY NOT WORKING
   * Message with image
   *
   */
   pictureSubmit(image: File): void {
    this.afs.collection('rooms').doc(this.paramValue).collection('messages').add({
      image,
      user_id: this.commonService.getUser().uid,
      name: this.commonService.getUser().displayName,
      time: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  chatData(ev: any): void {
    if (ev.chatData !== undefined) {
      ev.chatData.subscribe((roomName: string) => this.roomName = roomName);
    }
  }

  /**
   * Image Upload
   * IMPORTANT: currently every user gets a notification if someone uploads an image
   * Function for uploading images to the Firestore database -> saved into storage
   * @param event
   */
  onFileSelected(event: any): void {
    if (this.paramValue !== '') {
      const file = event.target.files[0];
      const type = file.type;
      const filename = file.name;
      // Notification API stuff
      let isImage: boolean;

      if (type.indexOf('image') !== 0) {
        isImage = false;
        // show notification if file is not an image
        this.getPermissionUpload(isImage, file);
      } else {
        // console.log(file);
        isImage = true;
        // we add time so we can upload the same image multiple times to our database
        const time = Date.now();
        /*const filePath = `images/${filename}_${time}`;*/
        // maybe needed, this only adds a route for the specific chatroom
        const filePath = `images/${this.paramValue}/${filename}_${time}`;
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
    const filename = file.name;

    if (permission === 'granted') {
      this.showNotificationUpload(filename, type, isImage);
    } else if (permission !== 'denied') {
      Notification.requestPermission().then(getPermission => {
        if (getPermission === 'granted') {
          this.showNotificationUpload(filename, type, isImage);
        }
      });
    } else if (permission === 'denied' && isImage) {
      alert(`${filename}: has been uploaded`);
    } else {
      alert('Image hasn\'t been uploaded\n' + `${filename}: ${type.split('/')[1]} is not an image`);
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
    isImage === true ? mTitle = `${filename} has been uploaded` : mTitle = 'Image hasn\'t been uploaded';
    isImage === true ? message = '' : message = `${filename}: ${type.split('/')[1]} is not an image`;

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
