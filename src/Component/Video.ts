import xCloudPlayer from "../Library";

export default class VideoComponent {

    _client:xCloudPlayer

    _videoSource
    _mediaSource
    _videoRender

    constructor(client:xCloudPlayer) {
        this._client = client
    }

    create() {
        console.log('xCloudPlayer Component/Video.ts - Create media element')

        var videoHolder = document.getElementById(this._client._elementHolder)
        if(videoHolder !== null){
            const videoSrc = this.createMediaSource()
            var videoRender = document.createElement('video')
            videoRender.id = this.getElementId()
            videoRender.src = videoSrc
            videoRender.width = videoHolder.clientWidth
            videoRender.height = videoHolder.clientHeight
            videoRender.play()

            this._videoRender = videoRender
            
            videoHolder.appendChild(videoRender);
        } else {
            console.log('xCloudPlayer Component/Video.ts - Error fetching videoholder: div#'+this._client._elementHolder)
        }

        console.log('xCloudPlayer Component/Video.ts - Media element created')
    }

    getElementId(){
        return 'xCloudPlayer_'+this._client._elementHolderRandom+'_videoRender'
    }

    getSource() {
        return this._videoSource
    }

    createMediaSource() {
        var mediaSource = new MediaSource(),
        videoSourceUrl = window.URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', () => {
            console.log('xCloudPlayer Component/Video.ts - MediaSource opened. Attaching videoSourceBuffer...');
        
            var videoSourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42c020"');
            videoSourceBuffer.mode = 'sequence'

            videoSourceBuffer.addEventListener('updateend', (event) => {
                // console.log('xCloudPlayer Component/Video.ts - Updateend video...', event);
            });

            videoSourceBuffer.addEventListener('update', (event) => {
                // console.log('xCloudPlayer Component/Video.ts - Updateend video...', event);
            });

            videoSourceBuffer.addEventListener('error', (event) => {
                console.log('xCloudPlayer Component/Video.ts - Error video...', event);
            });

            this._videoSource = videoSourceBuffer
        });

        this._mediaSource = mediaSource

        return videoSourceUrl
    }

    resetMediaSource() {
        this._mediaSource.removeSourceBuffer(this._videoSource)
        delete this._videoSource

        const videoSrc = this.createMediaSource()
        const videoRender = document.getElementById(this.getElementId()) as any
        videoRender.src = videoSrc
        videoRender.play()
        
        this._videoRender = videoRender

    }

    destroy() {
        // this._videoRender.pause()

        delete this._mediaSource
        delete this._videoRender
        delete this._videoSource
        
        document.getElementById(this.getElementId())?.remove()

        console.log('xCloudPlayer Component/Video.ts - Cleaning up Video element');
    }
}