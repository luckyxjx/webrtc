import React, { useState, useEffect, useRef } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import io, { Socket } from 'socket.io-client';
import { createGlobalStyle } from 'styled-components';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GlobalStyle = createGlobalStyle`
  :root {
    --primary: #7C3AED;
    --primary-dark: #6D28D9;
    --secondary: #10B981;
    --accent: #F59E0B;
    --background: #0F172A;
    --surface: #1E293B;
    --text: #F8FAFC;
    --text-secondary: #94A3B8;
    --danger: #EF4444;
    --success: #10B981;
    --border: #334155;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Space Grotesk', sans-serif;
    background-color: var(--background);
    color: var(--text);
    line-height: 1.5;
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
    background-image: 
      radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 20%),
      radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 20%);
  }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #0F172A;
  color: #F8FAFC;
  overflow: hidden;
  width: 100%;
`;

const Header = styled.header`
  padding: 1rem;
  background-color: #1E293B;
  text-align: center;
  border-bottom: 1px solid #334155;
  
  h1 {
    font-size: clamp(1.2rem, 4vw, 1.8rem);
    margin: 0;
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: clamp(0.5rem, 2vw, 1rem);
  gap: clamp(0.5rem, 2vw, 1rem);
  height: calc(100vh - 60px);
  overflow: hidden;
`;

const RoomSection = styled.section`
  background-color: #1E293B;
  padding: clamp(0.5rem, 2vw, 1rem);
  border-radius: 8px;
  border: 1px solid #334155;
  
  h2 {
    font-size: clamp(1rem, 3vw, 1.4rem);
    margin-bottom: 0.5rem;
  }
`;

const RoomInputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #334155;
  border-radius: 4px;
  background-color: #0F172A;
  color: #F8FAFC;
  flex: 1;
  min-width: 200px;
  font-size: clamp(0.9rem, 2vw, 1rem);

  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
  }
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #7C3AED;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: clamp(0.9rem, 2vw, 1rem);
  white-space: nowrap;

  &:hover {
    background-color: #6D28D9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const VideoSection = styled.section`
  flex: 1;
  position: relative;
  background-color: #1E293B;
  border-radius: 8px;
  border: 1px solid #334155;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: calc(100vh - 140px);
`;

const VideoGrid = styled.div<{ participants: number }>`
  flex: 1;
  display: grid;
  gap: clamp(0.25rem, 1vw, 0.5rem);
  padding: clamp(0.25rem, 1vw, 0.5rem);
  height: calc(100% - 80px);
  grid-template-columns: ${props => {
    if (props.participants <= 1) return '1fr';
    if (props.participants <= 2) return 'repeat(2, 1fr)';
    if (props.participants <= 4) return 'repeat(2, 1fr)';
    if (props.participants <= 6) return 'repeat(3, 1fr)';
    return 'repeat(4, 1fr)';
  }};
  grid-template-rows: ${props => {
    if (props.participants <= 1) return '1fr';
    if (props.participants <= 2) return '1fr';
    if (props.participants <= 4) return 'repeat(2, 1fr)';
    if (props.participants <= 6) return 'repeat(2, 1fr)';
    return 'repeat(3, 1fr)';
  }};
  max-height: calc(100vh - 200px);

  @media (max-width: 768px) {
    grid-template-columns: ${props => {
      if (props.participants <= 1) return '1fr';
      if (props.participants <= 2) return 'repeat(2, 1fr)';
      if (props.participants <= 4) return 'repeat(2, 1fr)';
      return 'repeat(2, 1fr)';
    }};
    grid-template-rows: ${props => {
      if (props.participants <= 1) return '1fr';
      if (props.participants <= 2) return '1fr';
      if (props.participants <= 4) return 'repeat(2, 1fr)';
      return 'repeat(3, 1fr)';
    }};
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(auto-fit, minmax(200px, 1fr));
  }
`;

const VideoItem = styled.div`
  position: relative;
  background-color: #0F172A;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #334155;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16/9;

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-color: #0F172A;
  }
`;

const Controls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: clamp(1rem, 3vw, 1.5rem);
  padding: clamp(0.75rem, 2vw, 1rem);
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid #334155;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 1rem;
    padding: 0.75rem;
  }
`;

