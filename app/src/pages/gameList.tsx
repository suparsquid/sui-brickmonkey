import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import "./connect.css";

import { API, GameStatus, LOCALNET_SUI_ADDRESS } from "@utils/constants";
import { Game } from "@components/game";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { SuiMoveObject } from "@mysten/sui.js";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";
import { Button } from "@radix-ui/themes";

const staticGame = {
  id: "7",
  people: 123,
  prize: 1.1,
  entry: "0",
  status: "In Progress",
  title: "Daily Free Trivia",
  disabled: true,
};

const GameListWrapper = () => {
  const account = useCurrentAccount();
  const [gameId, setGameId] = useState("");

  console.log(account);
  const nav = useNavigate();
  console.log(`${API}/get-game`);

  useEffect(() => {
    axios
      .get(`${API}/get-game`)
      .then((response) => {
        console.log(response.data);
        setGameId(response.data.gameId);
      })
      .catch((error) => {
        console.error("There was an error fetching the games!", error);
      });
  }, []);

  if (!account) {
    return <Navigate to="/" />;
  } else {
    if (!gameId) {
      return <div>Loading...</div>;
    }
    return <GameList account={account} gameId={gameId} />;
  }
};

interface GameProps {
  account: any;
  gameId: string;
}

const GameList: React.FC<GameProps> = ({ account, gameId }) => {
  const nav = useNavigate();

  const [games, setGames] = useState([staticGame]);
  const [joinedGame, setJoined] = useState(-1);
  const { data, isLoading, refetch, error } = useSuiClientQuery("getObject", {
    id: gameId,
    options: {
      showContent: true,
    },
  });

  const startGame = async () => {
    try {
      await fetch(`${API}/start-game`, { method: "POST" });
      refetch();
    } catch (error) {
      console.error("Failed to start the quiz:", error);
    }
  };

  useEffect(() => {
    if (!account) {
      nav("/"); // Redirects to the home page if there is no address
    } else {
      console.log(account);
      refetch();
    }
  }, [account, nav]);

  useEffect(() => {
    console.log(isLoading);
    if (!isLoading) {
      console.log(error);
      console.log(data);
      const gameObject = data?.data?.content as SuiMoveObject;
      console.log(gameObject);

      const { entry_fee, id, participants, status, total_reward, epoch } = gameObject.fields;
      console.log(gameObject);

      const newGame = {
        id: id.id,
        people: participants ? participants.length : 0,
        prize: Number(total_reward) / Number(MIST_PER_SUI),
        entry: Number(entry_fee) / Number(MIST_PER_SUI),
        status: Object.values(GameStatus)[status],
        title: `Crypto Trivia #${epoch}`,
        disabled: false,
      };
      setGames([newGame, staticGame]);
      const isParticipant = participants.some((participant: any) => participant === account.address);
      setJoined(isParticipant ? id.id : -1);
    }
  }, [account.address, data?.data?.content, isLoading, refetch]);

  useEffect(() => {
    const interval = setInterval(async () => {
      console.log("Refetch");
      await refetch();
    }, 5000); // 60000 milliseconds = 1 minute

    // Clear the interval when the component is unmounted
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading)
    return (
      <div className="flex flex-col h-auto items-center justify-center mt-10">
        <div>Loading...</div>
      </div>
    );

  return (
    <div className="flex flex-col h-auto items-center justify-center mt-10">
      <h1 className="pt-4 pb-4 font-share-tech-mono text-4xl">Play</h1>
      <p className="text-sm font-bold text-custom-color">*$250,000 won by 17,000 users in the last 24hrs</p>
      <div className="mt-5 w-[500px] flex flex-col body-text playcards">
        {games.map((game) => (
          <Game
            key={game.id}
            game={game}
            joinedGame={joinedGame}
            address={account.address}
            onJoinGame={() => refetch()}
          />
        ))}
      </div>
      <Button color="crimson" onClick={startGame}>
        DEBUG: Start Game
      </Button>{" "}
    </div>
  );
};
export default GameListWrapper;
