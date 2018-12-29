import {Component} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  public videoURL: SafeResourceUrl = "./assets/test.MP4";

  public async fileSelected($event: Event): Promise<void> {
    this.checkHasFileReader();
    const target = $event.target as HTMLInputElement;
    const files: FileList = target.files;
    const firstFile: File = files[0];
    const rawURL: string = URL.createObjectURL(firstFile);
    this.videoURL = rawURL;

  }

  constructor(private domSanitizer: DomSanitizer){

  }

  private checkHasFileReader(): void {
    if (!this.hasFileReader()) {
      throw new Error('File reader api are not supported');
    }
  }

  private hasFileReader(): boolean {
    const Window = window as any;
    return !!(Window.File && Window.FileReader && Window.FileList && window.Blob);
  }
}
