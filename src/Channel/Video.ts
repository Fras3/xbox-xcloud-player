import BaseChannel from './Base'
import VideoComponent from '../Component/Video'
import VideoWorker from '../Worker/Video'
import FpsCounter from '../Helper/FpsCounter'

export default class VideoChannel extends BaseChannel {

    _component:VideoComponent
    _worker

    _videoBuffer:Array<any> = []
    _frameMetadataQueue:Array<any> = []
    _keyframeNeeded = true

    _fpsCounter:FpsCounter

    constructor(channelName, client){
        super(channelName, client)

        this._component = new VideoComponent(this.getClient())
        this._fpsCounter = new FpsCounter(this.getClient(), 'video')
    }

    onOpen(event) {
        super.onOpen(event)
        console.log('xCloudPlayer Channels/Video.ts - ['+this._channelName+'] onOpen:', event)

        this._component.create()
        this._fpsCounter.start()

        // setInterval(() => {
        //     console.log('Video performance: _videoBuffer', this._videoBuffer.length, '_frameMetadataQueue', this._frameMetadataQueue.length)
        // }, 1000)

        // Create worker to process Video
        const blob = new Blob(['var func = '+VideoWorker.toString()+'; func(self)']);
        this._worker = new Worker(window.URL.createObjectURL(blob));

        // Process worker messages
        this._worker.onmessage = (workerMessage) => {
            if(workerMessage.data.action == 'doRender'){
                if(workerMessage.data.status !== 200){
                    console.log('xCloudPlayer Channels/Video.ts - Worker doRender failed:', workerMessage.data)

                } else {
                    if(this._keyframeNeeded === true && workerMessage.data.data.isKeyFrame === 1){
                        this._keyframeNeeded = false
                        this.doRender(workerMessage.data.data)

                    } else if(this._keyframeNeeded === false){
                        this.doRender(workerMessage.data.data)
                    }
                }
            }
        }
    }

    onMessage(event) {
        // console.log('xCloudPlayer Channels/Video.ts - ['+this._channelName+'] onMessage:', event)

        this._worker.postMessage({
            action: 'onPacket',
            data: {
                data: event.data,
                timePerformanceNow: performance.now()
            }
        })
        
        // this.#bitrateCounter.packets.push(event.data.byteLength)

    }

    doRender(frame){
        if(this._component.getSource().updating === false){
            let framesBuffer:ArrayBuffer = new Uint8Array()

            // Process queued frames first
            for(; this._videoBuffer.length > 0;){
                const newFrame = this._videoBuffer.shift()
                framesBuffer = this.mergeFrames(framesBuffer, newFrame.frameData)

                this.addProcessedFrame(newFrame)
            }

            this.addProcessedFrame(frame)
            framesBuffer = this.mergeFrames(framesBuffer, frame.frameData)

            this._component.getSource().appendBuffer(framesBuffer)
            this._component._videoRender.play()
            // this.#bitrateCounter.video.push(frame.frameData.byteLength)
        } else {
            this._videoBuffer.push(frame)
        }
    }

    addProcessedFrame(frame) {
        frame.frameRenderedTimeMs = performance.now()
        this._frameMetadataQueue.push(frame)

        this._fpsCounter.count()

        // Increase fps counter
        // this.#frameCounter++

        // Calc latency
        // var frameLatency = (frame.frameRenderedTimeMs - frame.firstFramePacketArrivalTimeMs)
        // this.#videoLatency.push(frameLatency)
    }

    getMetadataQueue(size=30) {
        return this._frameMetadataQueue.splice(0, (size-1))
    }

    getMetadataQueueLength() {
        return this._frameMetadataQueue.length
    }

    mergeFrames(buffer1, buffer2) {
        var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

        return tmp.buffer;
    }

    onClose(event) {
        console.log('xCloudPlayer Channels/Video.ts - ['+this._channelName+'] onClose:', event)

        this._component.destroy()

        super.onClose(event)
    }

    resetBuffer() {
        // Request key frame index
        this.getClient().getChannelProcessor('control').requestKeyframeRequest()
        this._component.resetMediaSource()

        this._keyframeNeeded = true

    }

    destroy() {
        this._fpsCounter.stop()

        if(this._worker !== undefined){
            this._worker.terminate()
        }

        console.log('xCloudPlayer Channels/Video.ts - Worker terminated', this._worker)

        // Called when we want to destroy the channel.
        super.destroy()
    }
}