import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {RoomData} from '../../../../services/common.service';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore} from '@angular/fire/firestore';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-sidebar-content',
  templateUrl: './sidebar-content.component.html',
  styleUrls: ['./sidebar-content.component.scss']
})
export class SidebarContentComponent implements OnInit {
  @Input() roomData!: RoomData;
  @Input() randomSeed!: any;

  @Output() seedValue: EventEmitter<string> = new EventEmitter<string>();

  lastMessage: string | undefined;
  // @ts-ignore
  subs: Subscription;

  constructor(private  afs: AngularFirestore) { }

  ngOnInit(): void {
    this.subs = this.afs.collection('rooms').doc(this.roomData.id)
      .collection('message', ref => ref.orderBy('time', 'desc'))
      .valueChanges()
      .subscribe(data => {
        if (data.length > 0){
          this.lastMessage = data[0].message;
        }
      });
  }

  onClick(): void {
    this.seedValue.emit(this.randomSeed);
  }
}
