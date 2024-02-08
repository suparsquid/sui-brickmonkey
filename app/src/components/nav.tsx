import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WalletButton from "./walletButton";
import "./nav.css";
import { Button, Link } from "@radix-ui/themes";
import { CHAIN_USED, Chain } from "@utils/constants";

const Logo = () => {
  if (CHAIN_USED == Chain.Sui) {
    return (
      <Button variant="soft" className="bg-white text-black ">
        <img src="/images/sui.svg" className="w-full h-[80%] object-cover" />
      </Button>
    );
  } else {
    return (
      <Button variant="soft" className="bg-white text-black border-solid border-2 border-black">
        <img src="/images/berachain.svg" className="w-full h-full object-cover" />
      </Button>
    );
  }
};

const Nav = () => {
  const nav = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const MobileNav = () => (
    <div className="mobile-nav">
      <img src="/favicon.svg" className="w-10 h-10 hover:cursor-pointer" onClick={() => nav("/")} />
      <Button onClick={() => setShowMobileMenu(!showMobileMenu)}>Menu</Button>
      {showMobileMenu && (
        <div className="mobile-menu">
          {/* <Link onClick={() => nav("/connect")}>Play</Link> */}
          <Link onClick={() => nav("/")}>Leaderboard</Link>
          <WalletButton />
        </div>
      )}
    </div>
  );

  const DesktopNav = () => (
    <div className="desktop-nav w-full flex flex-row border-b p-3 gap-x-6 items-center">
      <img src="/favicon.svg" className="w-10 h-10 hover:cursor-pointer" onClick={() => nav("/")} />
      <div className="flex flex-row gap-x-3">
        {/* <Link style={{ color: "black" }} onClick={() => nav("/connect")}>
          Play
        </Link> */}
        <Link style={{ color: "black" }} onClick={() => nav("/")}>
          Leaderboard
        </Link>
      </div>
      <div className="ml-auto flex flex-row gap-x-3 buttons">
        <Logo />
        <WalletButton />
      </div>
    </div>
  );

  return (
    <>
      <MobileNav />
      <DesktopNav />
    </>
  );
};

export default Nav;
