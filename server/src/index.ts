import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromHEX, MIST_PER_SUI } from "@mysten/sui.js/utils";
import dotenv from "dotenv";
import { bcs } from "@mysten/bcs";

const app = new Elysia().use(cors());
dotenv.config();

const port = process.env.PORT || 8888;
const rpcUrl = getFullnodeUrl("testnet");
const ADDR = process.env.GAME_ADDR || "";
const PAYOUT_ADDR = process.env.PAYOUT_ADDR || "";
const DEFAULT_TIME = 5;

const secret = process.env.OWNER_SECRET || "";
const keypair = Ed25519Keypair.fromSecretKey(fromHEX(secret));

let gameId = "";

let openClients = new Set();
let answeredClients = new Set();
let currentIndex = 0;
let timeLeft = DEFAULT_TIME; // Time left for the current question, in seconds
let gameEnded = false;
let intervalId = null;
const addresses = new Set<string>();
// Broadcasts the current question to all connected clients

const questions = [
  {
    q: "Where did Do Kwon hide after getting busted?",
    options: ["Dubai", "Singapore", "China", "Ukraine"],
    a: "Singapore",
  },
  {
    q: "What language does Sui use for its smart contracts?",
    options: ["Move", "Solidity", "Rust", "Typescript"],
    a: "Move",
  },
  {
    q: "What did Vitalik Buterin, co-founder of Ethereum, originally want to be when he grew up?",
    options: ["A lawyer", "A programmer", "A journalist", "An astronaut"],
    a: "A journalist",
  },
  {
    q: "Which animal has a hat?",
    options: ["dog", "cat", "goose", "panda"],
    a: "dog",
  },
];

// create a client connected to devnet
const client = new SuiClient({ url: rpcUrl });
const createGame = async () => {
  // Fetch the game object from the blockchain
  const game = await client.getObject({ id: ADDR });
  if (!game) {
    throw "Game no found";
  }

  // Construct the transaction block for starting the game
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${ADDR}::contract::create_game`,
    arguments: [txb.pure((MIST_PER_SUI * BigInt(1)) / BigInt(10))],
  });

  // // Sign and execute the transaction block
  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: txb,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  if (result.objectChanges) {
    console.log(result.objectChanges);
    for (const change of result.objectChanges) {
      if (change.type === "created" && change.objectType.includes("Game")) {
        gameId = change.objectId;
        break;
      }
    }
  }

  return result;
};
app.post("/create-game", async (req, res) => {
  return createGame();
});

app.get("/get-game", async (req, res) => {
  // Fetch the game object from the blockchain
  if (gameId.length === 0) {
    throw new Error("No game created");
  }
  return { gameId };
});

app.post("/start-game", async (req, res) => {
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${ADDR}::contract::start_game`,
    arguments: [txb.object(gameId)],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: txb,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  gameEnded = false;
  return result;
});

app.post("/end-game", async (req, res) => {
  const txb = new TransactionBlock();
  console.log(addresses);

  txb.moveCall({
    target: `${ADDR}::contract::end_game`,
    arguments: [txb.object(gameId), txb.pure(Array.from(addresses))],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: txb,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  gameEnded = false;
  return result;
});

app.post("/reset-game", async () => {
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${ADDR}::contract::reset_game`,
    arguments: [
      txb.object(gameId),
      txb.pure((MIST_PER_SUI * BigInt(1)) / BigInt(10)),
      txb.pure(PAYOUT_ADDR),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: txb,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  if (result.objectChanges) {
    for (const change of result.objectChanges) {
      if (change.type === "created" && change.objectType.includes("Game")) {
        gameId = change.objectId;
        break;
      }
    }
  }

  resetQuiz();
  return result;
});

const resetQuiz = () => {
  currentIndex = 0;
  gameEnded = false;
  openClients.clear();
  timeLeft = DEFAULT_TIME;
  stopServerTicks();
  answeredClients.clear();
  addresses.clear();
};

app.post("/start-quiz", async (req, res) => {
  resetQuiz();
});

function broadcastQuestion() {
  if (currentIndex >= questions.length) {
    // If this was the last question, set gameEnded flag
    gameEnded = true;

    // Send "game ended" message to all open clients and then close the connection
    const message = JSON.stringify({
      type: "gameEnded",
      message: "Game ended. Thank you for playing!",
    });
    openClients.forEach((ws: any) => {
      ws.send(message, () => {
        // Close the connection after sending the message
        ws.close();
        ws.terminate();
      });
    });

    // Clear the openClients set as all connections will be closed
    openClients.clear();
    stopServerTicks();
  } else {
    // If there are more questions, proceed as before
    const question = questions[currentIndex];
    openClients.forEach((ws: any) => {
      if (!answeredClients.has(ws)) {
        ws.send(
          JSON.stringify({ type: "question", ...questions[currentIndex] })
        );
      }
    });
    // Reset answered clients for the next question
    answeredClients.clear();
    timeLeft = DEFAULT_TIME;
  }
}

// Starts the server tick, sending out the time left every second
function startServerTicks() {
  intervalId = setInterval(() => {
    if (gameEnded) {
      return;
    }
    timeLeft--;
    const message = JSON.stringify({ type: "tick", timeLeft });
    openClients.forEach((ws: any) => {
      ws.send(message);
    });

    // When timeLeft reaches 0, move to the next question
    if (timeLeft <= 0) {
      currentIndex++;
      broadcastQuestion();
    }
  }, 1000); // Send a tick every second
}

function stopServerTicks() {
  if (intervalId !== null) {
    clearInterval(intervalId); // Use this function to stop the interval
    intervalId = null; // Reset the interval ID
  }
}

app.ws("/quiz", {
  body: t.Object({
    answer: t.String(),
    address: t.String(),
  }),
  open: (ws) => {
    console.log("Connected");
    if (gameEnded) {
      const message = JSON.stringify({
        type: "gameEnded",
        message: "Game ended. Thank you for playing!",
      });
      ws.send(message);
      ws.close();
    }
    // Send the first question immediately upon connection
    if (openClients.size === 0) {
      startServerTicks();
    }
    openClients.add(ws);
    if (!answeredClients.has(ws)) {
      ws.send(JSON.stringify({ type: "question", ...questions[currentIndex] }));
    }
  },
  message: (ws, { answer, address }) => {
    console.log("answer");
    console.log(answeredClients.has(address));
    if (!answeredClients.has(address)) {
      const correct = answer === questions[currentIndex].a;
      ws.send(
        JSON.stringify({
          type: "feedback",
          feedback: correct ? "Correct" : "Incorrect",
        })
      );
      // Mark this client as having answered the current question
      answeredClients.add(address);
      addresses.add(address);
    } else {
      ws.send(
        JSON.stringify({ type: "feedback", feedback: "Already answered" })
      );
    }
  },
  close: (ws) => {
    console.log("close");
    openClients.delete(ws);
  },
});

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  console.log("Yo");
  await createGame();
});
