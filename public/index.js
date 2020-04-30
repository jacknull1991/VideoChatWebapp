let Peer = require('simple-peer')
let socket = io()

const video = document.querySelector('video')
const filter = document.querySelector('#filter')

let client = {}
let currentFilter
// video stream
// ask for user permission
navigator.mediaDevices.getUserMedia({video: true, audio: true})
	.then(stream => {
		socket.emit('NewClient')
		video.srcObject = stream
		video.play()

		filter.addEventListener('change', (event) => {
			currentFilter = event.target.value
			video.style.filter = currentFilter
			SendFilter(currentFilter)
			event.preventDefault
		})

		// initialize peer stream
		function InitPeer(type) {
			let peer = new Peer({initiator:(type == 'init')?true:false, stream:stream, trickle:false})
			peer.on('stream', function(stream) {
				CreateVideo(stream)
			})
			/*peer.on('close', function() {
				document.getElementById("peerVideo").remove()
				peer.destroy()

			})*/
			peer.on('data', function(data) {
				let peerFilter = new TextDecoder('utf-8').decode(data)
				let peervideo = document.querySelector("#peerVideo")
				peervideo.style.filter = peerFilter
			})
			return peer
		}

		function RemoveVideo() {
			document.getElementById("peerVideo").remove()
		}

		// create peer of type init
		function MakePeer() {
			client.gotAnswer = false
			let peer = InitPeer('init')
			peer.on('signal', function(data) {
				if (!client.gotAnswer) {
					socket.emit('Offer', data)
				}
			})
			client.peer = peer
		}

		// create peer of type not init
		function FrontAnswer(offer) {
			let peer = InitPeer('notInit')
			peer.on('signal', (data) => {
				socket.emit('Answer', data)
			})
			peer.signal(offer)
			client.peer = peer
		}

		// handle answer from backend
		function SignalAnswer(answer) {
			client.gotAnswer = true
			let peer = client.peer
			peer.signal(answer)
		}

		// create video element in browser
		function CreateVideo(stream) {
			let video = document.createElement('video')
			video.id = 'peerVideo'
			video.srcObject = stream
			video.class = 'embed-responsive-item'
			document.querySelector('#peerDiv').appendChild(video)
			video.play()
			SendFilter(currentFilter)
		}

		function SessionActive() {
			document.write("Session active. Come back later")
		}

		function SendFilter(filter) {
			if (client.peer) {
				client.peer.send(filter)
			}
		}

		socket.on('BackOffer', FrontAnswer)
		socket.on('BackAnswer', SignalAnswer)
		socket.on('SessionActive', SessionActive)
		socket.on('CreatePeer', MakePeer)
		socket.on('RemoveVideo', RemoveVideo)


	})
	.catch(err => document.write(err))