import { useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "@radix-ui/themes";
import { useNavigate } from "react-router";

const Home = () => {
  const nav = useNavigate();
  const currentAccount = useCurrentAccount();

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col w-full items-center h-1/3 gap-y-4">
        <h1 className="text-4xl">Brick Monkey</h1>
        {currentAccount ? (
          <Button className="hover:cursor-pointer w-fit" onClick={() => nav("/games")}>
            <div className="text-l p-5">Start</div>
          </Button>
        ) : (
          <div className="text-l p-5">Connect Wallet to Get Started</div>
        )}
      </div>
    </div>
  );
};

export default Home;
