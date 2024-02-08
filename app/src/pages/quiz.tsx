import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./quiz.css";
import { API, WEBSOCKET_SERVER } from "@utils/constants";
import { Button } from "@radix-ui/themes";

const Quiz = () => {
  const nav = useNavigate();
  const { address } = useParams();
  const [answers, setAnswers] = useState([]);
  const [answered, setAnswered] = useState("");
  const [question, setQuestion] = useState("");
  const [feedback, setFeedback] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [timeLeft, setTimeLeft] = useState(5);
  const [gameEnded, setGameEnded] = useState("");
  console.log(address);

  const [resetKey, setResetKey] = useState(0);

  const endGame = async () => {
    try {
      await fetch(`${API}/end-game`, { method: "POST" });
      await fetch(`${API}/reset-game`, { method: "POST" });
    } catch (error) {
      alert("Failed to reset the Game");
    }
    nav("/games");
  };

  // Connect to WebSocket and handle messages
  const connectWebSocket = useCallback(() => {
    const websocket = new WebSocket(WEBSOCKET_SERVER);
    setWs(websocket);

    websocket.onopen = (event) => {
      console.log("WebSocket connection opened:", event);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      switch (data.type) {
        case "tick":
          setTimeLeft(data.timeLeft);
          break;
        case "question":
          setQuestion(data.q);
          setAnswers(data.options);
          setFeedback("");
          setAnswered("");
          setTimeLeft(5);
          break;
        case "feedback":
          setFeedback(data.feedback);
          break;
        default:
          setGameEnded(data.message);
          setQuestion("");
          break;
      }
    };

    return () => {
      websocket.close();
    };
  }, []);

  // Effect to connect WebSocket on component mount and resetKey change
  useEffect(() => {
    if (!address) {
      nav("/"); // Redirects to the home page if there is no address
    }
    const disconnect = connectWebSocket();
    return () => disconnect();
  }, [connectWebSocket, resetKey]);

  // Reset quiz logic
  const resetQuiz = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setResetKey((prevKey) => prevKey + 1);
    setGameEnded("");
  }, [ws]);

  // Start quiz logic
  const startQuiz = async () => {
    try {
      await fetch(`${API}/start-quiz`, { method: "POST" });
      resetQuiz();
    } catch (error) {
      console.error("Failed to start the quiz:", error);
    }
  };

  // Send answer to server
  const sendAnswer = (answer: string) => {
    if (ws) {
      const message = JSON.stringify({ answer: answer, address: address });
      ws.send(message);
      setAnswered(answer);
    }
  };

  // Render quiz UI
  return (
    <div key={resetKey} className="flex flex-col h-auto items-center mt-20">
      <div className="flex flex-col gap-y-2 w-full md:w-1/3 h-full justify-center items-center">
        {question && (
          <>
            <h1 className="text-xl w-[500px] text-center mb-5 question">{question}</h1>
            <h2 className="text-xl mb-5 border-2 border-gray-300 rounded-full w-10 h-10 flex items-center justify-center">
              {timeLeft}
            </h2>
            <div className="flex flex-col gap-y-2 w-full items-center">
              {answers.map((answer, idx) => {
                let buttonClass = "w-[300px] bg-gray-100 rounded-md text-left p-4 options text-sm";
                if (feedback && answered === answer) {
                  buttonClass += feedback === "Correct" ? " border-2 border-green-500" : " border-2 border-red-500";
                }
                return (
                  <button
                    key={idx}
                    disabled={answered.length > 0}
                    className={buttonClass}
                    onClick={() => sendAnswer(answer)}
                  >
                    {answer}
                  </button>
                );
              })}
            </div>
            {feedback && <div className="feedback">{feedback}</div>}
          </>
        )}

        {gameEnded && (
          <>
            <h1 className="text-xl w-[500px] text-center mb-5 question">{gameEnded}</h1>
            <Button onClick={endGame}>Continue</Button>
            <Button color="crimson" onClick={startQuiz}>
              DEBUG: Restart Game
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Quiz;
