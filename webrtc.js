const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

let peerConnection = null;
let localStream = null;

const elements = {
    startClientBtn: document.getElementById('startClientBtn'),
    clientOfferJson: document.getElementById('clientOfferJson'),
    clientAnswerJson: document.getElementById('clientAnswerJson'),
    connectBtn: document.getElementById('connectBtn'),
    
    techOfferJson: document.getElementById('techOfferJson'),
    createAnswerBtn: document.getElementById('createAnswerBtn'),
    techAnswerJson: document.getElementById('techAnswerJson'),
    
    connectionStatus: document.getElementById('connectionStatus'),
    remoteVideo: document.getElementById('remoteVideo'),
    fullscreenBtn: document.getElementById('fullscreenBtn')
};

function createPeerConnection() {
    if (peerConnection) return;
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.onconnectionstatechange = () => {
        elements.connectionStatus.innerText = "Estado conexión: " + peerConnection.connectionState;
        if (peerConnection.connectionState === 'connected') {
            elements.connectionStatus.className = "status-box status-connected";
        } else {
            elements.connectionStatus.className = "status-box";
        }
    };

    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            elements.remoteVideo.srcObject = event.streams[0];
        }
    };
}

// ==========================================
// FLUJO DEL CLIENTE (INTERNET REAL)
// ==========================================
elements.startClientBtn.onclick = async () => {
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false
        });

        elements.startClientBtn.disabled = true;
        elements.startClientBtn.innerText = "Pantalla Lista";

        createPeerConnection();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        elements.clientOfferJson.value = 'Buscando IPs públicas en internet (ICE)... Espera unos segundos...';

        // Esperamos a que la recolección ICE termine al 100% para entornos fuera de local
        peerConnection.onicecandidate = (event) => {
            if (!event.candidate) {
                elements.clientOfferJson.value = JSON.stringify(peerConnection.localDescription);
                elements.clientOfferJson.style.background = '#eaf6ff';
            }
        };
    } catch (err) {
        alert("Error al capturar pantalla: " + err.message);
        elements.startClientBtn.disabled = false;
    }
};

elements.connectBtn.onclick = async () => {
    const answerJson = elements.clientAnswerJson.value.trim();
    if (!answerJson) return alert('Pega la respuesta del técnico primero.');

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerJson)));
    } catch (err) {
        alert('Error al conectar. Revisa el texto copiado.');
    }
};

// ==========================================
// FLUJO DEL TÉCNICO (INTERNET REAL)
// ==========================================
elements.createAnswerBtn.onclick = async () => {
    const offerJson = elements.techOfferJson.value.trim();
    if (!offerJson) return alert('Pega la oferta del cliente primero.');

    elements.createAnswerBtn.disabled = true;
    createPeerConnection();

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        elements.techAnswerJson.value = 'Generando respuesta segura... Espera unos segundos...';

        peerConnection.onicecandidate = (event) => {
            if (!event.candidate) {
                elements.techAnswerJson.value = JSON.stringify(peerConnection.localDescription);
                elements.techAnswerJson.style.background = '#eaf6ff';
            }
        };
    } catch (e) {
        alert('Error en el JSON de la oferta.');
        elements.createAnswerBtn.disabled = false;
    }
};

// BOTÓN PARA PANTALLA COMPLETA
elements.fullscreenBtn.onclick = () => {
    if (elements.remoteVideo.requestFullscreen) {
        elements.remoteVideo.requestFullscreen();
    } else if (elements.remoteVideo.webkitRequestFullscreen) { /* Safari */
        elements.remoteVideo.webkitRequestFullscreen();
    } else if (elements.remoteVideo.msRequestFullscreen) { /* IE11 */
        elements.remoteVideo.msRequestFullscreen();
    }
};