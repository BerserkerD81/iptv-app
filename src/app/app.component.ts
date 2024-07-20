import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Hls from 'hls.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  username: string = "CeciliaMieres3Meses";
  password: string = "pzXNEaYaw3mF";
  loggedIn = false;
  categories: any[] = [];
  channels: any[] = [];
  selectedCategoryId: string | null = null;
  currentPage: number = 1;
  channelsPerPage: number = 4;
  currentStreamUrl: string = "";
  hls: Hls | undefined;
  currentCategoryType: string = 'live';
  selectedSeriesInfo: any = null;
  selectedSeasonNumber: number | null = null;
  selectedSeasonEpisodes: any[] = [];
  episodeCurrentPage: number = 1;
  episodesPerPage: number = 3;
  showEpisodes: boolean = false;
  currentEpisode: any;
  isPlaying = false;
  video: HTMLVideoElement | undefined;
  isfullScreen: boolean = false;
  hideControls: boolean = false;
  controlsTimeout: any;




  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.authenticate();
  }

  ngOnDestroy() {
    if (this.hls) {
      this.hls.destroy();
    }
  }
  ngAfterViewInit() {
    this.video = document.getElementById('myVideo') as HTMLVideoElement;
  }

  togglePlayPause() {
    if (this.video) {
      if (this.video.paused) {
        this.video.play();
        this.isPlaying = true;
      } else {
        this.video.pause();
        this.isPlaying = false;
      }
    }
  }
  @HostListener('window:mousemove')
  onMouseMove() {
    this.showControls();
    if (this.isfullScreen) {
      this.resetControlsTimeout();
    }
  }

  @HostListener('window:keydown')
  onKeydown() {
    this.showControls();
    if (this.isfullScreen) {
      this.resetControlsTimeout();
    }
  }

  showControls() {
    this.hideControls = false;
    this.resetControlsTimeout();
  }

  resetControlsTimeout() {
    clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      this.hideControls = true;
      this.showEpisodes = false
    }, 3000); // Ocultar controles después de 3 segundos de inactividad
  }

  toggleFullScreen() {
    const videoCon = document.getElementById('myContainer');
    if (this.video) {
      if (!this.isfullScreen) {
        // Enter fullscreen mode
        if (videoCon) {
          videoCon.requestFullscreen().catch(err => {
            console.error("Error attempting to enable fullscreen mode:", err);
          });
        }
        this.isfullScreen = true;
        this.video.style.position = 'relative';
        const controlsOverlay = document.getElementById('controls-overlay');
        if (controlsOverlay) {
          controlsOverlay.style.display = 'flex';
          controlsOverlay.style.position = 'absolute';
        }

        // Hide video controls
        this.video.controls = false;
      } else {
        // Exit fullscreen mode
        document.exitFullscreen().catch(err => {
          console.error("Error attempting to exit fullscreen mode:", err);
        });
        this.isfullScreen = false;

        // Show video controls
        this.video.controls = false;
      }
    }
  }





  extractEpisodeInfo(title: string): string {
    const regex = /S\d+E(\d+)\s-\s(.+)/;
    const match = title.match(regex);
    if (match) {
      return `Episode ${match[1]}: ${match[2]}`;
    }
    return title;
  }

  toggleEpisodes() {
    this.showEpisodes = !this.showEpisodes;
  }
  authenticate() {
    const proxyUrl = 'https://us-central1-jmtv-45e6f.cloudfunctions.net/proxyFunction/';
    const targetUrl = `http://masterprotv1.com:8080/player_api.php?username=${this.username}&password=${this.password}`;
    const url = proxyUrl + targetUrl;
    this.http.get(url).subscribe((response: any) => {
      console.log('Authentication response:', response);
      if (response && response.user_info && response.user_info.auth === 1) {
        this.loggedIn = true;
        this.loadCategories('live');
      } else {
        alert('Authentication failed.');
      }
    }, error => {
      console.error('Error during authentication:', error);
      alert('An error occurred during authentication.');
    });
  }

  loadCategories(type: string) {
    let action = '';
    this.currentCategoryType = type;
    console.log("currentCategoryType", this.currentCategoryType)
    switch (type) {
      case 'live':
        action = 'get_live_categories';
        break;
      case 'vod':
        action = 'get_vod_categories';
        break;
      case 'series':
        action = 'get_series_categories';
        break;
      default:
        action = 'get_live_categories';
        break;
    }

    const targetUrl = `http://masterprotv1.com:8080/player_api.php?username=${this.username}&password=${this.password}&action=${action}`;
    const proxyUrl = 'https://us-central1-jmtv-45e6f.cloudfunctions.net/proxyFunction/';
    const url = proxyUrl + targetUrl;

    this.http.get(url).subscribe((response: any) => {
      this.categories = response;
      this.channels = [];
      this.selectedCategoryId = null;
      this.selectedSeriesInfo = null;
      this.selectedSeasonEpisodes = [];
    }, error => {
      console.error('Error fetching categories:', error);
      alert('An error occurred while fetching categories.');
    });
  }

  getStreams(categoryId: string) {
    this.selectedCategoryId = categoryId;
    this.currentPage = 1;

    let action = '';
    switch (this.currentCategoryType) {
      case 'live':
        action = 'get_live_streams';
        break;
      case 'vod':
        action = 'get_vod_streams';
        break;
      case 'series':
        action = 'get_series';
        break;
      default:
        action = 'get_live_streams';
        break;
    }



    const targetUrl = `http://masterprotv1.com:8080/player_api.php?username=${this.username}&password=${this.password}&action=${action}&category_id=${categoryId}`;
    const proxyUrl = 'https://us-central1-jmtv-45e6f.cloudfunctions.net/proxyFunction/';
    const url = proxyUrl + targetUrl;

    this.http.get(url).subscribe((response: any) => {
      this.channels = response;
      console.log(this.channels);
    }, error => {
      console.error('Error fetching streams:', error);
      alert('An error occurred while fetching streams.');
    });
  }

  playChannel(channel: any) {
    console.log(channel);

    let streamUrl = '';
    const proxyUrl = 'https://us-central1-jmtv-45e6f.cloudfunctions.net/proxyFunction/';
let url="";
    if (channel.stream_type === 'live') {
      streamUrl = `http://masterprotv1.com:8080/${this.username}/${this.password}/${channel.stream_id}.m3u8`;
      this.currentStreamUrl = streamUrl;
      url = `https://us-central1-jmtv-45e6f.cloudfunctions.net/proxyFunction/proxy?url=http://masterprotv1.com:8080/${this.username}/${this.password}/${channel.stream_id}.m3u8`;
      console.log('Stream URL:', url);
      // URL del proxy con el stream URL

    } else if (channel.stream_type === 'movie') {
      streamUrl = `http://masterprotv1.com:8080/movie/${this.username}/${this.password}/${channel.stream_id}.${channel.container_extension}`;
      url = proxyUrl + streamUrl;
      console.log('Stream URL:', url);
    }
   


    const video = document.getElementById('myVideo') as HTMLVideoElement;

    if (this.hls) {
      this.hls.destroy();
    }

    if (Hls.isSupported() && channel.stream_type === 'live') {
      console.log('HLS.js is supported.');
      this.hls = new Hls();
      this.hls.loadSource(url);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('Manifest parsed, starting playback.');
        video.play()
          .then(() => console.log('Playback started successfully.'))
          .catch(error => console.error('Playback error:', error));
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS.js error:', data);
        alert('An error occurred during stream playback.');
      });

    } else if (channel.stream_type === 'movie') {
      console.log('Playing VOD.');
      video.src = url;
      video.play()
        .then(() => console.log('Playback started successfully.'))
        .catch(error => console.error('Playback error:', error));
    } else {
      console.error('HLS.js is not supported.');
      alert('HLS.js is not supported on this browser.');
    }
    this.isPlaying=true
  }

  handleKeyPress(event: KeyboardEvent) {
    console.log('Key pressed:', event.key);
    // Aquí puedes manejar la lógica para la navegación con teclado
    // Por ejemplo, moverse entre categorías o canales, etc.
  }

  @HostListener('document:keydown', ['$event'])
  handleRemoteControl(event: KeyboardEvent) {
    this.handleKeyPress(event);
  }

  handleCardClick(channel: any) {
    if (this.currentCategoryType === 'series') {
      this.getSeriesInfo(channel.series_id);
    } else {
      this.playChannel(channel);
    }
  }

  getSeriesInfo(seriesId: string) {
    const targetUrl = `http://masterprotv1.com:8080/player_api.php?username=${this.username}&password=${this.password}&action=get_series_info&series_id=${seriesId}`;
    const proxyUrl = 'https://us-central1-jmtv-45e6f.cloudfunctions.net/proxyFunction/';
    const url = proxyUrl + targetUrl;

    this.http.get(url).subscribe((response: any) => {
      this.selectedSeriesInfo = response;
      console.log("response", response);
    }, error => {
      console.error('Error fetching series info:', error);
      alert('An error occurred while fetching series info.');
    });
  }

  getEpisodes(seasonNumber: number) {
    console.log('Season Number:', seasonNumber);
    this.selectedSeasonNumber = seasonNumber;
    this.selectedSeasonEpisodes = this.selectedSeriesInfo.episodes[seasonNumber];
    console.log(this.selectedSeasonEpisodes);
    this.episodeCurrentPage = 1; // Reset episode page to 1 when a new season is selected
  }

  get paginatedChannels() {
    const startIndex = (this.currentPage - 1) * this.channelsPerPage;
    return this.channels.slice(startIndex, startIndex + this.channelsPerPage);
  }

  get paginatedEpisodes() {
    const startIndex = (this.episodeCurrentPage - 1) * this.episodesPerPage;
    return this.selectedSeasonEpisodes.slice(startIndex, startIndex + this.episodesPerPage);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage * this.channelsPerPage < this.channels.length) {
      this.currentPage++;
    }
  }

  previousEpisodePage() {
    if (this.episodeCurrentPage > 1) {
      this.episodeCurrentPage--;
    }
  }

  nextEpisodePage() {
    if (this.episodeCurrentPage * this.episodesPerPage < this.selectedSeasonEpisodes.length) {
      this.episodeCurrentPage++;
    }
  }

  playEpisode(episode: any) {
    this.showEpisodes = false
    console.log('Reproduciendo episodio:', episode);

    const streamUrl = `http://masterprotv1.com:8080/series/${this.username}/${this.password}/${episode.id}.${episode.container_extension}`;
    const proxyUrl = 'http://localhost:8080/';
    const url = proxyUrl+streamUrl

console.log("streamurl",streamUrl)
    console.log('URL del Stream:', url);
    this.currentEpisode = episode;
    const video = document.getElementById('myVideo') as HTMLVideoElement;

    // Destruir cualquier instancia previa de Hls
    if (this.hls) {
      this.hls.destroy();
      this.hls = undefined;
    }

    // Verificar si el archivo es .mkv
    if (streamUrl.endsWith('.mkv')) {
      console.log('Reproduciendo archivo MKV directamente.');
      video.src = url;
      video.play()
        .then(() => console.log('Reproducción iniciada con éxito.'))
        .catch(error => console.error('Error en la reproducción:', error));
    } else if (streamUrl.endsWith('.m3u8')) {
      // Si es HLS, usar Hls.js si es soportado
      if (Hls.isSupported()) {
        console.log('Hls.js es soportado.');
        this.hls = new Hls();
        this.hls.loadSource(url);
        this.hls.attachMedia(video);

        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('Manifesto analizado, comenzando la reproducción.');
          video.play()
            .then(() => console.log('Reproducción iniciada exitosamente.'))
            .catch(error => console.error('Error en la reproducción:', error));
        });

        this.hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('Error de Hls.js:', data);
          alert('Ocurrió un error durante la reproducción del stream.');
        });

      } else {
        console.error('Hls.js no es soportado en este navegador.');
        alert('Hls.js no es soportado en este navegador.');
      }
    } else {
      console.log('Reproduciendo película (movie).');
      video.src = url;
      video.play()
        .then(() => console.log('Reproducción iniciada con éxito.'))
        .catch(error => console.error('Error en la reproducción:', error));
    }
    this.isPlaying = true;
  }

}


