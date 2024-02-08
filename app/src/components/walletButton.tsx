import { ConnectButton, ConnectModal, WalletProvider, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { Button } from "@radix-ui/themes";
import { CHAIN_USED, Chain } from "@utils/constants";
import "@mysten/dapp-kit/dist/index.css";
import { useState } from "react";

const WalletButton = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectSui } = useDisconnectWallet();
  const [open, setOpen] = useState(false);

  if (CHAIN_USED === Chain.Sui) {
    return (
      <ConnectModal
        trigger={
          <Button
            className="font-share-tech-mono w-fit rounded-md bg-blue-500 px-2 text-white capitalize"
            onClick={() => disconnectSui()}
          >
            {" "}
            {currentAccount ? "Connected" : "Connect Wallet"}
          </Button>
        }
        open={!currentAccount && open}
        onOpenChange={(isOpen) => setOpen(isOpen)}
      />
    );
  } else {
    // console.log(address);
    // console.log(connectors);
    const connector = connectors[0];

    if (!address) {
      return (
        <Button
          className="font-share-tech-mono w-fit rounded-md bg-blue-500 px-2 text-white capitalize"
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          Connect Wallet
        </Button>
        // <WalletConnectButton buttonClassName="font-share-tech-mono w-fit rounded-md bg-blue-500 px-2 text-white capitalize" />
      );
    } else {
      return (
        <Button className="font-share-tech-mono" color="blue" onClick={() => disconnect()}>
          Connected to {address.substring(0, 6)}
        </Button>
      );
    }
  }
};

export default WalletButton;
