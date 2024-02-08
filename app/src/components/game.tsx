import { GameStatus, SUI_ADDRESS } from "@utils/constants";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";
import { useSignTransactionBlock, useSignAndExecuteTransactionBlock, useSuiClient } from "@mysten/dapp-kit";
import { useNavigate } from "react-router-dom";
interface GameProps {
  game: any; // Replace 'any' with a more specific type if possible
  joinedGame: number;
  address: string;
  onJoinGame: () => void;
}

const Game: React.FC<GameProps> = ({ game, joinedGame, address, onJoinGame }) => {
  const nav = useNavigate();

  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const { mutate: signTransactionBlock } = useSignTransactionBlock();

  const suiClient = useSuiClient();

  const joinGame = async () => {
    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.gas, [game.entry * Number(MIST_PER_SUI)]);

    tx.moveCall({
      target: `${SUI_ADDRESS}::contract::join_game`,
      arguments: [tx.object(game.id), coin],
    });

    signAndExecute(
      {
        transactionBlock: tx,
      },
      {
        onSuccess: (tx) => {
          console.log(tx);
          onJoinGame();
        },
        onError: (err) => {
          console.log(err);
        },
      }
    );
  };

  return (
    <div
      key={game.id}
      className={`mb-4 rounded-lg p-10 w-full border ${game.entry === "0" ? "bg-white text-black" : "bg-black text-white"}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-4xl font-bold mb-1s">{game.prize} SUI</h3>
          <p className="text-sm ">{game.title}</p>
        </div>
        <div className="text-right">
          <p className="text-xs">👥 {game.people}</p>
          <p className="text-xs">Entry: {game.entry === "0" ? "Free" : `${game.entry} SUI`}</p>
          <p className="text-xs">{game.status}</p>
        </div>
      </div>
      <div className="w-full mt-4">
        <button
          className={`flex justify-center rounded-lg p-3 text-center w-full ${game.entry === "0" ? "border" : "border"} ${!address || game.disabled ? "blur-sm" : ""}`}
          disabled={game.disabled || (joinedGame === game.id && game.status === GameStatus.Queueing)}
          onClick={() =>
            joinedGame === game.id && game.status === GameStatus.InProgress ? nav(`/quiz/${address}`) : joinGame()
          }
        >
          {joinedGame === game.id && game.status === GameStatus.InProgress ? (
            <span>Start Game</span>
          ) : joinedGame !== game.id && game.status === GameStatus.Queueing ? (
            <span>Enter Contest</span>
          ) : (
            <span>Game Joined</span>
          )}
        </button>
      </div>
    </div>
  );
};

export { Game };
