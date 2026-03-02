import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;

export const connectStockSocket = (onMessage) => {

  const socket = new SockJS('http://localhost:8080/ws/stocks');

  stompClient = new Client({
    webSocketFactory: () => socket,
    debug: () => {},
    reconnectDelay: 5000,
  });

  stompClient.onConnect = () => {
    stompClient.subscribe('/topic/stocks', (message) => {
      const data = JSON.parse(message.body);
      onMessage(data);
    });
  };

  stompClient.activate();
};

export const disconnectStockSocket = () => {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
};