const ControlButton = styled.button<{ isActive?: boolean }>`
  width: clamp(36px, 8vw, 40px);
  height: clamp(36px, 8vw, 40px);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.isActive ? '#EF4444' : '#1E293B'};
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  svg {
    width: clamp(18px, 4vw, 20px);
    height: clamp(18px, 4vw, 20px);
    fill: currentColor;
  }

  &:hover {
    background-color: ${props => props.isActive ? '#DC2626' : '#2D3748'};
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const LeaveButton = styled(ControlButton)`
  background-color: #EF4444;
  width: clamp(42px, 9vw, 48px);
  height: clamp(42px, 9vw, 48px);

  svg {
    width: clamp(20px, 4.5vw, 24px);
    height: clamp(20px, 4.5vw, 24px);
  }

  &:hover {
    background-color: #DC2626;
  }
`;

const StatusIndicator = styled.div<{ status: 'connected' | 'connecting' | 'disconnected' }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background-color: ${props => {
    switch (props.status) {
      case 'connected': return 'var(--success)';
      case 'connecting': return 'var(--accent)';
      case 'disconnected': return 'var(--danger)';
    }
  }};
  color: white;
  font-size: 0.875rem;
  z-index: 1000;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: white;
    animation: ${props => props.status === 'connecting' ? 'pulse 1.5s infinite' : 'none'};
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

function App() {
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream }>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected with ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('user-joined', (userId) => {
        console.log('User joined:', userId);
        handleUserJoined(userId);
      });
      
      socket.on('room-users', (users) => {
        console.log('Room users received:', users);
        handleRoomUsers(users);
      });
      
      socket.on('offer', (data) => {
        console.log('Received offer:', data);
        handleOffer(data);
      });
      
      socket.on('answer', (data) => {
        console.log('Received answer:', data);
        handleAnswer(data);
      });
      
      socket.on('ice-candidate', (data) => {
        console.log('Received ICE candidate:', data);
        handleIceCandidate(data);
      });
      
      socket.on('user-left', (userId) => {
        console.log('User left:', userId);
        handleUserLeft(userId);
      });
    }
  }, [socket]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleVideo();
      } else if (e.key === 'Escape') {
        if (roomId) {
          leaveRoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [roomId]);

  const handleUserJoined = (userId: string) => {
    console.log('User joined, creating peer connection for:', userId);
    createPeerConnection(userId);
    showNotification(`${userId} joined the room`, 'info');
  };

  const handleRoomUsers = (users: string[]) => {
    console.log('Handling room users:', users);
    users.forEach(userId => {
      if (userId !== socket?.id) {
        console.log('Creating peer connection for user:', userId);
        createPeerConnection(userId);
      }
    });
  };

  const handleUserLeft = (userId: string) => {
    console.log('User left:', userId);
    if (peerConnections.current[userId]) {
      peerConnections.current[userId].close();
      delete peerConnections.current[userId];
    }
    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[userId];
      console.log('Updated remote streams after user left:', newStreams);
      return newStreams;
    });
    showNotification(`${userId} left the room`, 'info');
  };

  const createPeerConnection = (userId: string) => {
    console.log('Creating peer connection for:', userId);
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
        }
      ],
      iceCandidatePoolSize: 10
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', userId);
        socket?.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId,
        });
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE Connection State for ${userId}:`, peerConnection.iceConnectionState);
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection State for ${userId}:`, peerConnection.connectionState);
    };

    peerConnection.ontrack = (event) => {
      console.log('Received track from:', userId, event.track.kind);
      const stream = event.streams[0];
      if (stream) {
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          newStreams[userId] = stream;
          console.log('Updated remote streams:', newStreams);
          return newStreams;
        });
      }
    };

    if (localStream) {
      console.log('Adding local tracks to peer connection');
      localStream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind);
        peerConnection.addTrack(track, localStream);
      });
    } else {
      console.warn('No local stream available when creating peer connection');
    }

    peerConnections.current[userId] = peerConnection;

    // Create and send offer if we're the initiator
    if (socket?.id && socket.id > userId) {
      console.log('Creating offer for:', userId);
      peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
        .then(offer => {
          console.log('Created offer:', offer);
          return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
          console.log('Sending offer to:', userId);
          socket?.emit('offer', {
            offer: peerConnection.localDescription,
            to: userId,
          });
        })
        .catch(error => {
          console.error('Error creating offer:', error);
        });
    }

    return peerConnection;
  };

  const handleOffer = async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
    console.log('Received offer from:', from);
    try {
      const peerConnection = createPeerConnection(from);
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log('Sending answer to:', from);
      socket?.emit('answer', {
        answer: peerConnection.localDescription,
        to: from,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
    console.log('Received answer from:', from);
    try {
      const peerConnection = peerConnections.current[from];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Connection established with:', from);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
    console.log('Received ICE candidate from:', from);
    try {
      const peerConnection = peerConnections.current[from];
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const generateUID = () => {
    return 'user_' + Math.random().toString(36).substring(2, 8);
  };

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    const newUserId = generateUID();
    setRoomId(newRoomId);
    setUserId(newUserId);
  };

  const joinRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      console.log('Joining room:', roomId);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Got local media stream');
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // If no userId exists (joining without creating), generate one
      if (!userId) {
        const newUserId = generateUID();
        console.log('Generated new userId:', newUserId);
        setUserId(newUserId);
      }
      
      console.log('Joining room:', roomId, 'with userId:', userId);
      socket?.emit('join-room', { roomId, userId });
      setIsJoined(true);
      setConnectionStatus('connected');
      showNotification('Successfully joined the room!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      showNotification('Failed to join room. Please try again.', 'error');
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const leaveRoom = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
    setLocalStream(null);
    setIsJoined(false);
    socket?.emit('leave-room', roomId);
    showNotification('Successfully left the room', 'info');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    toast[type](message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  return (
    <ThemeProvider theme={{}}>
      <GlobalStyle />
      <AppContainer>
        <ToastContainer />
        <Header>
          <h1>Cloud Sphere</h1>
          {roomId && (
            <StatusIndicator status={connectionStatus}>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </StatusIndicator>
          )}
        </Header>
        <MainContent>
          {isLoading && (
            <LoadingOverlay>
              <LoadingSpinner />
            </LoadingOverlay>
          )}
          <RoomSection>
            <h2>Room</h2>
            <RoomInputGroup>
              <Input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={isJoined}
              />
              {!isJoined ? (
                <>
                  <Button onClick={createRoom}>Create Room</Button>
                  <Button onClick={joinRoom}>Join Room</Button>
                </>
              ) : (
                <Button onClick={leaveRoom} style={{ backgroundColor: '#EF4444' }}>
                  Leave Room
                </Button>
              )}
            </RoomInputGroup>
            {userId && (
              <div style={{ marginTop: '0.5rem', color: '#94A3B8', fontSize: '0.9rem' }}>
                Your ID: {userId}
              </div>
            )}
          </RoomSection>
          <VideoSection>
            <VideoGrid participants={Object.keys(remoteStreams).length + 1}>
              <VideoItem>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                />
              </VideoItem>
              {Object.entries(remoteStreams).map(([userId, stream]) => (
                <VideoItem key={userId}>
                  <video
                    autoPlay
                    playsInline
                    ref={video => {
                      if (video) {
                        video.srcObject = stream;
                        video.onloadedmetadata = () => {
                          video.play().catch(e => console.error('Error playing video:', e));
                        };
                      }
                    }}
                  />
                </VideoItem>
              ))}
            </VideoGrid>
            {isJoined && (
              <Controls>
                <ControlButton
                  onClick={toggleMute}
                  isActive={isMuted}
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M12 4L9.91 6.09 12 8.18V4zm4.5 7c0 1.77-1.02 3.29-2.5 4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63 0-2.21-1.79-4-4-4s-4 1.79-4 4c0 .22.02.43.05.63l2.45-2.45v-2.21c-1.48-.74-2.5-2.26-2.5-4.03 0-2.21 1.79-4 4-4s4 1.79 4 4zm-8.5-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1v-2z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1.14.49-3 2.89 5.35 5.91 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                    </svg>
                  )}
                </ControlButton>
                <ControlButton
                  onClick={toggleVideo}
                  isActive={isVideoOff}
                >
                  {isVideoOff ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                  )}
                </ControlButton>
                <LeaveButton
                  onClick={leaveRoom}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.66c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                  </svg>
                </LeaveButton>
              </Controls>
            )}
          </VideoSection>
        </MainContent>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App;
