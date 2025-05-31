// Layout.js
import { Outlet } from "react-router";
import { Modal } from "./Modal";
import { ConnectWallet } from "../../pages/connectWallet";

export const Layout = () => {
  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-[9999] pointer-events-auto">
        <ConnectWallet />
      </div>
      <Modal>
        <Outlet />
      </Modal>
    </div>
  );
};
