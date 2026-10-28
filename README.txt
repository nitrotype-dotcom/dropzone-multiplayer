DROPZONE MULTIPLAYER PARTY SERVER
=================================

Included:
- dropzone_low_power.html: the game with a multiplayer party lobby
- server.js and package.json: the online WebSocket server

IMPORTANT LIMITATION
This adds online party creation/joining, party codes, a player list, leader-only Start Match, and live remote player positions. Combat, bots, loot, and map generation are still handled separately on each browser, so this is a multiplayer party prototype, not yet a fully authoritative shared battle simulation.

HOST THE SERVER
1. Put server.js and package.json in a new GitHub repository.
2. Create a Node web service on a hosting provider that supports persistent WebSockets (for example Render).
3. Set the build command to: npm install
4. Set the start command to: npm start
5. Deploy it and copy the service's WebSocket address. Use wss://YOUR-SERVICE-DOMAIN (not https://).
6. Open the HTML game on each player's device. Click MULTIPLAYER PARTY, paste the same wss:// address, and click CONNECT.
7. One player clicks CREATE PARTY and shares the 5-character code. Friends enter it and click JOIN PARTY. The leader chooses the map/difficulty and clicks START MATCH.

LOCAL TESTING
Install Node.js 18+, open a terminal in this folder, and run:
  npm install
  npm start
For same-computer testing, use ws://localhost:8080 in the game. For other devices on the same Wi-Fi, use ws://YOUR-COMPUTER-LAN-IP:8080 and allow the port through your firewall. Public hosting should use wss://.

Do not put passwords or private information into party names. Anyone with the code can join until the party is full (8 players).
