import {Component, Input, OnInit} from '@angular/core';
import {NgForm} from '@angular/forms';
import {CommonService} from '../../../services/common.service';
import {Observable, Subscription} from 'rxjs';
import {AngularFirestore} from '@angular/fire/firestore';
import * as firebase from 'firebase';
import {AngularFireStorage, AngularFireStorageModule} from '@angular/fire/storage';
import {finalize} from 'rxjs/operators';


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
    if (form.invalid){
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
    if (ev.chatData !== undefined){
      ev.chatData.subscribe((roomName: string) => this.roomName = roomName);
    }
  }

  onFileSelected(event: any): void{
    const file = event.target.files[0];
    const type = file.type;

    if (type.indexOf('image') !== 0){
      console.log(type + ' is not an image');
    } else {
      console.log(file);
      const n = Date.now();
      const filePath = `messages/${n}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(`messages/${n}`, file);
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
            });
          })
        )
        .subscribe(url => {
          if (url) {
            console.log(url);
          }
        });
    }}
}
