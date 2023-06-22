import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  pageTitle = 'Chat App';

  constructor(private router: Router, private title: Title) {
    this.router.events.subscribe((val) => {
      console.log(val);
      this.pageTitle = this.title.getTitle();
    });
  }
}
