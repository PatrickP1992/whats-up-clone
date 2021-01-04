import {Component, Input, OnInit} from '@angular/core';
import {NgForm} from '@angular/forms';
import {CommonService} from '../../../services/common.service';
import {Observable, Subscription} from 'rxjs';
import {AngularFirestore} from '@angular/fire/firestore';
import * as firebase from 'firebase';
import {AngularFireStorage, AngularFireStorageModule} from '@angular/fire/storage';
import {finalize} from 'rxjs/operators';
import {aliasTransformFactory} from '@angular/compiler-cli/src/ngtsc/transform';


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

  constructor(private commonService: CommonService,
              private afs: AngularFirestore,
              private storage: AngularFireStorage) {
  }

  ngOnInit(): void {
    this.subs = this.commonService.pathParam.subscribe(value => {
      this.paramValue = value;
      console.log(this.paramValue);
    });
  }

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
  }

  chatData(ev: any): void {
    if (ev.chatData !== undefined) {
      ev.chatData.subscribe((roomName: string) => this.roomName = roomName);
    }
  }

  /**
   *  Function for Uploading Images to Database (firestorage: images/)
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    const type = file.type;
    const filename = file.name;
    // Notification API stuff
    let isImage: boolean;

    if (type.indexOf('image') !== 0) {
      isImage = false;
      // show notification if file is not an image
      this.getPermission(isImage, file);
    } else {
      console.log(file);
      const filePath = `images/${filename}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);
      isImage = true;
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
              this.getPermission(isImage, file);
            });
          })
        ).subscribe(url => {
        if (url) {
          console.log(url);
        }
      });
    }
  }

  /**
   * Method for showing web notifications -> asking for permission to show notifications, etc.
   * @param isImage
   * @param file
   */
  getPermission(isImage: boolean, file: any): void {
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

  showNotificationUpload(filename: string, type: string, isImage: boolean): void {
    let mTitle;
    let message;
    if (isImage) {
      mTitle = `${filename}: has been uploaded`;
      message = '';
    } else {
      mTitle = 'Image hasn\'t been uploaded';
      message = `${filename}: ${type.split('/')[1]} is not an image`;
    }
    const notification = new Notification(mTitle, {body: message});
  }
}
