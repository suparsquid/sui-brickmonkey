const LOCALNET_SUI_ADDRESS = "0xa6d04b740a2f7a7229d5b43f3ec2fdf5b0a33530bf5134fb11bd5f80649f3c49";
enum GameStatus {
  Queueing = "Queueing",
  InProgress = "In Progress",
  Finished = "Finished",
}

enum Chain {
  Bera = "Bera",
  Sui = "Sui",
}

const CHAIN_USED = Chain.Sui;

const WEBSOCKET_SERVER = import.meta.env.VITE_WEBSOCKET_SERVER || "";
const API = import.meta.env.VITE_API || "";
const SUI_ADDRESS = import.meta.env.VITE_SUI_ADDRESS || "";

export { GameStatus, CHAIN_USED, Chain, LOCALNET_SUI_ADDRESS, WEBSOCKET_SERVER, API, SUI_ADDRESS };
